import fs from 'fs';
import zlib from 'zlib';

function createBadgePng(filePath) {
  const width = 96;
  const height = 96;
  // Raw RGBA pixel data
  const rawData = Buffer.alloc(height * (1 + width * 4));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - 48;
      const dy = y - 48;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Draw a circular radio/shield emblem
      // Outer circle (radius 40..45)
      const isOuterRing = dist >= 38 && dist <= 44;
      // Inner circle (radius 0..12)
      const isCenter = dist <= 12;
      // Mid ring (radius 22..26)
      const isMidRing = dist >= 22 && dist <= 27;

      if (isOuterRing || isCenter || isMidRing) {
        rawData[offset++] = 255; // R
        rawData[offset++] = 255; // G
        rawData[offset++] = 255; // B
        rawData[offset++] = 255; // Alpha full white
      } else {
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0; // Transparent
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idat = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  fs.writeFileSync(filePath, png);
  console.log(`Generated badge PNG at ${filePath} (${png.length} bytes)`);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Simple CRC32
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

createBadgePng('public/badge.png');
