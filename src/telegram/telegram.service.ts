import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
} from '@google/generative-ai';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { BigInteger } from 'big-integer';
import * as input from 'input';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private client: TelegramClient;
  private readonly channelIds = [
    BigInt('2434627915'),
    BigInt('1250288852'),
    BigInt('1251718534'),
  ];

  private readonly GEMINI_MODEL = 'gemini-2.0-flash-exp';
  private readonly GEMINI_SAFETY_SETTINGS: SafetySetting[] = [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: 'HARM_CATEGORY_CIVIC_INTEGRITY' as HarmCategory,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    await this.initializeClient();
    this.setupMessageHandlers();
  }

  private async initializeClient() {
    const apiIdStr = this.configService.get<string>('TELEGRAM_API_ID');
    if (!apiIdStr) throw new Error('TELEGRAM_API_ID must be set');
    const apiId = parseInt(apiIdStr, 10);
    if (isNaN(apiId)) throw new Error('TELEGRAM_API_ID must be a valid number');

    const apiHash = this.configService.get<string>('TELEGRAM_API_HASH');
    if (!apiHash) throw new Error('TELEGRAM_API_HASH must be set');

    const sessionString = this.configService.get<string>('TELEGRAM_SESSION');
    const stringSession = new StringSession(sessionString || '');
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();

    if (!sessionString) {
      await this.client.start({
        phoneNumber: async () =>
          await input.text('Please enter your phone number: '),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () =>
          await input.text('Please enter the code you received: '),
        onError: (err) => this.logger.error(err),
      });
      const savedSession = this.client.session.save();
      this.logger.log('Save this session string for future use:');
      this.logger.log(savedSession);
    }
  }

  private async translateWithGemini(input: string): Promise<string> {
    try {
      this.logger.debug('Starting Gemini translation for input:', {
        inputLength: input.length,
        inputPreview:
          input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      });

      const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;
      if (!apiKey) {
        this.logger.error('GEMINI_API_KEY is not configured');
        throw new Error('GEMINI_API_KEY is not configured');
      }

      this.logger.debug('Initializing Gemini AI client');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: this.GEMINI_MODEL,
        safetySettings: this.GEMINI_SAFETY_SETTINGS,
      });

      const prompt = `Translate this to English, but preserve formatting, mentions, and tone. If it's already in English, return it as-is:\n\n${input}`;
      this.logger.debug('Generated translation prompt:', {
        promptLength: prompt.length,
        promptPreview:
          prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      });

      this.logger.debug('Sending request to Gemini API');
      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      const endTime = Date.now();

      this.logger.debug('Received response from Gemini API', {
        responseTime: `${endTime - startTime}ms`,
        hasResponse: !!result.response,
      });

      const response = result.response;
      const translatedText = response.text().trim();

      this.logger.debug('Translation completed', {
        originalLength: input.length,
        translatedLength: translatedText.length,
        translatedPreview:
          translatedText.substring(0, 100) +
          (translatedText.length > 100 ? '...' : ''),
      });

      return translatedText;
    } catch (error) {
      this.logger.error('Translation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        inputLength: input.length,
        inputPreview:
          input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      });
      throw error;
    }
  }

  private async sendMediaToBot(
    botToken: string,
    chatId: string,
    message: any,
    formattedText: string,
  ) {
    try {
      if (message.photo) {
        const photo = message.photo[message.photo.length - 1];
        this.logger.debug('Processing photo:', {
          photoId: photo.id,
          size: photo.size,
          type: photo.type,
        });

        const buffer = await this.client.downloadMedia(photo, {
          progressCallback: (downloaded: BigInteger) => {
            this.logger.debug(
              `Downloading photo: ${Math.round(downloaded.toJSNumber() * 100)}%`,
            );
          },
        });

        if (!buffer) {
          throw new Error('Failed to download photo');
        }

        this.logger.debug('Photo downloaded successfully', {
          bufferSize: buffer.length,
        });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', formattedText);
        formData.append('parse_mode', 'HTML');
        formData.append('photo', new Blob([buffer]), 'photo.jpg');

        await this.httpService.axiosRef.post(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );
      } else if (message.video) {
        this.logger.debug('Processing video:', {
          videoId: message.video.id,
          size: message.video.size,
          mimeType: message.video.mimeType,
          duration: message.video.duration,
        });

        try {
          const buffer = await this.client.downloadMedia(message.video, {
            progressCallback: (downloaded: BigInteger) => {
              this.logger.debug(
                `Downloading video: ${Math.round(downloaded.toJSNumber() * 100)}%`,
              );
            },
          });

          if (!buffer) {
            throw new Error('Failed to download video');
          }

          this.logger.debug('Video downloaded successfully', {
            bufferSize: buffer.length,
          });

          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('caption', formattedText);
          formData.append('parse_mode', 'HTML');
          formData.append('video', new Blob([buffer]), 'video.mp4');

          this.logger.debug('Sending video to bot...');
          const response = await this.httpService.axiosRef.post(
            `https://api.telegram.org/bot${botToken}/sendVideo`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
            },
          );

          this.logger.debug('Video sent successfully', {
            status: response.status,
            statusText: response.statusText,
          });
        } catch (downloadError) {
          this.logger.error('Video download/upload failed:', {
            error: downloadError instanceof Error ? downloadError.message : 'Unknown error',
            stack: downloadError instanceof Error ? downloadError.stack : undefined,
          });
          throw downloadError;
        }
      } else {
        await this.httpService.axiosRef.post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            chat_id: chatId,
            text: formattedText,
            parse_mode: 'HTML',
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to send media to bot:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        mediaType: message.photo ? 'photo' : message.video ? 'video' : 'text',
      });

      // Fallback to text-only message
      await this.httpService.axiosRef.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: formattedText,
          parse_mode: 'HTML',
        },
      );
    }
  }

  private setupMessageHandlers() {
    this.client.addEventHandler(async (event) => {
      try {
        const message = event.message;
        const chat = await event.message.getChat();
        if (!chat) return;

        this.logger.debug('Chat object:', {
          id: chat.id,
          title: 'title' in chat ? chat.title : undefined,
          username: 'username' in chat ? chat.username : undefined,
          type: 'type' in chat ? chat.type : undefined,
        });

        if (!message.text) return;

        const chatId = BigInt(chat.id.toString());
        if (!this.channelIds.includes(chatId)) return;

        this.logger.log(`Processing message from monitored channel: ${chatId}`);

        const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
        if (webhookUrl) {
          try {
            await this.httpService.axiosRef.post(webhookUrl, {
              channel: chatId.toString(),
              message: message.text,
              channelTitle: 'title' in chat ? chat.title : undefined,
              channelUsername: 'username' in chat ? chat.username : undefined,
            });
            this.logger.log('Successfully forwarded message to webhook');
          } catch (error) {
            this.logger.error('Failed to send message to webhook:', error);
          }
        }

        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const botChatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
        if (botToken && botChatId) {
          const channelInfo = 'title' in chat ? `[${chat.title}]` : '';
          const translatedText = await this.translateWithGemini(message.text);
          const formattedMessage = `${channelInfo}\n\n${message.text}\n\n————\n${translatedText}`;
          await this.sendMediaToBot(
            botToken,
            botChatId,
            message,
            formattedMessage,
          );
          this.logger.log('Successfully forwarded message to bot');
        }
      } catch (error) {
        this.logger.error('Error processing message:', error);
      }
    }, new NewMessage({}));
  }

  async sendMessage(message: string) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    if (!botToken || !chatId)
      throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');

    try {
      await this.httpService.axiosRef.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
        },
      );
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }
}
