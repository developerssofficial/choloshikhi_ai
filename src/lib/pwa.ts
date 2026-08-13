"use client";

import { useState, useEffect, useRef } from "react";

export type InstallState = "idle" | "installable" | "installed" | "unsupported";

interface InstallableEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [state, setState] = useState<InstallState>("idle");
  const deferredRef = useRef<InstallableEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as InstallableEvent;
      setState((prev) => (prev === "installed" ? "installed" : "installable"));
    };

    const installedHandler = () => setState("installed");
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length) setState("installed");
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredRef.current) return false;
    deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === "accepted") setState("installed");
    deferredRef.current = null;
    return outcome === "accepted";
  };

  return { state, promptInstall };
}
