"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut, Menu, UsersRound, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { MemberActionsContext } from "@/components/layout/member-actions-context"
import { ImportMembersDialog } from "@/components/members/import-members-dialog"
import { MemberFormDialog } from "@/components/members/member-form-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import type { Member } from "@/lib/members/types"

const navigationItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/members", label: "Membros", icon: UsersRound },
]

function Brand({ mobile = false, compact = false }: { mobile?: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "px-0 py-0" : mobile ? "px-5 py-5" : "px-6 py-7")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
        <UsersRound aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold tracking-wide text-white">NOVA SUÍÇA</span>
        <span className="mt-0.5 text-xs text-white/55">Cadastro de membros</span>
      </span>
    </div>
  )
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-3">
      {navigationItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [signingOut, setSigningOut] = useState(false)

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

  if (pathname === "/login") return <>{children}</>

  async function signOut() {
    setSigningOut(true)
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut()
      if (error) throw error
      router.replace("/login")
      router.refresh()
    } catch {
      toast.error("Não foi possível encerrar a sessão. Tente novamente.")
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <MemberActionsContext.Provider value={actions}>
      <div className="min-h-screen bg-muted/45">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy lg:flex">
          <Brand />
          <NavigationLinks pathname={pathname} />
          <div className="mt-auto flex flex-col gap-4 p-4">
            <Separator className="bg-white/12" />
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
              onClick={signOut}
              disabled={signingOut}
            >
              <LogOut data-icon="inline-start" />
              {signingOut ? "Saindo…" : "Sair do sistema"}
            </Button>
          </div>
        </aside>

        <div className="min-h-screen lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:hidden">
            <Brand mobile />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Abrir menu de navegação"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
          </header>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-[min(84vw,300px)] border-none bg-navy p-0 text-white sm:max-w-xs" showCloseButton={false}>
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navegação</SheetTitle>
                <SheetDescription>Escolha uma das páginas do cadastro.</SheetDescription>
              </SheetHeader>
            <Brand mobile compact />
              <SheetClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar menu"
                    className="absolute top-5 right-4 text-white hover:bg-white/10 hover:text-white"
                  />
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
              <NavigationLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <SheetFooter className="mt-auto">
                <Separator className="bg-white/12" />
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={signOut}
                  disabled={signingOut}
                >
                  <LogOut data-icon="inline-start" />
                  {signingOut ? "Saindo…" : "Sair do sistema"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
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
