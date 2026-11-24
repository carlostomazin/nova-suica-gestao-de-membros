"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import useSWR, { useSWRConfig } from "swr"
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { jsonFetcher } from "@/lib/members/api-types"
import type { Member, MemberStatus } from "@/lib/members/types"

type MemberFormDialogProps = {
  open: boolean
  member: Member | null
  onOpenChange: (open: boolean) => void
}

type CongregationsResponse = { congregations: string[] }
type ApiError = { error?: string }

export function MemberFormDialog({ open, member, onOpenChange }: MemberFormDialogProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()
  const { data: congregationData } = useSWR<CongregationsResponse>("/api/members?congregations=1", jsonFetcher)
  const congregations = [...new Set([...(congregationData?.congregations ?? []), ...(member?.congregation ? [member.congregation] : [])])]
  const [name, setName] = useState("")
  const [status, setStatus] = useState<MemberStatus>("active")
  const [congregation, setCongregation] = useState("Nova Suíça")
  const [useCustomCongregation, setUseCustomCongregation] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialCongregation = member?.congregation ?? "Nova Suíça"
    setName(member?.name ?? "")
    setStatus(member?.status ?? "active")
    setCongregation(initialCongregation)
    setUseCustomCongregation(false)
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
    formData.set("congregation", congregation.trim())
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

  const customSelectValue = useCustomCongregation ? "__custom__" : congregation
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{member ? "Editar membro" : "Cadastrar membro"}</DialogTitle>
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
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                autoComplete="name"
                placeholder="Ex.: Ana Maria da Silva"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="member-status">Situação</FieldLabel>
              <Select value={status} onValueChange={(value) => value && setStatus(value as MemberStatus)}>
                <SelectTrigger id="member-status" className="w-full">
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="not_revalidated">Não revalidado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="member-congregation-select">Congregação</FieldLabel>
              <Select
                value={customSelectValue}
                onValueChange={(value) => {
                  if (value === "__custom__") {
                    setUseCustomCongregation(true)
                    setCongregation("")
                  } else if (value) {
                    setUseCustomCongregation(false)
                    setCongregation(value)
                  }
                }}
              >
                <SelectTrigger id="member-congregation-select" className="w-full">
                  <SelectValue placeholder="Selecione uma congregação" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {congregations.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    <SelectItem value="__custom__">Adicionar outra congregação…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {useCustomCongregation ? (
                <Input
                  id="member-custom-congregation"
                  aria-label="Nome da nova congregação"
                  value={congregation}
                  onChange={(event) => setCongregation(event.target.value)}
                  maxLength={120}
                  placeholder="Digite o nome da congregação"
                  required
                />
              ) : null}
              <FieldDescription>Escolha uma congregação existente ou adicione uma nova.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Foto do perfil</FieldLabel>
              <div className="flex items-center gap-4 rounded-xl border border-dashed p-4">
                <Avatar className="size-16 shrink-0">
                  {photoPreview ? <AvatarImage src={photoPreview} alt={name ? `Foto de ${name}` : "Prévia da foto do membro"} /> : null}
                  <AvatarFallback className="bg-muted text-sm font-medium">{initials || "NS"}</AvatarFallback>
                </Avatar>
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
            <Button type="submit" disabled={pending || !congregation.trim()}>
              {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
              {member ? "Salvar alterações" : "Cadastrar membro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
