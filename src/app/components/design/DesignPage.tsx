import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, Palette, Plus, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V2Badge, V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import {
  createDesignProject,
  designWorkbenchUrl,
  ensureDesignSession,
  getDesignHealth,
  getDesignSession,
  listDesignProjects,
  stopDesignSession,
  type DesignProject,
  type DesignSessionResponse,
} from "@/lib/designApi";

const TERMINAL_STATES = new Set(["READY", "ACTIVE", "IDLE", "STOPPED", "FAILED"]);

export function DesignPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
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
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["design", "projects"] });
      openSession.mutate(project);
    },
  });

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
  const stopSession = useMutation({
    mutationFn: () => stopDesignSession(activeSession!.id, selectedProject!.id),
    onSuccess: () => {
      setSelectedProject(null);
      setInitialSession(null);
    },
  });

  const projectList = projects.data?.projects ?? [];
  const workspaceUrl = useMemo(
    () => workspaceReady && selectedProject && activeSession
      ? designWorkbenchUrl(activeSession, selectedProject.name)
      : null,
    [activeSession, selectedProject, workspaceReady],
  );

  if (selectedProject) {
    return (
      <main className="flex min-h-0 flex-1 flex-col bg-[var(--v2-bg)] text-[var(--v2-ink-1)]" data-product-id="design">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)] px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <V2Button
              size="sm"
              iconOnly
              aria-label={t("design.back", { defaultValue: "Back to projects" })}
              onClick={() => {
                if (activeSession && !["STOPPED", "FAILED"].includes(activeSession.state)) stopSession.mutate();
                else { setSelectedProject(null); setInitialSession(null); }
              }}
              disabled={openSession.isPending || stopSession.isPending}
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            </V2Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{selectedProject.name}</h1>
              <p className="truncate font-mono text-[10px] text-[var(--v2-ink-3)]">{selectedProject.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <V2Badge tone={workspaceReady ? "success" : workspaceUnavailable ? "danger" : "accent"}>
              {activeSession?.state ?? (openSession.isPending ? "REQUESTED" : "STARTING")}
            </V2Badge>
            {activeSession && !["STOPPED", "FAILED"].includes(activeSession.state) ? (
              <V2Button size="sm" onClick={() => stopSession.mutate()} disabled={stopSession.isPending}>
                <Square className="size-3.5" aria-hidden />
                {t("design.stop", { defaultValue: "Stop" })}
              </V2Button>
            ) : null}
          </div>
        </header>

        {workspaceUrl ? (
          <iframe
            className="min-h-[640px] flex-1 border-0 bg-white"
            src={workspaceUrl}
            title={t("design.workbenchTitle", { defaultValue: "ZAKI Design workbench" })}
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="grid min-h-[640px] flex-1 place-items-center p-6">
            <V2Panel className="w-full max-w-lg">
              <V2PanelHead
                title={workspaceUnavailable
                  ? t("design.failedTitle", { defaultValue: "Workspace could not start" })
                  : t("design.startingTitle", { defaultValue: "Preparing your workspace" })}
                meta={activeSession?.state ?? "REQUESTED"}
              />
              <V2PanelBody className="space-y-4 text-sm text-[var(--v2-ink-2)]">
                {workspaceUnavailable || openSession.isError || sessionStatus.isError ? (
                  <>
                    <p>{t("design.failedBody", { defaultValue: "The isolated Design session did not become ready. You can retry safely." })}</p>
                    <V2Button variant="accent" size="sm" onClick={() => openSession.mutate(selectedProject)}>
                      <RefreshCw className="size-3.5" aria-hidden />
                      {t("design.retry", { defaultValue: "Retry" })}
                    </V2Button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <LoaderCircle className="size-5 animate-spin text-[var(--v2-accent)]" aria-hidden />
                    <p>{t("design.startingBody", { defaultValue: "Restoring project files and starting an isolated worker." })}</p>
                  </div>
                )}
              </V2PanelBody>
            </V2Panel>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[var(--v2-bg)] p-4 text-[var(--v2-ink-1)] md:p-6" data-product-id="design">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col justify-between gap-4 border-b border-[var(--v2-hairline)] pb-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--v2-ink-3)]">
              <Palette className="size-4 text-[var(--v2-accent)]" aria-hidden />
              {t("design.kicker", { defaultValue: "ZAKI Design" })}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t("design.title", { defaultValue: "Your design projects" })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--v2-ink-3)]">
              {t("design.subtitle", { defaultValue: "Open a project to start its isolated workspace. Files are restored per user and saved when the session stops." })}
            </p>
          </div>
          <V2Badge tone={health.data?.ok ? "success" : health.isError ? "danger" : "accent"}>
            {health.data?.ok
              ? t("design.engineReady", { defaultValue: "Engine ready" })
              : health.isError
                ? t("design.engineUnavailable", { defaultValue: "Engine unavailable" })
                : t("design.engineChecking", { defaultValue: "Checking engine" })}
          </V2Badge>
        </header>

        <V2Panel>
          <V2PanelHead title={t("design.newProject", { defaultValue: "New project" })} meta={t("design.projectScope", { defaultValue: "Private to your account" })} />
          <V2PanelBody>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = name.trim();
                if (trimmed) createProject.mutate({ name: trimmed });
              }}
            >
              <label className="sr-only" htmlFor="design-project-name">{t("design.projectName", { defaultValue: "Project name" })}</label>
              <input
                id="design-project-name"
                className="v2-input min-w-0 flex-1"
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("design.projectPlaceholder", { defaultValue: "Website redesign" })}
              />
              <V2Button type="submit" variant="accent" disabled={!name.trim() || createProject.isPending || health.data?.ok !== true}>
                {createProject.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                {t("design.createAndOpen", { defaultValue: "Create and open" })}
              </V2Button>
            </form>
            {createProject.isError ? <p className="mt-3 text-xs text-[var(--v2-danger)]">{createProject.error.message}</p> : null}
          </V2PanelBody>
        </V2Panel>

        <V2Panel>
          <V2PanelHead>
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <span>{t("design.projects", { defaultValue: "Projects" })}</span>
                <span className="ms-2 font-mono text-[10px] text-[var(--v2-ink-3)]">{projectList.length}</span>
              </div>
              <V2Button size="sm" onClick={() => projects.refetch()} disabled={projects.isFetching}>
                <RefreshCw className={`size-3.5 ${projects.isFetching ? "animate-spin" : ""}`} aria-hidden />
                {t("design.refresh", { defaultValue: "Refresh" })}
              </V2Button>
            </div>
          </V2PanelHead>
          <div className="divide-y divide-[var(--v2-hairline)]">
            {projects.isError ? (
              <div className="p-5 text-sm text-[var(--v2-danger)]">{projects.error.message}</div>
            ) : projectList.length ? projectList.map((project) => (
              <button
                key={project.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors hover:bg-[var(--v2-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)]"
                onClick={() => openSession.mutate(project)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{project.name}</span>
                  <span className="mt-1 block truncate font-mono text-[10px] text-[var(--v2-ink-3)]">{project.id}</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--v2-accent)]">
                  {t("design.open", { defaultValue: "Open" })}
                </span>
              </button>
            )) : (
              <div className="p-10 text-center text-sm text-[var(--v2-ink-3)]">
                {projects.isLoading
                  ? t("design.loadingProjects", { defaultValue: "Loading projects…" })
                  : t("design.empty", { defaultValue: "No projects yet. Create one above." })}
              </div>
            )}
          </div>
        </V2Panel>
      </div>
    </main>
  );
}
