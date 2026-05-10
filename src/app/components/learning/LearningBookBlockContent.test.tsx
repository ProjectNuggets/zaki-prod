import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import { LearningBookBlockContent } from "./LearningBookBlockContent";

describe("LearningBookBlockContent", () => {
  it("renders generated interactive HTML without script privileges", () => {
    const { container } = render(
      <LearningBookBlockContent
        block={{
          id: "interactive-1",
          type: "interactive",
          payload: {
            html: `
              <div onclick="alert(1)">
                <script>window.parent.postMessage("x", "*")</script>
                <a href="javascript:alert(1)">Open</a>
              </div>
            `,
          },
        }}
      />,
    );

    const iframe = container.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox", "");

    const srcDoc = iframe?.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Content-Security-Policy");
    expect(srcDoc).toContain("script-src 'none'");
    expect(srcDoc).toContain("connect-src 'none'");
    expect(srcDoc).not.toMatch(/<script\b/i);
    expect(srcDoc).not.toMatch(/\son[a-z]+\s*=/i);
    expect(srcDoc).not.toMatch(/javascript:/i);
  });

  it("renders Mermaid figure blocks as an SVG image preview", () => {
    const { container } = render(
      <LearningBookBlockContent
        block={{
          id: "figure-1",
          type: "figure",
          payload: {
            render_type: "mermaid",
            code: {
              language: "mermaid",
              content: 'flowchart TD\n  topic["Photosynthesis"]\n  topic --> ATP["ATP"]',
            },
            description: "Concept flow",
          },
        }}
      />,
    );

    const image = container.querySelector("img");
    expect(image).toBeInTheDocument();
    expect(image?.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector("pre")).toHaveTextContent("flowchart TD");
  });

  it("renders one-line concept graph Mermaid source as a diagram preview", () => {
    const { container } = render(
      <LearningBookBlockContent
        block={{
          id: "concept-1",
          type: "concept_graph",
          payload: {
            graph: {
              nodes: [
                { id: "topic", label: "Topic" },
                { id: "practice", label: "Practice" },
              ],
              edges: [{ source: "topic", target: "practice" }],
            },
            code: {
              language: "mermaid",
              content: 'graph TD topic["Topic"] practice["Practice"] topic -.-> practice',
            },
          },
        }}
      />,
    );

    const image = container.querySelector("img");
    expect(image).toBeInTheDocument();
    expect(image?.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(container).toHaveTextContent("Concept map / 2 concepts / 1 relations");
    expect(container.querySelector("pre")).toHaveTextContent("graph TD");
  });
});
