import { useEffect, useState } from "react";

function readNavigatorOnline() {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") {
    return true;
  }
  return navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(readNavigatorOnline);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setIsOnline(readNavigatorOnline());
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return isOnline;
}
