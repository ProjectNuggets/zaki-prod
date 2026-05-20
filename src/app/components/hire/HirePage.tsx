import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  User,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchUsageQuota } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  createHireManualLead,
  fireHireApplication,
  generateHireLead,
  getHireHealth,
  getHireProfile,
  getHireStatus,
  hireKeys,
  ingestHireGithub,
  ingestHirePortfolio,
  ingestHireResume,
  listHireLeads,
  previewHireApplication,
  readHireLeadForm,
  reevaluateHireLeads,
  scanHireFreeSources,
  startHireLeadPipeline,
  startHireScan,
  stopHireScan,
  updateHireCandidate,
  updateHireIdentity,
  updateHireLeadFollowup,
  updateHireLeadStatus,
  type HireHealth,
  type HireLead,
  type HireLeadStatus,
  type HireProfile,
} from "@/lib/hireApi";

type HireView = "dashboard" | "pipeline" | "profile" | "import" | "activity";
type HireIdentityDraft = {
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
  city: string;
};

const HIRE_VIEWS: Array<{ view: HireView; label: string; icon: ReactNode }> = [
  { view: "dashboard", label: "Dashboard", icon: <Activity className="size-4" /> },
  { view: "pipeline", label: "Pipeline", icon: <BriefcaseBusiness className="size-4" /> },
  { view: "profile", label: "Profile", icon: <User className="size-4" /> },
  { view: "import", label: "Import", icon: <Upload className="size-4" /> },
  { view: "activity", label: "Activity", icon: <Clock3 className="size-4" /> },
];

const LEAD_STATUSES: HireLeadStatus[] = [
  "discovered",
  "evaluating",
  "tailoring",
  "approved",
  "applied",
  "interviewing",
  "rejected",
  "discarded",
];

function normalizeHireView(value: string | null): HireView {
  const normalized = String(value || "dashboard").trim().toLowerCase();
  if (["pipeline", "profile", "import", "activity"].includes(normalized)) {
    return normalized as HireView;
  }
  return "dashboard";
}

function leadId(lead: HireLead | null | undefined) {
  return String(lead?.job_id || lead?.id || "").trim();
}

function normalizeLeads(payload: HireLead[] | { items?: HireLead[]; total?: number } | undefined) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function profileCandidate(profile: HireProfile | undefined) {
  const candidate = profile?.candidate || {};
  return {
    n: String(profile?.n || candidate.n || candidate.name || ""),
    s: String(profile?.s || candidate.s || candidate.summary || ""),
  };
}

function profileIdentity(profile: HireProfile | undefined): HireIdentityDraft {
  return {
    email: String(profile?.identity?.email || ""),
    phone: String(profile?.identity?.phone || ""),
    linkedin_url: String(profile?.identity?.linkedin_url || ""),
    github_url: String(profile?.identity?.github_url || ""),
    website_url: String(profile?.identity?.website_url || ""),
    city: String(profile?.identity?.city || ""),
  };
}

function profileSignalCount(profile: HireProfile | undefined) {
  if (!profile) return 0;
  const experience = profile.exp || profile.experience || [];
  return [
    profileCandidate(profile).n,
    profileCandidate(profile).s,
    profile.skills?.length,
    experience.length,
    profile.projects?.length,
    profile.education?.length,
    profile.certifications?.length,
    profile.achievements?.length,
  ].filter(Boolean).length;
}

function statusTone(status: string | undefined) {
  const normalized = String(status || "unknown").toLowerCase();
  if (["approved", "applied", "interviewing", "accepted"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (["tailoring", "evaluating", "matched"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200";
  }
  if (["rejected", "discarded"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
  }
  return "border-zaki-subtle bg-zaki-base text-zaki-secondary dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#c9b8a4]";
}

function scoreTone(score: number | undefined) {
  const value = Number(score || 0);
  if (value >= 80) return "text-emerald-700 dark:text-emerald-300";
  if (value >= 60) return "text-amber-700 dark:text-amber-300";
  return "text-zaki-secondary dark:text-[#c9b8a4]";
}

function shortDate(value: string | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isHealthy(health: HireHealth | undefined) {
  return ["alive", "ok"].includes(String(health?.status || "").toLowerCase());
}

function extractError(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-zaki-muted dark:text-[#a89684]">
          {label}
        </div>
        <div className="flex size-8 items-center justify-center rounded-zaki-md bg-zaki-hover text-zaki-brand dark:bg-[#1d1712]">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{value}</div>
      <div className="mt-1 text-xs text-zaki-secondary dark:text-[#c9b8a4]">{detail}</div>
    </div>
  );
}

function HireStatusChip({ status }: { status: string | undefined }) {
  return (
    <span className={cn("inline-flex items-center rounded-zaki-md border px-2 py-1 text-xs font-semibold", statusTone(status))}>
      {status || "unknown"}
    </span>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-zaki-md border border-dashed border-zaki-strong bg-zaki-base p-6 text-center dark:border-[#3a3026] dark:bg-[#14100d]">
      <p className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</p>
      <p className="mt-2 text-sm text-zaki-secondary dark:text-[#c9b8a4]">{body}</p>
    </div>
  );
}

export function HirePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = normalizeHireView(searchParams.get("view"));
  const [leadSearch, setLeadSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [manualLeadText, setManualLeadText] = useState("");
  const [manualLeadUrl, setManualLeadUrl] = useState("");
  const [resumeRaw, setResumeRaw] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [githubUsername, setGithubUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [automationConsent, setAutomationConsent] = useState(false);
  const [lastResult, setLastResult] = useState<{ title: string; payload: unknown } | null>(null);
  const [candidateDraft, setCandidateDraft] = useState({ n: "", s: "" });
  const [identityDraft, setIdentityDraft] = useState(profileIdentity(undefined));

  const healthQuery = useQuery({
    queryKey: hireKeys.health,
    queryFn: getHireHealth,
    retry: 1,
    staleTime: 30_000,
  });
  const statusQuery = useQuery({
    queryKey: hireKeys.status,
    queryFn: getHireStatus,
    retry: 1,
    refetchInterval: 10_000,
  });
  const leadsQuery = useQuery({
    queryKey: [...hireKeys.leads, statusFilter, minScore],
    queryFn: () =>
      listHireLeads({
        status: statusFilter === "all" ? undefined : statusFilter,
        minScore: minScore > 0 ? minScore : undefined,
        limit: 500,
      }),
    retry: 1,
  });
  const profileQuery = useQuery({
    queryKey: hireKeys.profile,
    queryFn: getHireProfile,
    retry: 1,
  });
  const quotaQuery = useQuery({
    queryKey: hireKeys.quota,
    queryFn: async () => {
      const { data } = await fetchUsageQuota("hire");
      return data;
    },
    retry: 1,
  });

  const leads = useMemo(() => normalizeLeads(leadsQuery.data), [leadsQuery.data]);
  const filteredLeads = useMemo(() => {
    const needle = leadSearch.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [lead.title, lead.company, lead.platform, lead.location, lead.reason]
        .some((value) => String(value || "").toLowerCase().includes(needle)),
    );
  }, [leadSearch, leads]);
  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => leadId(lead) === selectedLeadId) || filteredLeads[0] || null,
    [filteredLeads, selectedLeadId],
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const status = String(lead.status || "unknown");
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    return counts;
  }, [leads]);

  const approvedCount = leads.filter((lead) =>
    ["approved", "applied", "interviewing", "accepted"].includes(String(lead.status || "")),
  ).length;
  const generatedCount = leads.filter((lead) => lead.resume_asset || lead.cover_letter_asset || lead.asset).length;
  const dueFollowups = leads.filter((lead) => {
    if (!lead.followup_due_at) return false;
    const due = new Date(lead.followup_due_at).getTime();
    return !Number.isNaN(due) && due <= Date.now();
  }).length;
  const profileSignals = profileSignalCount(profileQuery.data);
  const quota = quotaQuery.data;

  useEffect(() => {
    if (!selectedLeadId || !filteredLeads.some((lead) => leadId(lead) === selectedLeadId)) {
      setSelectedLeadId(leadId(filteredLeads[0]) || "");
    }
  }, [filteredLeads, selectedLeadId]);

  useEffect(() => {
    if (!profileQuery.data) return;
    setCandidateDraft(profileCandidate(profileQuery.data));
    setIdentityDraft(profileIdentity(profileQuery.data));
  }, [profileQuery.data]);

  const invalidateHire = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hire"] }),
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
    ]);
  };

  const setView = (view: HireView) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    setSearchParams(next);
  };

  const scanMutation = useMutation({
    mutationFn: startHireScan,
    onSuccess: (payload) => {
      toast.success("Hire scan started.");
      setLastResult({ title: "Scan", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const stopScanMutation = useMutation({
    mutationFn: stopHireScan,
    onSuccess: (payload) => {
      toast.success("Stop requested.");
      setLastResult({ title: "Stop scan", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const freeScanMutation = useMutation({
    mutationFn: scanHireFreeSources,
    onSuccess: (payload) => {
      toast.success("Free-source scan completed.");
      setLastResult({ title: "Free-source scan", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const reevaluateMutation = useMutation({
    mutationFn: reevaluateHireLeads,
    onSuccess: (payload) => {
      toast.success("Re-evaluation started.");
      setLastResult({ title: "Re-evaluate", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const manualLeadMutation = useMutation({
    mutationFn: () => createHireManualLead({ text: manualLeadText, url: manualLeadUrl }),
    onSuccess: (lead) => {
      toast.success("Lead added.");
      setManualLeadText("");
      setManualLeadUrl("");
      setSelectedLeadId(leadId(lead));
      setLastResult({ title: "Manual lead", payload: lead });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const [candidate, identity] = await Promise.all([
        updateHireCandidate(candidateDraft),
        updateHireIdentity(identityDraft),
      ]);
      return { candidate, identity };
    },
    onSuccess: (payload) => {
      toast.success("Hire profile saved.");
      setLastResult({ title: "Profile save", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const resumeIngestMutation = useMutation({
    mutationFn: () => ingestHireResume({ raw: resumeRaw, file: resumeFile }),
    onSuccess: (payload) => {
      toast.success("Profile context imported.");
      setResumeRaw("");
      setResumeFile(null);
      setLastResult({ title: "Resume import", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const githubIngestMutation = useMutation({
    mutationFn: () => ingestHireGithub({ username: githubUsername }),
    onSuccess: (payload) => {
      toast.success("GitHub profile import started.");
      setGithubUsername("");
      setLastResult({ title: "GitHub import", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const portfolioIngestMutation = useMutation({
    mutationFn: () => ingestHirePortfolio({ url: portfolioUrl, autoImport: true }),
    onSuccess: (payload) => {
      toast.success("Portfolio import completed.");
      setPortfolioUrl("");
      setLastResult({ title: "Portfolio import", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HireLeadStatus }) => updateHireLeadStatus(id, status),
    onSuccess: () => {
      toast.success("Lead status updated.");
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const followupMutation = useMutation({
    mutationFn: (id: string) => updateHireLeadFollowup(id, 5),
    onSuccess: (payload) => {
      toast.success("Follow-up scheduled.");
      setLastResult({ title: "Follow-up", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const generationMutation = useMutation({
    mutationFn: (id: string) => generateHireLead(id),
    onSuccess: (payload) => {
      toast.success("Generation requested.");
      setLastResult({ title: "Generate package", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const pipelineMutation = useMutation({
    mutationFn: (id: string) => startHireLeadPipeline(id),
    onSuccess: (payload) => {
      toast.success("Pipeline started.");
      setLastResult({ title: "Pipeline", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const formReadMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => readHireLeadForm(id, url),
    onSuccess: (payload) => {
      toast.success("Form analysis completed.");
      setLastResult({ title: "Form read", payload });
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const previewMutation = useMutation({
    mutationFn: (id: string) => previewHireApplication(id),
    onSuccess: (payload) => {
      toast.success("Application preview ready.");
      setLastResult({ title: "Apply preview", payload });
    },
    onError: (error) => toast.error(extractError(error)),
  });
  const fireMutation = useMutation({
    mutationFn: (id: string) => fireHireApplication(id),
    onSuccess: (payload) => {
      toast.success("Application task started.");
      setLastResult({ title: "Auto-apply", payload });
      void invalidateHire();
    },
    onError: (error) => toast.error(extractError(error)),
  });

  const selectedId = leadId(selectedLead);
  const automationDisabled = !selectedId || !automationConsent;
  const busy =
    scanMutation.isPending ||
    freeScanMutation.isPending ||
    reevaluateMutation.isPending ||
    generationMutation.isPending ||
    pipelineMutation.isPending;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbf7f0] text-zaki-primary dark:bg-[#0c0a09] dark:text-[#efe6d9]">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-3 border-b border-zaki-subtle pb-4 dark:border-[#2a2018] lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-zaki-muted dark:text-[#a89684]">
              <BriefcaseBusiness className="size-4 text-zaki-brand" />
              ZAKI Hire
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zaki-primary dark:text-[#efe6d9]">
              Job pipeline
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="zaki-btn-sm zaki-btn-secondary inline-flex items-center gap-2"
              onClick={() => void invalidateHire()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <button
              type="button"
              className="zaki-btn-sm zaki-btn-secondary inline-flex items-center gap-2"
              disabled={stopScanMutation.isPending}
              onClick={() => stopScanMutation.mutate()}
            >
              <Square className="size-4" />
              Stop
            </button>
            <button
              type="button"
              className="zaki-btn-sm zaki-btn-primary inline-flex items-center gap-2"
              disabled={scanMutation.isPending}
              onClick={() => scanMutation.mutate()}
            >
              {scanMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run scan
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Leads" value={leads.length} detail={`${approvedCount} active or approved`} icon={<BriefcaseBusiness className="size-4" />} />
          <MetricCard label="Generated" value={generatedCount} detail="Resume or cover-letter packages" icon={<FileText className="size-4" />} />
          <MetricCard label="Profile" value={`${profileSignals}/8`} detail="Candidate evidence signals" icon={<User className="size-4" />} />
          <MetricCard
            label="Quota"
            value={quota?.unlimited ? "Unlimited" : quota?.remaining ?? "?"}
            detail={quota?.unlimited ? "Plan has Hire access" : `Remaining this ${quota?.period || "period"}`}
            icon={<ShieldCheck className="size-4" />}
          />
        </section>

        <section className="rounded-zaki-md border border-zaki-subtle bg-white p-3 dark:border-[#2a2018] dark:bg-[#14100d]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-zaki-md border px-2.5 py-1.5 text-xs font-semibold",
                  isHealthy(healthQuery.data)
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                )}
              >
                {isHealthy(healthQuery.data) ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {healthQuery.isLoading ? "Checking engine" : isHealthy(healthQuery.data) ? "Engine online" : "Engine needs attention"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-zaki-md border border-zaki-subtle bg-zaki-base px-2.5 py-1.5 text-xs font-semibold text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
                <Activity className="size-3.5" />
                Scan {statusQuery.data?.scanning ? "running" : "idle"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-zaki-md border border-zaki-subtle bg-zaki-base px-2.5 py-1.5 text-xs font-semibold text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
                <RefreshCw className="size-3.5" />
                Re-eval {statusQuery.data?.reevaluating ? "running" : "idle"}
              </span>
              {dueFollowups > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-zaki-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <Clock3 className="size-3.5" />
                  {dueFollowups} due follow-up{dueFollowups === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            {healthQuery.error ? (
              <div className="text-xs text-zaki-brand">{extractError(healthQuery.error)}</div>
            ) : null}
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {HIRE_VIEWS.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-zaki-md border px-3 py-2 text-sm font-semibold transition-colors",
                activeView === item.view
                  ? "border-zaki-strong bg-zaki-primary text-white dark:border-[#efe6d9] dark:bg-[#efe6d9] dark:text-[#0c0a09]"
                  : "border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {activeView === "dashboard" ? (
          <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
            <LeadWorkbench
              leads={filteredLeads}
              selectedLead={selectedLead}
              selectedLeadId={selectedLeadId}
              leadSearch={leadSearch}
              statusFilter={statusFilter}
              minScore={minScore}
              isLoading={leadsQuery.isLoading}
              onSearch={setLeadSearch}
              onStatusFilter={setStatusFilter}
              onMinScore={setMinScore}
              onSelectLead={setSelectedLeadId}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onGenerate={(id) => generationMutation.mutate(id)}
              onPipeline={(id) => pipelineMutation.mutate(id)}
              onFollowup={(id) => followupMutation.mutate(id)}
            />
            <div className="flex min-w-0 flex-col gap-4">
              <ManualLeadPanel
                text={manualLeadText}
                url={manualLeadUrl}
                isPending={manualLeadMutation.isPending}
                onText={setManualLeadText}
                onUrl={setManualLeadUrl}
                onSubmit={() => manualLeadMutation.mutate()}
              />
              <AutomationPanel
                lead={selectedLead}
                consent={automationConsent}
                disabled={automationDisabled}
                busy={formReadMutation.isPending || previewMutation.isPending || fireMutation.isPending}
                onConsent={setAutomationConsent}
                onReadForm={(id, url) => formReadMutation.mutate({ id, url })}
                onPreview={(id) => previewMutation.mutate(id)}
                onFire={(id) => fireMutation.mutate(id)}
              />
            </div>
          </div>
        ) : null}

        {activeView === "pipeline" ? (
          <LeadWorkbench
            leads={filteredLeads}
            selectedLead={selectedLead}
            selectedLeadId={selectedLeadId}
            leadSearch={leadSearch}
            statusFilter={statusFilter}
            minScore={minScore}
            isLoading={leadsQuery.isLoading}
            onSearch={setLeadSearch}
            onStatusFilter={setStatusFilter}
            onMinScore={setMinScore}
            onSelectLead={setSelectedLeadId}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            onGenerate={(id) => generationMutation.mutate(id)}
            onPipeline={(id) => pipelineMutation.mutate(id)}
            onFollowup={(id) => followupMutation.mutate(id)}
          />
        ) : null}

        {activeView === "profile" ? (
          <ProfilePanel
            candidate={candidateDraft}
            identity={identityDraft}
            profile={profileQuery.data}
            isSaving={saveProfileMutation.isPending}
            onCandidate={setCandidateDraft}
            onIdentity={setIdentityDraft}
            onSave={() => saveProfileMutation.mutate()}
          />
        ) : null}

        {activeView === "import" ? (
          <ImportPanel
            resumeRaw={resumeRaw}
            resumeFile={resumeFile}
            githubUsername={githubUsername}
            portfolioUrl={portfolioUrl}
            resumePending={resumeIngestMutation.isPending}
            githubPending={githubIngestMutation.isPending}
            portfolioPending={portfolioIngestMutation.isPending}
            onResumeRaw={setResumeRaw}
            onResumeFile={setResumeFile}
            onGithubUsername={setGithubUsername}
            onPortfolioUrl={setPortfolioUrl}
            onResumeSubmit={() => resumeIngestMutation.mutate()}
            onGithubSubmit={() => githubIngestMutation.mutate()}
            onPortfolioSubmit={() => portfolioIngestMutation.mutate()}
          />
        ) : null}

        {activeView === "activity" ? (
          <ActivityPanel
            statusCounts={statusCounts}
            health={healthQuery.data}
            status={statusQuery.data}
            lastResult={lastResult}
            busy={busy}
            onFreeSourceScan={() => freeScanMutation.mutate()}
            onReevaluate={() => reevaluateMutation.mutate()}
          />
        ) : null}
      </div>
    </div>
  );
}

function LeadWorkbench({
  leads,
  selectedLead,
  selectedLeadId,
  leadSearch,
  statusFilter,
  minScore,
  isLoading,
  onSearch,
  onStatusFilter,
  onMinScore,
  onSelectLead,
  onStatusChange,
  onGenerate,
  onPipeline,
  onFollowup,
}: {
  leads: HireLead[];
  selectedLead: HireLead | null;
  selectedLeadId: string;
  leadSearch: string;
  statusFilter: string;
  minScore: number;
  isLoading: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onMinScore: (value: number) => void;
  onSelectLead: (id: string) => void;
  onStatusChange: (id: string, status: HireLeadStatus) => void;
  onGenerate: (id: string) => void;
  onPipeline: (id: string) => void;
  onFollowup: (id: string) => void;
}) {
  return (
    <section className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
      <div className="rounded-zaki-md border border-zaki-subtle bg-white dark:border-[#2a2018] dark:bg-[#14100d]">
        <div className="border-b border-zaki-subtle p-3 dark:border-[#2a2018]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zaki-muted" />
              <input
                value={leadSearch}
                onChange={(event) => onSearch(event.target.value)}
                className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-base py-2 pl-9 pr-3 text-sm text-zaki-primary outline-none transition focus:border-zaki-accent dark:border-[#3a3026] dark:bg-[#0c0a09] dark:text-[#efe6d9]"
                placeholder="Search leads"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilter(event.target.value)}
              className="rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm text-zaki-primary outline-none dark:border-[#3a3026] dark:bg-[#0c0a09] dark:text-[#efe6d9]"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(event) => onMinScore(Number(event.target.value || 0))}
              className="w-24 rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm text-zaki-primary outline-none dark:border-[#3a3026] dark:bg-[#0c0a09] dark:text-[#efe6d9]"
              aria-label="Minimum score"
            />
          </div>
        </div>
        <div className="max-h-[680px] overflow-y-auto p-2 zaki-scrollbar-fade">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
              <Loader2 className="size-4 animate-spin" />
              Loading leads
            </div>
          ) : leads.length === 0 ? (
            <EmptyState title="No leads yet" body="Add a manual lead or run a scan to populate this tenant pipeline." />
          ) : (
            <div className="flex flex-col gap-2">
              {leads.map((lead) => {
                const id = leadId(lead);
                const active = id === selectedLeadId;
                return (
                  <button
                    key={id || `${lead.title}-${lead.company}`}
                    type="button"
                    onClick={() => onSelectLead(id)}
                    className={cn(
                      "w-full rounded-zaki-md border p-3 text-left transition-colors",
                      active
                        ? "border-zaki-strong bg-zaki-selected dark:border-[#5c4735] dark:bg-[#1d1712]"
                        : "border-transparent hover:border-zaki-subtle hover:bg-zaki-hover dark:hover:border-[#2a2018] dark:hover:bg-[#1d1712]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">
                          {lead.title || "Untitled role"}
                        </p>
                        <p className="mt-1 truncate text-xs text-zaki-secondary dark:text-[#c9b8a4]">
                          {lead.company || "Unknown company"} · {lead.platform || "source"}
                        </p>
                      </div>
                      <span className={cn("shrink-0 text-sm font-semibold", scoreTone(lead.score))}>
                        {lead.score ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <HireStatusChip status={String(lead.status || "discovered")} />
                      <span className="truncate text-xs text-zaki-muted dark:text-[#a89684]">{lead.location || lead.seniority_level || "No location"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LeadDetail
        lead={selectedLead}
        onStatusChange={onStatusChange}
        onGenerate={onGenerate}
        onPipeline={onPipeline}
        onFollowup={onFollowup}
      />
    </section>
  );
}

function LeadDetail({
  lead,
  onStatusChange,
  onGenerate,
  onPipeline,
  onFollowup,
}: {
  lead: HireLead | null;
  onStatusChange: (id: string, status: HireLeadStatus) => void;
  onGenerate: (id: string) => void;
  onPipeline: (id: string) => void;
  onFollowup: (id: string) => void;
}) {
  const id = leadId(lead);
  if (!lead || !id) {
    return (
      <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
        <EmptyState title="Select a lead" body="Lead details, generated assets, and actions appear here." />
      </div>
    );
  }
  return (
    <article className="rounded-zaki-md border border-zaki-subtle bg-white dark:border-[#2a2018] dark:bg-[#14100d]">
      <div className="border-b border-zaki-subtle p-4 dark:border-[#2a2018]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <HireStatusChip status={String(lead.status || "discovered")} />
              <span className="text-xs text-zaki-muted dark:text-[#a89684]">{id}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-zaki-primary dark:text-[#efe6d9]">{lead.title || "Untitled role"}</h2>
            <p className="mt-1 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
              {lead.company || "Unknown company"} · {lead.location || "Location not listed"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={cn("text-3xl font-semibold", scoreTone(lead.score))}>{lead.score ?? "-"}</div>
              <div className="text-xs text-zaki-muted dark:text-[#a89684]">fit score</div>
            </div>
            {lead.url ? (
              <a
                href={lead.url}
                target="_blank"
                rel="noreferrer"
                className="zaki-icon-btn size-9 rounded-zaki-md"
                aria-label="Open job"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-4">
        <div className="min-w-0 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Why it matched</h3>
            <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-[#c9b8a4]">
              {lead.reason || lead.signal_reason || "No scoring explanation was returned yet."}
            </p>
          </section>
          <TwoColumnList title="Match points" items={lead.match_points || []} empty="No match points yet." />
          <TwoColumnList title="Gaps" items={lead.gaps || []} empty="No gaps reported." />
          <section>
            <h3 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Description</h3>
            <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-zaki-md border border-zaki-subtle bg-zaki-base p-3 text-sm leading-6 text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4] zaki-scrollbar-fade">
              {lead.description || lead.text || "No description available."}
            </p>
          </section>
        </div>
        <aside className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zaki-muted dark:text-[#a89684]">Status</span>
            <select
              value={String(lead.status || "discovered")}
              onChange={(event) => onStatusChange(id, event.target.value as HireLeadStatus)}
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm text-zaki-primary outline-none dark:border-[#3a3026] dark:bg-[#0c0a09] dark:text-[#efe6d9]"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="zaki-btn-sm zaki-btn-primary flex w-full items-center justify-center gap-2" onClick={() => onGenerate(id)}>
            <Sparkles className="size-4" />
            Generate package
          </button>
          <button type="button" className="zaki-btn-sm zaki-btn-secondary flex w-full items-center justify-center gap-2" onClick={() => onPipeline(id)}>
            <Wand2 className="size-4" />
            Run pipeline
          </button>
          <button type="button" className="zaki-btn-sm zaki-btn-secondary flex w-full items-center justify-center gap-2" onClick={() => onFollowup(id)}>
            <Clock3 className="size-4" />
            Follow up in 5 days
          </button>
          <div className="rounded-zaki-md border border-zaki-subtle bg-zaki-base p-3 text-xs text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
            <div className="font-semibold text-zaki-primary dark:text-[#efe6d9]">Assets</div>
            <div className="mt-2 space-y-1">
              <div>Resume: {lead.resume_asset || lead.asset || "Not generated"}</div>
              <div>Cover letter: {lead.cover_letter_asset || "Not generated"}</div>
              <div>Follow-up: {shortDate(lead.followup_due_at)}</div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function TwoColumnList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">{title}</h3>
      {items.length ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {items.slice(0, 8).map((item) => (
            <li key={item} className="rounded-zaki-md border border-zaki-subtle bg-zaki-base px-3 py-2 text-sm text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zaki-secondary dark:text-[#c9b8a4]">{empty}</p>
      )}
    </section>
  );
}

function ManualLeadPanel({
  text,
  url,
  isPending,
  onText,
  onUrl,
  onSubmit,
}: {
  text: string;
  url: string;
  isPending: boolean;
  onText: (value: string) => void;
  onUrl: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
      <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Add lead</h2>
      <div className="mt-3 space-y-3">
        <input
          value={url}
          onChange={(event) => onUrl(event.target.value)}
          className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
          placeholder="Job URL"
        />
        <textarea
          value={text}
          onChange={(event) => onText(event.target.value)}
          className="min-h-28 w-full resize-y rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
          placeholder="Paste job text"
        />
        <button
          type="button"
          disabled={isPending || (!text.trim() && !url.trim())}
          className="zaki-btn-sm zaki-btn-primary flex w-full items-center justify-center gap-2"
          onClick={onSubmit}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <BriefcaseBusiness className="size-4" />}
          Add to pipeline
        </button>
      </div>
    </section>
  );
}

function AutomationPanel({
  lead,
  consent,
  disabled,
  busy,
  onConsent,
  onReadForm,
  onPreview,
  onFire,
}: {
  lead: HireLead | null;
  consent: boolean;
  disabled: boolean;
  busy: boolean;
  onConsent: (value: boolean) => void;
  onReadForm: (id: string, url: string) => void;
  onPreview: (id: string) => void;
  onFire: (id: string) => void;
}) {
  const id = leadId(lead);
  return (
    <section className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
      <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Automation</h2>
      <label className="mt-3 flex items-start gap-3 rounded-zaki-md border border-zaki-strong bg-zaki-base p-3 text-xs text-zaki-secondary dark:border-[#3a3026] dark:bg-[#0c0a09] dark:text-[#c9b8a4]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsent(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--zaki-brand)]"
        />
        <span>I approve this lead-specific automation action for the selected job application.</span>
      </label>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={disabled || busy || !lead?.url}
          className="zaki-btn-sm zaki-btn-secondary flex items-center justify-center gap-2"
          onClick={() => onReadForm(id, lead?.url || "")}
        >
          <FileText className="size-4" />
          Read form
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          className="zaki-btn-sm zaki-btn-secondary flex items-center justify-center gap-2"
          onClick={() => onPreview(id)}
        >
          <Search className="size-4" />
          Preview apply
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          className="zaki-btn-sm zaki-btn-primary flex items-center justify-center gap-2"
          onClick={() => onFire(id)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Auto-apply
        </button>
      </div>
    </section>
  );
}

function ProfilePanel({
  candidate,
  identity,
  profile,
  isSaving,
  onCandidate,
  onIdentity,
  onSave,
}: {
  candidate: { n: string; s: string };
  identity: HireIdentityDraft;
  profile: HireProfile | undefined;
  isSaving: boolean;
  onCandidate: (value: { n: string; s: string }) => void;
  onIdentity: (value: HireIdentityDraft) => void;
  onSave: () => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Candidate profile</h2>
          <button
            type="button"
            disabled={isSaving || (!candidate.n.trim() && !candidate.s.trim())}
            className="zaki-btn-sm zaki-btn-primary inline-flex items-center gap-2"
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-zaki-muted dark:text-[#a89684]">Name</span>
            <input
              value={candidate.n}
              onChange={(event) => onCandidate({ ...candidate, n: event.target.value })}
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-zaki-muted dark:text-[#a89684]">Email</span>
            <input
              value={identity.email || ""}
              onChange={(event) => onIdentity({ ...identity, email: event.target.value })}
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-zaki-muted dark:text-[#a89684]">Summary</span>
            <textarea
              value={candidate.s}
              onChange={(event) => onCandidate({ ...candidate, s: event.target.value })}
              className="mt-1 min-h-32 w-full resize-y rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
            />
          </label>
          {(["phone", "linkedin_url", "github_url", "website_url", "city"] as const).map((key) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold text-zaki-muted dark:text-[#a89684]">{key.replace(/_/g, " ")}</span>
              <input
                value={String(identity[key] || "")}
                onChange={(event) => onIdentity({ ...identity, [key]: event.target.value })}
                className="mt-1 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
              />
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
        <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Evidence</h2>
        <div className="mt-3 grid gap-2 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
          <div className="flex justify-between"><span>Skills</span><span>{profile?.skills?.length || 0}</span></div>
          <div className="flex justify-between"><span>Experience</span><span>{(profile?.exp || profile?.experience || []).length}</span></div>
          <div className="flex justify-between"><span>Projects</span><span>{profile?.projects?.length || 0}</span></div>
          <div className="flex justify-between"><span>Education</span><span>{profile?.education?.length || 0}</span></div>
          <div className="flex justify-between"><span>Certifications</span><span>{profile?.certifications?.length || 0}</span></div>
          <div className="flex justify-between"><span>Achievements</span><span>{profile?.achievements?.length || 0}</span></div>
        </div>
      </div>
    </section>
  );
}

function ImportPanel({
  resumeRaw,
  resumeFile,
  githubUsername,
  portfolioUrl,
  resumePending,
  githubPending,
  portfolioPending,
  onResumeRaw,
  onResumeFile,
  onGithubUsername,
  onPortfolioUrl,
  onResumeSubmit,
  onGithubSubmit,
  onPortfolioSubmit,
}: {
  resumeRaw: string;
  resumeFile: File | null;
  githubUsername: string;
  portfolioUrl: string;
  resumePending: boolean;
  githubPending: boolean;
  portfolioPending: boolean;
  onResumeRaw: (value: string) => void;
  onResumeFile: (file: File | null) => void;
  onGithubUsername: (value: string) => void;
  onPortfolioUrl: (value: string) => void;
  onResumeSubmit: () => void;
  onGithubSubmit: () => void;
  onPortfolioSubmit: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
        <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Resume and notes</h2>
        <textarea
          value={resumeRaw}
          onChange={(event) => onResumeRaw(event.target.value)}
          className="mt-3 min-h-60 w-full resize-y rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
          placeholder="Paste resume, profile notes, or role preferences"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(event) => onResumeFile(event.target.files?.[0] || null)}
            className="text-sm text-zaki-secondary dark:text-[#c9b8a4]"
          />
          <button
            type="button"
            disabled={resumePending || (!resumeRaw.trim() && !resumeFile)}
            onClick={onResumeSubmit}
            className="zaki-btn-sm zaki-btn-primary inline-flex items-center justify-center gap-2"
          >
            {resumePending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import profile
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
          <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">GitHub</h2>
          <input
            value={githubUsername}
            onChange={(event) => onGithubUsername(event.target.value)}
            className="mt-3 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
            placeholder="GitHub username"
          />
          <button
            type="button"
            disabled={githubPending || !githubUsername.trim()}
            onClick={onGithubSubmit}
            className="zaki-btn-sm zaki-btn-secondary mt-3 flex w-full items-center justify-center gap-2"
          >
            {githubPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import GitHub
          </button>
        </div>
        <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
          <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Portfolio</h2>
          <input
            value={portfolioUrl}
            onChange={(event) => onPortfolioUrl(event.target.value)}
            className="mt-3 w-full rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-sm outline-none dark:border-[#3a3026] dark:bg-[#0c0a09]"
            placeholder="https://portfolio.example"
          />
          <button
            type="button"
            disabled={portfolioPending || !portfolioUrl.trim()}
            onClick={onPortfolioSubmit}
            className="zaki-btn-sm zaki-btn-secondary mt-3 flex w-full items-center justify-center gap-2"
          >
            {portfolioPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import portfolio
          </button>
        </div>
      </div>
    </section>
  );
}

function ActivityPanel({
  statusCounts,
  health,
  status,
  lastResult,
  busy,
  onFreeSourceScan,
  onReevaluate,
}: {
  statusCounts: Map<string, number>;
  health: HireHealth | undefined;
  status: { scanning?: boolean; reevaluating?: boolean } | undefined;
  lastResult: { title: string; payload: unknown } | null;
  busy: boolean;
  onFreeSourceScan: () => void;
  onReevaluate: () => void;
}) {
  const counts = Array.from(statusCounts.entries());
  return (
    <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
          <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Operations</h2>
          <div className="mt-3 grid gap-2">
            <button type="button" disabled={busy} className="zaki-btn-sm zaki-btn-secondary inline-flex items-center justify-center gap-2" onClick={onFreeSourceScan}>
              <Search className="size-4" />
              Scan free sources
            </button>
            <button type="button" disabled={busy} className="zaki-btn-sm zaki-btn-secondary inline-flex items-center justify-center gap-2" onClick={onReevaluate}>
              <RefreshCw className="size-4" />
              Re-evaluate leads
            </button>
          </div>
        </div>
        <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
          <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Task status</h2>
          <div className="mt-3 space-y-2 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
            <div className="flex justify-between"><span>Scan</span><span>{status?.scanning ? "running" : "idle"}</span></div>
            <div className="flex justify-between"><span>Re-evaluation</span><span>{status?.reevaluating ? "running" : "idle"}</span></div>
            <div className="flex justify-between"><span>Engine</span><span>{health?.status || "unknown"}</span></div>
          </div>
        </div>
      </div>
      <div className="rounded-zaki-md border border-zaki-subtle bg-white p-4 dark:border-[#2a2018] dark:bg-[#14100d]">
        <h2 className="text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Pipeline counts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {counts.length ? counts.map(([key, value]) => (
            <span key={key} className={cn("inline-flex items-center gap-2 rounded-zaki-md border px-2.5 py-1.5 text-xs font-semibold", statusTone(key))}>
              {key} <span>{value}</span>
            </span>
          )) : <span className="text-sm text-zaki-secondary dark:text-[#c9b8a4]">No lead statuses yet.</span>}
        </div>
        <h2 className="mt-6 text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">Last result</h2>
        {lastResult ? (
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-zaki-md border border-zaki-subtle bg-zaki-base p-3 text-xs text-zaki-secondary dark:border-[#2a2018] dark:bg-[#0c0a09] dark:text-[#c9b8a4] zaki-scrollbar-fade">
            {lastResult.title}
            {"\n"}
            {JSON.stringify(lastResult.payload, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-zaki-secondary dark:text-[#c9b8a4]">Run an action to see its response payload.</p>
        )}
      </div>
    </section>
  );
}
