import { getHostAndPort, httpPort } from 'src/utils/network';

describe('network utils', () => {
  it('should parse host and port', () => {
    const { hostname, port } = getHostAndPort('http://localhost:8080');
    expect(hostname).toBe('localhost');
    expect(port).toBe(8080);
  });
  it('should return default httpPort', () => {
    expect(typeof httpPort).toBe('number');
  });
  it('should throw on invalid url', () => {
    expect(() => getHostAndPort('bad')).toThrow();
  });
});
