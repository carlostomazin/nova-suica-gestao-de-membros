import "server-only"

import ExcelJS from "exceljs"
import { cleanCellText, normalizeText } from "@/lib/members/normalization"
import type { MemberStatus } from "@/lib/members/types"

export type ImportedMemberRow = {
  sourceRow: number
  name: string
  externalCode: string | null
  status: MemberStatus
  rawStatus: string
  statusNeedsReview: boolean
  congregation: string
  photo?: {
    buffer: Buffer
    contentType: string
    extension: string
  }
  photoIssue?: string
}

export type ParsedMemberWorkbook = {
  sheetName: string
  headerRow: number
  rows: ImportedMemberRow[]
  ignoredRows: number
  embeddedImageCount: number
  imageAssociationFailures: number
}

const columnAliases = {
  photo: new Set(["foto", "photo", "imagem", "image"]),
  code: new Set(["codigo", "cod", "code", "codigo original"]),
  name: new Set(["nome", "name", "nome completo"]),
  status: new Set(["situacao", "status"]),
  congregation: new Set(["congregacao", "congregation"]),
} as const

function findHeader(worksheet: ExcelJS.Worksheet) {
  const lastCandidateRow = Math.min(worksheet.rowCount, 25)

  for (let rowNumber = 1; rowNumber <= lastCandidateRow; rowNumber += 1) {
    const columns: Partial<Record<keyof typeof columnAliases, number>> = {}
    worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell, column) => {
      const normalized = normalizeText(cleanCellText(cell.text || cell.value))
      for (const [key, aliases] of Object.entries(columnAliases) as Array<
        [keyof typeof columnAliases, Set<string>]
      >) {
        if (aliases.has(normalized)) columns[key] = column
      }
    })

    if (columns.code && columns.name && columns.status && columns.congregation) {
      return { rowNumber, columns }
    }
  }

  return null
}

function normalizeStatus(rawStatus: string) {
  const normalized = normalizeText(rawStatus).toUpperCase()

  if (!normalized) return { status: "active" as const, needsReview: false }
  if (normalized === "ATIVO") return { status: "active" as const, needsReview: false }
  if (normalized === "INATIVO") return { status: "inactive" as const, needsReview: false }
  if (normalized === "NAO REVALIDADO") {
    return { status: "not_revalidated" as const, needsReview: false }
  }

  return { status: "active" as const, needsReview: true }
}

type EmbeddedMedia = {
  index?: number | string
  buffer?: Uint8Array
  base64?: string
  extension?: string
}

function getMediaBuffer(media: EmbeddedMedia) {
  if (media.buffer) return Buffer.from(media.buffer)
  if (media.base64) {
    const base64 = media.base64.includes(",") ? media.base64.split(",").at(-1) : media.base64
    return Buffer.from(base64 ?? "", "base64")
  }
  return null
}

function getImageType(extension: string) {
  const normalized = extension.toLowerCase().replace(/^\./, "")
  if (normalized === "jpg" || normalized === "jpeg") {
    return { extension: "jpg", contentType: "image/jpeg" }
  }
  if (normalized === "png") return { extension: "png", contentType: "image/png" }
  if (normalized === "webp") return { extension: "webp", contentType: "image/webp" }
  return null
}

export async function parseMemberWorkbook(buffer: Buffer): Promise<ParsedMemberWorkbook> {
  const workbook = new ExcelJS.Workbook()
  const workbookBytes = new Uint8Array(buffer.length)
  workbookBytes.set(buffer)
  await workbook.xlsx.load(workbookBytes.buffer)

  const worksheets = [
    ...workbook.worksheets.filter((sheet) => normalizeText(sheet.name) === "consulta"),
    ...workbook.worksheets.filter((sheet) => normalizeText(sheet.name) !== "consulta"),
  ]

  const selected = worksheets
    .map((worksheet) => ({ worksheet, header: findHeader(worksheet) }))
    .find((item) => item.header)

  if (!selected?.header) {
    throw new Error(
      "Não foi possível localizar um cabeçalho com Código, Nome, Situação e Congregação nas primeiras 25 linhas.",
    )
  }

  const { worksheet, header } = selected
  const rows: ImportedMemberRow[] = []
  let ignoredRows = 0

  for (
    let rowNumber = header.rowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber)
    const cellText = (column: number | undefined) =>
      column ? cleanCellText(row.getCell(column).text || row.getCell(column).value) : ""
    const name = cellText(header.columns.name)

    if (!name) {
      ignoredRows += 1
      continue
    }

    const rawStatus = cellText(header.columns.status)
    const normalizedStatus = normalizeStatus(rawStatus)

    rows.push({
      sourceRow: rowNumber,
      name,
      externalCode: cellText(header.columns.code) || null,
      status: normalizedStatus.status,
      rawStatus,
      statusNeedsReview: normalizedStatus.needsReview,
      congregation: cellText(header.columns.congregation) || "Nova Suíça",
    })
  }

  const media = (workbook as unknown as { model?: { media?: EmbeddedMedia[] } }).model?.media ?? []
  const anchors = worksheet.getImages()
  let imageAssociationFailures = 0
  const rowsByNumber = new Map(rows.map((row) => [row.sourceRow, row]))

  for (const anchor of anchors) {
    const sourceRow = Math.floor(anchor.range.tl.row) + 1
    const target = rowsByNumber.get(sourceRow)
    const embedded = media.find((item) => String(item.index) === String(anchor.imageId))

    if (!target || !embedded) {
      imageAssociationFailures += 1
      continue
    }

    const type = getImageType(embedded.extension ?? "")
    const imageBuffer = getMediaBuffer(embedded)

    if (!type || !imageBuffer || imageBuffer.length > 5 * 1024 * 1024) {
      target.photoIssue = "A imagem não pôde ser extraída ou excede o limite de 5 MB."
      imageAssociationFailures += 1
      continue
    }

    target.photo = {
      buffer: imageBuffer,
      contentType: type.contentType,
      extension: type.extension,
    }
  }

  return {
    sheetName: worksheet.name,
    headerRow: header.rowNumber,
    rows,
    ignoredRows,
    embeddedImageCount: anchors.length,
    imageAssociationFailures,
  }
}
