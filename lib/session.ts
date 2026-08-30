import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * PLACEHOLDER — swap for real session verification (NextAuth, Lucia, a
 * signed JWT, whatever you land on) once auth is actually built. For now
 * this trusts a `session_user_id` cookie directly, with no signing, no
 * expiry, no tamper protection. It exists purely so Phase 3's dashboard
 * has something real to read a user + role from. Do not ship this as-is —
 * everything downstream (role gating, tenant scoping) depends on this
 * function actually being trustworthy.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;

  return user;
}
