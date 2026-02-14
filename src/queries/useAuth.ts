import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, fetchProfile, requestLogin, setAuthToken, clearAuthToken } from "@/lib/api";
import { useAuthStore } from "@/stores";

// Keys
export const authKeys = {
  user: ["auth", "user"] as const,
};

// Hooks
export function useCurrentUser() {
  const { setUser, setLoading } = useAuthStore();
  
  return useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      setLoading(true);
      try {
        const { response, data } = await fetchCurrentUser();
        if (response.ok && data.user) {
          const baseUser = data.user;
          try {
            const profile = await fetchProfile();
            if (profile.response.ok && profile.data.user) {
              const merged = { ...baseUser, fullName: profile.data.user.fullName ?? null };
              setUser(merged);
              return merged;
            }
          } catch {
            // Ignore profile fetch failure
          }
          setUser(baseUser);
          return baseUser;
        }
        setUser(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { setToken } = useAuthStore();
  
  return useMutation({
    mutationFn: async (credentials: { username?: string; password: string }) => {
      const { response, data } = await requestLogin(credentials);
      
      if (!response.ok || !data.token) {
        throw new Error(data.message ?? "Login failed");
      }
      
      return data.token;
    },
    onSuccess: (token) => {
      setAuthToken(token);
      setToken(token);
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  
  return useMutation({
    mutationFn: async () => {
      clearAuthToken();
      logout();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
