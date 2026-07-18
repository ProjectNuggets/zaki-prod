import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MinutesApiError } from "@/lib/minutesApi";
import { MinutesPage } from "./MinutesPage";

const mockList = jest.fn();
const mockRead = jest.fn();
const mockSearch = jest.fn();
const mockRequestReauthentication = jest.fn();
let mockToken = "session-a";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

jest.mock("@/lib/minutesApi", () => ({
  listMinutes: (...args: unknown[]) => mockList(...args),
  readMinutesItem: (...args: unknown[]) => mockRead(...args),
  searchMinutes: (...args: unknown[]) => mockSearch(...args),
  MinutesApiError: class MinutesApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
}));
jest.mock("@/lib/api", () => ({
  requestReauthentication: (...args: unknown[]) => mockRequestReauthentication(...args),
}));
jest.mock("@/stores", () => ({
  useAuthStore: (selector: (state: { token: string }) => unknown) => selector({ token: mockToken }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => <MemoryRouter><QueryClientProvider client={client}><MinutesPage /></QueryClientProvider></MemoryRouter>;
  const view = render(tree());
  return { ...view, rerenderPage: () => view.rerender(tree()) };
}

describe("MinutesPage read surface", () => {
  beforeEach(() => {
    mockToken = "session-a";
    mockRequestReauthentication.mockReset();
    mockList.mockReset().mockResolvedValue({
      items: [
        { id: "meeting:41", kind: "meeting", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        { id: "transcript:41", kind: "transcript", meeting_id: "meeting:41", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        { id: "summary:41", kind: "summary", meeting_id: "meeting:41", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.summary", expires_at: "2027-07-17T10:00:00Z" } },
      ],
      truncated: false,
    });
    mockRead.mockReset().mockResolvedValue({
      item: { id: "summary:41", kind: "summary", title: "Launch review", meeting_id: "meeting:41", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.summary", expires_at: "2027-07-17T10:00:00Z" }, content: { format: "summary", text: "Decision log" } },
      truncated: false,
    });
    mockSearch.mockReset().mockResolvedValue({
      items: [
        { id: "summary:41", kind: "summary", meeting_id: "meeting:41", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.summary", expires_at: "2027-07-17T10:00:00Z" } },
      ],
      truncated: false,
    });
  });

  it("moves from the meeting list to a bounded summary detail", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Launch review" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open summary" }));
    expect(await screen.findByText("Decision log")).toBeInTheDocument();
    expect(mockRead).toHaveBeenCalledWith("summary:41", "full");
  });

  it("searches through the BFF and opens a metadata-only result", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Launch review" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Minutes" }), {
      target: { value: "launch decision" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("button", { name: "Open result: Launch review" })).toBeInTheDocument();
    expect(mockSearch).toHaveBeenCalledWith("launch decision", 20);
    fireEvent.click(screen.getByRole("button", { name: "Open result: Launch review" }));
    expect(await screen.findByText("Decision log")).toBeInTheDocument();
  });

  it("continues truncated search results with the opaque cursor", async () => {
    mockSearch
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          { id: "summary:41", kind: "summary", meeting_id: "meeting:41", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.summary", expires_at: "2027-07-17T10:00:00Z" } },
        ],
        truncated: true,
        next_cursor: "search-page-2",
      })
      .mockResolvedValueOnce({
        items: [
          { id: "summary:12", kind: "summary", meeting_id: "meeting:12", title: "Earlier planning", occurred_at: "2026-06-12T09:00:00Z", updated_at: "2026-06-12T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.summary", expires_at: "2027-06-12T10:00:00Z" } },
        ],
        truncated: false,
      });
    renderPage();
    await screen.findByRole("heading", { name: "Launch review" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Minutes" }), { target: { value: "planning" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    fireEvent.click(await screen.findByRole("button", { name: "Load more search results" }));
    expect(await screen.findByRole("button", { name: "Open result: Earlier planning" })).toBeInTheDocument();
    expect(mockSearch).toHaveBeenNthCalledWith(2, "planning", 20, "search-page-2");
  });

  it("offers the sealed summary variant when a transcript exceeds the item cap", async () => {
    mockRead
      .mockRejectedValueOnce(new MinutesApiError(413, "minutes_item_too_large", "too large"))
      .mockResolvedValueOnce({
        item: { id: "transcript:41", kind: "transcript", title: "Launch review", meeting_id: "meeting:41", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" }, content: { format: "summary", text: "Decision log" } },
        truncated: false,
      });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open transcript" }));

    expect(await screen.findByText("This transcript is too large to open in full.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open summary instead" }));
    expect(await screen.findByText("Decision log")).toBeInTheDocument();
    expect(mockRead.mock.calls).toEqual([
      ["transcript:41", "full"],
      ["transcript:41", "summary"],
    ]);
  });

  it("terminates the limit state when the summary variant also exceeds the read cap", async () => {
    mockRead
      .mockRejectedValueOnce(new MinutesApiError(413, "minutes_item_too_large", "too large"))
      .mockRejectedValueOnce(new MinutesApiError(413, "minutes_item_too_large", "summary too large"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open transcript" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open summary instead" }));

    expect(await screen.findByText("Summary cannot be opened")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open summary instead" })).not.toBeInTheDocument();
    expect(mockRead.mock.calls).toEqual([
      ["transcript:41", "full"],
      ["transcript:41", "summary"],
    ]);
  });

  it("surfaces the sealed visible-capture attestation on transcript detail", async () => {
    mockRead.mockResolvedValueOnce({
      item: {
        id: "transcript:41",
        kind: "transcript",
        title: "Launch review",
        meeting_id: "meeting:41",
        occurred_at: "2026-07-17T09:00:00Z",
        updated_at: "2026-07-17T10:00:00Z",
        sensitivity: "sensitive_pii",
        retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" },
        capture_notice: { bot_visible: true, tenant_attested_at: "2026-07-17T08:55:00Z", policy_version: "minutes-consent-v1" },
        content: { format: "speaker_turns", turns: [{ speaker: "Nova", text: "Ship the read boundary.", started_at: "2026-07-17T09:00:00Z" }] },
      },
      truncated: false,
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Open transcript" }));
    expect(await screen.findByText("Visible capture verified")).toBeInTheDocument();
    expect(screen.getByText("minutes-consent-v1")).toBeInTheDocument();
  });

  it("turns an expired browser session into an explicit sign-in recovery", async () => {
    mockList.mockRejectedValueOnce(new MinutesApiError(401, "unauthorized", "signed out"));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Your Minutes session ended" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(mockRequestReauthentication).toHaveBeenCalledWith("/minutes");
  });

  it("turns a search-time 401 into the same session recovery state", async () => {
    mockSearch.mockRejectedValueOnce(new MinutesApiError(401, "unauthorized", "signed out"));
    renderPage();
    await screen.findByRole("heading", { name: "Launch review" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Minutes" }), {
      target: { value: "launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("heading", { name: "Your Minutes session ended" })).toBeInTheDocument();
    expect(screen.queryByText("Search is unavailable. Your meeting list is still here.")).not.toBeInTheDocument();
  });

  it("turns a detail-time 401 into the same session recovery state", async () => {
    mockRead.mockRejectedValueOnce(new MinutesApiError(401, "unauthorized", "signed out"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open transcript" }));

    expect(await screen.findByRole("heading", { name: "Your Minutes session ended" })).toBeInTheDocument();
    expect(screen.queryByText("This item is not available")).not.toBeInTheDocument();
  });

  it("turns an archive-continuation 401 into the same session recovery state", async () => {
    mockList
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          { id: "meeting:41", kind: "meeting", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        ],
        truncated: true,
        next_cursor: "page-2",
      })
      .mockRejectedValueOnce(new MinutesApiError(401, "unauthorized", "signed out"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Load older meetings" }));

    expect(await screen.findByRole("heading", { name: "Your Minutes session ended" })).toBeInTheDocument();
    expect(screen.queryByText("Older meetings could not be loaded. The meetings above are still available.")).not.toBeInTheDocument();
  });

  it("recovers the archive after an in-app reauthentication replaces the session", async () => {
    mockList
      .mockReset()
      .mockRejectedValueOnce(new MinutesApiError(401, "unauthorized", "signed out"))
      .mockResolvedValueOnce({ items: [], truncated: false });
    const { rerenderPage } = renderPage();
    expect(await screen.findByRole("heading", { name: "Your Minutes session ended" })).toBeInTheDocument();

    mockToken = "session-b";
    rerenderPage();

    expect(await screen.findByText("No captured meetings yet")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("keeps an item-based continuation reachable when the current page has no meeting row", async () => {
    mockList
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          { id: "transcript:41", kind: "transcript", meeting_id: "meeting:41", title: "Launch review transcript", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        ],
        truncated: true,
        next_cursor: "page-2",
      })
      .mockResolvedValueOnce({
        items: [
          { id: "meeting:41", kind: "meeting", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        ],
        truncated: false,
      });
    renderPage();

    expect(await screen.findByText("More meeting records are available")).toBeInTheDocument();
    expect(screen.queryByText("No captured meetings yet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load older meetings" }));

    expect(await screen.findByRole("heading", { name: "Launch review" })).toBeInTheDocument();
    expect(mockList).toHaveBeenNthCalledWith(2, { cursor: "page-2", limit: 50 });
  });

  it("continues a truncated archive without hiding a partial older meeting", async () => {
    mockList
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          { id: "meeting:41", kind: "meeting", title: "Launch review", occurred_at: "2026-07-17T09:00:00Z", updated_at: "2026-07-17T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" } },
        ],
        truncated: true,
        next_cursor: "page-2",
      })
      .mockResolvedValueOnce({
        items: [
          { id: "meeting:12", kind: "meeting", title: "Earlier planning", occurred_at: "2026-06-12T09:00:00Z", updated_at: "2026-06-12T10:00:00Z", sensitivity: "sensitive_pii", retention: { scope: "minutes.transcript", expires_at: "2027-06-12T10:00:00Z" } },
        ],
        truncated: false,
      });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Load older meetings" }));
    expect(await screen.findByRole("heading", { name: "Earlier planning" })).toBeInTheDocument();
    expect(screen.getAllByText("Summary not available yet.")).toHaveLength(2);
    expect(mockList).toHaveBeenNthCalledWith(2, { cursor: "page-2", limit: 50 });
  });
});
