export function buildBackendHealthStatus(error = null) {
  if (!error) {
    return {
      ok: true,
      statusCode: 200,
      body: {
        ok: true,
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    ok: false,
    statusCode: 503,
    body: {
      ok: false,
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    },
  };
}

function normalizeDependencies(dependencies = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(dependencies || {})) {
    normalized[key] = {
      ok: value?.ok !== false,
      status: value?.status || (value?.ok === false ? "not_ready" : "ready"),
      ...value,
    };
  }
  return normalized;
}

function hasBlockingDependency(dependencies = {}) {
  return Object.values(dependencies || {}).some((dependency) => dependency?.ok === false);
}

export function buildBackendReadyStatus({
  health,
  isDraining = false,
  shutdownSignal = null,
  dependencies = {},
}) {
  const normalizedDependencies = normalizeDependencies(dependencies);
  if (isDraining) {
    return {
      statusCode: 503,
      body: {
        ok: false,
        status: "draining",
        signal: shutdownSignal,
        retryable: true,
        dependencies: normalizedDependencies,
      },
    };
  }

  if (!health.ok) {
    return {
      statusCode: 503,
      body: {
        ...health.body,
        status: "not_ready",
        retryable: true,
        dependencies: normalizedDependencies,
      },
    };
  }

  if (hasBlockingDependency(normalizedDependencies)) {
    return {
      statusCode: 503,
      body: {
        ok: false,
        status: "not_ready",
        database: "connected",
        timestamp: health.body.timestamp,
        retryable: true,
        dependencies: normalizedDependencies,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      status: "ready",
      database: "connected",
      timestamp: health.body.timestamp,
      dependencies: normalizedDependencies,
    },
  };
}
