"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Download, FileSpreadsheet, LoaderCircle, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { MemberActionsContext } from "@/components/layout/member-actions-context"
import { ImportMembersDialog } from "@/components/members/import-members-dialog"
import { MemberFormDialog } from "@/components/members/member-form-dialog"
import { Button } from "@/components/ui/button"
import { downloadMemberExport } from "@/lib/members/api-types"
import type { Member } from "@/lib/members/types"

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
        <UsersRound aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold tracking-wide text-white">NOVA SUÍÇA</span>
        <span className="truncate text-xs text-white/55">Gestão de membros</span>
      </span>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [exporting, setExporting] = useState(false)

  const isMembersPage = pathname === "/members" || pathname.startsWith("/members/")

  const actions = useMemo(() => ({
    openCreateMember() {
      setEditingMember(null)
      setMemberDialogOpen(true)
    },
    openEditMember(member: Member) {
      setEditingMember(member)
      setMemberDialogOpen(true)
    },
    openImportMembers() {
      setImportDialogOpen(true)
    },
  }), [])

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

  return (
    <MemberActionsContext.Provider value={actions}>
      <div className="min-h-screen bg-muted/45">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-navy-soft/30 bg-navy px-4 sm:px-6">
          <Brand />

          {isMembersPage ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                aria-label="Importar membros"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white max-sm:size-7 max-sm:justify-center max-sm:gap-0 max-sm:p-0"
              >
                <FileSpreadsheet aria-hidden="true" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void exportAllMembers()}
                disabled={exporting}
                aria-label="Exportar membros"
                aria-busy={exporting}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white max-sm:size-7 max-sm:justify-center max-sm:gap-0 max-sm:p-0"
              >
                {exporting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
                <span className="hidden sm:inline">{exporting ? "Exportando..." : "Exportar"}</span>
              </Button>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      <MemberFormDialog
        open={memberDialogOpen}
        member={editingMember}
        onOpenChange={setMemberDialogOpen}
      />
      <ImportMembersDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </MemberActionsContext.Provider>
  )
}
