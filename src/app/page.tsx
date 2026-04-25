import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";

export default async function RootPage() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth")?.value;
  if (auth) {
    redirect("/dashboard");
  }
  return <Landing />;
}
