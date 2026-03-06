import { createContext, useContext, ReactNode } from "react";
import type { ConnectedAccount, Platform } from "@/types/platform";

interface AccountContextValue {
  accounts: ConnectedAccount[];
  getAccount: (platform: Platform) => ConnectedAccount | undefined;
  isConnected: (platform: Platform) => boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

// Seeded from server in production; hardcoded here to reflect current X-only integration
const ACCOUNTS: ConnectedAccount[] = [
  { id: "x-1", platform: "x", username: "@aura", displayName: "Aura", connected: true },
  { id: "threads-1", platform: "threads", username: "@aura", displayName: "Aura", connected: false },
];

export function AccountProvider({ children }: { children: ReactNode }) {
  const getAccount = (platform: Platform) => ACCOUNTS.find((a) => a.platform === platform);
  const isConnected = (platform: Platform) =>
    ACCOUNTS.some((a) => a.platform === platform && a.connected);

  return (
    <AccountContext.Provider value={{ accounts: ACCOUNTS, getAccount, isConnected }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccounts must be used within AccountProvider");
  return ctx;
}
