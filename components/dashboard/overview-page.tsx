"use client"

import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { ArrowRight, Download, FileSpreadsheet, UserPlus, UsersRound, UserRoundCheck, UserRoundX, UserRoundSearch, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemberActions } from "@/components/layout/member-actions-context"
import { jsonFetcher, downloadMemberExport, type MemberStatsResponse } from "@/lib/members/api-types"

const statsCards = [
  { key: "total", label: "Total de membros", description: "Cadastros registrados", icon: UsersRound, tone: "navy" },
  { key: "active", label: "Ativos", description: "Em atividade", icon: UserRoundCheck, tone: "green" },
  { key: "inactive", label: "Inativos", description: "Fora de atividade", icon: UserRoundX, tone: "red" },
  { key: "notRevalidated", label: "Não revalidados", description: "Precisam de acompanhamento", icon: UserRoundSearch, tone: "amber" },
] as const

const iconTones = {
  navy: "bg-primary/8 text-primary",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
}

export function OverviewPage() {
  const { data, error, isLoading, mutate } = useSWR<MemberStatsResponse>("/api/members?statsOnly=1", (url: string) => jsonFetcher<MemberStatsResponse>(url))
  const { openCreateMember, openImportMembers } = useMemberActions()
  const [exporting, setExporting] = useState(false)

  async function exportAllMembers() {
    setExporting(true)
    try {
      await downloadMemberExport()
      toast.success("Planilha exportada.")
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "Não foi possível exportar a planilha.")
    } finally {
      setExporting(false)
    }
  }

  const stats = data?.stats

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Nova Suíça · Administração</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Visão geral</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe os cadastros de membros da congregação.</p>
        </div>
        <Link href="/members" className={buttonVariants({ variant: "outline", className: "hidden sm:inline-flex" })}>
          Ver membros
          <ArrowRight data-icon="inline-end" />
        </Link>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Indicadores de membros" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon
          const value = stats?.[card.key]
          return (
            <Card key={card.key} className="border-border/80 shadow-sm">
              <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconTones[card.tone]}`}>
                  <Icon aria-hidden="true" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight tabular-nums">
                  {isLoading ? <Skeleton className="h-9 w-20" aria-label="Carregando" /> : value ?? "—"}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {stats?.total === 0 ? (
        <Card className="border-border/80 shadow-sm">
          <Empty className="min-h-56 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Ainda não há membros cadastrados</EmptyTitle>
              <EmptyDescription>Cadastre uma pessoa ou importe a planilha existente para começar.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
              <Button type="button" onClick={openCreateMember}><UserPlus data-icon="inline-start" />Cadastrar membro</Button>
              <Button type="button" variant="outline" onClick={openImportMembers}><FileSpreadsheet data-icon="inline-start" />Importar planilha</Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : null}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ações rápidas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie os dados sem sair do painel.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <QuickAction
            title="Cadastrar membro"
            description="Adicione uma pessoa e mantenha a lista atualizada."
            icon={UserPlus}
            buttonLabel="Novo cadastro"
            onClick={openCreateMember}
          />
          <QuickAction
            title="Importar planilha"
            description="Revise os dados antes de confirmar a importação."
            icon={FileSpreadsheet}
            buttonLabel="Selecionar arquivo"
            onClick={openImportMembers}
          />
          <QuickAction
            title="Exportar cadastros"
            description="Baixe um arquivo Excel com a lista atual."
            icon={Download}
            buttonLabel={exporting ? "Exportando…" : "Baixar planilha"}
            onClick={() => void exportAllMembers()}
            disabled={exporting || isLoading || !stats?.total}
          />
        </div>
      </section>
    </div>
  )
}

function QuickAction({
  title,
  description,
  icon: Icon,
  buttonLabel,
  onClick,
  disabled = false,
}: {
  title: string
  description: string
  icon: LucideIcon
  buttonLabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex-row items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Icon aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="leading-relaxed">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" className="w-full justify-between" onClick={onClick} disabled={disabled}>
          {buttonLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  )
}
