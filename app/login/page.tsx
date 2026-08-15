import { LoginScreen } from "@/components/App";
import { getSessionUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return <LoginScreen />;
}
