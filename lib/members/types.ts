export type MemberStatus = "active" | "inactive" | "not_revalidated"
export type MemberSortOrder = "name_asc" | "name_desc"
export type MemberPhotoFilter = "all" | "with" | "without"

export type Member = {
  id: string
  name: string
  status: MemberStatus
  congregation: string
  photoUrl: string | null
  createdAt?: string
  updatedAt?: string
}

export type MemberStats = {
  total: number
  active: number
  inactive: number
  notRevalidated: number
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  not_revalidated: "Não revalidado",
}

export const MEMBER_STATUS_EXPORT_LABELS: Record<MemberStatus, string> = {
  active: "ATIVO",
  inactive: "INATIVO",
  not_revalidated: "NÃO REVALIDADO",
}
