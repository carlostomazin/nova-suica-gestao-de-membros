"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, LoaderCircle, Plus, Search, UsersRound, X } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { MemberRowActions } from "@/components/members/member-row-actions"
import { MemberAvatar, MemberStatusBadge } from "@/components/members/member-visuals"
import { MemberFiltersDialog } from "@/components/members/member-filters-dialog"
import { useMemberActions } from "@/components/layout/member-actions-context"
import { jsonFetcher, downloadMemberExport, type MembersResponse } from "@/lib/members/api-types"
import type { MemberPhotoFilter, MemberSortOrder, MemberStatus } from "@/lib/members/types"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const pageSizeOptions = [10, 25, 50, 100]

type StatusFilterValue = "all" | MemberStatus

export function MembersPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilterValue>("all")
  const [photo, setPhoto] = useState<MemberPhotoFilter>("all")
  const [sortOrder, setSortOrder] = useState<MemberSortOrder>("name_asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [exporting, setExporting] = useState(false)
  const { openCreateMember, openEditMember, openImportMembers } = useMemberActions()

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      search,
      status,
      photo,
      sort: sortOrder,
      page: String(page),
      pageSize: String(pageSize),
    })
    return `/api/members?${params.toString()}`
  }, [search, status, photo, sortOrder, page, pageSize])

  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    requestUrl,
    (url) => jsonFetcher<MembersResponse>(url),
    { keepPreviousData: true, refreshInterval: 8 * 60 * 1000, refreshWhenHidden: false },
  )

  async function exportMembers(scope: "all" | "filtered") {
    setExporting(true)
    try {
      await downloadMemberExport(scope === "filtered" ? { search: search.trim(), status } : undefined)
      toast.success("Planilha exportada.")
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "Não foi possível exportar a planilha.")
    } finally {
      setExporting(false)
    }
  }

  const members = data?.members ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1
  const firstResult = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastResult = Math.min(page * pageSize, total)
  const isEmptySearch = Boolean(search.trim() || status !== "all" || photo !== "all")

  function applyFilters(filters: { status: StatusFilterValue; photo: MemberPhotoFilter; sortOrder: MemberSortOrder }) {
    setStatus(filters.status)
    setPhoto(filters.photo)
    setSortOrder(filters.sortOrder)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Indicadores de membros" className="grid grid-cols-4 gap-2 px-2 sm:px-0">
        {[
          { key: "total", label: "Total", value: data?.stats?.total, dotClass: "bg-primary" },
          { key: "active", label: "Ativos", value: data?.stats?.active, dotClass: "bg-emerald-500" },
          { key: "inactive", label: "Inativos", value: data?.stats?.inactive, dotClass: "bg-red-500" },
          { key: "notRevalidated", label: "Não revalidados", value: data?.stats?.notRevalidated, dotClass: "bg-amber-500" },
        ].map((item) => (
          <div
            key={item.key}
            className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/80 bg-card p-2 sm:p-2.5"
          >
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${item.dotClass}`} />
              <span className="truncate text-[11px] leading-tight text-muted-foreground sm:text-xs">{item.label}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground sm:text-base">
              {isLoading && !data ? <Skeleton className="inline-block h-4 w-8 align-middle" /> : item.value ?? "—"}
            </span>
          </div>
        ))}
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os membros</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 px-2 sm:px-0">
          <Button type="button" onClick={openCreateMember} aria-label="Novo membro" className="h-10 w-full sm:hidden">
            <Plus data-icon="inline-start" />
            Novo membro
          </Button>
          <div className="flex items-center gap-4">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar membro por nome"
                placeholder="Buscar por nome"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                className="h-10 bg-background pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => { setSearch(""); setPage(1) }}
                  className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              ) : null}
            </div>
            <MemberFiltersDialog sortOrder={sortOrder} status={status} photo={photo} onApply={applyFilters} />
            <Button type="button" onClick={openCreateMember} aria-label="Novo membro" className="hidden h-10 shrink-0 px-3 sm:ml-auto sm:inline-flex">
              <Plus data-icon="inline-start" />
              Novo membro
            </Button>
          </div>
        </div>

        <Card className="gap-0 overflow-hidden border-border/80 py-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="flex flex-col gap-4 p-5" aria-label="Carregando membros">
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
            </div>
          ) : members.length > 0 ? (
            <>
              <div className="hidden sm:block">
                <Table aria-label="Lista de membros">
                  <TableHeader>
                    <TableRow className="bg-muted/35 hover:bg-muted/35">
                      <TableHead className="h-10 w-20 pl-5">Foto</TableHead>
                      <TableHead className="h-10">Nome completo</TableHead>
                      <TableHead className="h-10 w-52">Situação</TableHead>
                      <TableHead className="h-10 w-16 pr-5 text-right"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer"
                        onClick={(event) => {
                          const target = event.target as HTMLElement
                          if (target.closest("button, a, [role='button'], [role='menuitem'], input, select, textarea")) return
                          openEditMember(member)
                        }}
                      >
                        <TableCell className="pl-5">
                          <MemberAvatar name={member.name} photoUrl={member.photoUrl} status={member.status} className="size-10" />
                        </TableCell>
                        <TableCell className="max-w-0">
                          <span className="block truncate font-medium" title={member.name}>{member.name}</span>
                        </TableCell>
                        <TableCell><MemberStatusBadge status={member.status} /></TableCell>
                        <TableCell className="pr-5 text-right"><MemberRowActions member={member} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y sm:hidden">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3.5"
                    onClick={(event) => {
                      const target = event.target as HTMLElement
                      if (target.closest("button, a, [role='button'], [role='menuitem'], input, select, textarea")) return
                      openEditMember(member)
                    }}
                  >
                    <MemberAvatar name={member.name} photoUrl={member.photoUrl} status={member.status} className="size-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                    </div>
                    <MemberRowActions member={member} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty className="min-h-72 border-0 px-5 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>{isEmptySearch ? "Nenhum membro encontrado" : "Ainda não há membros cadastrados"}</EmptyTitle>
                <EmptyDescription>
                  {isEmptySearch ? "Tente outro nome ou ajuste o filtro de situação." : "Cadastre uma pessoa ou importe sua planilha para começar."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row justify-center">
                {isEmptySearch ? (
                  <Button type="button" variant="outline" onClick={() => { setSearch(""); setStatus("all"); setPhoto("all"); setSortOrder("name_asc"); setPage(1) }}>Limpar filtros</Button>
                ) : (
                  <>
                    <Button type="button" onClick={openCreateMember}>Cadastrar membro</Button>
                    <Button type="button" variant="outline" onClick={openImportMembers}>Importar planilha</Button>
                  </>
                )}
              </EmptyContent>
            </Empty>
          )}
        </CardContent>

        {total > 0 ? (
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3.5 sm:px-5">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{firstResult}–{lastResult}</span> de <span className="font-medium text-foreground">{total}</span> membros
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="members-page-size" className="text-xs text-muted-foreground">Por página</label>
                <Select value={String(pageSize)} onValueChange={(value) => { if (value) { setPageSize(Number(value)); setPage(1) } }}>
                  <SelectTrigger id="members-page-size" size="sm" className="w-[76px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectGroup>
                      {pageSizeOptions.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 text-xs tabular-nums text-muted-foreground">Página {page} de {pages}</span>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Página anterior" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Próxima página" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page >= pages}>
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardFooter>
        ) : null}
      </Card>
      </div>
    </div>
  )
}

