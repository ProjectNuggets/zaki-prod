type NotebookExportItem = Record<string, unknown>;

function asRecord(value: unknown): NotebookExportItem {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as NotebookExportItem)
    : {};
}

function textOf(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function listOf(value: unknown): NotebookExportItem[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is NotebookExportItem =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function itemTitle(item: NotebookExportItem, fallback: string): string {
  return (
    textOf(item.title) ||
    textOf(item.name) ||
    textOf(item.label) ||
    textOf(item.id) ||
    fallback
  );
}

function itemDescription(item: NotebookExportItem): string {
  return textOf(item.description) || textOf(item.summary);
}

function sanitizeMarkdownText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatRecordDate(value: unknown): string {
  const raw = textOf(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString();
}

export function learningNotebookExportFilename(notebook: NotebookExportItem): string {
  const title = itemTitle(notebook, "notebook")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${title || "notebook"}.md`;
}

export function learningNotebookRecordExportFilename(
  notebook: NotebookExportItem,
  record: NotebookExportItem,
  index: number,
): string {
  const notebookName = learningNotebookExportFilename(notebook).replace(/\.md$/i, "");
  const recordName = itemTitle(record, `record-${index + 1}`)
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${notebookName}-${recordName || `record-${index + 1}`}.md`;
}

export function learningNotebookRecordMarkdown(
  record: NotebookExportItem,
  index: number,
): string {
  const type = textOf(record.type) || textOf(record.record_type) || "record";
  const createdAt = formatRecordDate(record.created_at);
  const summary = sanitizeMarkdownText(textOf(record.summary));
  const query = sanitizeMarkdownText(textOf(record.user_query));
  const output = sanitizeMarkdownText(textOf(record.output)) || "_No output saved._";
  const metadata = asRecord(record.metadata);
  const source = textOf(metadata.source) || textOf(metadata.capability) || textOf(record.source);

  const lines = [`## ${itemTitle(record, `Record ${index + 1}`)}`, "", `- Type: ${type}`];
  if (createdAt) lines.push(`- Created: ${createdAt}`);
  if (source) lines.push(`- Source: ${source}`);
  if (summary) lines.push("", "### Summary", "", summary);
  if (query) lines.push("", "### Query", "", query);
  lines.push("", "### Output", "", output);
  return `${lines.join("\n")}\n`;
}

export function learningNotebookMarkdown(
  notebook: NotebookExportItem,
  records: NotebookExportItem[] = listOf(notebook.records),
): string {
  const title = itemTitle(notebook, "Notebook");
  const description = sanitizeMarkdownText(itemDescription(notebook));
  const createdAt = formatRecordDate(notebook.created_at);
  const updatedAt = formatRecordDate(notebook.updated_at);
  const lines = [`# ${title}`, ""];

  if (description) lines.push(description, "");
  lines.push(`Records: ${records.length}`);
  if (createdAt) lines.push(`Created: ${createdAt}`);
  if (updatedAt) lines.push(`Updated: ${updatedAt}`);
  lines.push("");

  if (!records.length) {
    lines.push("_No records saved._", "");
  } else {
    records.forEach((record, index) => {
      lines.push(learningNotebookRecordMarkdown(record, index).trimEnd(), "");
    });
  }

  return `${lines.join("\n").trim()}\n`;
}
