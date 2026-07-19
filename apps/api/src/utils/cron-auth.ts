/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically once
 * the CRON_SECRET env var is set — this rejects unauthenticated callers.
 */
export const isAuthorizedCronRequest = ({
  authorizationHeader,
  secret,
}: {
  authorizationHeader: string | null;
  secret: string | undefined;
}): boolean => Boolean(secret) && authorizationHeader === `Bearer ${secret}`;
