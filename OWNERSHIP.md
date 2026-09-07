# Springfield ownership and disposition

Audit date: 2026-09-07

Audited default branch: `main` at
`1c978fd4d4d6314bc6164616ab2f1c1107ac243b`

## Decision

**Retained owner — recovery and maintenance source only.**

`gaulatti/springfield` remains the canonical source for the historical public
Springfield stream API and its co-located Telegram relay because the hostname,
certificate, monitoring target, and a source-level client reference still
exist, while portfolio searches found no replacement backend. The public
reverse proxy currently returns 502, and the audited cloud/artifact surfaces do
not prove a running service. This decision therefore preserves a recovery path;
it does not authorize deployment or claim product health.

Archival is unsafe while the DNS route, repository credentials, monitoring
target, and unresolved recovery dependencies remain. Supersession is also
unsupported because no canonical replacement was found.

## Ownership and recovery contract

| Contract | Recorded owner or boundary |
| --- | --- |
| Product/source owner | Gaulatti; repository `gaulatti/springfield` |
| Git origin | `git@github.com:gaulatti/springfield.git` |
| Canonical local recovery path | `/Users/gaulatti/source/gaulatti/springfield`; it was absent at audit time, so issue #1 used the isolated checkout `/Users/gaulatti/source/gaulatti/springfield.worktrees/issue-1-ownership-disposition` |
| Public contract | `springfield.gaulatti.com`; historical REST routes are `GET /`, `GET/POST /streams`, and `DELETE /streams/:uuid` |
| Historical delivery target | An on-premises Docker host, container `springfield`, repository variable port `3010`, MySQL, and nginx-rtmp/HLS dependencies |
| Historical artifact target | AWS ECR repository `springfield`; it is absent in `us-east-1` as of the audit |
| Secrets owner | Repository Actions references 18 secret names; database credentials were expected in AWS Secrets Manager. Values, current ownership, rotation, and recoverability were not inspected or verified. |
| Release/deploy command | None is currently authorized. The former push-to-main ECR build and SSH replacement procedure is quarantined. Issue #2 must define an immutable, reviewed manual release before any deployment. |
| Current health proof | Negative: read-only GETs to `/` and `/streams` both return nginx 502. No application, database, FFmpeg/RTMP-to-HLS, Telegram, or restart health is proven. |
| Rollback | No usable prior digest or rollback target was found. Recovery must retain an immutable prior artifact and exercise rollback before production use. |
| Next work | Issue #2, **Restore and prove the retained Springfield delivery contract**, is a child of issue #1 and is Blocked pending target, dependency/data, and credential ownership inventory. |

## Evidence table

| Surface | Method | Result |
| --- | --- | --- |
| Source and history | Fresh partial clone from the remote default branch; `git log`, `git rev-list`, full source/workflow inspection | `main` was `1c978fd4d4d6314bc6164616ab2f1c1107ac243b`, pushed 2025-06-13 EDT, with 12 commits and no tag. Source implements NestJS stream management plus a Telegram/Gemini relay. |
| Repository metadata | GitHub repository, branch, release, tag, and package APIs | Public, unarchived, issues enabled, no description before this audit, no tags or releases. Package listing was unverified because the token lacks `read:packages`; `package.json` is private and has no publish script. |
| Actions | Workflow, run, secret-name, variable, and permission APIs | One active `CI and Deploy` workflow, zero retained runs, Actions allowed without SHA-pinning enforcement, 18 repository secret names, and variables `AWS_REGION=us-east-1`, `HTTP_PORT=3010`, `LOGS_GROUP=/services/springfield`. Secret values were not requested. |
| GitHub delivery surfaces | Environments, deployments, Pages, hooks, rulesets, and branch-protection APIs | No environment, deployment, Pages site, webhook, ruleset, or branch protection. |
| GitHub security settings | Repository security metadata and security-update APIs | Secret scanning, push protection, validity checks, Dependabot security updates, vulnerability alerts, automated security fixes, and private vulnerability reporting were disabled at audit time. |
| Public DNS and TLS | `dig`, TLS certificate inspection, and read-only HTTPS GETs | `springfield.gaulatti.com` resolves to `173.52.82.181`. Its dedicated Let's Encrypt certificate is valid from 2026-07-24 through 2026-10-22. nginx 1.26.3 returns 502 for both `/` and `/streams`. No mutating request was sent. |
| AWS artifact/control plane | Read-only ECR repository/image, CloudWatch log-group/stream, and CloudFormation stack-summary queries in `us-east-1` | No ECR repository named `springfield`, no `/services/springfield` log group, and no active stack whose name contains Springfield. No stack outputs or credential values were requested. |
| Current consumers | Exact local search under `/Users/gaulatti/source`; authenticated GitHub code searches for `springfield`, `springfield.gaulatti.com`, `@gaulatti/springfield`, `RTMP_BASE_URL`, image/log names, and route references | `gaulatti/gtt-player` main hard-codes Springfield list/start/stop requests, but ready PR `gaulatti/gtt-player#2` records that client as an archive candidate. `gaulatti/milano` monitors the public hostname. No package import, second backend, or canonical replacement was found. |
| Source safety | Controller/module inspection | The stream mutations are unauthenticated in source, startup requires external AWS/MySQL and Telegram configuration, and the historical workflow mounted host AWS credentials and used mutable `latest` images. These are recovery blockers, not deployable defaults. |

GitHub search is index-based and the package inventory is incomplete without
`read:packages`. Local search covered available Gaulatti and Fifthbell source
trees while excluding generated dependency/build directories. Neither search
proves the absence of private callers, unmounted hosts, deleted artifacts, or
out-of-band backups.

## Before and after

Before this audit, the README presented the service as deployable and the
active workflow could publish `latest` to ECR and replace an on-premises
container on any push to `main`, using long-lived AWS and SSH credentials.

After this audit:

- the repository advertises the retained-recovery disposition and 502 boundary;
- CI only installs, builds, tests, and uploads coverage using immutable action
  revisions;
- the automatic ECR/SSH workflow is removed from source and disabled in GitHub
  before merge, so it cannot run while this PR is pending;
- recovery/deployment work is isolated in Blocked issue #2.

## Recovery, health, and rollback requirements

Recovery starts from a clean clone of `main`, never from the historical
workflow. Before serving traffic, issue #2 must identify the authorized target,
recover or replace MySQL and RTMP/HLS dependencies, reconcile every referenced
credential, and build a pinned artifact. Verification must cover authenticated
list/start/stop behavior, a bounded synthetic RTMP-to-HLS fixture, cleanup,
database recovery, service/host restart, monitoring, and the public TLS route.

Rollback requires preserving the previously proven immutable artifact and
database recovery point, switching the target back without mutable tags, and
repeating the public health and synthetic stream checks. Because no prior image
or recovery point was found, the current state has no verified rollback.

## Residual unknowns and boundaries

- the current reverse-proxy configuration and intended upstream host/process;
- whether any private caller or scheduled client remains;
- MySQL schema/data location, backups, retention, RPO, and RTO;
- nginx-rtmp/HLS configuration and storage ownership;
- Telegram channel/account consent, session ownership, and Gemini behavior;
- credential validity, ownership, rotation history, and least-privilege scope;
- any package inaccessible without `read:packages` or artifact outside ECR;
- live cost, logs, metrics, alerts, restart behavior, and recovery time.

No deployment, cloud mutation, credential access/rotation, DNS change, package
deletion, repository archive, or history rewrite was performed by this audit.
