import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StartStreamDto } from '../dto/start-stream.dto';
import { Stream } from '../models/stream.model';
import { waitForHttpOk } from '../utils/http-wait';

/**
 * Service responsible for managing video streaming sessions using FFmpeg, RTMP, and HLS.
 *
 * The `StreamsService` provides methods to start, stop, list, and clean up streaming sessions.
 * It enforces a maximum number of concurrent streams, manages FFmpeg processes, and handles
 * the lifecycle of HLS files and database records associated with each stream.
 *
 * Key features:
 * - Starts new streaming sessions with FFmpeg, enforcing concurrency limits.
 * - Prevents duplicate streams for the same source URL.
 * - Tracks and persists stream metadata (UUID, PID, URLs, timing) in the database.
 * - Stops streams by killing associated FFmpeg processes and cleaning up resources.
 * - Periodically cleans up expired streams, dead processes, and old HLS files.
 * - Provides utilities for checking process liveness and deleting stream-specific files.
 *
 * Intended for use in applications that require programmatic control over live video streaming,
 * such as media servers, live event platforms, or video ingestion pipelines.
 */
@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);
  private readonly hlsDir = path.resolve(__dirname, '../hls');
  private readonly maxStreams = 10;
  private readonly streamDurationMs = 5 * 60 * 1000;

  /**
   * Constructs a new instance of the StreamsService.
   *
   * @param streamModel - The Sequelize model for the Stream entity, injected via @InjectModel.
   *
   * @remarks
   * Upon instantiation, this constructor triggers the `cleanupAll` method asynchronously to perform any necessary cleanup tasks.
   */
  constructor(
    @InjectModel(Stream)
    private streamModel: typeof Stream,
  ) {
    void this.cleanupAll();
  }

  /**
   * Starts a new streaming session using FFmpeg, enforcing a maximum number of concurrent streams.
   *
   * - Checks if the maximum allowed streams are already running and throws a `ForbiddenException` if the limit is reached.
   * - If a stream with the same original URL is already running, returns the existing stream.
   * - Spawns an FFmpeg process to ingest the input stream and push it to an RTMP endpoint.
   * - Waits for the HLS output to become available before proceeding.
   * - Saves the stream details (UUID, PID, URLs, start and expiry times) to the database.
   * - Attaches error and exit event handlers to the FFmpeg process for logging.
   *
   * @param dto - The data transfer object containing the original stream URL and other parameters.
   * @returns The created or existing stream record from the database.
   * @throws ForbiddenException If the maximum number of streams is reached.
   * @throws BadRequestException If the FFmpeg process fails to start.
   */
  async startStream(dto: StartStreamDto) {
    /**
     * Check for max streams
     */
    const activeCount = await this.streamModel.count({
      where: { expiresAt: { $gt: new Date() } },
    });
    if (activeCount >= this.maxStreams) {
      throw new ForbiddenException('Stream limit reached');
    }

    /**
     * Check if a stream with the same URL is already running.
     */
    const existing = await this.streamModel.findOne({
      where: { originalUrl: dto.url },
    });
    if (existing && this.isPidAlive(existing.pid)) {
      return existing;
    }

    /**
     * Generate a unique identifier for the stream.
     */
    const uuid: string = uuidv4();

    /**
     * Construct the RTMP and HLS URLs.
     */
    const rtmpBase = process.env.RTMP_BASE_URL!;
    const rtmpUrl = `${rtmpBase}/${uuid}`;
    const hlsUrl = `${process.env.HLS_BASE_URL}/${uuid}.m3u8`;

    /**
     * Create HLS directory if it doesn't exist
     */
    const ffmpeg = spawn('ffmpeg', [
      '-rtbufsize',
      '1500M',
      '-probesize',
      '10M',
      '-analyzeduration',
      '10M',
      '-i',
      dto.url,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-f',
      'flv',
      rtmpUrl,
    ]);

    /**
     * Wait for FFmpeg to start and create HLS files
     */
    await waitForHttpOk(hlsUrl, 10000);

    /**
     * Save stream details to the database
     */
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.streamDurationMs);

    if (!ffmpeg?.pid) {
      throw new BadRequestException('FFmpeg process failed to start');
    }

    /**
     * Create HLS directory if it doesn't exist
     */
    const stream = await this.streamModel.create({
      uuid,
      pid: ffmpeg.pid,
      originalUrl: dto.url,
      hlsUrl,
      startTime: now,
      expiresAt,
    });

    /**
     * Attach event listeners to the FFmpeg process for error handling and logging.
     */
    ffmpeg.on('error', (err) => {
      this.logger.error(`FFmpeg error: ${err.message}`);
    });
    ffmpeg.on('exit', (code) => {
      this.logger.log(`FFmpeg exited with code ${code}`);
    });
    return stream;
  }

  /**
   * Stops a running stream by its UUID.
   *
   * This method performs the following actions:
   * 1. Finds the stream by its UUID.
   * 2. Attempts to kill the process associated with the stream's PID.
   * 3. Removes the stream record from the database.
   * 4. Deletes any HLS files associated with the stream.
   *
   * @param uuid - The unique identifier of the stream to stop.
   * @returns An object containing a message indicating the stream has been stopped.
   * @throws NotFoundException If the stream with the given UUID is not found.
   */
  async stopStream(uuid: string) {
    const stream = await this.streamModel.findByPk(uuid);
    if (!stream) throw new NotFoundException('Stream not found');
    try {
      process.kill(stream.pid);
    } catch (e: any) {
      this.logger.warn(`Failed to kill PID ${stream.pid}: ${e.message}`);
    }
    await this.streamModel.destroy({ where: { uuid: uuid } });

    /**
     * Remove HLS files associated with the stream
     */
    this.deleteHlsFiles(uuid);
    return { message: 'Stream stopped' };
  }

  /**
   * Retrieves all stream records from the database that have not yet expired.
   *
   * @returns A promise that resolves to an array of stream objects whose `expiresAt` date is in the future.
   */
  listStreams() {
    return this.streamModel.findAll({});
  }

  /**
   * Cleans up expired stream records from the database.
   *
   * This method performs the following actions:
   * - Finds all streams whose `expiresAt` timestamp is earlier than the current time.
   * - Attempts to kill the process associated with each expired stream using its PID.
   * - Logs a warning if the process cannot be killed.
   * - Deletes associated HLS files for each expired stream.
   * - Removes the expired stream record from the database.
   *
   * @returns {Promise<void>} A promise that resolves when the cleanup is complete.
   */
  async cleanupExpiredStreams(): Promise<void> {
    const now = new Date();
    const expired = await this.streamModel.findAll({
      where: { expiresAt: { $lt: now } },
    });
    for (const stream of expired) {
      try {
        process.kill(stream.pid);
      } catch {
        this.logger.warn(`Failed to kill PID ${stream.pid}`);
      }
      this.deleteHlsFiles(stream.uuid);
      void stream.destroy();
    }
  }

  /**
   * Removes HLS files older than 5 minutes from the configured HLS directory.
   *
   * - Ensures the HLS directory exists, creating it if necessary.
   * - Iterates through all files in the directory.
   * - Deletes any file whose last modification time is more than 5 minutes ago.
   *
   * @throws Will throw an error if file system operations fail.
   */
  cleanupOldHlsFiles() {
    if (!fs.existsSync(this.hlsDir)) {
      fs.mkdirSync(this.hlsDir, { recursive: true });
    }
    const files = fs.readdirSync(this.hlsDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(this.hlsDir, file);
      const stat = fs.statSync(filePath);

      /**
       * Delete files older than 5 minutes
       */
      if (now - stat.mtimeMs > 5 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Checks if a process with the given PID is currently alive.
   *
   * Sends signal `0` to the specified process ID to determine if it exists and is accessible.
   * Returns `true` if the process is alive, otherwise returns `false`.
   *
   * @param pid - The process ID to check.
   * @returns `true` if the process is alive; otherwise, `false`.
   */
  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
    } catch {
      this.logger.warn(`Process with PID ${pid} is not alive.`);
      return false;
    }
    return true;
  }

  /**
   * Deletes the HLS playlist file (.m3u8) and all associated MPEG-TS segment files (.ts)
   * for a given stream UUID from the HLS directory.
   *
   * @param uuid - The unique identifier of the stream whose HLS files should be deleted.
   */
  private deleteHlsFiles(uuid: string) {
    const hlsFile = path.join(this.hlsDir, `${uuid}.m3u8`);
    if (fs.existsSync(hlsFile)) fs.unlinkSync(hlsFile);

    /**
     * Remove all .ts files associated with the stream
     */
    const dir = path.dirname(hlsFile);
    fs.readdirSync(dir).forEach((file) => {
      if (file.startsWith(uuid) && file.endsWith('.ts')) {
        fs.unlinkSync(path.join(dir, file));
      }
    });
  }

  /**
   * Every 5 minutes, check if PIDs from the database are still running.
   * If not, delete the files for that PID and the record in the database.
   */
  async cleanupDeadProcesses() {
    const activeStreams = await this.streamModel.findAll();
    for (const stream of activeStreams) {
      if (!this.isPidAlive(stream.pid)) {
        this.logger.warn(
          `PID ${stream.pid} for stream ${stream.uuid} is not alive. Cleaning up.`,
        );
        this.deleteHlsFiles(stream.uuid);
        void this.streamModel.destroy({ where: { uuid: stream.uuid } });
      }
    }
  }

  /**
   * Runs all cleanup tasks: expired streams, old HLS files, and dead processes.
   */
  public cleanupAll() {
    void this.cleanupExpiredStreams();
    void this.cleanupOldHlsFiles();
    void this.cleanupDeadProcesses();
  }
}
