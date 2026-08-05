import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/clients/supabase";

export type SessionStatus = "guest" | "authenticating" | "authed";

type UseSessionResult = {
  status: SessionStatus;
  accessToken: string | null;
};

export const useSession = (): UseSessionResult => {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsInitializing(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const status: SessionStatus = isInitializing
    ? "authenticating"
    : session
      ? "authed"
      : "guest";

  return { status, accessToken: session?.access_token ?? null };
};
