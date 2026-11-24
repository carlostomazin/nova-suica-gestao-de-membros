import type { Metadata } from "next"
import { MembersPage } from "@/components/members/members-page"

export const metadata: Metadata = {
  title: "Membros | Nova Suíça",
  description: "Consulte e mantenha os cadastros de membros da congregação Nova Suíça.",
}

export default function MembersRoute() {
  return <MembersPage />
}
