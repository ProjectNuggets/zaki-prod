import type { ReactNode } from "react";

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zaki-subtle bg-white/85 px-5 py-5 shadow-[0px_12px_28px_rgba(15,15,15,0.05)] dark:border-[#2c221a] dark:bg-[#16110d]">
      <h2 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary text-left">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle text-left leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function LegalPage() {
  const legalEmail = "info@novanuggets.com";

  return (
    <div className="h-full overflow-y-auto zaki-scrollbar-fade px-6 py-10" dir="ltr" lang="en">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-[28px] border border-zaki-subtle bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ef_62%,#f6ecdf_100%)] shadow-[0px_24px_56px_rgba(15,15,15,0.1)] dark:border-[#2c221a] dark:bg-[linear-gradient(165deg,#1b140f_0%,#120f0c_58%,#0d0a08_100%)]">
          <div className="border-b border-zaki-subtle bg-[linear-gradient(130deg,#fff8ef_0%,#f4e8d9_70%,#eddcc8_100%)] px-7 py-7 dark:border-[#2c221a] dark:bg-[linear-gradient(130deg,#261d16_0%,#1a1410_65%,#130f0c_100%)]">
            <div className="inline-flex items-center rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zaki-muted dark:border-[#2c221a] dark:bg-[#201912] dark:text-zaki-dark-muted">
              Legal
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-zaki-primary dark:text-zaki-dark-primary text-left">
              Terms, Privacy & Compliance
            </h1>
            <p className="mt-2 text-xs text-zaki-muted text-left">
              Effective date: February 17, 2026
            </p>
            <p className="mt-3 text-sm text-zaki-secondary dark:text-zaki-dark-subtle text-left max-w-3xl">
              This page defines the baseline legal terms for ZAKI v0.1. By creating an account or
              using ZAKI, you agree to these terms.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-zaki-subtle bg-white/75 px-3 py-2 text-xs text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                Policy version: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">2026-02-17.v2</span>
              </div>
              <div className="rounded-xl border border-zaki-subtle bg-white/75 px-3 py-2 text-xs text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                Language: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">English</span>
              </div>
              <div className="rounded-xl border border-zaki-subtle bg-white/75 px-3 py-2 text-xs text-zaki-secondary dark:border-[#2c221a] dark:bg-[#1f1914] dark:text-zaki-dark-subtle">
                Contact: <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">{legalEmail}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="rounded-2xl border border-zaki-subtle bg-zaki-hover/60 px-4 py-4 dark:border-[#2c221a] dark:bg-[#17120f]">
              <p className="text-xs text-zaki-muted text-left">
                If you do not agree with these terms, do not use the service. Material updates are
                published here with a new effective date.
              </p>
            </div>

            <LegalSection title="1) Eligibility and account responsibility">
              <p>You must be legally able to enter a contract and use ZAKI in your jurisdiction.</p>
              <p>
                You are responsible for safeguarding your account credentials and for all activity
                under your account.
              </p>
              <p>
                You must provide accurate signup details and keep your email and billing details
                current.
              </p>
            </LegalSection>

            <LegalSection title="2) Acceptable use">
              <p>You agree not to misuse the service. Prohibited behavior includes:</p>
              <ul className="list-disc space-y-1 pl-5 marker:text-zaki-brand">
                <li>Illegal activity, fraud, harassment, threats, or infringement of third-party rights.</li>
                <li>Uploading malicious code, reverse engineering, or attempting unauthorized access.</li>
                <li>Automated abuse, scraping, or activity that degrades reliability for other users.</li>
              </ul>
              <p>
                We may suspend or terminate access for policy violations, security risks, or legal
                requirements.
              </p>
            </LegalSection>

            <LegalSection title="3) AI output and disclaimer">
              <p>
                ZAKI uses AI models and may produce incomplete, inaccurate, or outdated output. You
                must independently review important results.
              </p>
              <p>
                ZAKI and TYP are operated by Nova Nuggets. Depending on request type, inference is
                processed through Together AI. ZAKI does not provide legal, medical, tax, financial,
                or other licensed professional advice.
              </p>
            </LegalSection>

            <LegalSection title="4) Billing, access codes, and plan status">
              <p>
                Access codes and paid plans grant time-limited usage rights under the plan terms shown
                in the app.
              </p>
              <p>
                Expired or invalid access codes may restrict chat features until a valid entitlement is
                restored.
              </p>
              <p>
                You can manage subscription status and account lifecycle controls in Settings,
                including cancellation and account deletion.
              </p>
            </LegalSection>

            <LegalSection title="5) Privacy, GDPR, and data processing">
              <p>
                We are committed to GDPR compliance and process personal data needed to operate and
                secure ZAKI in line with GDPR principles (lawfulness, fairness, transparency, purpose
                limitation, minimization, accuracy, storage limitation, integrity, and
                confidentiality).
              </p>
              <p>Data categories include:</p>
              <ul className="list-disc space-y-1 pl-5 marker:text-zaki-brand">
                <li>Account data (email, profile, auth/session metadata).</li>
                <li>User content (chat prompts, responses, memory context, uploaded references).</li>
                <li>Operational data (diagnostics, abuse-prevention signals, and service logs).</li>
                <li>Billing metadata required for entitlement and payment reconciliation.</li>
              </ul>
              <p>
                We use this data for service delivery, reliability, security, support, compliance,
                product improvement, and fraud prevention.
              </p>
              <p>
                Service chain and roles: <span className="font-semibold">ZAKI → TYP → Together AI</span>.
                ZAKI and TYP are our systems. Together AI is used for inference processing. We send
                only the data needed to fulfill the request.
              </p>
              <p>
                Legal bases may include performance of contract, legitimate interests, legal
                obligations, and consent where applicable.
              </p>
            </LegalSection>

            <LegalSection title="6) International transfers and your GDPR rights">
              <p>
                Your data may be processed in countries outside your home jurisdiction, including
                through our infrastructure and subprocessors. Where GDPR applies, we use appropriate
                transfer safeguards (such as contractual safeguards) as required by law.
              </p>
              <p>You can request, subject to applicable law:</p>
              <ul className="list-disc space-y-1 pl-5 marker:text-zaki-brand">
                <li>Access to personal data we hold about you.</li>
                <li>Correction of inaccurate or incomplete data.</li>
                <li>Deletion or restriction of processing.</li>
                <li>Data portability for data you provided.</li>
                <li>Objection to certain processing activities.</li>
                <li>Withdrawal of consent where processing relies on consent.</li>
              </ul>
              <p>
                You may also lodge a complaint with your supervisory authority where applicable.
              </p>
            </LegalSection>

            <LegalSection title="7) Retention and deletion">
              <p>
                We keep data for as long as needed to provide the service and meet legal, tax, fraud
                prevention, and security obligations.
              </p>
              <p>
                You can request access, correction, export, or deletion of your data. Deleting your
                account permanently removes account access and triggers data deletion workflows, subject
                to required legal retention.
              </p>
            </LegalSection>

            <LegalSection title="8) Security controls">
              <p>
                We implement technical and organizational safeguards intended to keep data secure,
                including encryption in transit, controlled access, credential/secret protections,
                logging/monitoring, and role-based internal access controls.
              </p>
              <p>
                No online service can guarantee absolute security. You agree to notify us promptly if
                you suspect unauthorized account use.
              </p>
            </LegalSection>

            <LegalSection title="9) Third-party AI models and open-source licensing">
              <p>
                Our current inference provider is Together AI. We currently configure models that are
                labeled as Apache-2.0 licensed in the provider catalog at deployment time.
              </p>
              <p>
                Model availability and license metadata can change over time. We may update model
                routing and notices as needed for compliance and reliability.
              </p>
              <p>
                You remain responsible for reviewing outputs before use in legal, financial, medical,
                safety-critical, or other high-stakes decisions.
              </p>
            </LegalSection>

            <LegalSection title="10) Geographic use and legal requests">
              <p>
                You are responsible for complying with local laws where you access ZAKI. We may
                disclose limited data when required by valid legal process.
              </p>
            </LegalSection>

            <LegalSection title="11) Liability limits">
              <p>
                To the maximum extent permitted by law, ZAKI is provided on an "as is" and "as
                available" basis without warranties of uninterrupted availability or fitness for a
                specific purpose.
              </p>
              <p>
                Our aggregate liability is limited to amounts paid by you for the service in the 12
                months before the claim, where such limitation is legally enforceable.
              </p>
            </LegalSection>

            <LegalSection title="12) Children's privacy">
              <p>
                ZAKI is not directed to children under 13, and we do not knowingly collect personal
                data from children under 13.
              </p>
              <p>
                If you believe a child has provided personal data, contact us and we will investigate
                and delete the data where required.
              </p>
            </LegalSection>

            <LegalSection title="13) Governing law and disputes">
              <p>
                These terms are governed by applicable law in your region, without prejudice to
                non-waivable consumer protections.
              </p>
              <p>
                Before formal proceedings, you agree to contact us first so we can attempt to resolve
                the dispute in good faith.
              </p>
            </LegalSection>

            <LegalSection title="14) Contact and policy requests">
              <p>
                For legal, privacy, or compliance requests, contact{" "}
                <a className="text-zaki-brand hover:underline font-semibold" href={`mailto:${legalEmail}`}>
                  {legalEmail}
                </a>
                .
              </p>
              <p>
                Include the account email, request type (access, correction, deletion, export), and
                relevant context so we can process your request quickly.
              </p>
            </LegalSection>
          </div>
        </div>
      </div>
    </div>
  );
}
