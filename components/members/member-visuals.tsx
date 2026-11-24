"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { MEMBER_STATUS_LABELS, type MemberStatus } from "@/lib/members/types"

export function MemberAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string
  photoUrl: string | null
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("")

  return (
    <Avatar className={className}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${name}`} /> : null}
      <AvatarFallback>{initials || "NS"}</AvatarFallback>
    </Avatar>
  )
}

const statusStyles: Record<MemberStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-red-200 bg-red-50 text-red-700",
  not_revalidated: "border-amber-200 bg-amber-50 text-amber-800",
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      <span
        aria-hidden="true"
        className={cn(
          "mr-1.5 size-1.5 rounded-full",
          status === "active" ? "bg-emerald-600" : status === "inactive" ? "bg-red-600" : "bg-amber-600",
        )}
      />
      {MEMBER_STATUS_LABELS[status]}
    </Badge>
  )
}
