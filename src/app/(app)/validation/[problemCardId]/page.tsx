import { ValidationHub } from "@/components/validation/ValidationHub";

export default async function ValidationHubPage({
  params,
}: {
  params: Promise<{ problemCardId: string }>;
}) {
  const { problemCardId } = await params;
  return <ValidationHub problemCardId={problemCardId} />;
}
