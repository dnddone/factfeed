import { useCallback, useState } from "react";

import { supabase } from "@/clients/supabase";
import { getAuthCallbackUrl } from "@/utils/auth-callback";

type MagicLinkStatus = "idle" | "sending" | "sent";

type UseMagicLinkSignInResult = {
  email: string;
  setEmail: (email: string) => void;
  status: MagicLinkStatus;
  sendMagicLink: () => void;
};

export const useMagicLinkSignIn = (): UseMagicLinkSignInResult => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<MagicLinkStatus>("idle");

  const sendMagicLink = useCallback(async () => {
    setStatus("sending");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });

    if (error) {
      console.error("useMagicLinkSignIn: failed to send magic link", error);
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }, [email]);

  return { email, setEmail, status, sendMagicLink };
};
