import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V2Badge, V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import { listMinutes, readMinutesItem, type MinutesItem, type MinutesMetadata } from "@/lib/minutesApi";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function detailBody(item: MinutesItem) {
  if ("format" in item.content && item.content.format === "summary") {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--v2-ink-1)]">{item.content.text}</p>;
  }
  if ("format" in item.content && item.content.format === "speaker_turns") {
    return <ol className="space-y-4">{item.content.turns.map((turn, index) => (
      <li key={`${turn.started_at}-${index}`} className="grid gap-1 border-l-2 border-[var(--v2-hairline)] pl-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-xs text-[var(--v2-ink-1)]">{turn.speaker}</strong>
          <time className="font-mono text-[10px] text-[var(--v2-ink-3)]">{dateLabel(turn.started_at)}</time>
        </div>
        <p className="text-sm leading-6 text-[var(--v2-ink-2)]">{turn.text}</p>
      </li>
    ))}</ol>;
  }
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">
    <div><dt className="font-mono text-[10px] uppercase text-[var(--v2-ink-3)]">Platform</dt><dd>{item.content.platform}</dd></div>
    <div><dt className="font-mono text-[10px] uppercase text-[var(--v2-ink-3)]">Attendees</dt><dd>{item.content.attendees.length}</dd></div>
  </dl>;
}

export function MinutesPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const index = useQuery({ queryKey: ["minutes", "index"], queryFn: () => listMinutes({ limit: 50 }), retry: false });
  const detail = useMutation({ mutationFn: (itemId: string) => readMinutesItem(itemId, "full"), onMutate: setSelected });
  const items = index.data?.items ?? [];
  const meetings = useMemo(() => items.filter((item) => item.kind === "meeting"), [items]);
  const related = (meeting: MinutesMetadata, kind: MinutesMetadata["kind"]) =>
    items.find((item) => item.kind === kind && item.meeting_id === meeting.id);

  return <main className="min-h-full bg-[var(--v2-bg)] p-4 text-[var(--v2-ink-1)] md:p-6" data-product-id="minutes">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--v2-hairline)] pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--v2-ink-3)]"><Clock3 className="size-4 text-[var(--v2-accent)]" aria-hidden />{t("minutes.kicker", { defaultValue: "Meeting archive" })}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("minutes.title", { defaultValue: "Minutes" })}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--v2-ink-2)]">{t("minutes.subtitle", { defaultValue: "Review captured meetings, speaker-attributed transcripts, and retained summaries." })}</p>
        </div>
        <V2Badge tone="accent"><ShieldCheck className="size-3" aria-hidden />{t("minutes.readOnly", { defaultValue: "Read only" })}</V2Badge>
      </header>

      {index.isLoading ? <section aria-label={t("minutes.loading", { defaultValue: "Loading Minutes" })} className="grid gap-px bg-[var(--v2-hairline)] md:grid-cols-[minmax(260px,0.8fr)_1.6fr]"><div className="h-72 animate-pulse bg-[var(--v2-bg-raised)]" /><div className="h-72 animate-pulse bg-[var(--v2-bg-raised)]" /></section> : null}
      {index.isError ? <V2Panel><V2PanelHead title={t("minutes.errorTitle", { defaultValue: "Minutes could not be loaded" })} meta="READ FAILED" /><V2PanelBody className="space-y-4"><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.errorBody", { defaultValue: "The read service is temporarily unavailable. Your meeting data was not changed." })}</p><V2Button size="sm" onClick={() => index.refetch()}><RefreshCw className="size-3.5" aria-hidden />{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></V2PanelBody></V2Panel> : null}
      {!index.isLoading && !index.isError && meetings.length === 0 ? <V2Panel><V2PanelHead title={t("minutes.emptyTitle", { defaultValue: "No captured meetings yet" })} meta="0 MEETINGS" /><V2PanelBody><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.emptyBody", { defaultValue: "When a consented meeting is captured, its transcript and summary will appear here with their retention dates." })}</p></V2PanelBody></V2Panel> : null}

      {meetings.length > 0 ? <section className="grid min-h-[520px] gap-px bg-[var(--v2-hairline)] lg:grid-cols-[minmax(290px,0.78fr)_1.4fr]">
        <div className="bg-[var(--v2-bg-raised)] p-3"><div className="mb-3 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--v2-ink-3)]"><span>{t("minutes.meetings", { defaultValue: "Meetings" })}</span><span>{meetings.length}</span></div><ul className="space-y-2">{meetings.map((meeting) => {
          const summary = related(meeting, "summary"); const transcript = related(meeting, "transcript");
          return <li key={meeting.id} className="border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-4"><h2 className="text-sm font-semibold">{meeting.title}</h2><p className="mt-1 font-mono text-[10px] text-[var(--v2-ink-3)]">{dateLabel(meeting.occurred_at)}</p><div className="mt-4 flex flex-wrap gap-2">{summary ? <V2Button size="sm" variant="accent" onClick={() => detail.mutate(summary.id)}>{t("minutes.openSummary", { defaultValue: "Open summary" })}</V2Button> : null}{transcript ? <V2Button size="sm" onClick={() => detail.mutate(transcript.id)}>{t("minutes.openTranscript", { defaultValue: "Open transcript" })}</V2Button> : null}<V2Button size="sm" onClick={() => detail.mutate(meeting.id)}>{t("minutes.openMeeting", { defaultValue: "Meeting details" })}</V2Button></div>{!summary ? <p className="mt-3 text-xs text-[var(--v2-ink-3)]">{t("minutes.partialSummary", { defaultValue: "Summary not available yet." })}</p> : null}</li>;
        })}</ul></div>
        <div className="bg-[var(--v2-bg)] p-5 md:p-7">{detail.isPending ? <div className="h-56 animate-pulse border border-[var(--v2-hairline)] bg-[var(--v2-bg-raised)]" aria-label={t("minutes.loadingDetail", { defaultValue: "Loading meeting detail" })} /> : detail.isError ? <V2Panel><V2PanelHead title={t("minutes.detailErrorTitle", { defaultValue: "This item is not available" })} meta="READ FAILED" /><V2PanelBody><V2Button size="sm" onClick={() => selected && detail.mutate(selected)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></V2PanelBody></V2Panel> : detail.data ? <article><div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--v2-hairline)] pb-4"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-[var(--v2-ink-3)]"><FileText className="size-3.5" aria-hidden />{detail.data.item.kind}</div><h2 className="text-xl font-semibold">{detail.data.item.title}</h2></div><V2Badge><CalendarDays className="size-3" aria-hidden />{t("minutes.retainedUntil", { defaultValue: "Retained until" })} {dateLabel(detail.data.item.retention.expires_at)}</V2Badge></div>{detailBody(detail.data.item)}</article> : <div className="grid h-full min-h-72 place-items-center text-center"><div><FileText className="mx-auto mb-3 size-7 text-[var(--v2-ink-4)]" aria-hidden /><p className="text-sm text-[var(--v2-ink-3)]">{t("minutes.selectPrompt", { defaultValue: "Choose a summary or transcript to review it here." })}</p></div></div>}</div>
      </section> : null}
    </div>
  </main>;
}
