import { StartStreamDto } from 'src/dto/start-stream.dto';

describe('StartStreamDto', () => {
  it('should create an instance with url', () => {
    const dto = new StartStreamDto();
    dto.url = 'rtmp://test';
    expect(dto.url).toBe('rtmp://test');
  });
});
