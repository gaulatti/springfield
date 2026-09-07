# Springfield

> **Disposition: retained recovery owner; production is not verified.**

Springfield is the source owner for the historical Gaulatti stream-repackaging
and Telegram relay service. The repository is retained because its public
hostname and source-level consumer contract still exist and no replacement
implementation was found. Retention is not a claim that the application,
database, stream pipeline, or relay is currently running.

As of 2026-09-07, both `https://springfield.gaulatti.com/` and `/streams`
return nginx `502 Bad Gateway`. The historical ECR repository and CloudWatch
log group named by the deployment workflow are absent. Automatic deployment is
disabled; do not use the historical push-to-main ECR/SSH procedure.

See [OWNERSHIP.md](OWNERSHIP.md) for the dated evidence, recovery contract,
unverified boundaries, and blocked follow-up.

## Source boundary

The NestJS source contains two related surfaces:

- `StreamsService`, which starts bounded FFmpeg-to-RTMP jobs and records their
  HLS URLs in MySQL;
- `TelegramService`, which reads selected Telegram channels and optionally
  relays or translates messages.

These interfaces are recovery evidence only until issue #2 establishes an
authorized target, dependencies, secrets ownership, authenticated behavior,
health proof, backup/recovery, and rollback.

## Safe verification

From a clean checkout:

```sh
npm ci
npm run build
npm run test:cov -- --runInBand
```

Pull requests run those checks in CI. They do not build or publish an image,
contact live Telegram/Gemini accounts, mutate a database, or deploy a service.
