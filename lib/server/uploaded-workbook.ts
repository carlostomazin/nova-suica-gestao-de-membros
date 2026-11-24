import "server-only"

const maxWorkbookSize = 15 * 1024 * 1024

export function getWorkbookFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string" || value.size === 0) {
    return { file: null, error: "Selecione uma planilha .xlsx para continuar." } as const
  }

  if (!value.name.toLowerCase().endsWith(".xlsx")) {
    return { file: null, error: "O arquivo precisa estar no formato Excel .xlsx." } as const
  }

  if (value.size > maxWorkbookSize) {
    return { file: null, error: "A planilha deve ter no máximo 15 MB." } as const
  }

  return { file: value as File, error: null } as const
}
