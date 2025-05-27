import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { StartStreamDto } from '../dto/start-stream.dto';
import { StreamsService } from './streams.service';

/**
 * Controller responsible for handling HTTP requests related to stream operations.
 * Provides endpoints to start, stop, and list streams by delegating to the StreamsService.
 *
 * @remarks
 * This controller exposes RESTful endpoints for managing streams, including:
 * - Starting a new stream with a data transfer object.
 * - Stopping an existing stream by its UUID.
 * - Listing all available streams.
 *
 * @see StreamsService
 */
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  /**
   * Starts a new stream using the provided data transfer object.
   *
   * @param dto - The data transfer object containing the necessary information to start the stream.
   * @returns A promise that resolves with the result of the stream start operation.
   */
  @Post()
  start(@Body() dto: StartStreamDto) {
    return this.streamsService.startStream(dto);
  }

  /**
   * Stops the stream associated with the given UUID.
   *
   * @param uuid - The unique identifier of the stream to stop.
   * @returns A promise resolving to the result of the stop operation.
   */
  @Delete(':uuid')
  @HttpCode(200)
  async stop(@Param('uuid') uuid: string) {
    return this.streamsService.stopStream(uuid);
  }
  /**
   * Retrieves a list of streams from the streams service.
   *
   * @returns {Promise<Stream[]>} A promise that resolves to an array of stream objects.
   */
  @Get()
  async list(): Promise<
    Array<{ hlsUrl: string; startTime: Date; expiresAt: Date }>
  > {
    const streams = await this.streamsService.listStreams();
    return streams.map(({ hlsUrl, startTime, expiresAt }) => ({
      hlsUrl,
      startTime,
      expiresAt,
    }));
  }
}
