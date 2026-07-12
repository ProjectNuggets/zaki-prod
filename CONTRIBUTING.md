# Contributing to zaki-prod

Read [AGENTS.md](AGENTS.md) before changing this repository. It links to the live cross-repository
coordination board, defines product visibility and backend-truth rules, and lists the verification
required for frontend and BFF changes.

For the normal frontend workflow, use the staging-backed contributor guide:

- [Develop zaki-prod against staging](docs/contributing-proxy-to-staging.md)

That guide explains the SPA’s absolute BFF URL, session-cookie and CORS constraints, and the
recommended local reverse-proxy setup. It lets contributors work on `zaki-web` without running
nullalis, the chat engine, and the Brain database locally.

Use an isolated branch/worktree, keep changes within the claimed surface, add focused tests, and run
the repository checks in [README.md](README.md) before opening a pull request. Never commit secrets
or production credentials.
