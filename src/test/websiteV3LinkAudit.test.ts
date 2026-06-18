import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const websiteSrc = join(repoRoot, "website/src");

function readSourceFiles(root: string) {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (/\.(ts|tsx|css)$/.test(path)) {
        files.push(path);
      }
    }
  };
  visit(root);
  return files.map((path) => [path, readFileSync(path, "utf8")] as const);
}

describe("V3 website link audit", () => {
  it("keeps website app handoffs runtime-configured and never app.chatzaki.com", () => {
    const files = readSourceFiles(websiteSrc);
    for (const [path, source] of files) {
      expect(source).not.toContain("app.chatzaki.com");
      expect(source).not.toContain("zaki.app");
    }

    const appHandoff = readFileSync(join(websiteSrc, "lib/appHandoff.ts"), "utf8");
    expect(appHandoff).toContain("getWebsiteRuntimeConfig");
    expect(appHandoff).toContain('"hire_waitlist"');
    expect(appHandoff).toContain('"ZAKI Career"');

    const websiteApi = readFileSync(join(websiteSrc, "lib/websiteApi.ts"), "utf8");
    expect(websiteApi).toContain("getWebsiteRuntimeConfig");
    expect(websiteApi).toContain('"www.chatzaki.com"');
    expect(websiteApi).toContain('endsWith(".chatzaki.com")');
    expect(websiteApi).toContain('endsWith(".chatzaki.ai")');
    expect(websiteApi).toContain('endsWith(".chatzaki.io")');
  });

  it("keeps Website V3 checkout links on canonical billing plan ids", () => {
    const v3Source = readFileSync(join(websiteSrc, "components/v3/V3Website.tsx"), "utf8");
    expect(v3Source).toContain('pricingSignup("personal")');
    expect(v3Source).toContain('pricingSignup("pro")');
    expect(v3Source).toContain('pricingSignup("pro_max")');
    expect(v3Source).not.toContain('pricingSignup("agent")');
    expect(v3Source).not.toContain('pricingSignup("promax")');
    expect(v3Source).not.toContain('pricingSignup("learn")');
    expect(v3Source).not.toContain('pricingSignup("complete")');
  });

  it("keeps V3 public navigation concrete and removes mockup edit-mode UI", () => {
    const v3Source = readFileSync(join(websiteSrc, "components/v3/V3Website.tsx"), "utf8");
    expect(v3Source).toContain('to="/privacy"');
    expect(v3Source).toContain('to="/terms"');
    expect(v3Source).toContain('to="/compliance"');
    expect(v3Source).toContain("Design & Career");
    expect(v3Source).not.toContain("open beta");
    expect(v3Source).not.toContain("Private beta");
    expect(v3Source).not.toContain('href="#"');
    expect(v3Source).not.toContain("__edit_mode");
    expect(v3Source).not.toContain("id=\"tweaks\"");

    const cssSource = readFileSync(join(websiteSrc, "styles/v3.css"), "utf8");
    expect(cssSource).not.toContain("#tweaks");
  });

  it("keeps canonical V3 routes and retired suffix redirects registered", () => {
    const router = readFileSync(join(websiteSrc, "router.tsx"), "utf8");
    for (const route of ["/", "/product", "/use-cases", "/story", "/pricing", "/privacy", "/terms", "/compliance"]) {
      expect(router).toContain(`path="${route}"`);
    }
    for (const retired of ["/zaki-bot", "/autism-guidance", "/vs-chatgpt", "/zaki-vs-spaces", "/zaki-vs-openclaw", "/best-arabic-ai-assistant", "/how-to/*"]) {
      expect(router).toContain(`path="${retired}"`);
      expect(router).toContain("<Navigate");
    }

    const registry = readFileSync(join(websiteSrc, "lib/routeRegistry.ts"), "utf8");
    expect(registry).toContain('pathname: "/product/"');
    expect(registry).toContain('pathname: "/use-cases/"');
    expect(registry).not.toContain('pathname: "/zaki-bot/"');
    expect(registry).not.toContain('pathname: "/vs-chatgpt/"');
  });

  it("has copied V3 assets available to the website app", () => {
    for (const path of [
      "website/public/v3/zaki-mark.svg",
      "website/public/v3/bot/wave.png",
      "website/public/v3/bot/thinking.png",
      "website/public/v3/bot/heart.png",
      "website/public/v3/bot/hop.png",
      "website/public/v3/bot/sunglasses.png",
    ]) {
      expect(existsSync(join(repoRoot, path))).toBe(true);
    }
  });
});
