"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Plus, Search, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { MemberRowActions } from "@/components/members/member-row-actions"
import { MemberAvatar, MemberStatusBadge } from "@/components/members/member-visuals"
import { StatusFilter } from "@/components/members/status-filter"
import { useMemberActions } from "@/components/layout/member-actions-context"
import { jsonFetcher, downloadMemberExport, type MembersResponse } from "@/lib/members/api-types"
import type { MemberStatus } from "@/lib/members/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const pageSizeOptions = [10, 25, 50, 100]

type StatusFilterValue = "all" | MemberStatus

export function MembersPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilterValue>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [exporting, setExporting] = useState(false)
  const { openCreateMember, openImportMembers } = useMemberActions()

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      search,
      status,
      page: String(page),
      pageSize: String(pageSize),
    })
    return `/api/members?${params.toString()}`
  }, [search, status, page, pageSize])

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
  const isEmptySearch = Boolean(search.trim() || status !== "all")

  function changeStatus(next: StatusFilterValue) {
    setStatus(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Nova Suíça · Administração</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Membros</h1>
          <p className="mt-2 text-sm text-muted-foreground">Gerencie os membros da Igreja Nova Suíça</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={openImportMembers} aria-label="Importar membros" className="px-2.5 sm:px-3">
            <FileSpreadsheet data-icon="inline-start" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <ExportMenu
            exporting={exporting}
            onExportAll={() => void exportMembers("all")}
            onExportFiltered={() => void exportMembers("filtered")}
          />
          <Button type="button" onClick={openCreateMember} aria-label="Novo membro" className="px-2.5 sm:px-3">
            <Plus data-icon="inline-start" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo membro</span>
          </Button>
        </div>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os membros</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar membro por nome"
                placeholder="Buscar por nome"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                className="h-10 bg-background pl-10"
              />
            </div>
            <div className="sm:hidden">
              <StatusFilter value={status} onChange={changeStatus} compact />
            </div>
          </div>
        </CardHeader>

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
                      <TableHead className="w-20 pl-5">Foto</TableHead>
                      <TableHead>Nome completo</TableHead>
                      <TableHead className="w-52">
                        <StatusFilter value={status} onChange={changeStatus} />
                      </TableHead>
                      <TableHead className="w-16 pr-5 text-right"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-5">
                          <MemberAvatar name={member.name} photoUrl={member.photoUrl} className="size-10" />
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
                  <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                    <MemberAvatar name={member.name} photoUrl={member.photoUrl} className="size-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <div className="mt-1.5"><MemberStatusBadge status={member.status} /></div>
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
                  <Button type="button" variant="outline" onClick={() => { setSearch(""); setStatus("all"); setPage(1) }}>Limpar filtros</Button>
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
  )
}

function ExportMenu({
  exporting,
  onExportAll,
  onExportFiltered,
}: {
  exporting: boolean
  onExportAll: () => void
  onExportFiltered: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" disabled={exporting} aria-label="Exportar membros" className="px-2.5 sm:px-3" />}>
        <Download data-icon="inline-start" />
        <span className="hidden sm:inline">Exportar</span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onExportAll}>
            <Download data-icon="inline-start" />
            Exportar todos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportFiltered}>
            <FileSpreadsheet data-icon="inline-start" />
            Exportar resultado atual
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
