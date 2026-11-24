"use client"

import { useRef, useState, type DragEvent } from "react"
import useSWR, { useSWRConfig } from "swr"
import { AlertCircle, Check, FileSpreadsheet, ImageOff, LoaderCircle, Upload, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { jsonFetcher } from "@/lib/members/api-types"
import type { ImportPreview, ImportResult, ImportPreviewRow } from "@/lib/members/import-types"
import { MEMBER_STATUS_LABELS } from "@/lib/members/types"

type ImportMembersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ApiError = { error?: string }
type ImportMode = "ignore" | "update"

function matchLabel(row: ImportPreviewRow) {
  if (row.match === "existing_code") return "Código existente"
  if (row.match === "possible_name") return "Revisar duplicidade"
  if (row.match === "duplicate_file") return "Repetido na planilha"
  return "Novo cadastro"
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function ImportMembersDialog({ open, onOpenChange }: ImportMembersDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<ImportMode>("ignore")
  const [acknowledgeUnknownStatus, setAcknowledgeUnknownStatus] = useState(false)
  const [pending, setPending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [finished, setFinished] = useState<ImportResult | null>(null)

  function reset() {
    setFile(null)
    setPreview(null)
    setDuplicateMode("ignore")
    setAcknowledgeUnknownStatus(false)
    setPending(false)
    setFinished(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function chooseFile(nextFile?: File) {
    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Selecione uma planilha do Excel no formato .xlsx.")
      return
    }
    if (nextFile.size > 15 * 1024 * 1024) {
      toast.error("A planilha deve ter no máximo 15 MB.")
      return
    }
    setFile(nextFile)
    setPreview(null)
    setFinished(null)
    setAcknowledgeUnknownStatus(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  async function analyzeFile() {
    if (!file) return
    setPending(true)
    const formData = new FormData()
    formData.set("file", file)

    try {
      const response = await fetch("/api/members/import/preview", { method: "POST", body: formData })
      const body = (await response.json()) as ImportPreview & ApiError
      if (!response.ok) throw new Error(body.error || "Não foi possível analisar a planilha.")
      setPreview(body)
      setDuplicateMode("ignore")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível analisar a planilha.")
    } finally {
      setPending(false)
    }
  }

  async function commitImport() {
    if (!file || !preview) return
    setPending(true)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("duplicateMode", duplicateMode)
    formData.set("acknowledgeUnknownStatus", String(acknowledgeUnknownStatus))

    try {
      const response = await fetch("/api/members/import/commit", { method: "POST", body: formData })
      const body = (await response.json()) as ImportResult & ApiError
      if (!response.ok) throw new Error(body.error || "Não foi possível importar os registros.")
      setFinished(body)
      await mutate((key) => typeof key === "string" && key.startsWith("/api/members"))
      toast.success("Importação concluída.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os registros.")
    } finally {
      setPending(false)
    }
  }

  const canImport = Boolean(preview && (preview.newCount > 0 || (preview.duplicateCodeCount > 0 && duplicateMode === "update")))
  const needsStatusAcknowledgement = Boolean(preview?.statusReviewCount && !acknowledgeUnknownStatus)

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar membros</DialogTitle>
          <DialogDescription>
            Analise o arquivo primeiro. Nenhum cadastro será alterado até você confirmar a importação.
          </DialogDescription>
        </DialogHeader>

        {finished ? (
          <div className="flex flex-col gap-5 py-3">
            <Alert>
              <Check aria-hidden="true" />
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription>
                {finished.created} novos, {finished.updated} atualizados, {finished.skippedExisting + finished.skippedPossibleDuplicates + finished.skippedRepeatedRows} ignorados e {finished.failed} com falha.
              </AlertDescription>
            </Alert>
            {finished.photoFailures > 0 ? (
              <Alert>
                <ImageOff aria-hidden="true" />
                <AlertTitle>Algumas fotos não foram importadas</AlertTitle>
                <AlertDescription>{finished.photoFailures} imagem(ns) não puderam ser associadas ou salvas. Os demais cadastros foram mantidos.</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button onClick={() => changeOpen(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {!preview ? (
              <div className="flex flex-col gap-4">
                <input
                  ref={inputRef}
                  id="members-import-file"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  aria-label="Selecionar planilha Excel"
                />
                <label
                  htmlFor="members-import-file"
                  onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring",
                    dragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Upload aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Arraste a planilha para cá ou clique para selecionar</span>
                    <span className="text-xs text-muted-foreground">Excel .xlsx · até 15 MB</span>
                  </span>
                </label>

                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileSpreadsheet className="shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={analyzeFile} disabled={pending}>
                      {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
                      Analisar planilha
                    </Button>
                  </div>
                ) : null}

                <Alert>
                  <UsersRound aria-hidden="true" />
                  <AlertTitle>Colunas esperadas</AlertTitle>
                  <AlertDescription>
                    Código, Nome, Situação e Congregação. A coluna Foto é opcional; serão aceitas imagens incorporadas quando a planilha permitir associá-las a uma linha.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileSpreadsheet className="shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{file?.name}</p>
                      <p className="text-xs text-muted-foreground">Aba: {preview.sheetName} · {preview.rowCount} linha(s) com nome</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setPreview(null); setFinished(null) }}>
                    Escolher outro arquivo
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <SummaryCard label="Novos" value={preview.newCount} tone="green" />
                  <SummaryCard label="Código já cadastrado" value={preview.duplicateCodeCount} tone="blue" />
                  <SummaryCard label="Possível duplicidade" value={preview.possibleDuplicateCount} tone="amber" />
                  <SummaryCard label="Status para revisar" value={preview.statusReviewCount} tone="amber" />
                </div>

                {preview.duplicateCodeCount > 0 ? (
                  <FieldSet className="rounded-xl border p-4">
                    <FieldLegend variant="label">Registros com código já cadastrado</FieldLegend>
                    <FieldGroup className="gap-2">
                      <p className="text-sm text-muted-foreground">Escolha se esses cadastros devem ser ignorados ou atualizados pelo código original.</p>
                      <ToggleGroup
                        value={[duplicateMode]}
                        onValueChange={(value) => {
                          const selected = Array.isArray(value) ? value[0] : value
                          if (selected === "ignore" || selected === "update") setDuplicateMode(selected)
                        }}
                        aria-label="Como tratar códigos existentes"
                        className="flex-wrap"
                      >
                        <ToggleGroupItem value="ignore" variant="outline" aria-label="Ignorar duplicados por código">
                          Ignorar existentes
                        </ToggleGroupItem>
                        <ToggleGroupItem value="update" variant="outline" aria-label="Atualizar duplicados por código">
                          Atualizar pelo código
                        </ToggleGroupItem>
                      </ToggleGroup>
                      {duplicateMode === "update" ? (
                        <p className="text-xs text-muted-foreground">Nome, situação, congregação e foto serão atualizados quando o código coincidir.</p>
                      ) : null}
                    </FieldGroup>
                  </FieldSet>
                ) : null}

                {preview.statusReviewCount > 0 ? (
                  <FieldSet className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <FieldLegend variant="label">Confirmação necessária</FieldLegend>
                    <FieldGroup className="gap-2">
                      <p className="text-sm text-muted-foreground">{preview.statusReviewCount} linha(s) têm uma situação desconhecida. Se confirmadas, serão importadas como Ativo.</p>
                      <Field orientation="horizontal" className="items-start">
                        <Checkbox
                          id="acknowledge-unknown-status"
                          checked={acknowledgeUnknownStatus}
                          onCheckedChange={(checked) => setAcknowledgeUnknownStatus(checked === true)}
                        />
                        <FieldLabel htmlFor="acknowledge-unknown-status" className="text-sm font-normal">
                          Revisei e aceito importar essas linhas como Ativo.
                        </FieldLabel>
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                ) : null}

                {preview.possibleDuplicateCount > 0 ? (
                  <Alert>
                    <AlertCircle aria-hidden="true" />
                    <AlertTitle>Possíveis duplicidades sem código</AlertTitle>
                    <AlertDescription>
                      Esses nomes serão ignorados para evitar sobrescrever registros sem uma chave confiável. Confira-os manualmente depois da importação.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {preview.embeddedImages > 0 && preview.imageAssociationFailures > 0 ? (
                  <Alert>
                    <ImageOff aria-hidden="true" />
                    <AlertTitle>Algumas imagens não puderam ser associadas</AlertTitle>
                    <AlertDescription>
                      {preview.matchedImages} de {preview.embeddedImages} imagens incorporadas foram reconhecidas. As demais serão ignoradas; a importação dos cadastros continua normalmente.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="max-h-64 overflow-auto rounded-xl border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row) => (
                        <TableRow key={`${row.sourceRow}-${row.externalCode ?? row.name}`}>
                          <TableCell className="text-muted-foreground">{row.sourceRow}</TableCell>
                          <TableCell className="max-w-52 truncate font-medium">{row.name}</TableCell>
                          <TableCell>{row.externalCode || "—"}</TableCell>
                          <TableCell>
                            {row.statusNeedsReview ? (
                              <span className="text-xs font-medium text-amber-800">Revisar: {row.rawStatus || "vazio"}</span>
                            ) : MEMBER_STATUS_LABELS[row.status]}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-xs font-medium",
                              row.match === "new" ? "text-emerald-700" : row.match === "existing_code" ? "text-primary" : "text-amber-800",
                            )}>
                              {matchLabel(row)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {preview.truncated ? <p className="text-xs text-muted-foreground">Prévia limitada às primeiras 200 linhas; os totais consideram a planilha completa.</p> : null}
                {preview.ignoredRows > 0 ? <p className="text-xs text-muted-foreground">{preview.ignoredRows} linha(s) sem nome serão ignoradas.</p> : null}
              </>
            )}
          </div>
        )}

        {!finished ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            {preview ? (
              <Button type="button" onClick={commitImport} disabled={pending || !canImport || needsStatusAcknowledgement}>
                {pending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                Confirmar importação
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "amber" }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-slate-200 bg-slate-50 text-slate-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  }

  return (
    <div className={`flex min-h-24 flex-col justify-between rounded-xl border p-3.5 ${tones[tone]}`}>
      <span className="text-xs font-medium leading-snug">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  )
}
