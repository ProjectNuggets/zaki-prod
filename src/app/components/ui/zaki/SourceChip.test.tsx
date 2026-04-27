import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { SourceChip, normalizeChannel, formatLaneLabel } from "./SourceChip";

describe("SourceChip", () => {
  it("renders telegram channel with lane and role chips", () => {
    render(
      <SourceChip
        channel="telegram"
        lane="main"
        role="continuity"
        at={new Date().toISOString()}
      />
    );
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("Continuity")).toBeInTheDocument();
  });

  it("normalizes alternate channel spellings", () => {
    expect(normalizeChannel("telegram_dm")).toBe("telegram");
    expect(normalizeChannel("app")).toBe("web");
    expect(normalizeChannel("session_end")).toBe("session");
    expect(normalizeChannel("image_upload")).toBe("image");
    expect(normalizeChannel(undefined)).toBe("unknown");
  });

  it("renders thread lane with topic", () => {
    expect(formatLaneLabel("thread:project-foo")).toBe("thread \u00b7 project-foo");
    expect(formatLaneLabel("main")).toBe("main");
    expect(formatLaneLabel(null)).toBeNull();
  });

  it("renders an image-source indicator when imageRef is provided", () => {
    render(
      <SourceChip
        channel="web"
        imageRef="img:abc"
        at={new Date().toISOString()}
      />
    );
    expect(screen.getByText(/from image/i)).toBeInTheDocument();
  });

  it("falls back to Unknown when channel is missing", () => {
    render(<SourceChip at={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
