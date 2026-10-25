import { atsLogoUrl } from '../../../tools/prospect-tracker/ats-logo.js';
import { LOGO_BYTE_LIMIT, rasterType } from '../../../tools/prospect-tracker/ingestion/logo-image.js';
import { IngestionError } from '../../../tools/prospect-tracker/ingestion/errors.js';

// A-only by design: fail closed rather than handling IPv6/mapped-address edge
// cases. No caller-controlled DNS names; ATS asset routes are checked first.
export function publicIpv4(address: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const parts = address.split('.').map(Number);
  if (parts.some(part => part > 255) || parts.join('.') !== address) return false;
  const [a,b,c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
const failure = () => new IngestionError('logo_retrieval_failed', 'The company image could not be retrieved.', 502);
const MAX_HEADERS = 16 * 1024;
// Includes framing overhead; decoded bytes have their own smaller limit.
const MAX_WIRE = LOGO_BYTE_LIMIT + 64 * 1024;

/** Strict, deliberately small HTTP/1.1 subset: no redirects, compression,
 * interim responses, duplicate framing headers or conflicting framing. */
export function imageBody(wire: Uint8Array): Uint8Array {
  if (wire.length > MAX_WIRE) throw failure();
  let headerEnd = -1;
  for (let i = 0; i < Math.min(wire.length - 3, MAX_HEADERS); i++) {
    if (wire[i] === 13 && wire[i+1] === 10 && wire[i+2] === 13 && wire[i+3] === 10) { headerEnd = i; break; }
  }
  if (headerEnd < 0) throw failure();
  const lines = new TextDecoder('ascii', { fatal: true }).decode(wire.subarray(0, headerEnd)).split('\r\n');
  if (!/^HTTP\/1\.[01] 200(?: |$)/.test(lines.shift() ?? '')) throw failure();
  const headers = new Map<string,string>();
  for (const line of lines) {
    const match = /^([!#$%&'*+.^_`|~\da-z-]+):[ \t]*([^\r\n]*)$/i.exec(line);
    if (!match) throw failure();
    const key = match[1].toLowerCase();
    if (headers.has(key) && ['content-length','transfer-encoding','content-encoding'].includes(key)) throw failure();
    headers.set(key, match[2].trim());
  }
  if (headers.has('content-encoding') && headers.get('content-encoding') !== 'identity') throw failure();
  const body = wire.subarray(headerEnd + 4);
  const transfer = headers.get('transfer-encoding'), length = headers.get('content-length');
  if (transfer) {
    if (transfer.toLowerCase() !== 'chunked' || length !== undefined) throw failure();
    const chunks: Uint8Array[] = []; let position = 0, size = 0;
    while (position < body.length) {
      let end = position;
      while (end + 1 < body.length && !(body[end] === 13 && body[end+1] === 10) && end - position < 16) end++;
      const line = new TextDecoder().decode(body.subarray(position, end));
      if (!/^[0-9a-f]{1,8}$/i.test(line) || body[end] !== 13 || body[end+1] !== 10) throw failure();
      const count = parseInt(line, 16); position = end + 2;
      if (!count) {
        // Trailers/extensions aren't needed by the verified public logo hosts.
        if (position + 2 !== body.length || body[position] !== 13 || body[position+1] !== 10) throw failure();
        const result = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        return result;
      }
      size += count;
      if (size > LOGO_BYTE_LIMIT || position + count + 2 > body.length || body[position+count] !== 13 || body[position+count+1] !== 10) throw failure();
      chunks.push(body.subarray(position, position + count)); position += count + 2;
    }
    throw failure();
  }
  if (length !== undefined && (!/^\d{1,10}$/.test(length) || Number(length) !== body.length)) throw failure();
  if (body.length > LOGO_BYTE_LIMIT) throw failure();
  return body;
}

/** Resolve once, connect to that public IP, then authenticate TLS with the ATS
 * hostname. DNS is never consulted again during the connection (no TOCTOU).
 * No cookies, bearer headers, referrer, redirects, proxy or ambient fetch state.
 * Dependency seams are for tests only, never HTTP request options. */
export async function retrieveLogo(value: string, signal: AbortSignal, dependencies = {
  resolve: (host: string) => Deno.resolveDns(host, 'A'),
  connect: (ip: string) => Deno.connect({ hostname: ip, port: 443 }),
  secure: (conn: Deno.TcpConn, host: string) => Deno.startTls(conn, { hostname: host, alpnProtocols: ['http/1.1'] })
}) {
  const canonical = atsLogoUrl(value);
  if (!canonical) throw new IngestionError('logo_candidate_rejected', 'Unsupported company image.', 400);
  const url = new URL(canonical);
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(6000)]);
  let connection: Deno.Conn | undefined;
  const close = () => { try { connection?.close(); } catch { /* Already closed. */ } };
  // Race non-cancelable DNS and connect operations; late sockets close below.
  const abort = new Promise<never>((_, reject) => {
    if (deadline.aborted) reject(failure());
    else deadline.addEventListener('abort', () => { close(); reject(failure()); }, { once: true });
  });
  try {
    return await Promise.race([abort, (async () => {
      const addresses = await dependencies.resolve(url.hostname);
      deadline.throwIfAborted();
      if (!addresses.length || addresses.some(ip => !publicIpv4(ip))) throw failure();
      const tcp = await dependencies.connect(addresses[0]); connection = tcp;
      if (deadline.aborted) { close(); throw failure(); }
      const tls = await dependencies.secure(tcp, url.hostname); connection = tls;
      if (deadline.aborted) { close(); throw failure(); }
      await tls.handshake(); deadline.throwIfAborted();
      const request = new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: image/png,image/jpeg,image/webp\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`);
      for (let offset = 0; offset < request.length;) offset += await tls.write(request.subarray(offset));
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        deadline.throwIfAborted();
        const chunk = new Uint8Array(16384), count = await tls.read(chunk);
        if (count === null) break;
        size += count; if (size > MAX_WIRE) throw failure();
        chunks.push(chunk.subarray(0, count));
      }
      const wire = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { wire.set(chunk, offset); offset += chunk.length; }
      const bytes = imageBody(wire);
      return { bytes, type: rasterType(bytes) };
    })()]);
  } finally { close(); }
}
