const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) | 0
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

function createPNG(size) {
  const BG = [13, 13, 26]      // #0d0d1a
  const ACCENT = [79, 156, 249] // #4f9cf9

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type

  // Draw a simple icon: dark bg, rounded-ish blue square in center, white H
  const margin = Math.round(size * 0.15)
  const inner = size - margin * 2
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      const inBox = x >= margin && x < margin + inner && y >= margin && y < margin + inner
      // Round the inner box corners
      const cx = x - margin, cy = y - margin
      const r = Math.round(inner * 0.18) // corner radius
      const inCorner =
        (cx < r && cy < r && Math.hypot(cx - r, cy - r) > r) ||
        (cx >= inner - r && cy < r && Math.hypot(cx - (inner - r), cy - r) > r) ||
        (cx < r && cy >= inner - r && Math.hypot(cx - r, cy - (inner - r)) > r) ||
        (cx >= inner - r && cy >= inner - r && Math.hypot(cx - (inner - r), cy - (inner - r)) > r)
      let color = BG
      if (inBox && !inCorner) {
        // White H letter in center
        const lx = cx - Math.round(inner * 0.25)  // left bar
        const rx = cx - Math.round(inner * 0.55)  // right bar
        const barW = Math.round(inner * 0.12)
        const crossY = cy - Math.round(inner * 0.45)
        const crossH = Math.round(inner * 0.12)
        const barTop = Math.round(inner * 0.15)
        const barBot = Math.round(inner * 0.15)
        const inLeftBar = lx >= 0 && lx < barW && cy >= barTop && cy < inner - barBot
        const inRightBar = rx <= 0 && rx > -barW && cy >= barTop && cy < inner - barBot
        const inCross = Math.abs(cy - Math.round(inner / 2)) < Math.round(inner * 0.07) &&
                        cx >= Math.round(inner * 0.25) && cx < Math.round(inner * 0.75)
        color = (inLeftBar || inRightBar || inCross) ? [238, 238, 238] : ACCENT
      }
      row[1 + x * 3] = color[0]
      row[1 + x * 3 + 1] = color[1]
      row[1 + x * 3 + 2] = color[2]
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

fs.writeFileSync('public/icon-192.png', createPNG(192))
fs.writeFileSync('public/icon-512.png', createPNG(512))
console.log('Icons written to public/')
