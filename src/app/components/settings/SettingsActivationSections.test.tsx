import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { listAgentJobs } from "@/lib/api";
import { fetchAgentSuggestions, transitionAgentSuggestion } from "@/lib/suggestionsApi";

import { SettingsAutomationsSection } from "./SettingsAutomationsSection";
import { SettingsSuggestionsSection } from "./SettingsSuggestionsSection";

jest.mock("@/lib/api", () => ({
  listAgentJobs: jest.fn(),
}));
jest.mock("@/lib/suggestionsApi", () => ({
  fetchAgentSuggestions: jest.fn(),
  transitionAgentSuggestion: jest.fn(),
}));

const listAgentJobsMock = listAgentJobs as jest.MockedFunction<typeof listAgentJobs>;
const fetchSuggestionsMock = fetchAgentSuggestions as jest.MockedFunction<typeof fetchAgentSuggestions>;
const transitionSuggestionMock = transitionAgentSuggestion as jest.MockedFunction<
  typeof transitionAgentSuggestion
>;

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Settings activation sections", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("labels dream, mine, and user-scheduled jobs with next-run visibility", async () => {
    listAgentJobsMock.mockResolvedValueOnce({
      response: { ok: true, status: 200 } as Response,
      data: {
        jobs: [
          { id: "dream_3am", command: "dream", next_run_secs: 1_800_000_000 },
          { id: "mine_330am", command: "mine", enabled: false, paused: true },
          { id: "weekday-brief", name: "Weekday brief", next_run_secs: 1_800_003_600 },
        ],
      },
    });

    renderWithQueryClient(<SettingsAutomationsSection />);

    expect(await screen.findByText("Dream reflection")).toBeInTheDocument();
    expect(screen.getByText("Learning miner")).toBeInTheDocument();
    expect(screen.getByText("Weekday brief")).toBeInTheDocument();
    expect(screen.getAllByText("Paused")).toHaveLength(2);
    expect(screen.getAllByText(/^Next run /)).toHaveLength(2);
  });

  it("adopts and dismisses only through the transition API, then removes the reviewed row", async () => {
    fetchSuggestionsMock.mockResolvedValue([
      { key: "durable_fact/behavior/1", origin: "trace-miner", content: "Lead with outcomes" },
    ]);
    transitionSuggestionMock.mockResolvedValue(undefined);

    renderWithQueryClient(<SettingsSuggestionsSection />);

    expect(await screen.findByText("Lead with outcomes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adopt" }));

    await waitFor(() =>
      expect(transitionSuggestionMock).toHaveBeenCalledWith(
        "adopt",
        "durable_fact/behavior/1",
      ),
    );
    await waitFor(() => expect(screen.queryByText("Lead with outcomes")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /promote/i })).not.toBeInTheDocument();
  });

  it("teaches the suggestions empty state", async () => {
    fetchSuggestionsMock.mockResolvedValueOnce([]);

    renderWithQueryClient(<SettingsSuggestionsSection />);

    expect(await screen.findByText("No suggestions awaiting review")).toBeInTheDocument();
  });
});
