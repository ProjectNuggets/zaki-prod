const CONTROLLER_OWNED_BODY_PREFIXES = [
  "/api/design/projects",
  "/api/design/sessions",
  "/internal/design/controller/v1",
];

export function bypassDesignOwnedBodyParser(parser, { controllerEnabled = true } = {}) {
  if (typeof parser !== "function") {
    throw new TypeError("Body parser middleware is required.");
  }
  return (req, res, next) => {
    if (controllerEnabled && isControllerOwnedBodyPath(req.path)) return next();
    return parser(req, res, next);
  };
}

function isControllerOwnedBodyPath(value) {
  const path = String(value || "");
  return CONTROLLER_OWNED_BODY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
