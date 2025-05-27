import { config } from 'dotenv';
config();

/**
 * The port number for the gRPC and HTTP servers.
 *
 * This value is retrieved from the environment variables `GRPC_PORT` and `HTTP_PORT.
 * If the environment variables are not set, they default to `50051` and `3000`.
 *
 * @constant
 * @type {number}
 */
const httpPort: number = Number(process.env.HTTP_PORT) || 3000;

/**
 * Extracts the hostname and port from a given URL string.
 *
 * @param input - The URL string to parse.
 * @returns An object containing the hostname and port.
 * @throws Will throw an error if the input is not a valid URL.
 */
const getHostAndPort = (input: string): { hostname: string; port: number } => {
  try {
    const url = new URL(input);
    const hostname = url.hostname;
    const port = parseInt(url.port, 10);

    return { hostname, port };
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }
};

export { getHostAndPort, httpPort };
