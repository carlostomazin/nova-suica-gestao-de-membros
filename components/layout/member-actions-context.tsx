"use client"

import { createContext, useContext } from "react"
import type { Member } from "@/lib/members/types"

export type MemberActions = {
  openCreateMember: () => void
  openEditMember: (member: Member) => void
  openImportMembers: () => void
}

export const MemberActionsContext = createContext<MemberActions | null>(null)

export function useMemberActions() {
  const actions = useContext(MemberActionsContext)
  if (!actions) throw new Error("As ações de membros precisam estar dentro do AppShell.")
  return actions
}
