# ZAKI Hire Source Boundary Checkpoint

Status: Phase 1 source and license boundary checkpoint.
Last updated: 2026-05-20.

## Reader And Action

Reader: an internal ZAKI engineer preparing to work on the isolated Hire engine.

Post-read action: continue engine work from the correct source pin and keep the
AGPL-derived engine boundary separate from proprietary `zaki-prod`.

## Engine Workspace

The local `zaki-hire-engine` workspace has been created from upstream
JustHireMe and checked out on:

- local branch: `codex/zaki-hire-engine-hosted`
- upstream source commit: `3831a0f8b1393a8da3c5b6d6511dce52a8ee6381`
- upstream release marker: `v1.0.15`
- upstream source repository: `https://github.com/vasu-devs/justhireme`
- intended ZAKI fork repository: `https://github.com/ProjectNuggets/zaki-hire-engine`

The intended ZAKI fork remote does not exist yet. The local workspace is still
useful because it preserves upstream history and gives us an isolated place to
adapt the AGPL engine before any push.

## Remote Safety

The local engine remotes are intentionally explicit:

| Remote | URL | Push behavior |
| --- | --- | --- |
| `origin` | `https://github.com/ProjectNuggets/zaki-hire-engine.git` | Push target for the future ZAKI fork; currently not found. |
| `upstream` | `https://github.com/vasu-devs/justhireme.git` | Fetch-only; push URL disabled locally. |

No engine changes have been pushed.

## License Boundary Evidence

Upstream JustHireMe carries AGPL notices that must remain attached to the engine
fork:

- `LICENSE` is present and contains GNU AGPL text.
- `NOTICE` says the software is licensed under `AGPL-3.0-only`.
- root `package.json` declares `AGPL-3.0-only`.
- backend `pyproject.toml` declares `AGPL-3.0-only`.
- README includes AGPL network-use language and commercial-license language.

ZAKI production remains separate:

- no upstream JustHireMe source has been copied into `zaki-prod`
- `zaki-prod` owns proprietary shell, auth, BFF, entitlements, billing, quota,
  telemetry, and `/hire`
- `zaki-hire-engine` owns upstream-derived Hire product logic
- browser clients must call ZAKI backend, not the engine directly

## ZAKI Production License Cleanup

The ZAKI production worktree previously had public MIT signals:

| File | Signal |
| --- | --- |
| root `package.json` | MIT package license metadata |
| root `README.md` | MIT badge and License section pointing to `LICENSE` |
| `README_MVP_SECURITY_MEMORY.md` | MIT License section |

No root `LICENSE` file was found in the checked worktree. On 2026-05-20 this
branch replaced the root package and lockfile license metadata with
`UNLICENSED` and changed the README license sections to a proprietary/private
all-rights-reserved notice. Third-party attribution notes remain in
`ATTRIBUTIONS.md`.

## Phase 1 Remaining Work

| Gate | Status | Next action |
| --- | --- | --- |
| Engine fork exists under ProjectNuggets | Pending remote creation | Create the GitHub repository or fork target, then push only after local verification is accepted. |
| Upstream AGPL notices preserved | Locally verified | Keep `LICENSE`, `NOTICE`, and package metadata in the engine fork. |
| ZAKI proprietary boundary documented | Drafted | Keep source split: proprietary ZAKI BFF/UI, AGPL-derived engine. |
| ZAKI MIT public claims cleaned before release | Done locally | Package and lockfile metadata plus README license sections now state proprietary/private; confirm final legal wording before production. |
| No JustHireMe source copied into ZAKI prod | Verified at checkpoint | Continue using service boundary and avoid source copying. |
