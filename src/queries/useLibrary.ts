import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { LibraryResult } from "@/types";

// Keys
export const libraryKeys = {
  search: (query: string) => ["library", "search", query] as const,
  all: ["library"] as const,
};

// Types
interface LibrarySearchResponse {
  results?: LibraryResult[];
}

// Fetchers
async function searchLibrary(query: string): Promise<LibraryResult[]> {
  if (!query.trim()) {
    return [];
  }
  
  const response = await apiRequest(
    `/library/search?q=${encodeURIComponent(query)}`
  );
  
  if (!response.ok) {
    throw new Error("Search failed");
  }
  
  const data = await response.json() as LibrarySearchResponse;
  return data.results ?? [];
}

async function uploadToLibrary(file: File): Promise<LibraryResult> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await apiRequest("/library/upload", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Upload failed");
  }
  
  return response.json();
}

async function deleteFromLibrary(id: string): Promise<void> {
  const response = await apiRequest(`/library/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Delete failed");
  }
}

// Hooks
export function useLibrarySearch(query: string) {
  return useQuery({
    queryKey: libraryKeys.search(query),
    queryFn: () => searchLibrary(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useUploadToLibrary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uploadToLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });
}

export function useDeleteFromLibrary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteFromLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });
}
