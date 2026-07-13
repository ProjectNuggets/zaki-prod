// @ts-ignore
import { content } from "../components/landingContent.js";

export type Locale = "en" | "ar";
export type WebsiteContent = (typeof content)["en"];

export function normalizeLocale(locale: string): Locale {
  return locale === "ar" ? "ar" : "en";
}

export function getContent(locale: string): WebsiteContent {
  return content[normalizeLocale(locale)];
}

export const websiteContent = content as Record<Locale, WebsiteContent>;
