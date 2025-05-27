# Springfield: A ton of things.

## What it contains

**StreamsService** manages on-demand HLS repackaging jobs. It orchestrates FFmpeg to repackage incoming live streams (via RTMP) and outputs HLS segments, making them available for HTTP playback. The service is designed for reliability, cross-container compatibility, and operational clarity.

**Key Features:**
- On-demand HLS repackaging via FFmpeg and nginx-rtmp
- Resource management: max 10 concurrent streams, 5-minute TTL
- Lifecycle management: tracks streams in MySQL, cleans up expired streams/processes/files
- Robust error handling
- Cross-container safe: HLS readiness via HTTP polling

---

## Deployment

### Prerequisites
- Docker (recommended)
- MySQL database (see GitHub Actions or your deployment workflow for setup)
- nginx-rtmp server (for RTMP ingest and HLS output)
- FFmpeg (installed in the service container)

### Environment Variables
Set the following environment variables:
- `DB_CREDENTIALS` (AWS Secrets Manager secret for DB connection)
- `DB_DATABASE` (database name)
- `RTMP_BASE_URL` (e.g. rtmp://nginx-rtmp/live)
- `HLS_BASE_URL` (e.g. http://nginx-rtmp/hls)
- `HLS_OUTPUT_DIR` (e.g. /hls)
- `HTTP_PORT` (optional, default: 3000)
- `CONTAINERIZED` (optional, for logging)

### Docker Deployment
Build and run the service (adjust env vars as needed):

```fish
# Build the Docker image
docker build -t streams-service .

# Run the service (see your GitHub Actions or deployment workflow for MySQL setup)
docker run -d --name streams-service \
  -e DB_CREDENTIALS=... -e DB_DATABASE=... \
  -e RTMP_BASE_URL=rtmp://nginx-rtmp/live \
  -e HLS_BASE_URL=http://nginx-rtmp/hls \
  -e HLS_OUTPUT_DIR=/hls \
  -e HTTP_PORT=3000 \
  -e CONTAINERIZED=true \
  --memory=3g \
  streams-service
```

- nginx-rtmp and MySQL must be accessible from the container.
- Adjust RAM if you change the max concurrent streams (approx. 300MB per stream).

---

## API Usage

### Start a Stream
```bash
curl -X POST http://localhost:3000/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "rtmp://..."}'
```
- Returns: `{ uuid, hlsUrl, startedAt, expiresAt }`

### Stop a Stream
```bash
curl -X DELETE http://localhost:3000/streams/<uuid>
```

### List Active Streams
```bash
curl -X GET http://localhost:3000/streams
```

---

## Operational Notes
- Resource limits: Max 10 concurrent streams, 5-minute TTL per stream (configurable)
- Automatic cleanup: Expired streams, dead FFmpeg processes, and old HLS files are cleaned up automatically
- Error handling: Invalid input, FFmpeg failures, and process errors are logged and handled
- RAM sizing: Allocate ~300MB RAM per concurrent stream (3GB for 10 streams)
- Cross-container: HLS readiness is detected via HTTP polling
- Production best practices:
  - Use Docker Compose or Kubernetes for orchestration
  - Mount HLS output directory as a Docker volume
  - Monitor logs for FFmpeg errors and resource usage

---

## Development & Contribution

### Local Development
```bash
npm install
npm run start:dev
```
- Ensure MySQL and nginx-rtmp are running and accessible
- Set environment variables in a `.env` file or your shell

### Making Changes
- Business logic: `src/streams/streams.service.ts`
- Scheduled cleanup: `src/streams/streams.cleanup.task.ts` (centralized in `cleanupAll()`)
- Models: `src/models/stream.model.ts`
- DTOs: `src/dto/`
- Utilities: `src/utils/`

### Testing
```bash
npm run test
npm run test:e2e
```

---

## Troubleshooting & FAQ
- Stream not starting? Check FFmpeg logs and ensure RTMP/HLS endpoints are reachable
- HLS not available? Ensure nginx-rtmp is running and HLS output directory is mounted
- Too many streams? The service enforces a hard limit; wait for cleanup or stop unused streams
