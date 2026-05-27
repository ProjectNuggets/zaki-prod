import { backendAuthRequest } from "@/lib/api";

export type DesignProject = {
  id: string;
  name: string;
  status?: { value?: string };
  metadata?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
};

type DesignRequestOptions = {
  method?: string;
  body?: Record<string, unknown>;
};

async function parseDesignResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function designRequest<T = unknown>(
  path: string,
  options: DesignRequestOptions = {},
): Promise<T> {
  const response = await backendAuthRequest(path, {
    method: options.method ?? "GET",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await parseDesignResponse(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as Record<string, unknown>).message)
        : `Design request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function getDesignHealth() {
  return designRequest<{ ok: boolean; enabled: boolean; configured: boolean; upstreamStatus?: number }>(
    "/api/design/health",
  );
}

export function listDesignProjects() {
  return designRequest<{ projects: DesignProject[] }>("/api/design/projects");
}

export function createDesignProject(input: { name: string; prompt?: string }) {
  return designRequest<{ project: DesignProject; conversationId?: string }>("/api/design/projects", {
    method: "POST",
    body: {
      name: input.name,
      pendingPrompt: input.prompt || null,
      skipDiscoveryBrief: Boolean(input.prompt),
      metadata: {
        kind: "responsive-web",
        source: "zaki-design",
      },
    },
  });
}
