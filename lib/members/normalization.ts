export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim()
}

export function cleanCellText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}
