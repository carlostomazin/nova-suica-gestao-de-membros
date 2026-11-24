import type { MemberStatus } from "@/lib/members/types"

export type ImportMatchKind = "new" | "existing_code" | "possible_name" | "duplicate_file"

export type ImportPreviewRow = {
  sourceRow: number
  name: string
  externalCode: string | null
  status: MemberStatus
  rawStatus: string
  statusNeedsReview: boolean
  congregation: string
  match: ImportMatchKind
  existingName?: string
  photoIssue?: string
}

export type ImportPreview = {
  sheetName: string
  rowCount: number
  ignoredRows: number
  newCount: number
  duplicateCodeCount: number
  duplicateFileCount: number
  possibleDuplicateCount: number
  statusReviewCount: number
  embeddedImages: number
  matchedImages: number
  imageAssociationFailures: number
  rows: ImportPreviewRow[]
  truncated: boolean
}

export type ImportResult = {
  created: number
  updated: number
  skippedExisting: number
  skippedPossibleDuplicates: number
  skippedRepeatedRows: number
  failed: number
  photoFailures: number
  ignoredRows: number
  embeddedImages: number
  statusReviewCount: number
}
