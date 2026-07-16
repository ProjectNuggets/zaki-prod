import { getWebsiteApiBase } from "./websiteApi";
import type { Locale } from "./content";

export type WebsiteBetaWaitlistRequest = {
  email: string;
  name?: string;
  role?: string;
  useCase?: string;
  locale?: Locale;
  source?: string;
};

export type WebsiteBetaWaitlistResponse =
  | { success: true; id: string; duplicate?: boolean }
  | { success: false; error: string; code?: string };

export async function submitWaitlist(
  payload: WebsiteBetaWaitlistRequest
): Promise<WebsiteBetaWaitlistResponse> {
  const response = await fetch(`${getWebsiteApiBase()}/api/website-beta-waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as WebsiteBetaWaitlistResponse | null;
  if (!response.ok || !data) {
    return {
      success: false,
      error: data && "error" in data && typeof data.error === "string" ? data.error : "Request failed.",
      code: data && "code" in data ? data.code : undefined,
    };
  }
  return data;
}
