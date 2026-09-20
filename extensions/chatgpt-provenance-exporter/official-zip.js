"use strict";

const zlib = require("node:zlib");

const EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const CENTRAL = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
const LOCAL = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const MAX_ENTRY_BYTES = 512 * 1024 * 1024;

function crc32(input) {
  const bytes = Buffer.from(input);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeName(name) {
  const value = String(name || "").replace(/\\/g, "/");
  if (!value || value.startsWith("/") || /^[A-Za-z]:\//.test(value)) throw new Error(`Unsafe ZIP entry: ${name}`);
  if (value.split("/").some((part) => part === ".." || /[\u0000-\u001f]/.test(part))) {
    throw new Error(`Unsafe ZIP entry: ${name}`);
  }
  return value;
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 0xffff - 22);
  const offset = buffer.lastIndexOf(EOCD);
  if (offset < minimum || offset < 0) throw new Error("ZIP end-of-central-directory record was not found.");
  return offset;
}

function readZipEntries(input) {
  const buffer = Buffer.from(input);
  const eocd = findEndOfCentralDirectory(buffer);
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0) throw new Error("Multi-disk ZIP archives are not supported.");
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported by this importer.");
  }
  if (centralOffset + centralSize > buffer.length) throw new Error("ZIP central directory exceeds archive bounds.");

  const entries = [];
  const names = new Set();
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (!buffer.subarray(cursor, cursor + 4).equals(CENTRAL)) throw new Error("Malformed ZIP central directory entry.");
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const expectedCrc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > buffer.length) throw new Error("Malformed ZIP central directory bounds.");
    if (flags & 0x1) throw new Error("Encrypted ZIP entries are not supported.");
    const nameBytes = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = safeName((flags & 0x800) ? nameBytes.toString("utf8") : nameBytes.toString("binary"));
    if (names.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
    names.add(name);
    cursor = recordEnd;
    if (name.endsWith("/")) continue;
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error(`ZIP entry is too large: ${name}`);
    if (!buffer.subarray(localOffset, localOffset + 4).equals(LOCAL)) throw new Error(`Missing local ZIP header: ${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error(`ZIP entry exceeds archive bounds: ${name}`);
    const compressed = buffer.subarray(dataStart, dataEnd);
    let bytes;
    if (method === 0) bytes = Buffer.from(compressed);
    else if (method === 8) bytes = zlib.inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`);
    if (bytes.length !== uncompressedSize) throw new Error(`ZIP size mismatch for ${name}.`);
    if (crc32(bytes) !== expectedCrc) throw new Error(`ZIP CRC mismatch for ${name}.`);
    entries.push({ name, bytes, compression_method: method, crc32: expectedCrc });
  }
  return entries;
}

module.exports = { MAX_ENTRY_BYTES, crc32, readZipEntries };

