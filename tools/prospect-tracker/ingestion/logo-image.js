import { IngestionError } from './errors.js';

export const LOGO_BYTE_LIMIT = 2 * 1024 * 1024;
const rejected = () => new IngestionError('logo_content_rejected', 'The company image could not be displayed.', 422);
/** Raster signatures and bounded dimensions, independently of MIME/extension.
 * The browser decoder remains the final validity check. No SVG/HTML is served.
 * @param {Uint8Array} bytes */
export function rasterType(bytes) {
  if (bytes.length < 24 || bytes.length > LOGO_BYTE_LIMIT) throw rejected();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = /** @param {number} start @param {number} length */ (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  let width = 0, height = 0, type = '';
  if ([137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte) && view.getUint32(8) === 13 && ascii(12, 4) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20); type = 'image/png';
    if (bytes.length < 45 || ascii(bytes.length - 8, 4) !== 'IEND') throw rejected();
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 0xff) throw rejected();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw rejected();
      if ([0xc0,0xc1,0xc2].includes(marker) && length >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); type = 'image/jpeg'; break;
      }
      offset += length;
    }
  } else if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP' && view.getUint32(4, true) + 8 === bytes.length) {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X' && bytes.length >= 30 && !(bytes[20] & 2)) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true); width = 1 + (bits & 0x3fff); height = 1 + ((bits >>> 14) & 0x3fff);
    }
    type = 'image/webp';
  }
  if (!type || !width || !height || width > 4096 || height > 4096 || width * height > 8_000_000) throw rejected();
  return type;
}
