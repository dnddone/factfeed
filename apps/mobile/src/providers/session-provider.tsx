import React, { createContext, useContext } from "react";

import { type SessionStatus, useSession } from "@/hooks/useSession";

type State = {
  status: SessionStatus;
  accessToken: string | null;
};

const SessionContext = createContext<State | null>(null);

type Props = {
  children: React.ReactNode;
};

export const SessionProvider: React.FC<Props> = ({ children }) => {
  const { status, accessToken } = useSession();

  return (
    <SessionContext.Provider value={{ status, accessToken }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = (): State => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }

  return context;
};
