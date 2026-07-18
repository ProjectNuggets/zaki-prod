import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MinutesPage } from "./MinutesPage";

const mockList = jest.fn();
const mockRead = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));

jest.mock("@/lib/minutesApi", () => ({
  listMinutes: (...args: unknown[]) => mockList(...args),
  readMinutesItem: (...args: unknown[]) => mockRead(...args),
  searchMinutes: jest.fn(),
  MinutesApiError: class MinutesApiError extends Error {},
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MinutesPage /></QueryClientProvider>);
}

describe("MinutesPage read surface", () => {
  beforeEach(() => {
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
  });

  it("moves from the meeting list to a bounded summary detail", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Launch review" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open summary" }));
    expect(await screen.findByText("Decision log")).toBeInTheDocument();
    expect(mockRead).toHaveBeenCalledWith("summary:41", "full");
  });
});
