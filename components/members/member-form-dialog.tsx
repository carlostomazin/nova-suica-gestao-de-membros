"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSWRConfig } from "swr"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Camera, CircleCheck, ImagePlus, LoaderCircle, MapPin, Trash2, UserRound, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { MEMBER_STATUS_LABELS, type Member, type MemberStatus } from "@/lib/members/types"

type MemberFormDialogProps = {
  open: boolean
  member: Member | null
  onOpenChange: (open: boolean) => void
}

type ApiError = { error?: string }

type BrazilState = { uf: string; name: string }

const BRAZIL_STATES: BrazilState[] = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
]

function getStateByUf(uf?: string | null) {
  if (!uf) return null
  const normalized = uf.trim().toUpperCase()
  return BRAZIL_STATES.find((item) => item.uf === normalized) ?? null
}

function getStateByName(name?: string | null) {
  if (!name) return null
  const normalized = name.trim().toLocaleLowerCase("pt-BR")
  return (
    BRAZIL_STATES.find((item) => item.name.toLocaleLowerCase("pt-BR") === normalized) ??
    getStateByUf(name)
  )
}

const memberStatusOptions: { value: MemberStatus; label: string }[] = [
  { value: "active", label: MEMBER_STATUS_LABELS.active },
  { value: "inactive", label: MEMBER_STATUS_LABELS.inactive },
  { value: "not_revalidated", label: MEMBER_STATUS_LABELS.not_revalidated },
]

const memberStatusAccent: Record<MemberStatus, string> = {
  active: "accent-emerald-600",
  inactive: "accent-red-600",
  not_revalidated: "accent-amber-500",
}

export function MemberFormDialog({ open, member, onOpenChange }: MemberFormDialogProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const dialogTitleRef = useRef<HTMLHeadingElement>(null)
  const { mutate } = useSWRConfig()
  const { contains } = BaseCombobox.useFilter({ locale: "pt-BR" })
  const [name, setName] = useState("")
  const [status, setStatus] = useState<MemberStatus>("active")
  const [phone, setPhone] = useState("")
  const [cep, setCep] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [complement, setComplement] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [pending, setPending] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepLookupStatus, setCepLookupStatus] = useState<"idle" | "success" | "not_found">("idle")
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const lastCepLookup = useRef("")
  const lastSuccessfulCep = useRef("")
  const lastNotFoundCep = useRef("")
  const citiesCache = useRef<Record<string, string[]>>({})
  const cityRequestId = useRef(0)

  function normalizeStateValue(value?: string | null) {
    const state = getStateByName(value)
    return state?.name ?? value?.trim() ?? ""
  }

  async function loadCitiesForStateName(stateName: string, options?: { preferredCity?: string }) {
    const stateInfo = getStateByName(stateName)
    if (!stateInfo) {
      cityRequestId.current += 1
      setCities([])
      setCitiesLoading(false)
      return [] as string[]
    }

    const requestId = ++cityRequestId.current
    const cached = citiesCache.current[stateInfo.uf]
    if (cached) {
      let nextCities = cached
      const preferredCity = options?.preferredCity?.trim()
      if (preferredCity && !nextCities.includes(preferredCity)) {
        nextCities = [preferredCity, ...nextCities]
      }
      setCities(nextCities)
      setCitiesLoading(false)
      return nextCities
    }

    setCitiesLoading(true)
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateInfo.uf}/municipios?orderBy=nome`,
      )
      if (!response.ok) throw new Error("Falha ao carregar munic?pios.")
      const data = (await response.json()) as Array<{ nome: string }>
      let list = data.map((item) => item.nome).filter(Boolean)
      citiesCache.current[stateInfo.uf] = list
      const preferredCity = options?.preferredCity?.trim()
      if (preferredCity && !list.includes(preferredCity)) {
        list = [preferredCity, ...list]
      }
      if (cityRequestId.current === requestId) {
        setCities(list)
      }
      return list
    } catch {
      if (cityRequestId.current === requestId) {
        const preferredCity = options?.preferredCity?.trim()
        setCities(preferredCity ? [preferredCity] : [])
      }
      return options?.preferredCity ? [options.preferredCity] : []
    } finally {
      if (cityRequestId.current === requestId) {
        setCitiesLoading(false)
      }
    }
  }

  function handleStateSelection(nextState: string) {
    setState(nextState)
    setCity("")
    if (nextState) {
      void loadCitiesForStateName(nextState)
    } else {
      cityRequestId.current += 1
      setCities([])
      setCitiesLoading(false)
    }
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (!digits) return ""
    if (digits.length <= 2) return `(${digits}`
    const area = digits.slice(0, 2)
    const rest = digits.slice(2)
    if (rest.length <= 4) return `(${area}) ${rest}`
    if (digits.length <= 10) return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`
    return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
  }

  async function lookupCep(rawCep: string) {
    const digits = rawCep.replace(/\D/g, "")
    if (digits.length !== 8) return
    if (digits === lastCepLookup.current) {
      if (digits === lastSuccessfulCep.current) setCepLookupStatus("success")
      else if (digits === lastNotFoundCep.current) setCepLookupStatus("not_found")
      return
    }
    lastCepLookup.current = digits
    setCepLookupStatus("idle")
    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!response.ok) throw new Error("Falha ao consultar CEP.")
      const data = (await response.json()) as {
        erro?: boolean
        logradouro?: string
        bairro?: string
        localidade?: string
        uf?: string
      }
      if (data.erro) {
        lastSuccessfulCep.current = ""
        lastNotFoundCep.current = digits
        setCepLookupStatus("not_found")
        return
      }

      setStreet((prev) => prev || data.logradouro || "")
      setNeighborhood((prev) => prev || data.bairro || "")

      const foundState = getStateByUf(data.uf)
      const nextState = foundState?.name ?? (data.uf || "")
      const nextCity = data.localidade?.trim() || ""
      if (nextState) {
        setState(nextState)
        await loadCitiesForStateName(nextState, { preferredCity: nextCity || undefined })
      } else {
        cityRequestId.current += 1
        setCities(nextCity ? [nextCity] : [])
        setCitiesLoading(false)
        setState("")
      }
      setCity(nextCity)

      lastSuccessfulCep.current = digits
      lastNotFoundCep.current = ""
      setCepLookupStatus("success")
    } catch {
      lastSuccessfulCep.current = ""
      lastNotFoundCep.current = ""
      setCepLookupStatus("idle")
      toast.error("N?o foi poss?vel buscar o endere?o pelo CEP.")
    } finally {
      setCepLoading(false)
    }
  }

  function attachCameraStream(video: HTMLVideoElement | null) {
    if (!video || !streamRef.current) return
    video.srcObject = streamRef.current
    void video.play().catch(() => undefined)
  }

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function startCameraStream() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("UNSUPPORTED")
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    })
    streamRef.current = stream
    attachCameraStream(videoRef.current)
    return stream
  }

  async function handleOpenCamera() {
    if (cameraStarting) return
    const isComputer =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches

    if (!isComputer) {
      cameraInputRef.current?.click()
      return
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }

    setCameraStarting(true)
    stopCameraStream()
    try {
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          if (permission.state === "denied") {
            toast.error(
              "O acesso à câmera está bloqueado para este site. Clique no ícone de cadeado/configurações ao lado do endereço, permita a câmera e recarregue a página.",
            )
            return
          }
        } catch {
          // Alguns navegadores não suportam consultar a permissão de câmera; segue com getUserMedia.
        }
      }

      await startCameraStream()
      setCameraOpen(true)
    } catch (error) {
      if (error instanceof Error && error.message === "UNSUPPORTED") {
        cameraInputRef.current?.click()
        return
      }
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || error.name === "SecurityError")
      toast.error(
        denied
          ? "O navegador bloqueou o acesso à câmera. Verifique se o site tem permissão para usar a câmera, se a página está em HTTPS e tente novamente."
          : "Não foi possível acessar a webcam.",
      )
    } finally {
      setCameraStarting(false)
    }
  }

  async function handleCapturePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error("A câmera ainda não está pronta.")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      toast.error("Não foi possível capturar a foto.")
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    if (!blob) {
      toast.error("Não foi possível capturar a foto.")
      return
    }

    const file = new File([blob], `foto-membro-${Date.now()}.jpg`, { type: "image/jpeg" })
    handlePhotoSelection(file)
    setCameraOpen(false)
  }

  useEffect(() => {
    if (!cameraOpen) stopCameraStream()
  }, [cameraOpen])

  useEffect(() => {
    if (!open) {
      setPhotoViewerOpen(false)
      setCameraOpen(false)
      stopCameraStream()
      cityRequestId.current += 1
      setCities([])
      setCitiesLoading(false)
      return
    }
    setName((member?.name ?? "").toLocaleUpperCase("pt-BR"))
    setStatus(member?.status ?? "active")
    setPhone(member?.phone ? formatPhone(member.phone) : "")
    setCep(member?.cep ? formatCep(member.cep) : "")
    setStreet(member?.street ?? "")
    setNumber(member?.number ?? "")
    setNeighborhood(member?.neighborhood ?? "")
    setComplement(member?.complement ?? "")
    const nextState = normalizeStateValue(member?.state)
    const nextCity = member?.city ?? ""
    setCity(nextCity)
    setState(nextState)
    setPhoto(null)
    setRemovePhoto(false)
    setPhotoPreview(member?.photoUrl ?? null)
    lastCepLookup.current = ""
    lastSuccessfulCep.current = ""
    lastNotFoundCep.current = ""
    setCepLookupStatus("idle")
    if (nextState) {
      void loadCitiesForStateName(nextState, { preferredCity: nextCity || undefined })
    } else {
      cityRequestId.current += 1
      setCities([])
      setCitiesLoading(false)
    }
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
    formData.set("phone", phone.trim())
    formData.set("cep", cep.trim())
    formData.set("street", street.trim())
    formData.set("number", number.trim())
    formData.set("neighborhood", neighborhood.trim())
    formData.set("complement", complement.trim())
    formData.set("city", city.trim())
    formData.set("state", state.trim())
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            {photoPreview ? (
              <button
                type="button"
                onClick={() => setPhotoViewerOpen(true)}
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={name ? `Ver foto de ${name}` : "Ver foto"}
                title="Ver foto"
              >
                <Avatar className="size-24 cursor-pointer">
                  <AvatarImage src={photoPreview} alt={name ? `Foto de ${name}` : "Prévia da foto"} />
                  <AvatarFallback className="bg-muted text-lg font-medium">{initials || "NS"}</AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <Avatar className="size-24 shrink-0">
                <AvatarFallback className="bg-muted text-lg font-medium">{initials || "NS"}</AvatarFallback>
              </Avatar>
            )}
            <input
              ref={cameraInputRef}
              id="member-photo-camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(event) => {
                handlePhotoSelection(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <input
              ref={galleryInputRef}
              id="member-photo-gallery"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                handlePhotoSelection(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void handleOpenCamera()} disabled={cameraStarting}>
                {cameraStarting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Camera data-icon="inline-start" />}
                Tirar foto
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()}>
                <ImagePlus data-icon="inline-start" />
                Enviar do dispositivo
              </Button>
              {photoPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setPhoto(null)
                    setPhotoPreview(null)
                    setRemovePhoto(Boolean(member?.photoUrl))
                    if (cameraInputRef.current) cameraInputRef.current.value = ""
                    if (galleryInputRef.current) galleryInputRef.current.value = ""
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Remover
                </Button>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound aria-hidden="true" className="size-4" />
              Dados pessoais
            </h3>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="member-name">Nome completo *</FieldLabel>
                <Input
                  id="member-name"
                  value={name}
                  onChange={(event) => setName(event.target.value.toLocaleUpperCase("pt-BR"))}
                  maxLength={160}
                  autoComplete="name"
                  placeholder="Ex.: LUCAS ALMEIDA SILVA"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-phone">Telefone</FieldLabel>
                <Input
                  id="member-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="numeric"
                  placeholder="(19) 99999-0000"
                />
              </Field>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Situação</FieldLegend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {memberStatusOptions.map(({ value, label }) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-normal text-foreground">
                      <input
                        type="radio"
                        name="member-status"
                        value={value}
                        checked={status === value}
                        onChange={() => setStatus(value)}
                        className={`size-4 ${memberStatusAccent[value]}`}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </FieldSet>
            </FieldGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin aria-hidden="true" className="size-4" />
              Endereço
            </h3>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="member-cep">CEP</FieldLabel>
                <Input
                  id="member-cep"
                  value={cep}
                  onChange={(event) => {
                    const formatted = formatCep(event.target.value)
                    const digits = formatted.replace(/\D/g, "")
                    setCep(formatted)
                    if (digits.length === 8 && digits === lastSuccessfulCep.current) {
                      setCepLookupStatus("success")
                    } else if (digits.length === 8 && digits === lastNotFoundCep.current) {
                      setCepLookupStatus("not_found")
                    } else {
                      setCepLookupStatus("idle")
                    }
                    if (digits.length === 8) void lookupCep(formatted)
                  }}
                  onBlur={() => void lookupCep(cep)}
                  maxLength={9}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="13480-000"
                />
                {cepLookupStatus === "success" ? (
                  <p className="-mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CircleCheck aria-hidden="true" className="size-3.5" />
                    Endereço localizado com sucesso.
                  </p>
                ) : cepLookupStatus === "not_found" ? (
                  <p className="-mt-1.5 text-xs text-destructive">CEP não encontrado</p>
                ) : (
                  <p className="-mt-1.5 text-xs text-muted-foreground">Preenchimento automático do endereço pelo CEP</p>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
                <Field>
                  <FieldLabel htmlFor="member-street">Logradouro</FieldLabel>
                  <Input
                    id="member-street"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    maxLength={160}
                    autoComplete="address-line1"
                    placeholder="Rua, avenida..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-number">Número</FieldLabel>
                  <Input
                    id="member-number"
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                    maxLength={30}
                    placeholder="125"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-neighborhood">Bairro</FieldLabel>
                  <Input
                    id="member-neighborhood"
                    value={neighborhood}
                    onChange={(event) => setNeighborhood(event.target.value)}
                    maxLength={120}
                    placeholder="Bairro"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-complement">Complemento</FieldLabel>
                  <Input
                    id="member-complement"
                    value={complement}
                    onChange={(event) => setComplement(event.target.value)}
                    maxLength={120}
                    placeholder="Casa, apartamento..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="member-state">Estado</FieldLabel>
                  <Combobox
                    items={BRAZIL_STATES.map((option) => option.name)}
                    value={state || null}
                    onValueChange={(value) => {
                      if (typeof value === "string") handleStateSelection(value)
                      else handleStateSelection("")
                    }}
                    filter={contains}
                    autoHighlight
                  >
                    <ComboboxInputGroup>
                      <ComboboxInput id="member-state" placeholder="Selecione o estado" autoComplete="address-level1" />
                      <ComboboxTrigger aria-label="Abrir lista de estados" />
                    </ComboboxInputGroup>
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhum estado encontrado.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-city">Cidade</FieldLabel>
                  <Combobox
                    key={state || "no-state"}
                    items={cities}
                    value={city || null}
                    onValueChange={(value) => setCity(typeof value === "string" ? value : "")}
                    filter={contains}
                    autoHighlight
                    disabled={!state || citiesLoading}
                  >
                    <ComboboxInputGroup>
                      <ComboboxInput
                        id="member-city"
                        placeholder={
                          !state
                            ? "Selecione o estado primeiro"
                            : citiesLoading
                              ? "Carregando cidades..."
                              : "Selecione a cidade"
                        }
                        autoComplete="address-level2"
                      />
                      <ComboboxTrigger aria-label="Abrir lista de cidades" />
                    </ComboboxInputGroup>
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhuma cidade encontrada.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </Field>
              </div>
            </FieldGroup>
          </div>

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

        <Dialog open={cameraOpen} onOpenChange={(nextOpen) => setCameraOpen(nextOpen)}>
          <DialogPortal>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[60] bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setCameraOpen(false)
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) setCameraOpen(false)
              }}
            />
            <DialogPrimitive.Popup
              data-slot="dialog-content"
              className="fixed top-1/2 left-1/2 z-[60] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-3 overflow-hidden rounded-xl bg-popover p-3 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <DialogHeader>
                <DialogTitle>Tirar foto</DialogTitle>
                <DialogDescription>Posicione o rosto no enquadramento e capture a imagem.</DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg bg-black">
                <video
                  ref={(node) => {
                    videoRef.current = node
                    attachCameraStream(node)
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-[4/3] max-h-[60vh] w-full object-cover"
                />
              </div>
              <DialogFooter className="sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setCameraOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void handleCapturePhoto()} disabled={cameraStarting}>
                  {cameraStarting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Camera data-icon="inline-start" />}
                  Capturar
                </Button>
              </DialogFooter>
            </DialogPrimitive.Popup>
          </DialogPortal>
        </Dialog>

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
                <DialogTitle>Foto</DialogTitle>
                <DialogDescription>{name ? `Foto de ${name}` : "Prévia da foto"}</DialogDescription>
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
                  alt={name ? `Foto de ${name}` : "Prévia da foto"}
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
