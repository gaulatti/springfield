import { Sequelize } from 'sequelize-typescript';
import { Stream } from 'src/models/stream.model';

describe('Stream Model', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    database: 'springfield_test',
    username: 'springfield_test',
    password: 'not-used',
    logging: false,
    models: [Stream],
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should have required fields', () => {
    const stream = Stream.build({
      uuid: 'uuid',
      pid: 123,
      originalUrl: 'url',
      hlsUrl: 'hls',
      startTime: new Date(),
      expiresAt: new Date(),
    });

    expect(stream.uuid).toBe('uuid');
    expect(stream.pid).toBe(123);
    expect(stream.originalUrl).toBe('url');
    expect(stream.hlsUrl).toBe('hls');
    expect(stream.startTime).toBeInstanceOf(Date);
    expect(stream.expiresAt).toBeInstanceOf(Date);
  });
});
