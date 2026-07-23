import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import {
  createDesignProject,
  designWorkbenchUrl,
  ensureDesignSession,
  getDesignHealth,
  getDesignSession,
  listDesignProjects,
  type DesignProject,
  type DesignSessionResponse,
} from "@/lib/designApi";

const TERMINAL_STATES = new Set(["READY", "ACTIVE", "IDLE", "STOPPED", "FAILED"]);
const DEFAULT_PROJECT_NAME = "My designs";

// Clicking the Design icon lands the user straight in the Open Design workbench home — no project
// picker mid-step. B1 gives one session per user serving ALL their projects out of one workspace, so
// the old "choose a project to start its isolated workspace" list is redundant: we auto-open the most
// recent project (or seed a default when there are none) and let Open Design's own home + project
// switcher (inside the iframe) take over. Project management + session controls live in Open Design;
// leaving Design happens via the app rail.
export function DesignPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);
  const [initialSession, setInitialSession] = useState<DesignSessionResponse | null>(null);

  const health = useQuery({ queryKey: ["design", "health"], queryFn: getDesignHealth, retry: false });
  const projects = useQuery({ queryKey: ["design", "projects"], queryFn: listDesignProjects });

  const openSession = useMutation({
    mutationFn: (project: DesignProject) => ensureDesignSession(project.id),
    onMutate: (project) => {
      setSelectedProject(project);
      setInitialSession(null);
    },
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: ["design", "session"] });
      setInitialSession(result);
    },
  });
  const createProject = useMutation({
    mutationFn: createDesignProject,
    onSuccess: ({ project }) => {
      void queryClient.invalidateQueries({ queryKey: ["design", "projects"] });
      openSession.mutate(project);
    },
  });

  // Auto-open on entry — fires once, after the engine reports ready and the project list has loaded.
  const autoOpenStartedRef = useRef(false);
  useEffect(() => {
    if (autoOpenStartedRef.current || selectedProject) return;
    if (health.data?.ok !== true || projects.isLoading) return;
    if (openSession.isPending || createProject.isPending) return;
    autoOpenStartedRef.current = true;
    const recent = projects.data?.projects?.[0];
    if (recent) openSession.mutate(recent);
    else createProject.mutate({ name: DEFAULT_PROJECT_NAME });
  }, [health.data?.ok, projects.isLoading, projects.data, selectedProject, openSession, createProject]);

  const seedSession = initialSession?.session ?? null;
  const sessionStatus = useQuery({
    queryKey: ["design", "session", seedSession?.id, selectedProject?.id],
    queryFn: () => getDesignSession(seedSession!.id, selectedProject!.id),
    enabled: Boolean(seedSession && selectedProject && !TERMINAL_STATES.has(seedSession.state)),
    refetchInterval: (query) => {
      const value = query.state.data;
      if (value && TERMINAL_STATES.has(value.session.state)) return false;
      return Math.max(500, Math.min(value?.retryAfterMs ?? initialSession?.retryAfterMs ?? 1000, 5000));
    },
  });
  const activeSession = sessionStatus.data?.session ?? seedSession;
  const workspaceReady = activeSession && ["READY", "ACTIVE", "IDLE"].includes(activeSession.state);
  const workspaceUnavailable = activeSession && ["STOPPED", "FAILED"].includes(activeSession.state);

  const workspaceUrl = useMemo(
    () => (workspaceReady && selectedProject && activeSession
      ? designWorkbenchUrl(activeSession, selectedProject.name)
      : null),
    [activeSession, selectedProject, workspaceReady],
  );

  const retry = () => {
    const project = selectedProject ?? projects.data?.projects?.[0] ?? null;
    if (project) openSession.mutate(project);
    else createProject.mutate({ name: DEFAULT_PROJECT_NAME });
  };

  // Full-bleed workbench — the Open Design home is the landing surface.
  if (workspaceUrl) {
    return (
      <main className="flex min-h-0 flex-1 flex-col bg-[var(--v2-bg)]" data-product-id="design">
        <iframe
          className="min-h-[640px] flex-1 border-0 bg-white"
          src={workspaceUrl}
          title={t("design.workbenchTitle", { defaultValue: "ZAKI Design workbench" })}
          allow="clipboard-read; clipboard-write"
        />
      </main>
    );
  }

  // Otherwise: opening (spinner) or a genuine failure (retry). No picker.
  const hasError =
    projects.isError ||
    openSession.isError ||
    createProject.isError ||
    sessionStatus.isError ||
    Boolean(workspaceUnavailable) ||
    health.isError;

  return (
    <main
      className="grid min-h-full flex-1 place-items-center bg-[var(--v2-bg)] p-6 text-[var(--v2-ink-1)]"
      data-product-id="design"
    >
      <V2Panel className="w-full max-w-md">
        <V2PanelHead
          title={hasError
            ? t("design.failedTitle", { defaultValue: "Workspace could not start" })
            : t("design.startingTitle", { defaultValue: "Opening your design workspace" })}
          meta={activeSession?.state ?? (health.data?.ok ? "STARTING" : "CHECKING")}
        />
        <V2PanelBody className="space-y-4 text-sm text-[var(--v2-ink-2)]">
          {hasError ? (
            <>
              <p>
                {t("design.failedBody", {
                  defaultValue: "Your design session did not become ready. You can retry safely.",
                })}
              </p>
              <V2Button
                variant="accent"
                size="sm"
                onClick={retry}
                disabled={openSession.isPending || createProject.isPending}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {t("design.retry", { defaultValue: "Retry" })}
              </V2Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-5 animate-spin text-[var(--v2-accent)]" aria-hidden />
              <p>
                {t("design.startingBody", {
                  defaultValue: "Restoring your files and starting your workspace.",
                })}
              </p>
            </div>
          )}
        </V2PanelBody>
      </V2Panel>
    </main>
  );
}
