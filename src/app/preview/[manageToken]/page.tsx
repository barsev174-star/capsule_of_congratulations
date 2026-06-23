import { redirect } from "next/navigation";
import { getManagePath } from "@/lib/routes/card-links";

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
};

export default async function PreviewRedirectPage({ params }: Props) {
  const { manageToken } = await params;
  redirect(`${getManagePath(manageToken)}?tab=preview`);
}
