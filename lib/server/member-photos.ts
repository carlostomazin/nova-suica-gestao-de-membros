import "server-only"

import { randomUUID } from "node:crypto"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

const bucketName = "member-photos"
const maxPhotoSize = 5 * 1024 * 1024

export type ImagePayload = {
  buffer: Buffer
  contentType: "image/jpeg" | "image/png" | "image/webp"
  extension: "jpg" | "png" | "webp"
}

export function imagePayloadFromFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string" || value.size === 0) {
    return { image: null, error: null } as const
  }

  if (value.size > maxPhotoSize) {
    return { image: null, error: "A foto deve ter no máximo 5 MB." } as const
  }

  const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
  if (!acceptedTypes.has(value.type)) {
    return { image: null, error: "Use uma imagem JPG, JPEG, PNG ou WebP." } as const
  }

  return { image: value as File, error: null } as const
}

export function imagePayloadFromBuffer(
  buffer: Buffer,
  contentType: string,
  extension: string,
): ImagePayload | null {
  if (buffer.length === 0 || buffer.length > maxPhotoSize) return null

  const signatures: Record<string, { contentType: ImagePayload["contentType"]; extension: ImagePayload["extension"]; valid: boolean }> = {
    jpeg: {
      contentType: "image/jpeg",
      extension: "jpg",
      valid: buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    },
    jpg: {
      contentType: "image/jpeg",
      extension: "jpg",
      valid: buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    },
    png: {
      contentType: "image/png",
      extension: "png",
      valid: buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    },
    webp: {
      contentType: "image/webp",
      extension: "webp",
      valid: buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP",
    },
  }

  const result = signatures[extension.toLowerCase().replace(/^\./, "")]
  if (!result?.valid || result.contentType !== contentType) return null

  return { buffer, contentType: result.contentType, extension: result.extension }
}

export async function uploadMemberPhoto(memberId: string, image: ImagePayload) {
  const path = `members/${memberId}/${randomUUID()}.${image.extension}`
  const { error } = await getSupabaseAdmin()
    .storage.from(bucketName)
    .upload(path, image.buffer, {
      contentType: image.contentType,
      upsert: false,
      cacheControl: "3600",
    })

  if (error) throw new Error("Não foi possível salvar a foto no armazenamento privado.")
  return path
}

export async function removeMemberPhotos(paths: Array<string | null | undefined>) {
  const existingPaths = [...new Set(paths.filter((path): path is string => Boolean(path)))]
  if (!existingPaths.length) return

  await getSupabaseAdmin().storage.from(bucketName).remove(existingPaths)
}

export async function getSignedPhotoUrls(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (!uniquePaths.length) return new Map<string, string>()

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucketName)
    .createSignedUrls(uniquePaths, 60 * 10)

  if (error) return new Map<string, string>()

  return new Map(
    (data ?? [])
      .filter((item) => item.path && item.signedUrl)
      .map((item) => [item.path as string, item.signedUrl as string]),
  )
}

export async function getMemberPhotoImage(path: string): Promise<{ buffer: Buffer; extension: "jpeg" | "png" } | null> {
  const { data, error } = await getSupabaseAdmin().storage.from(bucketName).download(path)
  if (error || !data) return null

  const sourceBuffer = Buffer.from(await data.arrayBuffer())
  const ext = path.split(".").pop()?.toLowerCase()

  if (ext === "png") return { buffer: sourceBuffer, extension: "png" }
  if (ext === "jpg" || ext === "jpeg") return { buffer: sourceBuffer, extension: "jpeg" }
  if (ext === "webp") {
    try {
      const sharp = (await import("sharp")).default
      return { buffer: await sharp(sourceBuffer).png().toBuffer(), extension: "png" }
    } catch {
      return null
    }
  }

  return null
}
