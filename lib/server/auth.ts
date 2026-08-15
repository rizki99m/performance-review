import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";
import type { Role, UserStatus } from "../types";

export type SafeSessionUser = { id: string; name: string; position: string; username: string; role: Role; status: UserStatus };
const COOKIE = "performance_review_session";
function sign(value:string){const secret=process.env.DATABASE_URL;if(!secret)throw new Error("DATABASE_URL is not configured.");return createHmac("sha256",secret).update(value).digest("base64url")}

export async function createSession(userId: string) {
  const payload=`${userId}.${Date.now()+1000*60*60*12}`;const token=`${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
}
export async function destroySession() { (await cookies()).delete(COOKIE); }
export async function getSessionUser(): Promise<SafeSessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if(!token)return null;const [userId,expires,signature]=token.split(".");if(!userId||!expires||!signature||Number(expires)<=Date.now())return null;const expected=sign(`${userId}.${expires}`);if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  const sql = db();
  const rows = await sql`SELECT id::text, name, position, username, role, status FROM users WHERE id = ${userId}::bigint LIMIT 1`;
  return (rows[0] as SafeSessionUser | undefined) ?? null;
}
export async function requireUser() { const user = await getSessionUser(); if (!user) throw new ApiError(401, "Authentication required."); if (user.status !== "ACTIVE") throw new ApiError(403, "This account is inactive."); return user; }
export async function requireAdmin() { const user = await requireUser(); if (user.role !== "ADMIN") throw new ApiError(403, "Admin access required."); return user; }
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
