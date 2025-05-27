import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  type NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { httpPort } from './utils/network';

/**
 * Bootstraps the NestJS application using the Fastify adapter.
 *
 * - Creates a new Nest application instance with Fastify.
 * - Enables CORS for cross-origin requests.
 * - Registers compression middleware for response compression.
 * - Starts the application on the specified HTTP port and logs the startup message.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application has started.
 */
async function bootstrap(): Promise<void> {
  /**
   * Create a new Nest application using the Fastify adapter
   */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  /**
   * Enable CORS for the application
   */
  app.enableCors();

  /**
   * Start the application.
   */
  await app.listen(httpPort, '0.0.0.0');
  Logger.log(`🚀 REST API running on port ${httpPort}`);
}

if (require.main === module) {
  bootstrap();
}
