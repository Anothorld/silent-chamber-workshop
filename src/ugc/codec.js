const { SIZES } = require('./model');
const { validateDraft } = require('./validation');
const { OBJECT_BY_CODE, OBJECT_BY_TYPE, MAX_OBJECTS } = require('./objects');

const SIZE_NAMES = ['small', 'medium', 'large'];
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_CODE_LENGTH = 16384;

function fail(code) {
  const error = new Error(`level-code-${code}`);
  error.code = code;
  throw error;
}

function checkDraft(draft) {
  const { errors } = validateDraft(draft);
  if (errors.length) {
    fail(errors.some(error => ['unreachable', 'lock-unreachable'].includes(error.code))
      ? 'unreachable' : 'invalid');
  }
  if (draft.origin !== null && (!draft.origin ||
      !Number.isInteger(draft.origin.seed) || draft.origin.seed < 0 ||
      draft.origin.seed > 0xffffffff ||
      !Number.isInteger(draft.origin.generatorVersion) ||
      draft.origin.generatorVersion < 0 || draft.origin.generatorVersion > 255)) {
    fail('invalid');
  }
}

// Rebuild only persisted fields, so imports never retain runtime state or aliases.
function canonicalDraft(draft) {
  const sortObjects = (items, keys) => items.map(item => {
    const copy = {};
    for (const key of keys) copy[key] = item[key];
    return copy;
  }).sort((a, b) => {
    for (const key of keys) if (a[key] !== b[key]) return a[key] - b[key];
    return 0;
  });
  const objects = (draft.objects || []).map(item => ({ type: item.type, x: item.x, y: item.y,
    ...(OBJECT_BY_TYPE[item.type].pair ? { toX: item.toX, toY: item.toY } : {}) }));
  objects.sort((a, b) => (OBJECT_BY_TYPE[a.type].code || 256) - (OBJECT_BY_TYPE[b.type].code || 256) ||
    (a.type < b.type ? -1 : a.type > b.type ? 1 : 0) ||
    a.x - b.x || a.y - b.y || (a.toX || 0) - (b.toX || 0) ||
    (a.toY || 0) - (b.toY || 0));
  return {
    size: draft.size,
    name: draft.name,
    tiles: draft.tiles.slice(),
    start: draft.start.slice(),
    exit: draft.exit.slice(),
    mechanism: draft.mechanism && draft.mechanism.slice(),
    guards: draft.guards.map(point => point.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    spikes: sortObjects(draft.spikes, ['x', 'y', 'tempo', 'phase']),
    launchers: sortObjects(draft.launchers, ['x', 'y', 'dir', 'tempo', 'phase']),
    objects,
    origin: draft.origin && { seed: draft.origin.seed, generatorVersion: draft.origin.generatorVersion },
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function base64Encode(bytes) {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const bits = (bytes[index] << 16) | ((bytes[index + 1] || 0) << 8) | (bytes[index + 2] || 0);
    output += BASE64[(bits >>> 18) & 63] + BASE64[(bits >>> 12) & 63];
    if (index + 1 < bytes.length) output += BASE64[(bits >>> 6) & 63];
    if (index + 2 < bytes.length) output += BASE64[bits & 63];
  }
  return output;
}

function base64Decode(text) {
  if (!text || !/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) fail('corrupt');
  const bytes = [];
  let bits = 0, count = 0;
  for (const char of text) {
    bits = (bits << 6) | BASE64.indexOf(char);
    count += 6;
    if (count >= 8) {
      count -= 8;
      bytes.push((bits >>> count) & 255);
      bits &= (1 << count) - 1;
    }
  }
  if (bits !== 0) fail('corrupt');
  return bytes;
}

function utf8Encode(text) {
  const escaped = encodeURIComponent(text);
  const bytes = [];
  for (let index = 0; index < escaped.length; index += 1) {
    if (escaped[index] === '%') {
      bytes.push(parseInt(escaped.slice(index + 1, index + 3), 16));
      index += 2;
    } else bytes.push(escaped.charCodeAt(index));
  }
  return bytes;
}

function utf8Decode(bytes) {
  try {
    return decodeURIComponent(bytes.map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''));
  } catch (_) { return fail('corrupt'); }
}

class Writer {
  constructor() { this.bytes = []; }
  u8(value) { this.bytes.push(value); }
  u32(value) {
    for (let shift = 0; shift < 32; shift += 8) this.u8((value >>> shift) & 255);
  }
  point(point) { this.u8(point[0]); this.u8(point[1]); }
}

class Reader {
  constructor(bytes, end = bytes.length) { this.bytes = bytes; this.end = end; this.index = 0; }
  take(length) {
    if (this.index + length > this.end) fail('corrupt');
    const result = this.bytes.slice(this.index, this.index + length);
    this.index += length;
    return result;
  }
  u8() { return this.take(1)[0]; }
  u32() {
    const bytes = this.take(4);
    return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
  }
  point() { return this.take(2); }
  flag() { const value = this.u8(); if (value > 1) fail('corrupt'); return value; }
  count(limit) { const value = this.u8(); if (value > limit) fail('corrupt'); return value; }
}

function encodeLevel(input) {
  checkDraft(input);
  const draft = canonicalDraft(input);
  const extended = draft.tiles.some(tile => tile > 3) || draft.objects.some(item => !OBJECT_BY_TYPE[item.type].code);
  const version = extended ? 4 : draft.tiles.includes(3) ? 3 : draft.objects.length ? 2 : 1;
  const writer = new Writer();
  writer.bytes.push(0x45, 0x43, 0x4c, version, SIZE_NAMES.indexOf(draft.size));
  const name = utf8Encode(draft.name);
  writer.u8(name.length); writer.bytes.push(...name);
  writer.u8(draft.origin ? 1 : 0);
  if (draft.origin) { writer.u32(draft.origin.seed); writer.u8(draft.origin.generatorVersion); }
  if (version === 4) writer.bytes.push(...draft.tiles);
  else for (let index = 0; index < draft.tiles.length; index += 4) {
    let byte = 0;
    for (let offset = 0; offset < 4; offset += 1) byte |= (draft.tiles[index + offset] || 0) << (offset * 2);
    writer.u8(byte);
  }
  writer.point(draft.start); writer.point(draft.exit);
  writer.u8(draft.mechanism ? 1 : 0);
  if (draft.mechanism) writer.point(draft.mechanism);
  writer.u8(draft.guards.length);
  for (const guard of draft.guards) writer.point(guard);
  for (const [items, keys] of [[draft.spikes, ['x', 'y', 'tempo', 'phase']],
    [draft.launchers, ['x', 'y', 'dir', 'tempo', 'phase']]]) {
    writer.u8(items.length);
    for (const item of items) for (const key of keys) writer.u8(item[key]);
  }
  if (version >= 2) {
    writer.u8(draft.objects.length);
    for (const item of draft.objects) {
      const spec = OBJECT_BY_TYPE[item.type];
      if (version === 4) {
        const type = utf8Encode(item.type);
        if (type.length < 1 || type.length > 64) fail('invalid');
        writer.u8(type.length); writer.bytes.push(...type);
      } else writer.u8(spec.code);
      writer.u8(item.x); writer.u8(item.y);
      if (spec.pair) { writer.u8(item.toX); writer.u8(item.toY); }
    }
  }
  writer.u32(crc32(writer.bytes));
  const code = `ECL${version}-${base64Encode(writer.bytes)}`;
  if (code.length > MAX_CODE_LENGTH) fail('invalid');
  return code;
}

function decodeLevel(code) {
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) fail('corrupt');
  const prefix = /^ECL([1234])-/.exec(code);
  if (!prefix) { if (/^ECL\d+-/.test(code)) fail('unsupported'); fail('corrupt'); }
  const version = Number(prefix[1]);
  const bytes = base64Decode(code.slice(5));
  if (bytes.length < 8) fail('corrupt');
  if (bytes[0] !== 0x45 || bytes[1] !== 0x43 || bytes[2] !== 0x4c) fail('corrupt');
  if (bytes[3] !== version) fail('unsupported');
  const checksum = new Reader(bytes); checksum.index = bytes.length - 4;
  if (checksum.u32() !== crc32(bytes.slice(0, -4))) fail('corrupt');
  const reader = new Reader(bytes, bytes.length - 4); reader.index = 4;
  const size = SIZE_NAMES[reader.u8()];
  if (!size) fail('corrupt');
  const nameLength = reader.u8();
  if (nameLength > 48) fail('corrupt');
  const name = utf8Decode(reader.take(nameLength));
  const origin = reader.flag() ? { seed: reader.u32(), generatorVersion: reader.u8() } : null;
  const [width, height] = SIZES[size];
  const packed = reader.take(version === 4 ? 0 : width * height / 4);
  const tiles = version === 4 ? reader.take(width * height) : [];
  for (const byte of packed) for (let shift = 0; shift < 8; shift += 2) {
    const tile = (byte >>> shift) & 3;
    if (tile === 3 && version < 3) fail('corrupt');
    tiles.push(tile);
  }
  const start = reader.point(), exit = reader.point();
  const mechanism = reader.flag() ? reader.point() : null;
  const guards = Array.from({ length: reader.count(8) }, () => reader.point());
  const readObjects = (limit, keys) => Array.from({ length: reader.count(limit) }, () => {
    const values = reader.take(keys.length);
    const item = {};
    keys.forEach((key, index) => { item[key] = values[index]; });
    return item;
  });
  const spikes = readObjects(32, ['x', 'y', 'tempo', 'phase']);
  const launchers = readObjects(8, ['x', 'y', 'dir', 'tempo', 'phase']);
  const objects = [];
  if (version >= 2) for (let index = 0, count = reader.count(MAX_OBJECTS); index < count; index += 1) {
    let spec;
    if (version === 4) {
      const length = reader.u8();
      if (length < 1 || length > 64) fail('corrupt');
      spec = OBJECT_BY_TYPE[utf8Decode(reader.take(length))];
    } else spec = OBJECT_BY_CODE[reader.u8()];
    if (!spec) fail('corrupt');
    const item = { type: spec.type, x: reader.u8(), y: reader.u8() };
    if (spec.pair) { item.toX = reader.u8(); item.toY = reader.u8(); }
    objects.push(item);
  }
  if (reader.index !== reader.end) fail('corrupt');
  const draft = { size, name, tiles, start, exit, mechanism, guards, spikes, launchers, objects, origin };
  checkDraft(draft);
  return canonicalDraft(draft);
}

module.exports = { encodeLevel, decodeLevel };
