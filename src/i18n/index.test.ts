import { describe, expect, it } from "@jest/globals";
import { i18n, resolveInitialLanguage } from "./index";

describe("resolveInitialLanguage", () => {
  it("lets the lang query parameter override persisted and browser preferences", () => {
    const storage = {
      getItem: (key: string) => (key === "i18nextLng" ? "en" : null),
    };

    expect(
      resolveInitialLanguage({
        search: "?lang=ar",
        storage,
        browserLanguage: "en-US",
      })
    ).toBe("ar");
  });

  it("honors the persisted i18next language when no query override exists", () => {
    const storage = {
      getItem: (key: string) => (key === "i18nextLng" ? "ar" : null),
    };

    expect(
      resolveInitialLanguage({
        search: "",
        storage,
        browserLanguage: "en-US",
      })
    ).toBe("ar");
  });

  it("persists language changes and updates the document language", async () => {
    window.localStorage.removeItem("i18nextLng");

    await i18n.changeLanguage("ar");

    expect(window.localStorage.getItem("i18nextLng")).toBe("ar");
    expect(document.documentElement.lang).toBe("ar");

    await i18n.changeLanguage("en");
  });
});
