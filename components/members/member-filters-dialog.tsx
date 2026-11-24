"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MemberPhotoFilter, MemberSortOrder, MemberStatus } from "@/lib/members/types"

type StatusFilterValue = "all" | MemberStatus

type MemberFiltersDialogProps = {
  sortOrder: MemberSortOrder
  status: StatusFilterValue
  photo: MemberPhotoFilter
  onApply: (filters: { sortOrder: MemberSortOrder; status: StatusFilterValue; photo: MemberPhotoFilter }) => void
}

const sortOptions = [
  { value: "name_asc", label: "Nome (A a Z)" },
  { value: "name_desc", label: "Nome (Z a A)" },
] satisfies Array<{ value: MemberSortOrder; label: string }>

const statusOptions = [
  { value: "all", label: "Todas as situações" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "not_revalidated", label: "Não revalidados" },
] satisfies Array<{ value: StatusFilterValue; label: string }>

const photoOptions = [
  { value: "all", label: "Todas" },
  { value: "with", label: "Com foto" },
  { value: "without", label: "Sem foto" },
] satisfies Array<{ value: MemberPhotoFilter; label: string }>

export function MemberFiltersDialog({ sortOrder, status, photo, onApply }: MemberFiltersDialogProps) {
  const [open, setOpen] = useState(false)
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder)
  const [draftStatus, setDraftStatus] = useState(status)
  const [draftPhoto, setDraftPhoto] = useState(photo)
  const hasActiveFilters = sortOrder !== "name_asc" || status !== "all" || photo !== "all"

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftSortOrder(sortOrder)
      setDraftStatus(status)
      setDraftPhoto(photo)
    }
    setOpen(nextOpen)
  }

  function applyFilters() {
    onApply({ sortOrder: draftSortOrder, status: draftStatus, photo: draftPhoto })
    setOpen(false)
  }

  function clearFilters() {
    onApply({ sortOrder: "name_asc", status: "all", photo: "all" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={hasActiveFilters ? "secondary" : "outline"}
            className="relative h-10 shrink-0 gap-2 px-3"
          />
        }
      >
        <SlidersHorizontal data-icon="inline-start" />
        <span>Filtros</span>
        {hasActiveFilters ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background"
          />
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>Escolha como ordenar e filtrar a lista de membros.</DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="member-sort-order">Ordenar por</FieldLabel>
            <Select
              items={sortOptions}
              value={draftSortOrder}
              onValueChange={(value) => value && setDraftSortOrder(value as MemberSortOrder)}
            >
              <SelectTrigger id="member-sort-order" className="w-full">
                <SelectValue placeholder="Selecione a ordenação" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="member-status-filter">Situação</FieldLabel>
            <Select
              items={statusOptions}
              value={draftStatus}
              onValueChange={(value) => value && setDraftStatus(value as StatusFilterValue)}
            >
              <SelectTrigger id="member-status-filter" className="w-full">
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="member-photo-filter">Foto</FieldLabel>
            <Select
              items={photoOptions}
              value={draftPhoto}
              onValueChange={(value) => value && setDraftPhoto(value as MemberPhotoFilter)}
            >
              <SelectTrigger id="member-photo-filter" className="w-full">
                <SelectValue placeholder="Selecione o filtro de foto" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {photoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={clearFilters}>Limpar</Button>
          <Button type="button" onClick={applyFilters}>Aplicar filtros</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
