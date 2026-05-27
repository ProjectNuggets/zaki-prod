import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FilePlus2, Palette, RefreshCw, Wand2 } from "lucide-react";
import { createDesignProject, getDesignHealth, listDesignProjects } from "@/lib/designApi";
import { billingKeys, useMeterStatus } from "@/queries";
import { useProductRegistry } from "@/queries/useProducts";

const DESIGN_PRODUCT_ID = "design";

export function DesignPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("New design workspace");
  const [prompt, setPrompt] = useState("");
  const productRegistry = useProductRegistry();
  const meterStatus = useMeterStatus();
  const health = useQuery({
    queryKey: ["design", "health"],
    queryFn: getDesignHealth,
    retry: false,
  });
  const projects = useQuery({
    queryKey: ["design", "projects"],
    queryFn: listDesignProjects,
  });
  const createProject = useMutation({
    mutationFn: createDesignProject,
    onSuccess: () => {
      setPrompt("");
      void queryClient.invalidateQueries({ queryKey: ["design", "projects"] });
      void queryClient.invalidateQueries({ queryKey: billingKeys.meterStatus });
    },
  });

  const designProduct = useMemo(
    () =>
      (productRegistry.data?.data?.products ?? []).find(
        (product) => product.productId === DESIGN_PRODUCT_ID,
      ) ?? null,
    [productRegistry.data?.data?.products],
  );
  const designMeter = meterStatus.data?.data?.products?.[DESIGN_PRODUCT_ID] ?? null;
  const projectList = projects.data?.projects ?? [];
  const designRuntimeReady = designProduct?.state === "enabled" && health.data?.ok === true;

  return (
    <main
      className="min-h-screen bg-zaki-base text-zaki-text"
      data-product-id={DESIGN_PRODUCT_ID}
    >
      <section className="border-b border-zaki-border bg-zaki-surface/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zaki-muted">
              <Palette className="h-4 w-4" aria-hidden="true" />
              <span>ZAKI Design</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-zaki-text md:text-4xl">
              Design workspaces for product, brand, decks, and web prototypes.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zaki-muted">
              Create tenant-isolated Open Design projects through ZAKI central auth, billing, and metering.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-2 text-sm">
            <StatusLine label="Product" value={designProduct?.state ?? "loading"} />
            <StatusLine label="Engine" value={health.data?.ok ? "ready" : health.isError ? "unavailable" : "checking"} />
            <StatusLine label="Central meter" value={designMeter?.state ?? designProduct?.state ?? "unknown"} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="rounded-zaki-lg border border-zaki-border bg-zaki-surface p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            createProject.mutate({ name: name.trim() || "Untitled design workspace", prompt: prompt.trim() });
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-zaki-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zaki-text">New workspace</h2>
          </div>
          <label className="block text-xs font-medium text-zaki-muted" htmlFor="design-name">
            Name
          </label>
          <input
            id="design-name"
            className="mt-2 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm outline-none focus:border-zaki-accent"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="mt-4 block text-xs font-medium text-zaki-muted" htmlFor="design-prompt">
            Brief
          </label>
          <textarea
            id="design-prompt"
            className="mt-2 min-h-[160px] w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm leading-6 outline-none focus:border-zaki-accent"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Product surface, audience, brand cues, constraints, and output format."
          />
          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-zaki-md bg-zaki-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={createProject.isPending || !designRuntimeReady}
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            {createProject.isPending ? "Creating" : "Create workspace"}
          </button>
          {createProject.isError ? (
            <p className="mt-3 text-xs text-red-600">{createProject.error.message}</p>
          ) : null}
        </form>

        <div className="rounded-zaki-lg border border-zaki-border bg-zaki-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-zaki-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-zaki-text">Workspaces</h2>
              <p className="mt-1 text-xs text-zaki-muted">{projectList.length} tenant-scoped projects</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-zaki-md border border-zaki-border px-3 py-2 text-xs font-medium text-zaki-text"
              onClick={() => projects.refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </button>
          </div>
          <div className="divide-y divide-zaki-border">
            {projectList.length ? projectList.map((project) => (
              <article key={project.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-zaki-text">{project.name}</h3>
                  <p className="mt-1 text-xs text-zaki-muted">{project.id}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zaki-muted">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {project.status?.value ?? "ready"}
                </div>
              </article>
            )) : (
              <div className="px-4 py-12 text-center text-sm text-zaki-muted">
                No design workspaces yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
      <span className="text-zaki-muted">{label}</span>
      <span className="font-medium text-zaki-text">{value}</span>
    </div>
  );
}
