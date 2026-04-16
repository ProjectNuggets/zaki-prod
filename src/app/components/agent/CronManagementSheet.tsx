import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Clock3,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAgentCron,
  createAgentCron,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { EmptyState, InlineConfirm, SheetShell } from "@/app/components/ui/zaki";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type CronJob = {
  id: string;
  expression: string;
  name: string | null;
  prompt: string | null;
  command: string;
  job_type: string;
  paused: boolean;
  enabled: boolean;
  one_shot: boolean;
  next_run_secs: number | null;
  last_run_secs: number | null;
  last_status: string | null;
  last_output: string | null;
  consecutive_failures: number;
  created_at_s: number;
};

function formatUnixTs(secs: number | null | undefined) {
  if (typeof secs !== "number" || secs <= 0) return "\u2014";
  const d = new Date(secs * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(job: CronJob) {
  if (job.paused || !job.enabled) {
    return { label: "paused", color: "bg-zaki-hover text-zaki-secondary" };
  }
  if (job.consecutive_failures > 0) {
    return { label: `${job.consecutive_failures} failures`, color: "bg-zaki-brand/10 text-zaki-brand" };
  }
  if (job.last_status === "ok" || job.last_status === "success") {
    return { label: "healthy", color: "bg-zaki-accent/15 text-zaki-accent" };
  }
  return { label: "pending", color: "bg-zaki-hover text-zaki-secondary" };
}

/** Fetch current jobs array from the API (via BFF). */
async function fetchCurrentJobs(): Promise<CronJob[]> {
  const { data } = await listAgentCron();
  const raw = (data as { jobs?: CronJob[] })?.jobs ?? (Array.isArray(data) ? data : []);
  return raw as CronJob[];
}

/**
 * All cron mutations use read-modify-write: fetch all jobs, mutate the array,
 * POST the full array back. This is required because nullalis only has a bulk
 * replace API (replaceJobsJson) — there is no per-job PATCH/DELETE endpoint.
 */
async function postFullJobsArray(jobs: CronJob[]) {
  await createAgentCron(jobs as unknown[]);
}

export function CronManagementSheet({ isOpen, onClose }: Props) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [newExpression, setNewExpression] = useState("0 */6 * * *");
  const [newPrompt, setNewPrompt] = useState("");
  const [newName, setNewName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setNewExpression("0 */6 * * *");
    setNewPrompt("");
    setNewName("");
    setEditingJobId(null);
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await fetchCurrentJobs());
    } catch {
      toast.error("Failed to load cron jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadJobs();
  }, [isOpen, loadJobs]);

  const handleEdit = useCallback((job: CronJob) => {
    setEditingJobId(job.id);
    setNewExpression(job.expression);
    setNewPrompt(job.prompt ?? "");
    setNewName(job.name ?? "");
    setShowForm(true);
  }, []);

  const handleTogglePause = useCallback(
    async (job: CronJob) => {
      setActionInProgress(`toggle:${job.id}`);
      try {
        const current = await fetchCurrentJobs();
        const updated = current.map((j) =>
          j.id === job.id ? { ...j, paused: !j.paused } : j
        );
        await postFullJobsArray(updated);
        setJobs(updated);
        toast.success(job.paused ? "Job resumed" : "Job paused");
      } catch {
        toast.error("Failed to update job");
      } finally {
        setActionInProgress(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setActionInProgress(`delete:${id}`);
      try {
        const current = await fetchCurrentJobs();
        const filtered = current.filter((j) => j.id !== id);
        await postFullJobsArray(filtered);
        setJobs(filtered);
        toast.success("Job deleted");
      } catch {
        toast.error("Failed to delete job");
      } finally {
        setActionInProgress(null);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    const expr = newExpression.trim();
    const prompt = newPrompt.trim();
    if (!expr || !prompt) {
      toast.error("Schedule and prompt are required");
      return;
    }
    setActionInProgress(editingJobId ? "update" : "create");
    try {
      const current = await fetchCurrentJobs();
      let updated: CronJob[];
      if (editingJobId) {
        updated = current.map((j) =>
          j.id === editingJobId
            ? { ...j, expression: expr, prompt, name: newName.trim() || null }
            : j
        );
      } else {
        const newJob = {
          expression: expr,
          prompt,
          name: newName.trim() || null,
          job_type: "agent",
        };
        updated = [...current, newJob as unknown as CronJob];
      }
      await postFullJobsArray(updated);
      resetForm();
      setShowForm(false);
      toast.success(editingJobId ? "Cron job updated" : "Cron job created");
      loadJobs();
    } catch {
      toast.error(editingJobId ? "Failed to update cron job" : "Failed to create cron job");
    } finally {
      setActionInProgress(null);
    }
  }, [newExpression, newPrompt, newName, editingJobId, resetForm, loadJobs]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Scheduled Jobs"
      icon={<Clock3 className="size-4" />}
      description="Manage your agent cron jobs"
      padded={false}
    >
      <div className="px-4 py-3">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
            title="New job"
            aria-label="New cron job"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {showForm && (
            <div className="mb-4 rounded-zaki-xl border border-zaki-strong bg-zaki-elevated p-3 dark:bg-[#1a1714]">
              <div className="mb-2 font-display text-xs font-bold text-zaki-primary">
                {editingJobId ? "Edit Cron Job" : "New Cron Job"}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]"
                />
                <input
                  type="text"
                  placeholder="Cron expression (e.g. 0 */6 * * *)"
                  value={newExpression}
                  onChange={(e) => setNewExpression(e.target.value)}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs font-mono-ui text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]"
                />
                <textarea
                  placeholder="Agent prompt. What should ZAKI do?"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === "create" || actionInProgress === "update"}
                    onClick={handleSave}
                    className="rounded-full bg-zaki-brand px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {actionInProgress === "create" || actionInProgress === "update" ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        {editingJobId ? "Updating..." : "Creating..."}
                      </span>
                    ) : (
                      editingJobId ? "Update" : "Create"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="rounded-full border border-zaki-strong px-4 py-2 text-xs text-zaki-primary transition-colors hover:bg-zaki-hover"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zaki-brand" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<Calendar className="size-5" />}
              title="No scheduled jobs"
              helper="Let ZAKI work on a recurring schedule."
              action={
                <button
                  type="button"
                  className="rounded-full bg-zaki-brand px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                >
                  Create a job
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map((job) => {
                const badge = statusBadge(job);
                return (
                  <div
                    key={job.id}
                    className="group rounded-zaki-xl border border-zaki-strong bg-zaki-elevated p-3 text-xs transition-colors hover:border-zaki-accent/40 dark:bg-[#1a1714]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 shrink-0 text-zaki-accent" />
                          <span className="font-medium truncate text-zaki-primary">
                            {job.name || job.prompt?.slice(0, 40) || job.command?.slice(0, 40) || job.id}
                          </span>
                        </div>
                        <div className="mt-1 font-mono-ui text-[11px] text-zaki-secondary">
                          {job.expression}
                        </div>
                      </div>
                      {confirmingDeleteId === job.id ? (
                        <InlineConfirm
                          label="Delete job?"
                          disabled={actionInProgress === `delete:${job.id}`}
                          onConfirm={() => {
                            handleDelete(job.id);
                            setConfirmingDeleteId(null);
                          }}
                          onCancel={() => setConfirmingDeleteId(null)}
                        />
                      ) : (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            title="Edit"
                            disabled={!!actionInProgress}
                            onClick={() => handleEdit(job)}
                            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                            aria-label="Edit cron job"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title={job.paused ? "Resume" : "Pause"}
                            disabled={!!actionInProgress}
                            onClick={() => handleTogglePause(job)}
                            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                            aria-label={job.paused ? "Resume cron job" : "Pause cron job"}
                          >
                            {actionInProgress === `toggle:${job.id}` ? (
                              <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
                            ) : job.paused ? (
                              <Play className="size-3.5" />
                            ) : (
                              <Pause className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={!!actionInProgress}
                            onClick={() => setConfirmingDeleteId(job.id)}
                            className="rounded-full p-1.5 text-zaki-brand transition-colors hover:bg-zaki-brand/10"
                            aria-label="Delete cron job"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {job.prompt && (
                      <div className="mt-1.5 line-clamp-2 text-[11px] text-zaki-secondary">
                        {job.prompt}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          badge.color
                        )}
                      >
                        {badge.label}
                      </span>
                      {job.next_run_secs && (
                        <span className="flex items-center gap-0.5 text-zaki-secondary">
                          <Clock3 className="size-3" />
                          next: <span className="font-mono-ui">{formatUnixTs(job.next_run_secs)}</span>
                        </span>
                      )}
                      {job.last_run_secs && (
                        <span className="text-zaki-secondary">
                          last: <span className="font-mono-ui">{formatUnixTs(job.last_run_secs)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </SheetShell>
  );
}
