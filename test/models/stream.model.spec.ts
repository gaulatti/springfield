import { Stream } from 'src/models/stream.model';

describe('Stream Model', () => {
  it('should have required fields', () => {
    const stream = new Stream();
    stream.uuid = 'uuid';
    stream.pid = 123;
    stream.originalUrl = 'url';
    stream.hlsUrl = 'hls';
    stream.startTime = new Date();
    stream.expiresAt = new Date();
    expect(stream.uuid).toBe('uuid');
    expect(stream.pid).toBe(123);
    expect(stream.originalUrl).toBe('url');
    expect(stream.hlsUrl).toBe('hls');
    expect(stream.startTime).toBeInstanceOf(Date);
    expect(stream.expiresAt).toBeInstanceOf(Date);
  });
});
