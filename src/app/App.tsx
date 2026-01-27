import "@/styles/fonts.css";
import { useEffect, useState } from "react";
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

export default function App() {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!!token);

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
      <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center text-sm text-[#88735A]">
        Loading session...
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans text-[#1f1a14]">
      <Sidebar user={user} onLogout={handleLogout} />
      <ChatArea user={user} />
    </div>
  );
}
