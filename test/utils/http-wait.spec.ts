import { waitForHttpOk } from 'src/utils/http-wait';

describe('waitForHttpOk', () => {
  it('should throw if url never returns 200', async () => {
    await expect(waitForHttpOk('http://localhost:9999', 100)).rejects.toThrow();
  });
});
