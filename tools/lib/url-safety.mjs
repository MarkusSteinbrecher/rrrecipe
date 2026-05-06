import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const defaultDeniedHosts = new Set(["localhost"]);

export async function validateExternalUrl(input, options = {}) {
  const url = parseUrl(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  const hostname = normalizedHostname(url);
  const deniedHosts = options.deniedHosts ?? defaultDeniedHosts;
  if (deniedHosts.has(hostname)) {
    throw new Error(`Host ${hostname} is not allowed.`);
  }

  const addresses = await resolveAddresses(hostname, options.lookup ?? dnsLookup);
  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`Host ${hostname} resolves to a private or local address.`);
    }
  }

  return { ok: true, url };
}

export async function readResponseTextWithLimit(response, maxBytes) {
  const contentLength = response.headers.get("content-length");
  if (!contentLength) {
    throw new Error("Refusing to read response without a content-length header.");
  }
  const expectedBytes = Number(contentLength);
  if (!Number.isFinite(expectedBytes) || expectedBytes < 0) {
    throw new Error("Response content-length is invalid.");
  }
  if (expectedBytes > maxBytes) {
    throw new Error(`Response body exceeds ${maxBytes} bytes.`);
  }

  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error(`Response body exceeds ${maxBytes} bytes.`);
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response body exceeds ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function parseUrl(input) {
  try {
    return new URL(String(input ?? ""));
  } catch {
    throw new Error("URL is empty or malformed.");
  }
}

function normalizedHostname(url) {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

async function resolveAddresses(hostname, lookup) {
  if (isIP(hostname)) return [hostname];
  let records;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`Could not resolve host ${hostname}.`);
  }
  const addresses = Array.isArray(records) ? records.map((record) => record.address).filter(Boolean) : [records?.address].filter(Boolean);
  if (!addresses.length) throw new Error(`Could not resolve host ${hostname}.`);
  return addresses;
}

function isPrivateAddress(address) {
  const normalized = address.toLowerCase();
  const mappedIpv4 = mappedIpv4Address(normalized);
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) return isPrivateIpv6(normalized);
  return true;
}

function mappedIpv4Address(address) {
  const dotted = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return undefined;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

function isPrivateIpv4(address) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(address) {
  if (address === "::" || address === "::1") return true;
  const first = Number.parseInt(address.split(":")[0] || "0", 16);
  return (first >= 0xfe80 && first <= 0xfebf) || (first >= 0xfc00 && first <= 0xfdff);
}
