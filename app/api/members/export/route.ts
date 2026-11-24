import ExcelJS from "exceljs"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { normalizeText } from "@/lib/members/normalization"
import { MEMBER_STATUS_EXPORT_LABELS, type MemberStatus } from "@/lib/members/types"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

const noStoreHeaders = { "Cache-Control": "no-store" }
const validStatuses = new Set(["all", "active", "inactive", "not_revalidated"])

export async function GET(request: Request) {
  const authFailure = await requireAuthenticatedUser()
  if (authFailure) return authFailure

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
      .select("external_code, name, status, congregation")

    if (error) {
      return Response.json({ error: "Não foi possível carregar os membros para exportação." }, { status: 503, headers: noStoreHeaders })
    }

    const members = (data ?? [])
      .filter((member) => scope === "all" || !search || normalizeText(member.name).includes(search))
      .filter((member) => scope === "all" || status === "all" || member.status === status)
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }))

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

    for (const member of members) {
      worksheet.addRow({
        photo: "",
        code: member.external_code ?? "",
        name: member.name,
        status: MEMBER_STATUS_EXPORT_LABELS[member.status as MemberStatus] ?? "",
        congregation: member.congregation,
      })
    }

    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date())
    const file = Buffer.from(await workbook.xlsx.writeBuffer())

    return new Response(file, {
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
