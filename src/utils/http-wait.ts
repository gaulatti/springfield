import { BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';

/**
 * Waits for an HTTP 200 OK response from the specified URL within a given timeout period.
 *
 * This function repeatedly sends HTTP HEAD requests to the provided URL until a successful
 * response (status 200) is received or the timeout is reached. If the timeout is exceeded
 * without receiving a successful response, a `BadRequestException` is thrown.
 *
 * @param url - The URL to check for an HTTP 200 OK response.
 * @param timeout - The maximum time to wait (in milliseconds) before giving up.
 * @throws {BadRequestException} If the URL does not return HTTP 200 within the timeout.
 * @returns A promise that resolves when the URL responds with HTTP 200 OK.
 */
const waitForHttpOk = async (url: string, timeout: number): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return;
    } catch {
      console.warn(`Failed to fetch ${url}, retrying...`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new BadRequestException('HLS .m3u8 did not appear in time (HTTP 200)');
};

export { waitForHttpOk };
