import { useCallback, useState } from "react";

import { AUTH_CALLBACK_URL } from "@/constants/auth.constants";
import { supabase } from "@/clients/supabase";

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
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
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
