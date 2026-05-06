import { describe, expect, it } from "vitest";
import { readResponseTextWithLimit, validateExternalUrl } from "./url-safety.mjs";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];
const privateLookup = async () => [{ address: "192.168.1.10", family: 4 }];

describe("validateExternalUrl", () => {
  it("accepts http and https URLs that resolve publicly", async () => {
    await expect(validateExternalUrl("http://example.com/recipe", { lookup: publicLookup })).resolves.toMatchObject({ ok: true });
    await expect(validateExternalUrl("https://example.com/recipe", { lookup: publicLookup })).resolves.toMatchObject({ ok: true });
  });

  it("rejects unsupported schemes", async () => {
    await expect(validateExternalUrl("ftp://example.com/file", { lookup: publicLookup })).rejects.toThrow(/http and https/);
    await expect(validateExternalUrl("file:///etc/passwd", { lookup: publicLookup })).rejects.toThrow(/http and https/);
    await expect(validateExternalUrl("javascript:alert(1)", { lookup: publicLookup })).rejects.toThrow(/http and https/);
  });

  it("rejects credentials", async () => {
    await expect(validateExternalUrl("https://user:pass@example.com/recipe", { lookup: publicLookup })).rejects.toThrow(/credentials/);
  });

  it("rejects private IPv4 families", async () => {
    await expect(validateExternalUrl("http://10.0.0.1/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://172.16.0.1/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://192.168.1.1/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://127.0.0.1/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://169.254.1.1/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://0.0.0.0/")).rejects.toThrow(/private or local/);
  });

  it("rejects private IPv6 families and IPv4-mapped IPv6 loopback", async () => {
    await expect(validateExternalUrl("http://[::1]/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://[fe80::1]/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://[fc00::1]/")).rejects.toThrow(/private or local/);
    await expect(validateExternalUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow(/private or local/);
  });

  it("rejects hostnames that resolve to private addresses", async () => {
    await expect(validateExternalUrl("https://recipes.example/soup", { lookup: privateLookup })).rejects.toThrow(/private or local/);
  });

  it("accepts public IP addresses", async () => {
    await expect(validateExternalUrl("https://93.184.216.34/recipe")).resolves.toMatchObject({ ok: true });
  });

  it("rejects empty or malformed input", async () => {
    await expect(validateExternalUrl("")).rejects.toThrow(/malformed/);
    await expect(validateExternalUrl("not a url")).rejects.toThrow(/malformed/);
  });
});

describe("readResponseTextWithLimit", () => {
  it("accepts a small response with content-length", async () => {
    const body = "x".repeat(100 * 1024);
    const response = new Response(body, { headers: { "content-length": String(Buffer.byteLength(body)) } });

    await expect(readResponseTextWithLimit(response, 2 * 1024 * 1024)).resolves.toHaveLength(body.length);
  });

  it("rejects a large response before reading it", async () => {
    const body = "x".repeat(5 * 1024 * 1024);
    const response = new Response(body, { headers: { "content-length": String(Buffer.byteLength(body)) } });

    await expect(readResponseTextWithLimit(response, 2 * 1024 * 1024)).rejects.toThrow(/exceeds/);
  });

  it("rejects responses without content-length", async () => {
    const response = new Response("ok");

    await expect(readResponseTextWithLimit(response, 2 * 1024 * 1024)).rejects.toThrow(/content-length/);
  });
});
