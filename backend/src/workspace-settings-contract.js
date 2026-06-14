export function mergeWorkspaceMetadata(workspace, metadata) {
  if (!workspace) return null;
  if (!metadata) return workspace;
  return {
    ...workspace,
    description:
      typeof metadata.description === "string" ? metadata.description : workspace.description,
    icon: typeof metadata.icon === "string" ? metadata.icon : workspace.icon,
    color: typeof metadata.color === "string" ? metadata.color : workspace.color,
  };
}

export function buildLocalWorkspaceMetadataPayload(body = {}) {
  const payload = {};
  if (typeof body.description === "string") {
    payload.description = body.description.trim();
  }
  if (typeof body.icon === "string") {
    payload.icon = body.icon.trim();
  }
  if (typeof body.color === "string") {
    payload.color = body.color.trim();
  }
  return payload;
}

export function extractWorkspaceFromUpstream(data) {
  if (Array.isArray(data?.workspace)) {
    return data.workspace[0] || null;
  }
  return data?.workspace || null;
}

export function buildWorkspaceMutationPayload(body = {}) {
  const payload = {};
  const name = String(body.name || body.title || "").trim();
  if (name) {
    payload.name = name;
  }

  const instructionsSource =
    typeof body.openAiPrompt === "string" ? body.openAiPrompt : body.instructions;
  if (typeof instructionsSource === "string") {
    payload.openAiPrompt = instructionsSource.trim();
  }

  if (Number.isFinite(Number(body.openAiTemp))) {
    payload.openAiTemp = Number(body.openAiTemp);
  }

  if (Number.isFinite(Number(body.openAiHistory))) {
    payload.openAiHistory = Number(body.openAiHistory);
  }

  return payload;
}
