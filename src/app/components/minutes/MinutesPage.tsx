import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { CalendarDays, Clock3, FileText, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { V2Badge, V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import { MinutesApiError, listMinutes, readMinutesItem, searchMinutes, type MinutesIndexResponse, type MinutesItem, type MinutesMetadata } from "@/lib/minutesApi";

function dateLabel(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function kindLabel(kind: MinutesMetadata["kind"], t: TFunction) {
  const labels = { meeting: "Meeting", transcript: "Transcript", summary: "Summary" } as const;
  return t(`minutes.kind.${kind}`, { defaultValue: labels[kind] });
}

function detailBody(item: MinutesItem, t: TFunction, locale?: string) {
  if ("format" in item.content && item.content.format === "summary") {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--v2-ink-1)]">{item.content.text}</p>;
  }
  if ("format" in item.content && item.content.format === "speaker_turns") {
    return <ol className="space-y-4">{item.content.turns.map((turn, index) => (
      <li key={`${turn.started_at}-${index}`} className="grid gap-1 border-l-2 border-[var(--v2-hairline)] pl-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-xs text-[var(--v2-ink-1)]">{turn.speaker}</strong>
          <time className="font-mono text-[10px] text-[var(--v2-ink-3)]">{dateLabel(turn.started_at, locale)}</time>
        </div>
        <p className="text-sm leading-6 text-[var(--v2-ink-2)]">{turn.text}</p>
      </li>
    ))}</ol>;
  }
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">
    <div><dt className="font-mono text-[10px] uppercase text-[var(--v2-ink-3)]">{t("minutes.platform", { defaultValue: "Platform" })}</dt><dd>{t(`minutes.platforms.${item.content.platform}`, { defaultValue: item.content.platform })}</dd></div>
    <div><dt className="font-mono text-[10px] uppercase text-[var(--v2-ink-3)]">{t("minutes.attendees", { defaultValue: "Attendees" })}</dt><dd>{item.content.attendees.length}</dd></div>
  </dl>;
}

export function MinutesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSession, setSearchSession] = useState<(MinutesIndexResponse & { query: string }) | null>(null);
  const [pagination, setPagination] = useState<{ items: MinutesMetadata[]; truncated: boolean; nextCursor?: string } | null>(null);
  const index = useQuery({ queryKey: ["minutes", "index"], queryFn: () => listMinutes({ limit: 50 }), retry: false });
  const detail = useMutation({
    mutationFn: ({ itemId, variant }: { itemId: string; variant: "full" | "summary" }) => readMinutesItem(itemId, variant),
    onMutate: ({ itemId }) => setSelected(itemId),
  });
  const search = useMutation({
    mutationFn: ({ query, cursor }: { query: string; cursor?: string }) => cursor
      ? searchMinutes(query, 20, cursor)
      : searchMinutes(query, 20),
    onMutate: ({ cursor }) => {
      if (!cursor) setSearchSession(null);
    },
    onSuccess: (page, request) => setSearchSession((current) => {
      const items = request.cursor && current
        ? [...new Map([...current.items, ...page.items].map((item) => [item.id, item])).values()]
        : page.items;
      return { ...page, items, query: request.query };
    }),
  });
  const loadOlder = useMutation({
    mutationFn: (cursor: string) => listMinutes({ cursor, limit: 50 }),
    onSuccess: (page) => setPagination((current) => ({
      items: [...(current?.items ?? []), ...page.items],
      truncated: page.truncated,
      nextCursor: page.next_cursor,
    })),
  });
  const openDetail = (itemId: string, variant: "full" | "summary" = "full") => detail.mutate({ itemId, variant });
  const indexAuthError = index.error instanceof MinutesApiError && index.error.status === 401;
  const items = useMemo(() => {
    const byId = new Map<string, MinutesMetadata>();
    for (const item of [...(index.data?.items ?? []), ...(pagination?.items ?? [])]) byId.set(item.id, item);
    return [...byId.values()];
  }, [index.data?.items, pagination?.items]);
  const nextCursor = pagination ? pagination.nextCursor : index.data?.next_cursor;
  const hasOlder = pagination ? pagination.truncated && Boolean(nextCursor) : Boolean(index.data?.truncated && nextCursor);
  const meetings = useMemo(() => items.filter((item) => item.kind === "meeting"), [items]);
  const related = (meeting: MinutesMetadata, kind: "summary" | "transcript") =>
    items.find((item) => item.kind === kind && item.meeting_id === meeting.id);

  return <main className="min-h-full bg-[var(--v2-bg)] p-4 text-[var(--v2-ink-1)] md:p-6" data-product-id="minutes">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--v2-hairline)] pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--v2-ink-3)]"><Clock3 className="size-4 text-[var(--v2-accent)]" aria-hidden />{t("minutes.kicker", { defaultValue: "Meeting archive" })}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("minutes.title", { defaultValue: "Minutes" })}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--v2-ink-2)]">{t("minutes.subtitle", { defaultValue: "Review captured meetings, speaker-attributed transcripts, and retained summaries." })}</p>
        </div>
        <V2Badge><ShieldCheck className="size-3 text-[var(--v2-accent)]" aria-hidden />{t("minutes.readOnly", { defaultValue: "Read only" })}</V2Badge>
      </header>

      {!indexAuthError ? <section className="border border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)] p-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchQuery.trim();
            if (query) search.mutate({ query });
          }}
        >
          <label className="sr-only" htmlFor="minutes-search">{t("minutes.searchLabel", { defaultValue: "Search Minutes" })}</label>
          <div className="flex min-w-0 flex-1 items-center gap-2 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-3">
            <Search className="size-4 shrink-0 text-[var(--v2-ink-3)]" aria-hidden />
            <input
              id="minutes-search"
              type="search"
              maxLength={512}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("minutes.searchPlaceholder", { defaultValue: "Search summaries and transcripts" })}
              className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--v2-ink-4)]"
            />
          </div>
          <V2Button type="submit" size="sm" disabled={!searchQuery.trim() || search.isPending}>
            {search.isPending ? t("minutes.searching", { defaultValue: "Searching…" }) : t("minutes.searchAction", { defaultValue: "Search" })}
          </V2Button>
        </form>
        <div aria-live="polite">
        {search.isError ? <p className="mt-3 text-xs text-[var(--v2-danger)]">{t("minutes.searchError", { defaultValue: "Search is unavailable. Your meeting list is still here." })}</p> : null}
        {searchSession ? <div className="mt-3 border-t border-[var(--v2-hairline)] pt-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--v2-ink-2)]"><span>{t("minutes.searchResults", { defaultValue: "Search results" })}</span><span>{searchSession.items.length}</span></div>
          {searchSession.items.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{searchSession.items.map((item) => <li key={item.id}>
            <button
              type="button"
              aria-label={`${t("minutes.openResult", { defaultValue: "Open result" })}: ${item.title}`}
              onClick={() => openDetail(item.id)}
              className="w-full border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-3 text-left transition-colors hover:bg-[var(--v2-bg-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)]"
            >
              <span className="block font-mono text-[10px] uppercase text-[var(--v2-ink-2)]">{kindLabel(item.kind, t)}</span>
              <strong className="mt-1 block truncate text-sm">{item.title}</strong>
              <time className="mt-1 block font-mono text-[10px] text-[var(--v2-ink-3)]">{dateLabel(item.occurred_at, locale)}</time>
            </button>
          </li>)}</ul> : <p className="text-sm text-[var(--v2-ink-3)]">{t("minutes.searchEmpty", { defaultValue: "No retained Minutes items match that search." })}</p>}
          {searchSession.truncated && searchSession.next_cursor ? <V2Button className="mt-3" size="sm" disabled={search.isPending} onClick={() => search.mutate({ query: searchSession.query, cursor: searchSession.next_cursor })}>{search.isPending ? t("minutes.loadingMoreSearch", { defaultValue: "Loading more results…" }) : t("minutes.loadMoreSearch", { defaultValue: "Load more search results" })}</V2Button> : null}
        </div> : null}
        </div>
      </section> : null}

      {index.isLoading ? <section aria-label={t("minutes.loading", { defaultValue: "Loading Minutes" })} className="grid gap-px bg-[var(--v2-hairline)] md:grid-cols-[minmax(260px,0.8fr)_1.6fr]"><div className="h-72 animate-pulse bg-[var(--v2-bg-raised)]" /><div className="h-72 animate-pulse bg-[var(--v2-bg-raised)]" /></section> : null}
      {indexAuthError ? <V2Panel><V2PanelBody className="space-y-4"><div><p className="font-mono text-[10px] uppercase tracking-wider text-[var(--v2-ink-2)]">{t("minutes.authRequiredMeta", { defaultValue: "Auth required" })}</p><h2 className="mt-2 text-lg font-semibold">{t("minutes.authTitle", { defaultValue: "Your Minutes session ended" })}</h2></div><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.authBody", { defaultValue: "Sign in again to continue reviewing your retained meetings." })}</p><Link className="v2-btn v2-btn--primary v2-btn--sm inline-flex" to="/?next=%2Fminutes">{t("minutes.signInAgain", { defaultValue: "Sign in again" })}</Link></V2PanelBody></V2Panel> : null}
      {index.isError && !indexAuthError ? <V2Panel><V2PanelHead title={t("minutes.errorTitle", { defaultValue: "Minutes could not be loaded" })} meta={t("minutes.readFailedMeta", { defaultValue: "Read failed" })} /><V2PanelBody className="space-y-4"><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.errorBody", { defaultValue: "The read service is temporarily unavailable. Your meeting data was not changed." })}</p><V2Button size="sm" onClick={() => index.refetch()}><RefreshCw className="size-3.5" aria-hidden />{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></V2PanelBody></V2Panel> : null}
      {!index.isLoading && !index.isError && meetings.length === 0 ? <V2Panel><V2PanelHead title={t("minutes.emptyTitle", { defaultValue: "No captured meetings yet" })} meta={t("minutes.emptyMeta", { defaultValue: "0 meetings" })} /><V2PanelBody><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.emptyBody", { defaultValue: "When a consented meeting is captured, its transcript and summary will appear here with their retention dates." })}</p></V2PanelBody></V2Panel> : null}

      {meetings.length > 0 ? <section className="grid min-h-[520px] gap-px bg-[var(--v2-hairline)] lg:grid-cols-[minmax(290px,0.78fr)_1.4fr]">
        <div className="bg-[var(--v2-bg-raised)] p-3"><div className="mb-3 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--v2-ink-2)]"><span>{t("minutes.meetings", { defaultValue: "Meetings" })}</span><span>{meetings.length}</span></div><ul className="space-y-2">{meetings.map((meeting) => {
          const summary = related(meeting, "summary"); const transcript = related(meeting, "transcript");
          return <li key={meeting.id} className="border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-4"><h2 className="text-sm font-semibold">{meeting.title}</h2><p className="mt-1 font-mono text-[10px] text-[var(--v2-ink-3)]">{dateLabel(meeting.occurred_at, locale)}</p><div className="mt-4 flex flex-wrap gap-2">{summary ? <V2Button size="sm" variant="primary" onClick={() => openDetail(summary.id)}>{t("minutes.openSummary", { defaultValue: "Open summary" })}</V2Button> : null}{transcript ? <V2Button size="sm" onClick={() => openDetail(transcript.id)}>{t("minutes.openTranscript", { defaultValue: "Open transcript" })}</V2Button> : null}<V2Button size="sm" onClick={() => openDetail(meeting.id)}>{t("minutes.openMeeting", { defaultValue: "Meeting details" })}</V2Button></div>{!summary ? <p className="mt-3 text-xs text-[var(--v2-ink-2)]">{t("minutes.partialSummary", { defaultValue: "Summary not available yet." })}</p> : null}</li>;
        })}</ul>{loadOlder.isError ? <p className="mt-3 text-xs text-[var(--v2-danger)]">{t("minutes.loadOlderError", { defaultValue: "Older meetings could not be loaded. The meetings above are still available." })}</p> : null}{hasOlder ? <V2Button className="mt-3 w-full" size="sm" disabled={loadOlder.isPending} onClick={() => nextCursor && loadOlder.mutate(nextCursor)}>{loadOlder.isPending ? t("minutes.loadingOlder", { defaultValue: "Loading older meetings…" }) : t("minutes.loadOlder", { defaultValue: "Load older meetings" })}</V2Button> : null}</div>
        <div className="bg-[var(--v2-bg)] p-5 md:p-7">{detail.isPending ? <div className="h-56 animate-pulse border border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)]" aria-label={t("minutes.loadingDetail", { defaultValue: "Loading meeting detail" })} /> : detail.isError ? detail.error instanceof MinutesApiError && detail.error.code === "minutes_item_too_large" ? <V2Panel><V2PanelHead title={t("minutes.tooLargeTitle", { defaultValue: "Transcript exceeds the read limit" })} meta={t("minutes.summaryAvailableMeta", { defaultValue: "Summary available" })} /><V2PanelBody className="space-y-4"><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.tooLargeBody", { defaultValue: "This transcript is too large to open in full." })}</p><V2Button size="sm" variant="primary" onClick={() => selected && openDetail(selected, "summary")}>{t("minutes.openSummaryInstead", { defaultValue: "Open summary instead" })}</V2Button></V2PanelBody></V2Panel> : <V2Panel><V2PanelHead title={t("minutes.detailErrorTitle", { defaultValue: "This item is not available" })} meta={t("minutes.readFailedMeta", { defaultValue: "Read failed" })} /><V2PanelBody><V2Button size="sm" onClick={() => selected && openDetail(selected)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></V2PanelBody></V2Panel> : detail.data ? <article><div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--v2-hairline)] pb-4"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-[var(--v2-ink-3)]"><FileText className="size-3.5" aria-hidden />{kindLabel(detail.data.item.kind, t)}</div><h2 className="text-xl font-semibold">{detail.data.item.title}</h2></div><V2Badge><CalendarDays className="size-3" aria-hidden />{t("minutes.retainedUntil", { defaultValue: "Retained until" })} {dateLabel(detail.data.item.retention.expires_at, locale)}</V2Badge></div>{"capture_notice" in detail.data.item ? <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)] px-3 py-2"><span className="flex items-center gap-2 text-xs font-medium"><ShieldCheck className="size-4 text-[var(--v2-accent)]" aria-hidden />{t("minutes.captureVerified", { defaultValue: "Visible capture verified" })}</span><span className="font-mono text-[10px] text-[var(--v2-ink-2)]">{detail.data.item.capture_notice.policy_version}</span></div> : null}{detailBody(detail.data.item, t, locale)}</article> : <div className="grid h-full min-h-72 place-items-center text-center"><div><FileText className="mx-auto mb-3 size-7 text-[var(--v2-ink-4)]" aria-hidden /><p className="text-sm text-[var(--v2-ink-3)]">{t("minutes.selectPrompt", { defaultValue: "Choose a summary or transcript to review it here." })}</p></div></div>}</div>
      </section> : null}
    </div>
  </main>;
}
