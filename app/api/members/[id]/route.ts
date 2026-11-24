import { z } from "zod"
import { requireAuthenticatedUser } from "@/lib/server/auth"
import { getSignedPhotoUrls, imagePayloadFromBuffer, imagePayloadFromFile, removeMemberPhotos, uploadMemberPhoto } from "@/lib/server/member-photos"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

const memberInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome completo.").max(160),
  status: z.enum(["active", "inactive", "not_revalidated"]),
  congregation: z.string().trim().min(1, "Informe a congregação.").max(120),
})
const noStoreHeaders = { "Cache-Control": "no-store" }
type RouteContext = { params: Promise<{ id: string }> }

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: noStoreHeaders })
}

async function getMemberId(context: RouteContext) {
  const { id } = await context.params
  return z.string().uuid().safeParse(id)
}

export async function PATCH(request: Request, context: RouteContext) {
  const authFailure = await requireAuthenticatedUser()
  if (authFailure) return authFailure

  let uploadedPath: string | null = null

  try {
    const memberId = await getMemberId(context)
    if (!memberId.success) return errorResponse("Membro não encontrado.", 404)

    const formData = await request.formData()
    const parsed = memberInputSchema.safeParse({
      name: formData.get("name"),
      status: formData.get("status"),
      congregation: formData.get("congregation"),
    })
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Revise os dados do membro.")
    }

    const photo = imagePayloadFromFile(formData.get("photo"))
    if (photo.error) return errorResponse(photo.error)

    const supabase = getSupabaseAdmin()
    const { data: existing, error: readError } = await supabase
      .from("members")
      .select("id, photo_path")
      .eq("id", memberId.data)
      .maybeSingle()

    if (readError) return errorResponse("Não foi possível carregar o cadastro.", 503)
    if (!existing) return errorResponse("Membro não encontrado.", 404)

    let nextPhotoPath = existing.photo_path
    if (photo.image) {
      const buffer = Buffer.from(await photo.image.arrayBuffer())
      const extension = photo.image.type === "image/jpeg" ? "jpg" : photo.image.type === "image/png" ? "png" : "webp"
      const verifiedImage = imagePayloadFromBuffer(buffer, photo.image.type, extension)
      if (!verifiedImage) return errorResponse("O arquivo enviado não é uma imagem JPG, PNG ou WebP válida.")
      uploadedPath = await uploadMemberPhoto(memberId.data, verifiedImage)
      nextPhotoPath = uploadedPath
    } else if (formData.get("removePhoto") === "true") {
      nextPhotoPath = null
    }

    const { data, error } = await supabase
      .from("members")
      .update({
        name: parsed.data.name,
        status: parsed.data.status,
        congregation: parsed.data.congregation,
        photo_path: nextPhotoPath,
      })
      .eq("id", memberId.data)
      .select("id, name, status, congregation, photo_path, created_at, updated_at")
      .single()

    if (error) {
      await removeMemberPhotos([uploadedPath])
      return errorResponse("Não foi possível salvar as alterações.", 503)
    }

    if (existing.photo_path && existing.photo_path !== nextPhotoPath) {
      try {
        await removeMemberPhotos([existing.photo_path])
      } catch {
        // A atualização do cadastro já foi confirmada; uma falha de limpeza não deve invalidar a nova foto.
      }
    }

    const signedUrls = await getSignedPhotoUrls(data.photo_path ? [data.photo_path] : [])
    return Response.json(
      {
        member: {
          id: data.id,
          name: data.name,
          status: data.status,
          congregation: data.congregation,
          photoUrl: data.photo_path ? signedUrls.get(data.photo_path) ?? null : null,
        },
      },
      { headers: noStoreHeaders },
    )
  } catch {
    await removeMemberPhotos([uploadedPath])
    return errorResponse("Não foi possível salvar as alterações. Tente novamente.", 503)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authFailure = await requireAuthenticatedUser()
  if (authFailure) return authFailure

  try {
    const memberId = await getMemberId(context)
    if (!memberId.success) return errorResponse("Membro não encontrado.", 404)

    const supabase = getSupabaseAdmin()
    const { data: member, error: readError } = await supabase
      .from("members")
      .select("id, photo_path")
      .eq("id", memberId.data)
      .maybeSingle()

    if (readError) return errorResponse("Não foi possível carregar o cadastro.", 503)
    if (!member) return errorResponse("Membro não encontrado.", 404)

    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId.data)

    if (deleteError) return errorResponse("Não foi possível excluir o membro.", 503)
    await removeMemberPhotos([member.photo_path])

    return Response.json({ success: true }, { headers: noStoreHeaders })
  } catch {
    return errorResponse("Não foi possível excluir o membro. Tente novamente.", 503)
  }
}
