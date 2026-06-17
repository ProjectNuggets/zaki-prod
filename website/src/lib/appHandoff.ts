export const APP_BASE_URL = "https://app.chatzaki.com";

export type AppIntent =
  | "dashboard"
  | "chat"
  | "agent"
  | "memory"
  | "plans"
  | "learn_waitlist"
  | "design_waitlist"
  | "career_waitlist";

export function appHandoffUrl(path = "/", source = "website_standalone", intent: AppIntent = "dashboard") {
  const url = new URL(path, APP_BASE_URL);
  url.searchParams.set("source", source);
  url.searchParams.set("intent", intent);
  return url.toString();
}
