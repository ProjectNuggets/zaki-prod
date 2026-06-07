import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, RefreshCw, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createHireManualLead,
  fireHireApplication,
  generateHireLead,
  getHireHealth,
  getHireProfile,
  getHireReadiness,
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
import { HireMobileViewNav, HireShellHeader, HireStatusBand } from "./HireShell";
import { HireLeadDossier } from "./HireLeadDossier";
import { HireTodayCommandCenter } from "./HireTodayCommandCenter";
import {
  EmptyState,
  HireStatusChip,
  LEAD_STATUSES,
  type HireIdentityDraft,
  type HireView,
  extractError,
  hireReady,
  leadId,
  normalizeHireView,
  normalizeLeads,
  profileCandidate,
  profileIdentity,
  profileSignalCount,
  scoreTone,
  statusTone,
} from "./hireUi";
import "./hireV2.css";

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
  const readinessQuery = useQuery({
    queryKey: hireKeys.readiness,
    queryFn: getHireReadiness,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
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
  const readiness = readinessQuery.data;
  const hireActionsDisabled = readinessQuery.isLoading || readinessQuery.isError || !hireReady(readiness);

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
    <div className="zaki-hire-v2 min-h-0 flex-1 overflow-y-auto" data-v2-density="compact">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 lg:px-6">
        <HireShellHeader
          activeView={activeView}
          leadsCount={leads.length}
          approvedCount={approvedCount}
          generatedCount={generatedCount}
          profileSignals={profileSignals}
          readiness={readiness}
          readinessLoading={readinessQuery.isLoading}
          readinessError={readinessQuery.error}
          scanPending={scanMutation.isPending}
          stopPending={stopScanMutation.isPending}
          actionsDisabled={hireActionsDisabled}
          onRefresh={() => void invalidateHire()}
          onStop={() => stopScanMutation.mutate()}
          onScan={() => scanMutation.mutate()}
        />

        <HireStatusBand
          readiness={readiness}
          readinessLoading={readinessQuery.isLoading}
          readinessError={readinessQuery.error}
          health={healthQuery.data}
          healthLoading={healthQuery.isLoading}
          healthError={healthQuery.error}
          status={statusQuery.data}
          dueFollowups={dueFollowups}
        />

        <HireMobileViewNav activeView={activeView} onView={setView} />

        {activeView === "dashboard" ? (
          <HireTodayCommandCenter
            leads={filteredLeads}
            selectedLead={selectedLead}
            selectedLeadId={selectedLeadId}
            leadsLoading={leadsQuery.isLoading}
            profileSignals={profileSignals}
            generatedCount={generatedCount}
            dueFollowups={dueFollowups}
            actionsDisabled={hireActionsDisabled}
            manualLeadText={manualLeadText}
            manualLeadUrl={manualLeadUrl}
            manualLeadPending={manualLeadMutation.isPending}
            automationConsent={automationConsent}
            automationDisabled={automationDisabled || hireActionsDisabled}
            automationBusy={formReadMutation.isPending || previewMutation.isPending || fireMutation.isPending}
            onSelectLead={setSelectedLeadId}
            onManualText={setManualLeadText}
            onManualUrl={setManualLeadUrl}
            onManualSubmit={() => manualLeadMutation.mutate()}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            onGenerate={(id) => generationMutation.mutate(id)}
            onPipeline={(id) => pipelineMutation.mutate(id)}
            onFollowup={(id) => followupMutation.mutate(id)}
            onConsent={setAutomationConsent}
            onReadForm={(id, url) => formReadMutation.mutate({ id, url })}
            onPreview={(id) => previewMutation.mutate(id)}
            onFire={(id) => fireMutation.mutate(id)}
          />
        ) : null}

        {activeView === "pipeline" ? (
          <LeadWorkbench
            leads={filteredLeads}
            selectedLead={selectedLead}
            selectedLeadId={selectedLeadId}
            leadSearch={leadSearch}
            statusFilter={statusFilter}
            minScore={minScore}
            actionsDisabled={hireActionsDisabled}
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
            disabled={hireActionsDisabled}
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
            disabled={hireActionsDisabled}
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
            disabled={hireActionsDisabled}
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
  actionsDisabled,
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
  actionsDisabled: boolean;
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
      <div className="zaki-hire-panel">
        <div className="zaki-hire-rule border-b p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="zaki-hire-muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <input
                value={leadSearch}
                onChange={(event) => onSearch(event.target.value)}
                className="zaki-hire-input w-full py-2 pl-9 pr-3"
                placeholder="Search leads"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilter(event.target.value)}
              className="zaki-hire-select px-3 py-2"
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
              className="zaki-hire-input w-24 px-3 py-2"
              aria-label="Minimum score"
            />
          </div>
        </div>
        <div className="max-h-[680px] overflow-y-auto p-2 zaki-scrollbar-fade">
          {isLoading ? (
            <div className="zaki-hire-text flex items-center gap-2 p-4 text-sm">
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
                    className={cn("zaki-hire-row-button w-full p-3 text-left", active && "is-active")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="zaki-hire-num truncate text-sm font-semibold">
                          {lead.title || "Untitled role"}
                        </p>
                        <p className="zaki-hire-muted mt-1 truncate text-xs">
                          {lead.company || "Unknown company"} · {lead.platform || "source"}
                        </p>
                      </div>
                      <span className={cn("shrink-0 text-sm font-semibold", scoreTone(lead.score))}>
                        {lead.score ?? "-"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <HireStatusChip status={String(lead.status || "discovered")} />
                      <span className="zaki-hire-muted truncate text-xs">{lead.location || lead.seniority_level || "No location"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <HireLeadDossier
        lead={selectedLead}
        disabled={actionsDisabled}
        onStatusChange={onStatusChange}
        onGenerate={onGenerate}
        onPipeline={onPipeline}
        onFollowup={onFollowup}
      />
    </section>
  );
}

function ProfilePanel({
  candidate,
  identity,
  profile,
  isSaving,
  disabled,
  onCandidate,
  onIdentity,
  onSave,
}: {
  candidate: { n: string; s: string };
  identity: HireIdentityDraft;
  profile: HireProfile | undefined;
  isSaving: boolean;
  disabled: boolean;
  onCandidate: (value: { n: string; s: string }) => void;
  onIdentity: (value: HireIdentityDraft) => void;
  onSave: () => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="zaki-hire-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="zaki-hire-label-strong">Candidate profile</h2>
          <button
            type="button"
            disabled={disabled || isSaving || (!candidate.n.trim() && !candidate.s.trim())}
            className="zaki-hire-button zaki-hire-button-primary"
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="zaki-hire-label">Name</span>
            <input
              value={candidate.n}
              onChange={(event) => onCandidate({ ...candidate, n: event.target.value })}
              className="zaki-hire-input mt-1 w-full px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="zaki-hire-label">Email</span>
            <input
              value={identity.email || ""}
              onChange={(event) => onIdentity({ ...identity, email: event.target.value })}
              className="zaki-hire-input mt-1 w-full px-3 py-2"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="zaki-hire-label">Summary</span>
            <textarea
              value={candidate.s}
              onChange={(event) => onCandidate({ ...candidate, s: event.target.value })}
              className="zaki-hire-input mt-1 min-h-32 w-full resize-y px-3 py-2"
            />
          </label>
          {(["phone", "linkedin_url", "github_url", "website_url", "city"] as const).map((key) => (
            <label key={key} className="block">
              <span className="zaki-hire-label">{key.replace(/_/g, " ")}</span>
              <input
                value={String(identity[key] || "")}
                onChange={(event) => onIdentity({ ...identity, [key]: event.target.value })}
                className="zaki-hire-input mt-1 w-full px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>
      <div className="zaki-hire-panel p-4">
        <h2 className="zaki-hire-label-strong">Evidence</h2>
        <div className="zaki-hire-text mt-3 grid gap-2 text-sm">
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
  disabled,
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
  disabled: boolean;
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
      <div className="zaki-hire-panel p-4">
        <h2 className="zaki-hire-label-strong">Resume and notes</h2>
        <textarea
          value={resumeRaw}
          onChange={(event) => onResumeRaw(event.target.value)}
          className="zaki-hire-input mt-3 min-h-60 w-full resize-y px-3 py-2"
          placeholder="Paste resume, profile notes, or role preferences"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(event) => onResumeFile(event.target.files?.[0] || null)}
            className="zaki-hire-text text-sm"
          />
          <button
            type="button"
            disabled={disabled || resumePending || (!resumeRaw.trim() && !resumeFile)}
            onClick={onResumeSubmit}
            className="zaki-hire-button zaki-hire-button-primary"
          >
            {resumePending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import profile
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="zaki-hire-panel p-4">
          <h2 className="zaki-hire-label-strong">GitHub</h2>
          <input
            value={githubUsername}
            onChange={(event) => onGithubUsername(event.target.value)}
            className="zaki-hire-input mt-3 w-full px-3 py-2"
            placeholder="GitHub username"
          />
          <button
            type="button"
            disabled={disabled || githubPending || !githubUsername.trim()}
            onClick={onGithubSubmit}
            className="zaki-hire-button mt-3 flex w-full"
          >
            {githubPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import GitHub
          </button>
        </div>
        <div className="zaki-hire-panel p-4">
          <h2 className="zaki-hire-label-strong">Portfolio</h2>
          <input
            value={portfolioUrl}
            onChange={(event) => onPortfolioUrl(event.target.value)}
            className="zaki-hire-input mt-3 w-full px-3 py-2"
            placeholder="https://portfolio.example"
          />
          <button
            type="button"
            disabled={disabled || portfolioPending || !portfolioUrl.trim()}
            onClick={onPortfolioSubmit}
            className="zaki-hire-button mt-3 flex w-full"
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
  disabled,
  onFreeSourceScan,
  onReevaluate,
}: {
  statusCounts: Map<string, number>;
  health: HireHealth | undefined;
  status: { scanning?: boolean; reevaluating?: boolean } | undefined;
  lastResult: { title: string; payload: unknown } | null;
  busy: boolean;
  disabled: boolean;
  onFreeSourceScan: () => void;
  onReevaluate: () => void;
}) {
  const counts = Array.from(statusCounts.entries());
  return (
    <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="zaki-hire-panel p-4">
          <h2 className="zaki-hire-label-strong">Operations</h2>
          <div className="mt-3 grid gap-2">
            <button type="button" disabled={disabled || busy} className="zaki-hire-button" onClick={onFreeSourceScan}>
              <Search className="size-4" />
              Scan free sources
            </button>
            <button type="button" disabled={disabled || busy} className="zaki-hire-button" onClick={onReevaluate}>
              <RefreshCw className="size-4" />
              Re-evaluate leads
            </button>
          </div>
        </div>
        <div className="zaki-hire-panel p-4">
          <h2 className="zaki-hire-label-strong">Task status</h2>
          <div className="zaki-hire-text mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Scan</span><span>{status?.scanning ? "running" : "idle"}</span></div>
            <div className="flex justify-between"><span>Re-evaluation</span><span>{status?.reevaluating ? "running" : "idle"}</span></div>
            <div className="flex justify-between"><span>Engine</span><span>{health?.status || "unknown"}</span></div>
          </div>
        </div>
      </div>
      <div className="zaki-hire-panel p-4">
        <h2 className="zaki-hire-label-strong">Pipeline counts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {counts.length ? counts.map(([key, value]) => (
            <span key={key} className={cn("zaki-hire-status", statusTone(key))}>
              {key} <span>{value}</span>
            </span>
          )) : <span className="zaki-hire-text text-sm">No lead statuses yet.</span>}
        </div>
        <h2 className="zaki-hire-label-strong mt-6">Last result</h2>
        {lastResult ? (
          <pre className="zaki-hire-sunken zaki-hire-text mt-3 max-h-[420px] overflow-auto p-3 text-xs zaki-scrollbar-fade">
            {lastResult.title}
            {"\n"}
            {JSON.stringify(lastResult.payload, null, 2)}
          </pre>
        ) : (
          <p className="zaki-hire-text mt-3 text-sm">Run an action to see its response payload.</p>
        )}
      </div>
    </section>
  );
}
