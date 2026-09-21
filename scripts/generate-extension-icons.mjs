import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZES = [16, 32, 48, 128];

const ICONS = {
  cleaner: {
    directory: "extensions/chatgpt-10-day-cleaner",
    background: "#12352b",
    accent: "#65e6b0",
    secondary: "#f6d365",
    motif(draw, scale) {
      draw.line(37, 91, 94, 34, 15, "#f7fbff", scale);
      draw.line(33, 95, 46, 108, 15, "#f7fbff", scale);
      draw.line(83, 27, 99, 43, 15, "#f7fbff", scale);
      draw.circle(31, 31, 7, this.accent, scale);
      draw.circle(100, 27, 5, this.secondary, scale);
      draw.line(100, 12, 100, 42, 4, this.secondary, scale);
      draw.line(85, 27, 115, 27, 4, this.secondary, scale);
    },
  },
  provenance: {
    directory: "extensions/chatgpt-provenance-exporter",
    background: "#18264c",
    accent: "#70d6ff",
    secondary: "#ffb86b",
    motif(draw, scale) {
      draw.line(35, 42, 87, 31, 8, this.accent, scale);
      draw.line(35, 42, 83, 89, 8, this.secondary, scale);
      draw.line(87, 31, 83, 89, 8, "#e8f1ff", scale);
      draw.circle(31, 42, 14, this.accent, scale);
      draw.circle(91, 30, 14, this.secondary, scale);
      draw.circle(84, 94, 14, "#e8f1ff", scale);
      draw.circle(31, 42, 6, this.background, scale);
      draw.circle(91, 30, 6, this.background, scale);
      draw.circle(84, 94, 6, this.background, scale);
    },
  },
  transcript: {
    directory: "extensions/chatgpt-transcript-exporter",
    background: "#40215d",
    accent: "#d6b3ff",
    secondary: "#79e2ff",
    motif(draw, scale) {
      draw.roundRect(27, 18, 72, 80, 10, "#f7fbff", scale);
      draw.polygon([[77, 18], [99, 40], [77, 40]], this.accent, scale);
      draw.line(41, 54, 84, 54, 7, this.background, scale);
      draw.line(41, 70, 84, 70, 7, this.background, scale);
      draw.line(41, 86, 68, 86, 7, this.background, scale);
      draw.circle(92, 100, 15, this.secondary, scale);
      draw.polygon([[83, 111], [84, 97], [96, 105]], this.secondary, scale);
      draw.line(87, 100, 97, 100, 4, this.background, scale);
    },
  },
  linkedin: {
    directory: "extensions/linkedin-connection-exporter",
    background: "#0a66c2",
    accent: "#ffffff",
    secondary: "#c7e3ff",
    motif(draw, scale) {
      draw.circle(42, 40, 13, this.accent, scale);
      draw.circle(86, 40, 13, this.secondary, scale);
      draw.roundRect(22, 61, 40, 34, 10, this.accent, scale);
      draw.roundRect(66, 61, 40, 34, 10, this.secondary, scale);
      draw.line(55, 73, 73, 73, 8, this.accent, scale);
      draw.line(55, 85, 73, 85, 8, this.accent, scale);
      draw.circle(42, 40, 5, this.background, scale);
      draw.circle(86, 40, 5, this.background, scale);
    },
  },
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), 8 + data.length);
  return result;
}

function png(width, height, rgba) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0, ...rgba.slice(y * width * 4, (y + 1) * width * 4)]));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from("\x89PNG\r\n\x1a\n", "binary"),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function color(value) {
  const hex = value.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function makeCanvas(size, background) {
  const pixels = new Uint8Array(size * size * 4);
  const bg = color(background);
  for (let index = 0; index < size * size; index += 1) {
    pixels[index * 4] = bg[0];
    pixels[index * 4 + 1] = bg[1];
    pixels[index * 4 + 2] = bg[2];
    pixels[index * 4 + 3] = 0;
  }
  return pixels;
}

function setPixel(pixels, size, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = rgba[0];
  pixels[index + 1] = rgba[1];
  pixels[index + 2] = rgba[2];
  pixels[index + 3] = rgba[3];
}

function drawApi(pixels, size) {
  const paint = (x, y, rgba) => setPixel(pixels, size, Math.round(x), Math.round(y), rgba);
  const blendShape = (x, y, rgba) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= size || py >= size) return;
    const index = (py * size + px) * 4;
    const alpha = rgba[3] / 255;
    const inverse = 1 - alpha;
    pixels[index] = Math.round(rgba[0] * alpha + pixels[index] * inverse);
    pixels[index + 1] = Math.round(rgba[1] * alpha + pixels[index + 1] * inverse);
    pixels[index + 2] = Math.round(rgba[2] * alpha + pixels[index + 2] * inverse);
    pixels[index + 3] = Math.round(255 * (alpha + pixels[index + 3] / 255 * inverse));
  };
  const draw = {
    circle(cx, cy, radius, value, scale) {
      const rgba = [...color(value), 255];
      for (let y = cy - radius; y <= cy + radius; y += 1) {
        for (let x = cx - radius; x <= cx + radius; x += 1) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) blendShape(x * scale, y * scale, rgba);
        }
      }
    },
    line(x1, y1, x2, y2, width, value, scale) {
      const rgba = [...color(value), 255];
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 3;
      for (let step = 0; step <= steps; step += 1) {
        const t = steps ? step / steps : 0;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        for (let oy = -width / 2; oy <= width / 2; oy += 1) {
          for (let ox = -width / 2; ox <= width / 2; ox += 1) blendShape((x + ox) * scale, (y + oy) * scale, rgba);
        }
      }
    },
    polygon(points, value, scale) {
      const rgba = [...color(value), 255];
      const minY = Math.floor(Math.min(...points.map((point) => point[1])));
      const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));
      for (let y = minY; y <= maxY; y += 1) {
        const intersections = [];
        for (let index = 0; index < points.length; index += 1) {
          const a = points[index];
          const b = points[(index + 1) % points.length];
          if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) intersections.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
        intersections.sort((a, b) => a - b);
        for (let index = 0; index + 1 < intersections.length; index += 2) {
          for (let x = Math.ceil(intersections[index]); x <= intersections[index + 1]; x += 1) blendShape(x * scale, y * scale, rgba);
        }
      }
    },
    roundRect(x, y, width, height, radius, value, scale) {
      const rgba = [...color(value), 255];
      for (let py = y; py <= y + height; py += 1) {
        for (let px = x; px <= x + width; px += 1) {
          const dx = Math.max(x + radius - px, 0, px - (x + width - radius));
          const dy = Math.max(y + radius - py, 0, py - (y + height - radius));
          if (dx * dx + dy * dy <= radius * radius) blendShape(px * scale, py * scale, rgba);
        }
      }
    },
  };
  return { paint, ...draw };
}

function render(spec, size) {
  const scale = size / 128;
  const pixels = makeCanvas(size, spec.background);
  const draw = drawApi(pixels, size);
  draw.roundRect(8, 8, 112, 112, 24, spec.background, scale);
  spec.motif(draw, scale);
  return png(size, size, pixels);
}

for (const spec of Object.values(ICONS)) {
  const directory = path.join(ROOT, spec.directory, "icons");
  fs.mkdirSync(directory, { recursive: true });
  for (const size of SIZES) fs.writeFileSync(path.join(directory, `icon${size}.png`), render(spec, size));
}

console.log(`Generated ${Object.keys(ICONS).length} icon sets at ${SIZES.join(", ")} px.`);
