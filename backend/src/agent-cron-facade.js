const AGENT_CRON_JOB_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,180}$/u;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAgentCronJobIdSafe(value) {
  return typeof value === "string" && AGENT_CRON_JOB_ID_PATTERN.test(value);
}

export function getAgentCronJobId(job) {
  if (!isPlainObject(job)) return "";
  const raw = job.id ?? job.job_id ?? job.jobId;
  return typeof raw === "string" ? raw.trim() : "";
}

function makeAgentCronJobId(index = 0, options = {}) {
  const now =
    typeof options.now === "function"
      ? Number(options.now())
      : Date.now();
  const random =
    typeof options.random === "function"
      ? Number(options.random())
      : Math.random();
  const safeNow = Number.isFinite(now) && now > 0 ? Math.floor(now) : Date.now();
  const safeRandom = Number.isFinite(random) && random >= 0 ? random : Math.random();
  const suffix = Math.floor(safeRandom * 0xfffffff)
    .toString(36)
    .padStart(5, "0")
    .slice(0, 8);
  return `zaki-ui-${safeNow.toString(36)}-${index}-${suffix}`;
}

export function normalizeAgentCronJobsPayload(data) {
  const rawJobs = Array.isArray(data)
    ? data
    : Array.isArray(data?.jobs)
      ? data.jobs
      : [];
  return rawJobs.filter(isPlainObject).map((job) => ({ ...job }));
}

export function ensureAgentCronJobIds(jobs, options = {}) {
  return normalizeAgentCronJobsPayload(jobs).map((job, index) => {
    const id = getAgentCronJobId(job);
    if (id) return job.id === id ? job : { ...job, id };
    return { ...job, id: makeAgentCronJobId(index, options) };
  });
}

export function appendAgentCronJob(jobs, job, options = {}) {
  if (!isPlainObject(job)) {
    throw new TypeError("cron_job_must_be_object");
  }
  const normalized = ensureAgentCronJobIds([...normalizeAgentCronJobsPayload(jobs), job], options);
  return {
    jobs: normalized,
    job: normalized[normalized.length - 1] || null,
  };
}

export function applyAgentCronPatch(jobs, jobId, patch, options = {}) {
  if (!isPlainObject(patch)) {
    throw new TypeError("cron_patch_must_be_object");
  }
  const normalizedId = typeof jobId === "string" ? jobId.trim() : "";
  const { id: _id, job_id: _jobId, jobId: _jobIdCamel, ...safePatch } = patch;
  let found = false;
  let patchedJob = null;
  const patched = ensureAgentCronJobIds(jobs, options).map((job) => {
    const existingId = getAgentCronJobId(job);
    if (existingId !== normalizedId) return job;
    found = true;
    patchedJob = { ...job, ...safePatch, id: existingId };
    return patchedJob;
  });
  return {
    found,
    jobs: patched,
    job: patchedJob,
  };
}

export function removeAgentCronJob(jobs, jobId, options = {}) {
  const normalizedId = typeof jobId === "string" ? jobId.trim() : "";
  let found = false;
  const normalized = ensureAgentCronJobIds(jobs, options);
  const filtered = normalized.filter((job) => {
    const keep = getAgentCronJobId(job) !== normalizedId;
    if (!keep) found = true;
    return keep;
  });
  return {
    found,
    jobs: filtered,
  };
}
