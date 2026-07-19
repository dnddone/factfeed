import { db } from "@/clients/db";
import {
  DEFAULT_POOL_MIN_THRESHOLD,
  DEFAULT_TOP_UP_BATCH_SIZE,
} from "@/constants/cron.constants";
import { runTopUp } from "@/top-up";
import { isAuthorizedCronRequest } from "@/utils/cron-auth";

export const GET = async (request: Request): Promise<Response> => {
  const authorized = isAuthorizedCronRequest({
    authorizationHeader: request.headers.get("authorization"),
    secret: process.env.CRON_SECRET,
  });

  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const threshold =
    Number(process.env.POOL_MIN_THRESHOLD) || DEFAULT_POOL_MIN_THRESHOLD;
  const batchSize =
    Number(process.env.TOP_UP_BATCH_SIZE) || DEFAULT_TOP_UP_BATCH_SIZE;

  const result = await runTopUp({ db, threshold, batchSize });

  return Response.json(result);
};
