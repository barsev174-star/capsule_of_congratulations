import { redirect } from "next/navigation";
import { getJoinPath } from "@/lib/routes/card-links";

type Props = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export default async function ParticipantCardRedirectPage({ params }: Props) {
  const { publicSlug } = await params;
  redirect(getJoinPath(publicSlug));
}
