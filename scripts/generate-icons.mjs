import fs from "fs";
import path from "path";
import zlib from "zlib";

const sizes = [192, 512];
const dir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(dir, { recursive: true });

function createPng(width, height, r, g, b) {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
  }

  const uncompressed = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    uncompressed[y * (1 + width * 3)] = 0;
    raw.copy(uncompressed, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }

  const compressed = zlib.deflateSync(uncompressed);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk("IHDR", makeIHDR(width, height)),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 2;
  return data;
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCRCTable();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let table;
function makeCRCTable() {
  if (table) return table;
  table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

for (const size of sizes) {
  const buf = createPng(size, size, 99, 102, 241);
  const out = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`Created ${out}`);
}
