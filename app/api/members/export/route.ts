import ExcelJS from "exceljs"
import { normalizeText } from "@/lib/members/normalization"
import { MEMBER_STATUS_EXPORT_LABELS, type MemberStatus } from "@/lib/members/types"
import { getMemberPhotoImage } from "@/lib/server/member-photos"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

const noStoreHeaders = { "Cache-Control": "no-store" }
const validStatuses = new Set(["all", "active", "inactive", "not_revalidated"])

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const scope = params.get("scope") ?? "all"
    const search = normalizeText(params.get("search") ?? "")
    const status = params.get("status") ?? "all"

    if (scope !== "all" && scope !== "filtered") {
      return Response.json({ error: "Escopo de exportação inválido." }, { status: 400, headers: noStoreHeaders })
    }
    if (!validStatuses.has(status)) {
      return Response.json({ error: "Filtro de status inválido." }, { status: 400, headers: noStoreHeaders })
    }

    const { data, error } = await getSupabaseAdmin()
      .from("members")
      .select("external_code, name, status, congregation, photo_path")

    if (error) {
      return Response.json({ error: "Não foi possível carregar os membros para exportação." }, { status: 503, headers: noStoreHeaders })
    }

    const members = (data ?? [])
      .filter((member) => scope === "all" || !search || normalizeText(member.name).includes(search))
      .filter((member) => scope === "all" || status === "all" || member.status === status)
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }))

    const photoEntries = await Promise.all(
      members.map(async (member) => [
        member.photo_path ?? "",
        member.photo_path ? await getMemberPhotoImage(member.photo_path) : null,
      ] as const),
    )
    const photosByPath = new Map(
      photoEntries.filter(([path, image]) => Boolean(path) && Boolean(image)) as Array<[string, { buffer: Buffer; extension: "jpeg" | "png" }]>,
    )

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Cadastro de Membros"
    workbook.created = new Date()
    const worksheet = workbook.addWorksheet("Consulta", {
      views: [{ state: "frozen", ySplit: 1 }],
    })

    worksheet.columns = [
      { header: "Foto", key: "photo", width: 14 },
      { header: "Código", key: "code", width: 16 },
      { header: "Nome", key: "name", width: 38 },
      { header: "Situação", key: "status", width: 22 },
      { header: "Congregação", key: "congregation", width: 26 },
    ]
    worksheet.autoFilter = "A1:E1"
    worksheet.getRow(1).height = 24
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17283E" },
    }

    members.forEach((member, index) => {
      worksheet.addRow({
        photo: "",
        code: member.external_code ?? "",
        name: member.name,
        status: MEMBER_STATUS_EXPORT_LABELS[member.status as MemberStatus] ?? "",
        congregation: member.congregation,
      })

      const image = member.photo_path ? photosByPath.get(member.photo_path) : null
      if (!image) return

      const rowNumber = index + 2
      worksheet.getRow(rowNumber).height = 56
      const imageId = workbook.addImage({ buffer: image.buffer as any, extension: image.extension })
      worksheet.addImage(imageId, {
        tl: { col: 0, row: rowNumber - 1 },
        ext: { width: 56, height: 56 },
        editAs: "oneCell",
      })
    })

    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date())
    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="membros-nova-suica-${date}.xlsx"`,
      },
    })
  } catch {
    return Response.json({ error: "Não foi possível gerar a planilha." }, { status: 503, headers: noStoreHeaders })
  }
}
