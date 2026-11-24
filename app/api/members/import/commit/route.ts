import { randomUUID } from "node:crypto"
import { normalizeText } from "@/lib/members/normalization"
import { imagePayloadFromBuffer, removeMemberPhotos, uploadMemberPhoto } from "@/lib/server/member-photos"
import { parseMemberWorkbook } from "@/lib/server/import-parser"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"
import { getWorkbookFile } from "@/lib/server/uploaded-workbook"

const noStoreHeaders = { "Cache-Control": "no-store" }

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: noStoreHeaders })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const upload = getWorkbookFile(formData.get("file"))
    if (upload.error) return errorResponse(upload.error)

    const duplicateMode = formData.get("duplicateMode")
    if (duplicateMode !== "ignore" && duplicateMode !== "update") {
      return errorResponse("Escolha como tratar os códigos já cadastrados.")
    }

    const workbook = await parseMemberWorkbook(Buffer.from(await upload.file.arrayBuffer()))
    const unknownStatuses = workbook.rows.filter((row) => row.statusNeedsReview).length
    const acknowledgesUnknown = formData.get("acknowledgeUnknownStatus") === "true"
    if (unknownStatuses > 0 && !acknowledgesUnknown) {
      return errorResponse("Revise e confirme o tratamento dos status desconhecidos antes de importar.")
    }

    const supabase = getSupabaseAdmin()
    const { data: existing, error: readError } = await supabase
      .from("members")
      .select("id, external_code, name, congregation, photo_path")

    if (readError) return errorResponse("Não foi possível comparar os dados atuais.", 503)

    type ExistingMember = {
      id: string
      external_code: string | null
      name: string
      congregation: string
      photo_path: string | null
    }
    const existingByCode = new Map<string, ExistingMember>()
    const existingNames = new Set<string>()
    for (const member of existing ?? []) {
      if (member.external_code) existingByCode.set(member.external_code.trim(), member)
      existingNames.add(`${normalizeText(member.name)}|${normalizeText(member.congregation)}`)
    }

    const seenCodes = new Set<string>()
    const seenNames = new Set<string>()
    const result = {
      created: 0,
      updated: 0,
      skippedExisting: 0,
      skippedPossibleDuplicates: 0,
      skippedRepeatedRows: 0,
      failed: 0,
      photoFailures: workbook.imageAssociationFailures,
      ignoredRows: workbook.ignoredRows,
    }

    for (const row of workbook.rows) {
      const codeKey = row.externalCode?.trim() ?? ""
      const nameKey = `${normalizeText(row.name)}|${normalizeText(row.congregation)}`

      if (codeKey && seenCodes.has(codeKey)) {
        result.skippedRepeatedRows += 1
        continue
      }
      if (!codeKey && seenNames.has(nameKey)) {
        result.skippedRepeatedRows += 1
        continue
      }
      if (codeKey) seenCodes.add(codeKey)
      else seenNames.add(nameKey)

      const current = codeKey ? existingByCode.get(codeKey) : undefined
      if (!codeKey && existingNames.has(nameKey)) {
        result.skippedPossibleDuplicates += 1
        continue
      }
      if (current && duplicateMode === "ignore") {
        result.skippedExisting += 1
        continue
      }

      let nextPhotoPath = current?.photo_path ?? null
      let uploadedPath: string | null = null
      if (row.photo) {
        const image = imagePayloadFromBuffer(row.photo.buffer, row.photo.contentType, row.photo.extension)
        if (!image) {
          result.photoFailures += 1
        } else {
          try {
            const memberId = current?.id ?? randomUUID()
            uploadedPath = await uploadMemberPhoto(memberId, image)
            nextPhotoPath = uploadedPath
          } catch {
            result.photoFailures += 1
          }
        }
      }

      const values = {
        external_code: row.externalCode,
        name: row.name,
        status: row.status,
        congregation: row.congregation,
        photo_path: nextPhotoPath,
        ...(workbook.hasPhoneColumn ? { phone: row.phone } : {}),
        ...(workbook.hasCepColumn ? { cep: row.cep } : {}),
        ...(workbook.hasStreetColumn ? { street: row.street } : {}),
        ...(workbook.hasNumberColumn ? { number: row.number } : {}),
        ...(workbook.hasNeighborhoodColumn ? { neighborhood: row.neighborhood } : {}),
        ...(workbook.hasComplementColumn ? { complement: row.complement } : {}),
        ...(workbook.hasCityColumn ? { city: row.city } : {}),
        ...(workbook.hasStateColumn ? { state: row.state } : {}),
      }

      if (current) {
        const { error } = await supabase.from("members").update(values).eq("id", current.id)
        if (error) {
          await removeMemberPhotos([uploadedPath])
          result.failed += 1
          continue
        }
        if (current.photo_path && current.photo_path !== nextPhotoPath) {
          try {
            await removeMemberPhotos([current.photo_path])
          } catch {
            result.photoFailures += 1
          }
        }
        result.updated += 1
        existingNames.add(nameKey)
      } else {
        const memberId = uploadedPath ? uploadedPath.split("/")[1] : randomUUID()
        const { error } = await supabase.from("members").insert({ id: memberId, ...values })
        if (error) {
          await removeMemberPhotos([uploadedPath])
          result.failed += 1
          continue
        }
        result.created += 1
        existingNames.add(nameKey)
        if (codeKey) {
          existingByCode.set(codeKey, {
            id: memberId,
            external_code: row.externalCode,
            name: row.name,
            congregation: row.congregation,
            photo_path: nextPhotoPath,
          })
        }
      }
    }

    return Response.json(
      {
        ...result,
        embeddedImages: workbook.embeddedImageCount,
        statusReviewCount: unknownStatuses,
      },
      { headers: noStoreHeaders },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível importar a planilha."
    return errorResponse(message, message.startsWith("Não foi possível comparar") ? 503 : 400)
  }
}
