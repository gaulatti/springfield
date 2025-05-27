import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Stream } from './models/stream.model';
import { StreamsController } from './streams/streams.controller';
import { StreamsService } from './streams/streams.service';

/**
 * The AWS Secrets Manager client.
 */
const secretsManager = new SecretsManagerClient();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const defaultConfig: SequelizeModuleOptions = {
          dialect: 'mysql',
          port: +3306,
          models: [join(__dirname, '**/*.model.ts')],
          autoLoadModels: true,
          logging: false,
        };

        /**
         * Retrieve the secret from AWS Secrets Manager.
         */
        const secretResponse = await secretsManager.send(
          new GetSecretValueCommand({
            SecretId: configService.get('DB_CREDENTIALS'),
          }),
        );

        /**
         * If the secret response contains a secret string, parse it and return the database configuration.
         */
        if (secretResponse.SecretString) {
          const { host, port, username, password } = JSON.parse(
            secretResponse.SecretString,
          );

          const remoteConfig = {
            ...defaultConfig,
            host: host,
            port: +port,
            username,
            password,
            database: configService.get('DB_DATABASE'),
          };

          return {
            ...remoteConfig,
          };
        }

        throw new Error(
          'Failed to retrieve database credentials from AWS Secrets Manager.',
        );
      },
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([Stream]),
  ],
  controllers: [AppController, StreamsController],
  providers: [AppService, StreamsService],
})

/**
 * The root module of the application.
 *
 * @remarks
 * This class is used to configure the main application module in a NestJS project.
 * It serves as the entry point for module imports, controllers, and providers.
 */
export class AppModule {}
