import "server-only"

import { normalizeText } from "@/lib/members/normalization"
import { parseMemberWorkbook, type ImportedMemberRow } from "@/lib/server/import-parser"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

export type ImportMatchKind = "new" | "existing_code" | "possible_name" | "duplicate_file"

export type AnalyzedImportRow = {
  sourceRow: number
  name: string
  externalCode: string | null
  status: ImportedMemberRow["status"]
  rawStatus: string
  statusNeedsReview: boolean
  congregation: string
  match: ImportMatchKind
  existingName?: string
  photoIssue?: string
}

export async function analyzeMemberWorkbook(buffer: Buffer) {
  const parsed = await parseMemberWorkbook(buffer)
  const { data: existingMembers, error } = await getSupabaseAdmin()
    .from("members")
    .select("external_code, name, congregation")

  if (error) throw new Error("Não foi possível comparar a planilha com os membros atuais.")

  const byCode = new Map<string, { name: string }>()
  const byNameAndCongregation = new Map<string, string>()

  for (const member of existingMembers ?? []) {
    if (member.external_code) {
      byCode.set(member.external_code.trim(), { name: member.name })
    }
    byNameAndCongregation.set(
      `${normalizeText(member.name)}|${normalizeText(member.congregation)}`,
      member.name,
    )
  }

  const seenCodes = new Set<string>()
  const seenNames = new Set<string>()
  const rows: AnalyzedImportRow[] = parsed.rows.map((row) => {
    const codeKey = row.externalCode?.trim() ?? ""
    const nameKey = `${normalizeText(row.name)}|${normalizeText(row.congregation)}`
    let match: ImportMatchKind = "new"
    let existingName: string | undefined

    if (codeKey && seenCodes.has(codeKey)) {
      match = "duplicate_file"
    } else if (codeKey && byCode.has(codeKey)) {
      match = "existing_code"
      existingName = byCode.get(codeKey)?.name
    } else if (!codeKey && (byNameAndCongregation.has(nameKey) || seenNames.has(nameKey))) {
      match = "possible_name"
      existingName = byNameAndCongregation.get(nameKey)
    }

    if (codeKey) seenCodes.add(codeKey)
    if (!codeKey) seenNames.add(nameKey)

    return {
      sourceRow: row.sourceRow,
      name: row.name,
      externalCode: row.externalCode,
      status: row.status,
      rawStatus: row.rawStatus,
      statusNeedsReview: row.statusNeedsReview,
      congregation: row.congregation,
      match,
      existingName,
      photoIssue: row.photoIssue,
    }
  })

  const embeddedImages = parsed.embeddedImageCount
  const matchedImages = parsed.rows.filter((row) => row.photo).length

  return {
    sheetName: parsed.sheetName,
    rowCount: parsed.rows.length,
    ignoredRows: parsed.ignoredRows,
    newCount: rows.filter((row) => row.match === "new").length,
    duplicateCodeCount: rows.filter((row) => row.match === "existing_code").length,
    duplicateFileCount: rows.filter((row) => row.match === "duplicate_file").length,
    possibleDuplicateCount: rows.filter((row) => row.match === "possible_name").length,
    statusReviewCount: rows.filter((row) => row.statusNeedsReview).length,
    embeddedImages,
    matchedImages,
    imageAssociationFailures: parsed.imageAssociationFailures,
    rows,
  }
}

export { parseMemberWorkbook }
