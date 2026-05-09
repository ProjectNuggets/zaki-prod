import { useEffect, useState } from "react";
import { getFreshAuthToken } from "@/lib/api";

type LearningAssetState = {
  src: string;
  status: "idle" | "loading" | "ready" | "error";
};

export function isProtectedLearningAssetUrl(url: string) {
  if (!url || /^data:|^blob:/i.test(url)) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return (
      parsed.pathname.startsWith("/api/learning/outputs/") ||
      parsed.pathname.startsWith("/api/learning/attachments/")
    );
  } catch {
    return false;
  }
}

export function useLearningProtectedAsset(url: string): LearningAssetState {
  const [state, setState] = useState<LearningAssetState>(() => ({
    src: url,
    status: url ? "idle" : "error",
  }));

  useEffect(() => {
    if (!url) {
      setState({ src: "", status: "error" });
      return undefined;
    }

    if (!isProtectedLearningAssetUrl(url)) {
      setState({ src: url, status: "ready" });
      return undefined;
    }

    let cancelled = false;
    let objectUrl = "";
    setState({ src: "", status: "loading" });

    void (async () => {
      try {
        const token = await getFreshAuthToken();
        const headers = new Headers();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const response = await fetch(url, {
          credentials: "include",
          headers,
        });
        if (!response.ok) throw new Error(`Asset request failed: ${response.status}`);
        const blob = await response.blob();
        const nextObjectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }
        objectUrl = nextObjectUrl;
        setState({ src: objectUrl, status: "ready" });
      } catch {
        if (!cancelled) setState({ src: "", status: "error" });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return state;
}
