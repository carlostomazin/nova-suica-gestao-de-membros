"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMemberActions } from "@/components/layout/member-actions-context"
import { useSWRConfig } from "swr"
import type { Member } from "@/lib/members/types"

type MemberRowActionsProps = { member: Member }
type ApiError = { error?: string }

export function MemberRowActions({ member }: MemberRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const { openEditMember } = useMemberActions()
  const { mutate } = useSWRConfig()

  async function deleteMember() {
    setPending(true)
    try {
      const response = await fetch(`/api/members/${member.id}`, { method: "DELETE" })
      const body = (await response.json().catch(() => null)) as ApiError | null
      if (!response.ok) throw new Error(body?.error || "Não foi possível excluir o membro.")

      await mutate((key) => typeof key === "string" && key.startsWith("/api/members"))
      toast.success("Membro excluído.")
      setConfirmOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o membro.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${member.name}`}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openEditMember(member)}>
              <Pencil data-icon="inline-start" />
              Editar cadastro
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Excluir membro
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={(nextOpen) => { if (!pending) setConfirmOpen(nextOpen) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o cadastro e a foto armazenada. Não é possível desfazê-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void deleteMember()
              }}
            >
              {pending ? "Excluindo…" : "Excluir membro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
