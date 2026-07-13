type NovaWebsiteRuntimeEnv = {
  NOVA_WEBSITE_API_BASE_URL?: string;
  ENVIRONMENT?: string;
};

declare global {
  interface Window {
    __NOVA_WEBSITE_ENV__?: NovaWebsiteRuntimeEnv;
  }
}

export type QualificationRequest = {
  name: string;
  email: string;
  company: string;
  role: string;
  assessmentPath: string;
  workflow: string;
  stackAccess?: string;
  decisionWindow: string;
  ndaDossierRequested: boolean;
};

export type QualificationResponse =
  | { success: true; id: string; duplicate?: boolean }
  | { success: false; error: string; code?: string };

function getQualificationApiBase() {
  if (typeof window === "undefined") return "";

  const configured = String(window.__NOVA_WEBSITE_ENV__?.NOVA_WEBSITE_API_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");

  const { hostname, protocol } = window.location;
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    return `${protocol}//${hostname}:8787`;
  }

  return "https://api.chatzaki.com";
}

function buildUseCase(payload: QualificationRequest) {
  return [
    `Company: ${payload.company}`,
    `Assessment path: ${payload.assessmentPath}`,
    `Decision window: ${payload.decisionWindow}`,
    `Workflow: ${payload.workflow}`,
    payload.stackAccess ? `Stack and access: ${payload.stackAccess}` : null,
    `NDA evidence requested: ${payload.ndaDossierRequested ? "yes" : "no"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function submitQualification(
  payload: QualificationRequest
): Promise<QualificationResponse> {
  try {
    const response = await fetch(`${getQualificationApiBase()}/api/website-beta-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        role: payload.role,
        useCase: buildUseCase(payload),
        locale: "en",
        source: "nova-nuggets-qualification",
      }),
    });
    const data = (await response.json().catch(() => null)) as QualificationResponse | null;

    if (!response.ok || !data) {
      return {
        success: false,
        error:
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "We could not send your brief. Please email hello@novanuggets.com.",
        code: data && "code" in data ? data.code : undefined,
      };
    }

    return data;
  } catch {
    return {
      success: false,
      error: "We could not send your brief. Please email hello@novanuggets.com.",
      code: "network_error",
    };
  }
}
