import "server-only";
import type { User } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/service";

export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const service = getServiceClient();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("findUserByEmail failed", error.message);
      return null;
    }
    const match = data.users.find((user) => (user.email ?? "").toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 40) return null;
  }
}
