import {
  CATEGORY_ORDER,
  SLASH_COMMANDS,
  filterCommands,
  getDisplayOrder,
  groupByCategory,
  resolveCanonical,
} from "./slashCommands";

describe("slashCommands catalog", () => {
  it("contains 54 canonical commands", () => {
    const canonicals = SLASH_COMMANDS.filter((command) => !command.isAlias);
    expect(canonicals).toHaveLength(54);
  });

  it("every alias points at a real canonical command", () => {
    const canonicalNames = new Set(
      SLASH_COMMANDS.filter((command) => !command.isAlias).map((command) => command.name),
    );
    const aliases = SLASH_COMMANDS.filter((command) => command.isAlias);
    expect(aliases.length).toBeGreaterThan(0);
    for (const alias of aliases) {
      expect(alias.canonicalName).toBeTruthy();
      expect(canonicalNames.has(alias.canonicalName as string)).toBe(true);
    }
  });

  it("every command name is unique", () => {
    const names = SLASH_COMMANDS.map((command) => command.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every command name starts with a slash", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.name.startsWith("/")).toBe(true);
    }
  });

  it("every category referenced by a command is in CATEGORY_ORDER", () => {
    const known = new Set(CATEGORY_ORDER.map((category) => category.id));
    for (const cmd of SLASH_COMMANDS) {
      expect(known.has(cmd.category)).toBe(true);
    }
  });
});

describe("filterCommands", () => {
  it("returns only canonical commands by default (no aliases)", () => {
    const list = filterCommands({ filter: "" });
    const aliases = list.filter((command) => command.isAlias);
    expect(aliases).toHaveLength(0);
  });

  it("includes aliases when showAliases is true", () => {
    const list = filterCommands({ filter: "", showAliases: true });
    const aliases = list.filter((command) => command.isAlias);
    expect(aliases.length).toBeGreaterThan(0);
  });

  it("hides operator-only commands by default", () => {
    const list = filterCommands({ filter: "" });
    expect(list.find((command) => command.name === "/bash")).toBeUndefined();
    expect(list.find((command) => command.name === "/elevated")).toBeUndefined();
  });

  it("includes operator-only commands when isOperator is true", () => {
    const list = filterCommands({ filter: "", isOperator: true });
    expect(list.find((command) => command.name === "/bash")).toBeDefined();
    expect(list.find((command) => command.name === "/elevated")).toBeDefined();
  });

  it("performs prefix match on the filter (case-insensitive)", () => {
    const list = filterCommands({ filter: "he" });
    expect(list.find((command) => command.name === "/health")).toBeDefined();
    expect(list.find((command) => command.name === "/help")).toBeDefined();
    expect(list.find((command) => command.name === "/new")).toBeUndefined();
  });

  it("matches when filter casing differs from name", () => {
    const upper = filterCommands({ filter: "HE" });
    expect(upper.find((command) => command.name === "/help")).toBeDefined();
  });

  it("returns empty list when no commands match", () => {
    const list = filterCommands({ filter: "zzznotacommand" });
    expect(list).toHaveLength(0);
  });
});

describe("groupByCategory", () => {
  it("groups commands and orders categories per CATEGORY_ORDER", () => {
    const groups = groupByCategory(filterCommands({ filter: "" }));
    const ids = groups.map((group) => group.category.id);
    const expected = CATEGORY_ORDER.map((category) => category.id);
    let lastSeenIndex = -1;
    for (const id of ids) {
      const idx = expected.indexOf(id);
      expect(idx).toBeGreaterThan(lastSeenIndex);
      lastSeenIndex = idx;
    }
  });

  it("omits categories with no visible commands", () => {
    const groups = groupByCategory([]);
    expect(groups).toHaveLength(0);
  });

  it("display-order flat list places /execute under /mode group, not after identity", () => {
    const flat = groupByCategory(filterCommands({ filter: "" })).flatMap(
      (group) => group.commands,
    );
    const execIdx = flat.findIndex((command) => command.name === "/execute");
    const modelIdx = flat.findIndex((command) => command.name === "/model");
    const modeIdx = flat.findIndex((command) => command.name === "/mode");
    expect(execIdx).toBeGreaterThan(modeIdx);
    expect(execIdx).toBeLessThan(modelIdx);
  });
});

describe("resolveCanonical", () => {
  it("returns canonical name for an alias", () => {
    const help = SLASH_COMMANDS.find((command) => command.name === "/commands");
    expect(help).toBeDefined();
    expect(resolveCanonical(help!)).toBe("/help");
  });

  it("returns the same name for a canonical command", () => {
    const help = SLASH_COMMANDS.find((command) => command.name === "/help");
    expect(help).toBeDefined();
    expect(resolveCanonical(help!)).toBe("/help");
  });
});

describe("getDisplayOrder", () => {
  it("returns flat list and grouped buckets when filter is empty", () => {
    const order = getDisplayOrder({ filter: "" });
    expect(order.grouped).not.toBeNull();
    expect(order.flat.length).toBeGreaterThan(0);
    expect(order.flat.length).toBe(
      (order.grouped ?? []).reduce((sum, group) => sum + group.commands.length, 0),
    );
  });

  it("returns flat list with grouped=null when filter is non-empty", () => {
    const order = getDisplayOrder({ filter: "he" });
    expect(order.grouped).toBeNull();
    expect(order.flat.find((command) => command.name === "/help")).toBeDefined();
  });

  it("flat list reflects category display order, not catalog declaration order", () => {
    const order = getDisplayOrder({ filter: "" });
    const execIdx = order.flat.findIndex((command) => command.name === "/execute");
    const modelIdx = order.flat.findIndex((command) => command.name === "/model");
    expect(execIdx).toBeLessThan(modelIdx);
  });

  it("flat list grows when showAliases is enabled", () => {
    const without = getDisplayOrder({ filter: "" }).flat.length;
    const withAliases = getDisplayOrder({ filter: "", showAliases: true }).flat.length;
    expect(withAliases).toBeGreaterThan(without);
  });
});
