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
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAgentCron,
  createAgentCron,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";

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
    return { label: "paused", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" };
  }
  if (job.consecutive_failures > 0) {
    return { label: `${job.consecutive_failures} failures`, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" };
  }
  if (job.last_status === "ok" || job.last_status === "success") {
    return { label: "healthy", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
  }
  return { label: "pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
}

/** Fetch current jobs array from the API. */
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
  await createAgentCron(jobs as unknown as Record<string, unknown>);
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[380px] border-l border-zinc-200 bg-white p-0 dark:border-zinc-700 dark:bg-zinc-900 sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <SheetTitle className="text-sm font-semibold">Scheduled Jobs</SheetTitle>
          <SheetDescription className="sr-only">
            Manage your agent cron jobs
          </SheetDescription>
          <div className="flex items-center gap-1">
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
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="New job"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(100vh - 60px)" }}>
          {showForm && (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="mb-2 text-xs font-semibold">
                {editingJobId ? "Edit Cron Job" : "New Cron Job"}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  type="text"
                  placeholder="Cron expression (e.g. 0 */6 * * *)"
                  value={newExpression}
                  onChange={(e) => setNewExpression(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs font-mono dark:border-zinc-600 dark:bg-zinc-900"
                />
                <textarea
                  placeholder="Agent prompt \u2014 what should ZAKI do?"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === "create" || actionInProgress === "update"}
                    onClick={handleSave}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No scheduled jobs.{" "}
              <button
                type="button"
                className="text-emerald-600 underline hover:text-emerald-700"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                Create one
              </button>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.map((job) => {
                const badge = statusBadge(job);
                return (
                  <div
                    key={job.id}
                    className="group rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 shrink-0 text-zinc-500" />
                          <span className="font-medium truncate">
                            {job.name || job.prompt?.slice(0, 40) || job.command?.slice(0, 40) || job.id}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-zinc-500">
                          {job.expression}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Edit"
                          disabled={!!actionInProgress}
                          onClick={() => handleEdit(job)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title={job.paused ? "Resume" : "Pause"}
                          disabled={!!actionInProgress}
                          onClick={() => handleTogglePause(job)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {actionInProgress === `toggle:${job.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
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
                          onClick={() => handleDelete(job.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40"
                        >
                          {actionInProgress === `delete:${job.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {job.prompt && (
                      <div className="mt-1.5 line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {job.prompt}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          badge.color
                        )}
                      >
                        {badge.label}
                      </span>
                      {job.next_run_secs && (
                        <span className="flex items-center gap-0.5 text-zinc-500">
                          <Clock3 className="size-3" />
                          next: {formatUnixTs(job.next_run_secs)}
                        </span>
                      )}
                      {job.last_run_secs && (
                        <span className="text-zinc-500">
                          last: {formatUnixTs(job.last_run_secs)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
