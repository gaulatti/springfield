import { Test, TestingModule } from '@nestjs/testing';
import { StreamsController } from 'src/streams/streams.controller';
import { StreamsService } from 'src/streams/streams.service';

describe('StreamsController', () => {
  let controller: StreamsController;
  let service: StreamsService;

  beforeEach(async () => {
    service = {
      startStream: jest.fn(),
      stopStream: jest.fn(),
      listStreams: jest.fn(),
    } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamsController],
      providers: [{ provide: StreamsService, useValue: service }],
    }).compile();
    controller = module.get<StreamsController>(StreamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call startStream', async () => {
    (service.startStream as jest.Mock).mockResolvedValue({
      hlsUrl: 'a',
      startTime: new Date(),
      expiresAt: new Date(),
    });
    const dto = { url: 'foo' };
    const result = await controller.start(dto);
    expect(service.startStream).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('hlsUrl');
  });

  it('should call stopStream', async () => {
    (service.stopStream as jest.Mock).mockResolvedValue({ message: 'ok' });
    const result = await controller.stop('id');
    expect(service.stopStream).toHaveBeenCalledWith('id');
    expect(result).toHaveProperty('message');
  });

  it('should call list and filter output', async () => {
    (service.listStreams as jest.Mock).mockResolvedValue([
      {
        hlsUrl: 'a',
        startTime: new Date(),
        expiresAt: new Date(),
        uuid: 'u',
        pid: 1,
        originalUrl: 'o',
      },
    ]);
    const result = await controller.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('hlsUrl');
    expect(result[0]).not.toHaveProperty('uuid');
    expect(result[0]).not.toHaveProperty('pid');
    expect(result[0]).not.toHaveProperty('originalUrl');
  });
});
