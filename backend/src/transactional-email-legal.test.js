import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_LEGAL_URLS,
  appendTransactionalEmailLegalHtml,
  appendTransactionalEmailLegalText,
} from "./transactional-email-legal.js";

const emailAssetNames = [
  "verification.html",
  "verification-dark.html",
  "verification.txt",
  "password-reset.html",
  "password-reset-dark.html",
  "password-reset.txt",
];

describe("transactional email legal links", () => {
  it("wires the legal footer into every live ZAKI email format", () => {
    const indexPath = fileURLToPath(new URL("./index.js", import.meta.url));
    const source = readFileSync(indexPath, "utf8");

    expect(source).toContain("appendTransactionalEmailLegalHtml(footerHtml)");
    expect(source.match(/appendTransactionalEmailLegalText\(/g)).toHaveLength(3);
  });

  it("appends canonical legal links to HTML email footers", () => {
    const html = appendTransactionalEmailLegalHtml("<p>Need help? support@chatzaki.com</p>");

    expect(html).toContain("Need help? support@chatzaki.com");
    expect(html).toContain("ZAKI by Nova Nuggets L.L.C.");
    expect(html).toContain(`href="${CANONICAL_LEGAL_URLS.terms}"`);
    expect(html).toContain(`href="${CANONICAL_LEGAL_URLS.privacy}"`);
    expect(html).toContain(`href="${CANONICAL_LEGAL_URLS.compliance}"`);
  });

  it("appends canonical legal links to plain-text email bodies", () => {
    const lines = appendTransactionalEmailLegalText(["Support: support@chatzaki.com"]);

    expect(lines).toContain("ZAKI by Nova Nuggets L.L.C.");
    expect(lines).toEqual(
      expect.arrayContaining([
        `Terms: ${CANONICAL_LEGAL_URLS.terms}`,
        `Privacy: ${CANONICAL_LEGAL_URLS.privacy}`,
        `Security & Compliance: ${CANONICAL_LEGAL_URLS.compliance}`,
      ]),
    );
  });

  it.each(emailAssetNames)("keeps %s on current ZAKI branding and legal pages", (name) => {
    const path = fileURLToPath(new URL(`../../emails/${name}`, import.meta.url));
    const source = readFileSync(path, "utf8");

    expect(source).toContain("ZAKI");
    expect(source).toContain("Nova Nuggets L.L.C.");
    expect(source).not.toMatch(/https?:\/\/(?:www\.)?novanuggets\.com/i);
    expect(source).not.toContain("NovaNuggets family");
    for (const url of Object.values(CANONICAL_LEGAL_URLS)) {
      expect(source).toContain(url);
    }
  });
});
