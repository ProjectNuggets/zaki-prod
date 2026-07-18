export const CANONICAL_LEGAL_URLS = Object.freeze({
  terms: "https://chatzaki.com/terms",
  privacy: "https://chatzaki.com/privacy",
  compliance: "https://chatzaki.com/compliance",
});

export function appendTransactionalEmailLegalHtml(footerHtml = "") {
  return `${footerHtml}
    <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#7f6b59;">
      ZAKI by Nova Nuggets L.L.C.<br>
      <a href="${CANONICAL_LEGAL_URLS.terms}" style="color:#c75236;text-decoration:none;">Terms</a>
      &nbsp;·&nbsp;
      <a href="${CANONICAL_LEGAL_URLS.privacy}" style="color:#c75236;text-decoration:none;">Privacy</a>
      &nbsp;·&nbsp;
      <a href="${CANONICAL_LEGAL_URLS.compliance}" style="color:#c75236;text-decoration:none;">Security &amp; Compliance</a>
    </p>`;
}

export function appendTransactionalEmailLegalText(lines = []) {
  return [
    ...lines,
    "",
    "ZAKI by Nova Nuggets L.L.C.",
    `Terms: ${CANONICAL_LEGAL_URLS.terms}`,
    `Privacy: ${CANONICAL_LEGAL_URLS.privacy}`,
    `Security & Compliance: ${CANONICAL_LEGAL_URLS.compliance}`,
  ];
}
