import { cookies } from "next/headers";
import { createHash } from "crypto";

export async function getServerDistinctId(): Promise<string | null> {
  const store = await cookies();
  const auth = store.get("auth")?.value;
  if (!auth) return null;
  const hex = createHash("sha256").update(auth).digest("hex");
  return `u_${hex}`;
}
