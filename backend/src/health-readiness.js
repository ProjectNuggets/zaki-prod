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

export function buildBackendReadyStatus({ health, isDraining = false, shutdownSignal = null }) {
  if (isDraining) {
    return {
      statusCode: 503,
      body: {
        ok: false,
        status: "draining",
        signal: shutdownSignal,
        retryable: true,
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
    },
  };
}
