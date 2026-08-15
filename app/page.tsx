import { App } from "@/components/App";
import { getSessionUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  if (!await getSessionUser()) redirect("/login");
  return <App />;
}
