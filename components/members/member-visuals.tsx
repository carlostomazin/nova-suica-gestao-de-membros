"use client"

import { useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogPortal, DialogTitle } from "@/components/ui/dialog"
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
  const [viewerOpen, setViewerOpen] = useState(false)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("")

  const avatar = (
    <Avatar className={className}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={`Foto de ${name}`} /> : null}
      <AvatarFallback>{initials || "NS"}</AvatarFallback>
    </Avatar>
  )

  if (!photoUrl) return avatar

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Ver foto de ${name}`}
        title="Ver foto"
      >
        <span className="block cursor-pointer">{avatar}</span>
      </button>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogPortal>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[60] bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setViewerOpen(false)
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setViewerOpen(false)
            }}
          />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-[60] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-2 overflow-hidden rounded-xl bg-popover p-2 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-3xl sm:p-3 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Foto do membro</DialogTitle>
              <DialogDescription>{`Foto de ${name}`}</DialogDescription>
            </DialogHeader>
            <DialogClose
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-3 right-3 z-10 bg-background/95 text-foreground shadow-md ring-1 ring-foreground/10 hover:bg-background"
                />
              }
            >
              <X />
              <span className="sr-only">Fechar</span>
            </DialogClose>
            <img
              src={photoUrl}
              alt={`Foto de ${name}`}
              className="max-h-[80vh] w-full rounded-lg bg-muted/30 object-contain"
            />
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
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
