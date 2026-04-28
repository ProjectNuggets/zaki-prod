// Generated from docs/slash-commands-spec.md (V1) — keep in sync with that doc.
// Source of truth: src/agent/commands.zig HELP_TEXT (backend).

export type CommandCategory =
  | "session"
  | "identity"
  | "mode"
  | "safety"
  | "usage"
  | "context"
  | "diagnostics"
  | "channels"
  | "subagents"
  | "voice"
  | "execution"
  | "config"
  | "help";

export interface CategoryMeta {
  id: CommandCategory;
  label: string;
}

export const CATEGORY_ORDER: CategoryMeta[] = [
  { id: "session", label: "Session lifecycle" },
  { id: "mode", label: "Execution mode" },
  { id: "context", label: "Context & memory" },
  { id: "channels", label: "Channels & docking" },
  { id: "voice", label: "Voice & reasoning" },
  { id: "execution", label: "Execution & tools" },
  { id: "identity", label: "Identity & runtime" },
  { id: "safety", label: "Safety & approvals" },
  { id: "usage", label: "Usage & cost" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "subagents", label: "Subagents & focus" },
  { id: "config", label: "Config & export" },
  { id: "help", label: "Help" },
];

export interface SlashCommand {
  name: string;
  args?: string;
  description: string;
  extendedHelp?: string;
  category: CommandCategory;
  isAlias?: boolean;
  canonicalName?: string;
  requires?: "operator";
  takesArgs?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/new", args: "[model]", description: "Start a fresh session, optionally switching model", extendedHelp: "Begins a new conversation. Pass a model name to switch models at the same time.", category: "session", takesArgs: true },
  { name: "/restart", description: "Alias of /new — start fresh session", category: "session", isAlias: true, canonicalName: "/new" },
  { name: "/reset", description: "Checkpoint and clear history (keeps memory)", extendedHelp: "Clears the visible conversation history but preserves long-term memory and session settings.", category: "session" },
  { name: "/resume", args: "<session_key>", description: "Switch to a named session", extendedHelp: "Reopen a saved session by its key. Use /status to see the current session.", category: "session", takesArgs: true },
  { name: "/status", description: "Show session state, model, mode, queue depth", category: "session" },

  { name: "/whoami", description: "Show user identity, tenant, entitlement", category: "identity" },
  { name: "/id", description: "Alias of /whoami", category: "identity", isAlias: true, canonicalName: "/whoami" },
  { name: "/runtime", description: "Show runtime info: workspace, mode, tools, memory", category: "identity" },
  { name: "/model", args: "[name]", description: "Show current model OR switch to <name>", extendedHelp: "Without args, prints the active model. Pass a name (e.g. claude-opus-4-7) to switch.", category: "identity", takesArgs: true },
  { name: "/models", description: "List available models from configured providers", category: "identity" },

  { name: "/mode", args: "[plan|execute|review|background]", description: "Show or set execution mode", extendedHelp: "Plan = read-only tools. Execute = all tools (default). Review = read-only + structured output. Background = run without streaming.", category: "mode", takesArgs: true },
  { name: "/plan", description: "Switch to plan mode (read-only tools only)", category: "mode" },
  { name: "/execute", description: "Switch to execute mode (default; all tools)", category: "mode" },
  { name: "/review", description: "Switch to review mode (read-only + structured output)", category: "mode" },

  { name: "/permissions", description: "Show approval policy + per-tool risk posture", category: "safety" },
  { name: "/perm", description: "Alias of /permissions", category: "safety", isAlias: true, canonicalName: "/permissions" },
  { name: "/approve", args: "<allow-once|deny>", description: "Resolve the pending tool approval", extendedHelp: "Use when a tool call is waiting for approval. Pass allow-once to permit one execution, deny to refuse.", category: "safety", takesArgs: true },
  { name: "/allowlist", description: "Per-session tool allowlist management", category: "safety" },

  { name: "/usage", args: "[off|tokens|full|cost]", description: "Show or set usage tracking mode", extendedHelp: "Off hides usage. Tokens shows token counts. Cost shows USD. Full shows both.", category: "usage", takesArgs: true },
  { name: "/cost", description: "Read-only token + USD cost snapshot", category: "usage" },

  { name: "/context", description: "Show current context window pressure", category: "context" },
  { name: "/compact", description: "Force compaction of conversation history", extendedHelp: "Summarizes older turns to free context space without losing thread continuity.", category: "context" },
  { name: "/memory", args: "<stats|status|reindex|count|search|get|list|drain-outbox>", description: "Memory management", extendedHelp: "Inspect or manipulate the long-term memory store. Use status for health, search to query, reindex to rebuild.", category: "context", takesArgs: true },
  { name: "/learn", args: "[list|forget <key>]", description: "Inspect or remove learned facts", category: "context", takesArgs: true },
  { name: "/persona", description: "Show persona profile from SOUL.md", category: "context" },

  { name: "/health", description: "Channel health dashboard", category: "diagnostics" },
  { name: "/doctor", description: "Memory subsystem diagnostics", category: "diagnostics" },
  { name: "/security-review", description: "Structured security audit of session", category: "diagnostics" },
  { name: "/debug", args: "[show|reset]", description: "Show or reset debug counters", category: "diagnostics", takesArgs: true },

  { name: "/dock-telegram", description: "Set Telegram as the active reply channel", category: "channels" },
  { name: "/dock-discord", description: "Set Discord as the active reply channel", category: "channels" },
  { name: "/dock-slack", description: "Set Slack as the active reply channel", category: "channels" },
  { name: "/telegram", description: "Alias of /dock-telegram", category: "channels", isAlias: true, canonicalName: "/dock-telegram" },
  { name: "/discord", description: "Alias of /dock-discord", category: "channels", isAlias: true, canonicalName: "/dock-discord" },
  { name: "/slack", description: "Alias of /dock-slack", category: "channels", isAlias: true, canonicalName: "/dock-slack" },
  { name: "/activation", description: "Show activation mode (always / mention)", category: "channels" },
  { name: "/send", description: "Show send mode (live / off)", category: "channels" },

  { name: "/subagents", description: "List active subagents and tasks", category: "subagents" },
  { name: "/agents", description: "Alias of /subagents", category: "subagents", isAlias: true, canonicalName: "/subagents" },
  { name: "/focus", description: "Focus on a specific subagent task", category: "subagents" },
  { name: "/unfocus", description: "Release focus from current task", category: "subagents" },
  { name: "/kill", description: "Stop a running subagent", category: "subagents" },
  { name: "/steer", description: "Send mid-flight guidance to a subagent", category: "subagents" },
  { name: "/tell", description: "Direct message to a specific subagent", category: "subagents" },
  { name: "/t", description: "Alias of /tell", category: "subagents", isAlias: true, canonicalName: "/tell" },

  { name: "/voice", args: "[on|off]", description: "Toggle voice replies (channel-dependent)", category: "voice", takesArgs: true },
  { name: "/tts", description: "TTS configuration / status", category: "voice" },
  { name: "/think", description: "Toggle thinking-mode visibility", category: "voice" },
  { name: "/thinking", description: "Alias of /think", category: "voice", isAlias: true, canonicalName: "/think" },
  { name: "/verbose", description: "Toggle verbose stream events", category: "voice" },
  { name: "/v", description: "Alias of /verbose", category: "voice", isAlias: true, canonicalName: "/verbose" },
  { name: "/reasoning", description: "Show reasoning effort setting", category: "voice" },
  { name: "/reason", description: "Alias of /reasoning", category: "voice", isAlias: true, canonicalName: "/reasoning" },

  { name: "/exec", description: "Show last tool execution detail", category: "execution" },
  { name: "/queue", description: "Show inbound message queue state", category: "execution" },
  { name: "/stop", description: "Stop the in-flight turn", category: "execution" },
  { name: "/poll", description: "Poll for queued messages (manual drain)", category: "execution" },
  { name: "/bash", description: "Run a quick shell command (operator)", extendedHelp: "Operator-only. Executes a shell command on the agent host. Restricted by approval policy.", category: "execution", requires: "operator" },
  { name: "/skill", description: "Skill registry management", category: "execution" },
  { name: "/elevated", description: "Toggle elevated execution permissions", extendedHelp: "Operator-only. Raises the approval ceiling for the next tool call.", category: "execution", requires: "operator" },
  { name: "/elev", description: "Alias of /elevated", category: "execution", isAlias: true, canonicalName: "/elevated", requires: "operator" },

  { name: "/config", description: "Show current config snapshot", category: "config" },
  { name: "/capabilities", description: "Show platform capabilities (voice, tools, channels)", category: "config" },
  { name: "/export-session", description: "Export current session as JSON", category: "config" },
  { name: "/export", description: "Alias of /export-session", category: "config", isAlias: true, canonicalName: "/export-session" },
  { name: "/session", args: "ttl <duration|off>", description: "Session lifecycle settings", extendedHelp: "Configure session TTL. Pass ttl 1h to expire after one hour, ttl off to disable expiry.", category: "config", takesArgs: true },

  { name: "/help", description: "Show this command list", category: "help" },
  { name: "/commands", description: "Alias of /help", category: "help", isAlias: true, canonicalName: "/help" },
];

export interface FilterOptions {
  filter: string;
  showAliases?: boolean;
  isOperator?: boolean;
}

export function filterCommands(options: FilterOptions): SlashCommand[] {
  const { filter, showAliases = false, isOperator = false } = options;
  const needle = filter.trim().toLowerCase();

  return SLASH_COMMANDS.filter((cmd) => {
    if (cmd.requires === "operator" && !isOperator) return false;
    if (cmd.isAlias && !showAliases) return false;
    if (needle.length === 0) return true;
    return cmd.name.slice(1).toLowerCase().startsWith(needle);
  });
}

export function groupByCategory(
  commands: SlashCommand[],
): { category: CategoryMeta; commands: SlashCommand[] }[] {
  const buckets = new Map<CommandCategory, SlashCommand[]>();
  for (const cmd of commands) {
    const list = buckets.get(cmd.category);
    if (list) {
      list.push(cmd);
    } else {
      buckets.set(cmd.category, [cmd]);
    }
  }
  return CATEGORY_ORDER.flatMap((meta) => {
    const list = buckets.get(meta.id);
    if (!list || list.length === 0) return [];
    return [{ category: meta, commands: list }];
  });
}

export function resolveCanonical(cmd: SlashCommand): string {
  return cmd.isAlias && cmd.canonicalName ? cmd.canonicalName : cmd.name;
}

export interface DisplayOrder {
  flat: SlashCommand[];
  grouped: { category: CategoryMeta; commands: SlashCommand[] }[] | null;
}

export function getDisplayOrder(options: FilterOptions): DisplayOrder {
  const list = filterCommands(options);
  if (options.filter.trim().length > 0) {
    return { flat: list, grouped: null };
  }
  const grouped = groupByCategory(list);
  return { flat: grouped.flatMap((group) => group.commands), grouped };
}
