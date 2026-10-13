// Generates the app icons (dark square, blue "FAST" in a 5x7 pixel font).
// Run: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GLYPHS = {
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100']
};
const BG = [0x1c, 0x1b, 0x1a];
const FG = [0x5b, 0x8d, 0xef];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const word = 'FAST';
  const cols = word.length * 5 + (word.length - 1);
  const cell = Math.floor(size * 0.62 / cols);
  const x0 = Math.floor((size - cols * cell) / 2);
  const y0 = Math.floor((size - 7 * cell) / 2);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      let on = false;
      const gx = Math.floor((x - x0) / cell), gy = Math.floor((y - y0) / cell);
      if (x >= x0 && y >= y0 && gy < 7 && gx < cols && gx % 6 < 5) {
        on = GLYPHS[word[Math.floor(gx / 6)]][gy][gx % 6] === '1';
      }
      const c = on ? FG : BG;
      raw[row + 1 + x * 3] = c[0];
      raw[row + 2 + x * 3] = c[1];
      raw[row + 3 + x * 3] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
[192, 512].forEach(function (size) {
  fs.writeFileSync(path.join(dir, 'icon-' + size + '.png'), png(size));
  console.log('icon-' + size + '.png written');
});
