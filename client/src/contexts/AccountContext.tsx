import { createContext, useContext, useMemo, ReactNode } from "react";
import type { ConnectedAccount, Platform } from "@/types/platform";
import { useTwitterStatus, useThreadsStatus } from "@/lib/hooks";

interface AccountContextValue {
  accounts: ConnectedAccount[];
  getAccount: (platform: Platform) => ConnectedAccount | undefined;
  isConnected: (platform: Platform) => boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { data: xStatus } = useTwitterStatus();
  const { data: threadsStatus } = useThreadsStatus();

  const accounts: ConnectedAccount[] = useMemo(() => [
    {
      id: "x-1",
      platform: "x",
      username: xStatus?.handle ?? "@aura",
      displayName: xStatus?.name ?? "Aura",
      connected: xStatus?.connected ?? false,
    },
    {
      id: "threads-1",
      platform: "threads",
      username: threadsStatus?.username ? `@${threadsStatus.username}` : "@aura",
      displayName: "Aura",
      connected: threadsStatus?.connected ?? false,
    },
  ], [xStatus, threadsStatus]);

  const getAccount = (platform: Platform) => accounts.find((a) => a.platform === platform);
  const isConnected = (platform: Platform) =>
    accounts.some((a) => a.platform === platform && a.connected);

  return (
    <AccountContext.Provider value={{ accounts, getAccount, isConnected }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccounts must be used within AccountProvider");
  return ctx;
}
