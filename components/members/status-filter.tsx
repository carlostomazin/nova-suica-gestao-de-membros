"use client"

import { useState } from "react"
import { ChevronDown, Filter } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { FieldSet, FieldLegend } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MemberStatus } from "@/lib/members/types"

type StatusFilterValue = "all" | MemberStatus

const options: Array<{ value: StatusFilterValue; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "not_revalidated", label: "Não revalidados" },
]

export function StatusFilter({
  value,
  onChange,
  compact = false,
}: {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = options.find((option) => option.value === value)?.label ?? "Todos"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={value === "all" ? "outline" : "secondary"}
            size="sm"
            aria-label={`Filtrar por situação: ${label}`}
            className={cn(compact ? "w-full justify-between" : "gap-1.5")}
          />
        }
      >
        <Filter data-icon="inline-start" />
        {compact ? <span>Situação: {label}</span> : <span>{label === "Todos" ? "Situação" : label}</span>}
        <ChevronDown data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <FieldSet className="gap-3">
          <FieldLegend variant="label">Filtrar por situação</FieldLegend>
          <ToggleGroup
            value={[value]}
            onValueChange={(values) => {
              const next = values[0] as StatusFilterValue | undefined
              if (next) {
                onChange(next)
                setOpen(false)
              }
            }}
            aria-label="Situação dos membros"
            orientation="vertical"
            className="w-full items-stretch"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                variant="outline"
                className="w-full justify-start"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
      </PopoverContent>
    </Popover>
  )
}
