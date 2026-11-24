import type { Member, MemberStats } from "@/lib/members/types"

export type MembersResponse = {
  members: Member[]
  stats: MemberStats
  total: number
  page: number
  pageSize: number
  pages: number
}

export type MemberStatsResponse = {
  stats: MemberStats
}

export async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const body = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(body.error || "Não foi possível concluir a solicitação.")
  }

  return body
}

export async function downloadMemberExport(options?: {
  search?: string
  status?: string
}) {
  const params = new URLSearchParams({ scope: "all" })
  if (options?.search || options?.status && options.status !== "all") {
    params.set("scope", "filtered")
    if (options.search) params.set("search", options.search)
    if (options.status && options.status !== "all") params.set("status", options.status)
  }

  const response = await fetch(`/api/members/export?${params.toString()}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || "Não foi possível exportar a planilha.")
  }

  const file = await response.blob()
  const url = URL.createObjectURL(file)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `membros-nova-suica-${new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date())}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
