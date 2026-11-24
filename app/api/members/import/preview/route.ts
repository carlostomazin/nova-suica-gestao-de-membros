import { requireAuthenticatedUser } from "@/lib/server/auth"
import { analyzeMemberWorkbook } from "@/lib/server/import-analysis"
import { getWorkbookFile } from "@/lib/server/uploaded-workbook"

const noStoreHeaders = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  const authFailure = await requireAuthenticatedUser()
  if (authFailure) return authFailure

  try {
    const formData = await request.formData()
    const upload = getWorkbookFile(formData.get("file"))
    if (upload.error) return Response.json({ error: upload.error }, { status: 400, headers: noStoreHeaders })

    const analysis = await analyzeMemberWorkbook(Buffer.from(await upload.file.arrayBuffer()))
    const previewLimit = 200

    return Response.json(
      {
        ...analysis,
        rows: analysis.rows.slice(0, previewLimit),
        truncated: analysis.rows.length > previewLimit,
      },
      { headers: noStoreHeaders },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível ler a planilha."
    const status = message.startsWith("Não foi possível comparar") ? 503 : 400
    return Response.json({ error: message }, { status, headers: noStoreHeaders })
  }
}
