import { Test, TestingModule } from '@nestjs/testing';
import { StreamsService } from 'src/streams/streams.service';
import { getModelToken } from '@nestjs/sequelize';
import { Stream } from 'src/models/stream.model';

describe('StreamsService', () => {
  let service: StreamsService;
  let streamModel: any;

  beforeEach(async () => {
    streamModel = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      destroy: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamsService,
        {
          provide: getModelToken(Stream),
          useValue: streamModel,
        },
      ],
    }).compile();
    service = module.get<StreamsService>(StreamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startStream', () => {
    it('should throw if max streams reached', async () => {
      streamModel.count.mockResolvedValue(10);
      await expect(service.startStream({ url: 'foo' })).rejects.toThrow();
    });
    it('should return existing if already running', async () => {
      streamModel.count.mockResolvedValue(0);
      streamModel.findOne.mockResolvedValue({ pid: 123, originalUrl: 'foo' });
      jest.spyOn(service as any, 'isPidAlive').mockReturnValue(true);
      const result = await service.startStream({ url: 'foo' });
      expect(result.originalUrl).toBe('foo');
    });
  });

  describe('stopStream', () => {
    it('should throw if not found', async () => {
      streamModel.findByPk.mockResolvedValue(null);
      await expect(service.stopStream('bad')).rejects.toThrow();
    });
  });

  describe('listStreams', () => {
    it('should return all streams', async () => {
      streamModel.findAll.mockResolvedValue([{ hlsUrl: 'a', startTime: new Date(), expiresAt: new Date() }]);
      const result = await service.listStreams();
      expect(result.length).toBe(1);
    });
  });

  describe('cleanupExpiredStreams', () => {
    it('should cleanup expired streams', async () => {
      streamModel.findAll.mockResolvedValue([{ pid: 1, uuid: 'u', destroy: jest.fn() }]);
      jest.spyOn(process, 'kill').mockImplementation(() => undefined);
      jest.spyOn(service as any, 'deleteHlsFiles').mockImplementation(() => undefined);
      await service.cleanupExpiredStreams();
      expect(streamModel.findAll).toHaveBeenCalled();
    });
  });

  describe('cleanupOldHlsFiles', () => {
    it('should not throw if dir does not exist', () => {
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
      jest.spyOn(require('fs'), 'mkdirSync').mockImplementation(() => undefined);
      service.cleanupOldHlsFiles();
    });
  });

  describe('isPidAlive', () => {
    it('should return true for alive pid', () => {
      jest.spyOn(process, 'kill').mockImplementation(() => undefined);
      expect((service as any).isPidAlive(1)).toBe(true);
    });
    it('should return false for dead pid', () => {
      jest.spyOn(process, 'kill').mockImplementation(() => { throw new Error(); });
      expect((service as any).isPidAlive(1)).toBe(false);
    });
  });
});
