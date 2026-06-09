// Runtime config placeholder. This default ships in the image and is OVERWRITTEN at container start by
// docker-entrypoint.d/40-zaki-env.sh, which writes the per-environment BACKEND_URL from the container
// env. Keeping a default here means /env.js always exists (no 404) and local/dev builds work unchanged.
// One built image therefore serves any environment — the backend URL is injected at runtime, not baked.
window.__ZAKI_ENV__ = window.__ZAKI_ENV__ || {};
