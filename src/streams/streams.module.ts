import { Module, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, ScheduleModule } from '@nestjs/schedule';
import { StreamsService } from './streams.service';

/**
 * The StreamsModule is responsible for managing stream-related operations within the application.
 *
 * This module initializes stream cleanup procedures both on module initialization and at regular intervals.
 * It leverages the StreamsService to perform cleanup tasks, ensuring that resources associated with streams
 * are properly managed and released.
 *
 * @remarks
 * - Implements the {@link OnModuleInit} interface to hook into the NestJS module lifecycle.
 * - Uses the `@Cron` decorator to schedule periodic cleanup every 5 minutes.
 *
 * @example
 * // The StreamsModule is typically imported into the main application module:
 * import { StreamsModule } from './streams/streams.module';
 *
 * @see {@link StreamsService}
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [StreamsService],
})
export class StreamsModule implements OnModuleInit {
  constructor(private readonly streamsService: StreamsService) {}

  /**
   * Lifecycle hook that is called when the module has been initialized.
   * Invokes the `cleanupAll` method of the `streamsService` to perform any necessary cleanup operations.
   * This method is called automatically by the NestJS framework.
   */
  onModuleInit() {
    void this.streamsService.cleanupAll();
  }

  /**
   * Initiates the cleanup process for all streams managed by the StreamsService.
   * This method calls the asynchronous `cleanupAll` function and ignores its returned promise.
   * Typically used to perform resource cleanup or shutdown procedures.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCleanup() {
    void this.streamsService.cleanupAll();
  }
}
