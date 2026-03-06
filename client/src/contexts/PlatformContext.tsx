import { createContext, useContext, useState, ReactNode } from "react";
import type { SelectedPlatform, Platform } from "@/types/platform";

interface PlatformContextValue {
  selectedPlatform: SelectedPlatform;
  setSelectedPlatform: (p: SelectedPlatform) => void;
  isVisible: (platform: Platform) => boolean;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [selectedPlatform, setSelectedPlatform] = useState<SelectedPlatform>("all");

  const isVisible = (platform: Platform) =>
    selectedPlatform === "all" || selectedPlatform === platform;

  return (
    <PlatformContext.Provider value={{ selectedPlatform, setSelectedPlatform, isVisible }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
