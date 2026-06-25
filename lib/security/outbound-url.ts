import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type AddressResolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultResolver: AddressResolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export function isPrivateOrReservedAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const family = isIP(normalized);

  if (family === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) || a >= 224
    );
  }

  if (family === 6) {
    if (normalized.startsWith("::ffff:")) {
      return isPrivateOrReservedAddress(normalized.slice(7));
    }
    return (
      normalized === "::" || normalized === "::1" ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8")
    );
  }

  return true;
}

export async function assertSafeOutboundUrl(
  input: string,
  resolver: AddressResolver = defaultResolver
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Endpoint must be a valid URL");
  }

  if (url.protocol !== "https:") throw new Error("Endpoint must use HTTPS");
  if (url.username || url.password) throw new Error("Endpoint credentials are not allowed in the URL");
  if (url.port && url.port !== "443") throw new Error("Endpoint must use the standard HTTPS port");

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal")
  ) {
    throw new Error("Private network endpoints are not allowed");
  }

  const bareHostname = hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(bareHostname);
  if (literalFamily && isPrivateOrReservedAddress(bareHostname)) {
    throw new Error("Private or reserved endpoint addresses are not allowed");
  }

  const addresses = literalFamily
    ? [{ address: bareHostname, family: literalFamily }]
    : await resolver(hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedAddress(address))) {
    throw new Error("Endpoint resolves to a private or reserved network address");
  }

  return url;
}
