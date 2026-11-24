"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSWRConfig } from "swr"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ImagePlus, LoaderCircle, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MEMBER_STATUS_LABELS, type Member, type MemberStatus } from "@/lib/members/types"

type MemberFormDialogProps = {
  open: boolean
  member: Member | null
  onOpenChange: (open: boolean) => void
}

type ApiError = { error?: string }

const memberStatusOptions: { value: MemberStatus; label: string }[] = [
  { value: "active", label: MEMBER_STATUS_LABELS.active },
  { value: "inactive", label: MEMBER_STATUS_LABELS.inactive },
  { value: "not_revalidated", label: MEMBER_STATUS_LABELS.not_revalidated },
]

export function MemberFormDialog({ open, member, onOpenChange }: MemberFormDialogProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const dialogTitleRef = useRef<HTMLHeadingElement>(null)
  const { mutate } = useSWRConfig()
  const [name, setName] = useState("")
  const [status, setStatus] = useState<MemberStatus>("active")
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhotoViewerOpen(false)
      return
    }
    setName((member?.name ?? "").toLocaleUpperCase("pt-BR"))
    setStatus(member?.status ?? "active")
    setPhoto(null)
    setRemovePhoto(false)
    setPhotoPreview(member?.photoUrl ?? null)
  }, [open, member])

  useEffect(() => {
    if (!photo) return
    const objectUrl = URL.createObjectURL(photo)
    setPhotoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  function handlePhotoSelection(file?: File) {
    if (!file) return
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      toast.error("Escolha uma foto JPG, PNG ou WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5 MB.")
      return
    }
    setPhoto(file)
    setRemovePhoto(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    const formData = new FormData()
    formData.set("name", name.trim())
    formData.set("status", status)
    formData.set("congregation", member?.congregation?.trim() || "Nova Suíça")
    if (photo) formData.set("photo", photo)
    if (removePhoto) formData.set("removePhoto", "true")

    try {
      const response = await fetch(member ? `/api/members/${member.id}` : "/api/members", {
        method: member ? "PATCH" : "POST",
        body: formData,
      })
      const body = (await response.json().catch(() => null)) as ApiError | null
      if (!response.ok) throw new Error(body?.error || "Não foi possível salvar o cadastro.")

      await mutate((key) => typeof key === "string" && key.startsWith("/api/members"))
      toast.success(member ? "Cadastro atualizado." : "Membro cadastrado.")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cadastro.")
    } finally {
      setPending(false)
    }
  }

  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        initialFocus={dialogTitleRef}
      >
        <DialogHeader>
          <DialogTitle ref={dialogTitleRef} tabIndex={-1}>{member ? "Editar membro" : "Cadastrar membro"}</DialogTitle>
          <DialogDescription>
            {member ? "Atualize os dados do cadastro. O código original será preservado." : "Preencha os dados principais para adicionar uma pessoa à Nova Suíça."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="member-name">Nome completo</FieldLabel>
              <Input
                id="member-name"
                value={name}
                onChange={(event) => setName(event.target.value.toLocaleUpperCase("pt-BR"))}
                maxLength={160}
                autoComplete="name"
                placeholder="Ex.: ANA MARIA DA SILVA"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="member-status">Situação</FieldLabel>
              <Select items={memberStatusOptions} value={status} onValueChange={(value) => value && setStatus(value as MemberStatus)}>
                <SelectTrigger id="member-status" className="w-full">
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {memberStatusOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Foto do perfil</FieldLabel>
              <div className="flex items-center gap-4 rounded-xl border border-dashed p-4">
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={() => setPhotoViewerOpen(true)}
                    className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={name ? `Ver foto de ${name}` : "Ver foto do membro"}
                    title="Ver foto"
                  >
                    <Avatar className="size-16 cursor-pointer">
                      <AvatarImage src={photoPreview} alt={name ? `Foto de ${name}` : "Prévia da foto do membro"} />
                      <AvatarFallback className="bg-muted text-sm font-medium">{initials || "NS"}</AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                  <Avatar className="size-16 shrink-0">
                    <AvatarFallback className="bg-muted text-sm font-medium">{initials || "NS"}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex min-w-0 flex-col gap-2">
                  <input
                    ref={photoInputRef}
                    id="member-photo"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handlePhotoSelection(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                      <ImagePlus data-icon="inline-start" />
                      {photoPreview ? "Trocar foto" : "Adicionar foto"}
                    </Button>
                    {photoPreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPhoto(null)
                          setPhotoPreview(null)
                          setRemovePhoto(Boolean(member?.photoUrl))
                          if (photoInputRef.current) photoInputRef.current.value = ""
                        }}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
              {member ? "Salvar alterações" : "Cadastrar membro"}
            </Button>
          </DialogFooter>
        </form>

        <Dialog open={photoViewerOpen && Boolean(photoPreview)} onOpenChange={setPhotoViewerOpen}>
          <DialogPortal>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[60] bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setPhotoViewerOpen(false)
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) setPhotoViewerOpen(false)
              }}
            />
            <DialogPrimitive.Popup
              data-slot="dialog-content"
              className="fixed top-1/2 left-1/2 z-[60] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-2 overflow-hidden rounded-xl bg-popover p-2 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-3xl sm:p-3 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <DialogHeader className="sr-only">
                <DialogTitle>Foto do membro</DialogTitle>
                <DialogDescription>{name ? `Foto de ${name}` : "Prévia da foto do membro"}</DialogDescription>
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
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={name ? `Foto de ${name}` : "Prévia da foto do membro"}
                  className="max-h-[80vh] w-full rounded-lg bg-muted/30 object-contain"
                />
              ) : null}
            </DialogPrimitive.Popup>
          </DialogPortal>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
