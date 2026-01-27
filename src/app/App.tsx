import "@/styles/fonts.css";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { LoginScreen } from "./components/LoginScreen";
import {
  clearAuthToken,
  fetchCurrentUser,
  getAuthToken,
  setAuthToken,
} from "@/lib/api";

type AppUser = {
  id?: number | string;
  username?: string;
  role?: string;
};

type ThemePreference = "light" | "dark" | "system";

const getStoredTheme = (): ThemePreference => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem("zaki-theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!!token);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("zaki-theme");
    if (!stored) return "dark";
    return getStoredTheme();
  });
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const resolvedTheme = useMemo(
    () => (themePreference === "system" ? systemTheme : themePreference),
    [systemTheme, themePreference]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("zaki-theme", themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    let isMounted = true;
    setAuthLoading(true);
    fetchCurrentUser()
      .then(({ data, response }) => {
        if (!isMounted) return;
        if (!response.ok || !data?.success) {
          clearAuthToken();
          setToken(null);
          setUser(null);
          return;
        }
        setUser(data.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuthToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleLogin = (newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  if (!token && !authLoading) {
    return <LoginScreen onSuccess={handleLogin} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fff8f0] dark:bg-[#0f0b08] flex items-center justify-center text-sm text-[#88735A] dark:text-[#c9b8a4]">
        Loading session...
      </div>
    );
  }

  return (
    <div className="zaki-app flex w-full h-screen overflow-hidden font-sans text-[#1f1a14] dark:text-[#efe6d9]">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        onThemeChange={setThemePreference}
      />
      <ChatArea user={user} />
    </div>
  );
}
