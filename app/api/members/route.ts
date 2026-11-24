import { randomUUID } from "node:crypto"
import { z } from "zod"
import { normalizeText } from "@/lib/members/normalization"
import type { MemberSortOrder, MemberStatus } from "@/lib/members/types"
import { getSignedPhotoUrls, imagePayloadFromBuffer, imagePayloadFromFile, removeMemberPhotos, uploadMemberPhoto } from "@/lib/server/member-photos"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

const memberInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome completo.").max(160),
  status: z.enum(["active", "inactive", "not_revalidated"]),
  congregation: z.string().trim().min(1, "Informe a congregação.").max(120),
  phone: z.string().trim().max(40, "O telefone deve ter no máximo 40 caracteres.").transform((value) => value || null),
  cep: z.string().trim().max(20, "O CEP deve ter no máximo 20 caracteres.").transform((value) => value || null),
  street: z.string().trim().max(160, "O logradouro deve ter no máximo 160 caracteres.").transform((value) => value || null),
  number: z.string().trim().max(30, "O número deve ter no máximo 30 caracteres.").transform((value) => value || null),
  neighborhood: z.string().trim().max(120, "O bairro deve ter no máximo 120 caracteres.").transform((value) => value || null),
  complement: z.string().trim().max(120, "O complemento deve ter no máximo 120 caracteres.").transform((value) => value || null),
  city: z.string().trim().max(120, "A cidade deve ter no máximo 120 caracteres.").transform((value) => value || null),
  state: z.string().trim().max(60, "O estado deve ter no máximo 60 caracteres.").transform((value) => value || null),
})

const pageSizes = new Set([10, 25, 50, 100])
const validSortOrders = new Set<MemberSortOrder>(["name_asc", "name_desc"])
const noStoreHeaders = { "Cache-Control": "no-store" }

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: noStoreHeaders })
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const supabase = getSupabaseAdmin()

    if (searchParams.get("congregations") === "1") {
      const { data, error } = await supabase.from("members").select("congregation")
      if (error) return errorResponse("Não foi possível carregar as congregações.", 503)

      const congregations = [...new Set((data ?? []).map((item) => item.congregation))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "pt-BR", { sensitivity: "base" }))
      return Response.json({ congregations }, { headers: noStoreHeaders })
    }

    if (searchParams.get("statsOnly") === "1") {
      const { data, error } = await supabase.from("members").select("status")
      if (error) return errorResponse("Não foi possível carregar os indicadores.", 503)

      const stats = (data ?? []).reduce(
        (result, item) => {
          result.total += 1
          if (item.status === "active") result.active += 1
          if (item.status === "inactive") result.inactive += 1
          if (item.status === "not_revalidated") result.notRevalidated += 1
          return result
        },
        { total: 0, active: 0, inactive: 0, notRevalidated: 0 },
      )

      return Response.json({ stats }, { headers: noStoreHeaders })
    }

    const { data, error } = await supabase
      .from("members")
      .select("id, external_code, name, photo_path, status, congregation, phone, cep, street, number, neighborhood, complement, city, state, created_at, updated_at")

    if (error) return errorResponse("Não foi possível carregar os membros.", 503)

    const allMembers = data ?? []
    const stats = allMembers.reduce(
      (result, item) => {
        result.total += 1
        if (item.status === "active") result.active += 1
        if (item.status === "inactive") result.inactive += 1
        if (item.status === "not_revalidated") result.notRevalidated += 1
        return result
      },
      { total: 0, active: 0, inactive: 0, notRevalidated: 0 },
    )

    const search = normalizeText(searchParams.get("search") ?? "")
    const rawStatus = searchParams.get("status") ?? "all"
    const validStatuses = new Set(["all", "active", "inactive", "not_revalidated"])
    if (!validStatuses.has(rawStatus)) return errorResponse("Filtro de status inválido.")

    const rawPhoto = searchParams.get("photo") ?? "all"
    const validPhotoFilters = new Set(["all", "with", "without"])
    if (!validPhotoFilters.has(rawPhoto)) return errorResponse("Filtro de foto inválido.")

    const rawSortOrder = searchParams.get("sort") ?? "name_asc"
    if (!validSortOrders.has(rawSortOrder as MemberSortOrder)) return errorResponse("Ordenação inválida.")
    const sortOrder = rawSortOrder as MemberSortOrder

    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "10", 10) || 10
    if (!pageSizes.has(pageSize)) return errorResponse("Tamanho de página inválido.")

    const filtered = allMembers
      .filter((member) => !search || normalizeText(member.name).includes(search))
      .filter((member) => rawStatus === "all" || member.status === rawStatus)
      .filter((member) => rawPhoto === "all" || (rawPhoto === "with" ? Boolean(member.photo_path) : !member.photo_path))
      .sort((left, right) => {
        const comparison = left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })
        return sortOrder === "name_asc" ? comparison : -comparison
      })

    const total = filtered.length
    const pageMembers = filtered.slice((page - 1) * pageSize, page * pageSize)
    const signedUrls = await getSignedPhotoUrls(
      pageMembers.map((member) => member.photo_path).filter((path): path is string => Boolean(path)),
    )

    return Response.json(
      {
        members: pageMembers.map((member) => ({
          id: member.id,
          name: member.name,
          status: member.status as MemberStatus,
          congregation: member.congregation,
          phone: member.phone ?? null,
          cep: member.cep ?? null,
          street: member.street ?? null,
          number: member.number ?? null,
          neighborhood: member.neighborhood ?? null,
          complement: member.complement ?? null,
          city: member.city ?? null,
          state: member.state ?? null,
          photoUrl: member.photo_path ? signedUrls.get(member.photo_path) ?? null : null,
          createdAt: member.created_at,
          updatedAt: member.updated_at,
        })),
        stats,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
      { headers: noStoreHeaders },
    )
  } catch {
    return errorResponse("Não foi possível se conectar ao banco de dados.", 503)
  }
}

export async function POST(request: Request) {
  let photoPath: string | null = null

  try {
    const formData = await request.formData()
    const parsed = memberInputSchema.safeParse({
      name: formData.get("name"),
      status: formData.get("status"),
      congregation: formData.get("congregation"),
      phone: formData.get("phone") ?? "",
      cep: formData.get("cep") ?? "",
      street: formData.get("street") ?? "",
      number: formData.get("number") ?? "",
      neighborhood: formData.get("neighborhood") ?? "",
      complement: formData.get("complement") ?? "",
      city: formData.get("city") ?? "",
      state: formData.get("state") ?? "",
    })

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Revise os dados do membro.")
    }

    const photo = imagePayloadFromFile(formData.get("photo"))
    if (photo.error) return errorResponse(photo.error)

    const id = randomUUID()
    if (photo.image) {
      const buffer = Buffer.from(await photo.image.arrayBuffer())
      const extension = photo.image.type === "image/jpeg" ? "jpg" : photo.image.type === "image/png" ? "png" : "webp"
      const verifiedImage = imagePayloadFromBuffer(buffer, photo.image.type, extension)
      if (!verifiedImage) return errorResponse("O arquivo enviado não é uma imagem JPG, PNG ou WebP válida.")
      photoPath = await uploadMemberPhoto(id, verifiedImage)
    }

    const { data, error } = await getSupabaseAdmin()
      .from("members")
      .insert({
        id,
        name: parsed.data.name,
        status: parsed.data.status,
        congregation: parsed.data.congregation,
        phone: parsed.data.phone,
        cep: parsed.data.cep,
        street: parsed.data.street,
        number: parsed.data.number,
        neighborhood: parsed.data.neighborhood,
        complement: parsed.data.complement,
        city: parsed.data.city,
        state: parsed.data.state,
        photo_path: photoPath,
      })
      .select("id, name, status, congregation, phone, cep, street, number, neighborhood, complement, city, state, photo_path, created_at, updated_at")
      .single()

    if (error) {
      await removeMemberPhotos([photoPath])
      if (error.code === "23505") return errorResponse("Já existe um membro com esse código.", 409)
      return errorResponse("Não foi possível cadastrar o membro.", 503)
    }

    const signedUrls = await getSignedPhotoUrls(data.photo_path ? [data.photo_path] : [])
    return Response.json(
      {
        member: {
          id: data.id,
          name: data.name,
          status: data.status,
          congregation: data.congregation,
          phone: data.phone ?? null,
          cep: data.cep ?? null,
          street: data.street ?? null,
          number: data.number ?? null,
          neighborhood: data.neighborhood ?? null,
          complement: data.complement ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          photoUrl: data.photo_path ? signedUrls.get(data.photo_path) ?? null : null,
        },
      },
      { status: 201, headers: noStoreHeaders },
    )
  } catch {
    await removeMemberPhotos([photoPath])
    return errorResponse("Não foi possível cadastrar o membro. Verifique a conexão e tente novamente.", 503)
  }
}

