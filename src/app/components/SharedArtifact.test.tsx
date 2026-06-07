import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedArtifact } from "./SharedArtifact";

const originalFetch = global.fetch;
const originalPrint = window.print;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalCreateObjectUrl = window.URL.createObjectURL;
const originalRevokeObjectUrl = window.URL.revokeObjectURL;
const fetchMock = jest.fn();
const printMock = jest.fn();
const writeTextMock = jest.fn();
const createObjectUrlMock = jest.fn();
const revokeObjectUrlMock = jest.fn();
let anchorClickSpy: jest.SpiedFunction<typeof HTMLAnchorElement.prototype.click>;

describe("SharedArtifact", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    printMock.mockReset();
    writeTextMock.mockReset();
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    createObjectUrlMock.mockReturnValue("blob:zaki-artifact");
    global.fetch = fetchMock as unknown as typeof fetch;
    Object.defineProperty(window, "print", {
      configurable: true,
      value: printMock,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, "print", {
      configurable: true,
      value: originalPrint,
    });
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    anchorClickSpy.mockRestore();
  });

  it("renders a public artifact share as a polished document page", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        title: "Launch brief",
        kind: "markdown",
        content: "# Launch brief\n\nThis artifact is ready to send.",
        updated_at_unix: 1_800_000_000,
      }),
    });

    render(
      <MemoryRouter initialEntries={["/artifact/abc12345def67890"]}>
        <Routes>
          <Route path="/artifact/:shareCode" element={<SharedArtifact />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/agent/share/artifact/abc12345def67890")
      );
      expect(screen.getByTestId("shared-artifact-page")).toHaveTextContent("Launch brief");
      expect(screen.getByText("This artifact is ready to send.")).toBeInTheDocument();
      expect(screen.getByText("47 B")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy content" }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "# Launch brief\n\nThis artifact is ready to send."
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Download .md" }));
    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download='Launch_brief.md']")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(printMock).toHaveBeenCalledTimes(1);
  });

  it("renders MIME HTML shares in a sandboxed document frame", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        title: "Launch page",
        kind: "text/html",
        content:
          '<!doctype html><html><body><main><h1>Launch page</h1><p>Ready to publish.</p></main></body></html>',
        updated_at_unix: 1_800_000_000,
      }),
    });

    render(
      <MemoryRouter initialEntries={["/artifact/abc12345def67890"]}>
        <Routes>
          <Route path="/artifact/:shareCode" element={<SharedArtifact />} />
        </Routes>
      </MemoryRouter>
    );

    const frame = await screen.findByTestId("shared-artifact-frame");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("Launch page"));
    expect(screen.queryByText("<!doctype html>")).not.toBeInTheDocument();
  });

  it("renders MIME JSON shares as formatted code", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        title: "Analysis payload",
        kind: "application/json",
        content: '{"status":"ready","items":[1,2]}',
        updated_at_unix: 1_800_000_000,
      }),
    });

    render(
      <MemoryRouter initialEntries={["/artifact/abc12345def67890"]}>
        <Routes>
          <Route path="/artifact/:shareCode" element={<SharedArtifact />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/\"status\": \"ready\"/)).toBeInTheDocument();
      expect(screen.getByText(/\"items\":/)).toBeInTheDocument();
    });
  });
});
