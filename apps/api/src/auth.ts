import type { SupabaseClient } from "@supabase/supabase-js";
import type { db } from "@/clients/db";
import { bearerToken } from "@/utils/bearer-token";

/**
 * Resolves the bearer token in `authorizationHeader` to a durable user ID via
 * Supabase Auth, provisioning a matching `User` row on first sight (ADR 0009 —
 * guests have no session and get `null`, not an error).
 */
export const resolveUserId = async ({
  supabase,
  db: prisma,
  authorizationHeader,
}: {
  supabase: SupabaseClient;
  db: typeof db;
  authorizationHeader: string | null;
}): Promise<string | null> => {
  const token = bearerToken(authorizationHeader);

  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const userId = data.user.id;

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  return userId;
};
