const test = require('node:test');
const assert = require('node:assert/strict');
const { createBlankDraft } = require('../src/ugc/model');
const { encodeLevel, decodeLevel } = require('../src/ugc/codec');

function draft(size = 'small') {
  const value = createBlankDraft(size, '回声😀');
  value.start = [2, 2]; value.exit = [3, 2];
  value.origin = { seed: 0xffffffff, generatorVersion: 255 };
  value.mechanism = [6, 6];
  value.guards = [[5, 5], [4, 4]];
  value.spikes = [{ x: 8, y: 8, tempo: 2, phase: 3 }, { x: 7, y: 7, tempo: 0, phase: 0 }];
  value.launchers = [{ x: 0, y: 4, dir: 1, tempo: 1, phase: 2 }];
  return value;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function payload(code) { return Buffer.from(code.slice(5), 'base64url'); }
function signed(bytes) {
  const body = Buffer.from(bytes);
  const crc = Buffer.alloc(4); crc.writeUInt32LE(crc32(body));
  return `ECL1-${Buffer.concat([body, crc]).toString('base64url')}`;
}
function reject(code, kind) { assert.throws(() => decodeLevel(code), error => error.code === kind); }

test('custom codes roundtrip canonically at all sizes without mutating or retaining input', () => {
  for (const size of ['small', 'medium', 'large']) {
    const original = draft(size), before = structuredClone(original);
    const code = encodeLevel(original);
    const decoded = decodeLevel(code);
    assert.ok(code.startsWith('ECL1-')); assert.ok(code.length <= 4096);
    assert.equal(encodeLevel(decoded), code);
    assert.deepEqual(original, before);
    assert.deepEqual(decoded.guards, [[4, 4], [5, 5]]);
    decoded.tiles[0] = 0;
    assert.equal(decodeLevel(code).tiles[0], 1);
    original.guards.reverse(); original.spikes.reverse();
    assert.equal(encodeLevel(original), code);
  }
});

test('fence terrain uses ECL3 and survives sharing while older codes remain readable', () => {
  const value = createBlankDraft('small', '栅栏');
  value.start = [2, 2]; value.exit = [4, 2];
  value.tiles[3 + 2 * 36] = 3;
  const code = encodeLevel(value);
  assert.ok(code.startsWith('ECL3-'));
  assert.equal(decodeLevel(code).tiles[3 + 2 * 36], 3);
  const old = draft();
  assert.deepEqual(decodeLevel(encodeLevel(old)), decodeLevel(encodeLevel(old)));
});

test('minimal layout has the specified magic, packing, and little-endian CRC', () => {
  const value = createBlankDraft('small', 'A'); value.start = [1, 1]; value.exit = [2, 1];
  const bytes = payload(encodeLevel(value));
  assert.deepEqual([...bytes.subarray(0, 8)], [0x45, 0x43, 0x4c, 1, 0, 1, 65, 0]);
  assert.equal(bytes[8], 0x55);
  assert.equal(bytes.readUInt32LE(bytes.length - 4), crc32(bytes.subarray(0, -4)));
  assert.deepEqual(decodeLevel(encodeLevel(value)), value);
});

test('rejects malformed, oversized, noncanonical base64 and unsupported formats', () => {
  for (const value of [null, '', 'ECL1-!', 'ECL1-A', 'ECL1-AAAA=', 'ECL1-' + 'A'.repeat(4092)]) reject(value, 'corrupt');
  reject('ECL2-AAAA', 'corrupt');
  reject('ECL4-AAAA', 'corrupt');
  reject('ECL5-AAAA', 'unsupported');
  const bytes = payload(encodeLevel(draft())); bytes[3] = 2;
  reject(signed(bytes.subarray(0, -4)), 'unsupported');
  const code = encodeLevel(draft());
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const remainder = payload(code).length % 3;
  if (remainder) {
    const last = alphabet.indexOf(code.at(-1));
    reject(code.slice(0, -1) + alphabet[last | 1], 'corrupt');
  }
});

test('bounds checks every truncation, CRC flips, trailing data, flags, size, UTF-8 and tile values', () => {
  const bytes = payload(encodeLevel(draft()));
  const body = bytes.subarray(0, -4);
  for (let length = 0; length < body.length; length++) reject(signed(body.subarray(0, length)), 'corrupt');
  const flipped = Buffer.from(bytes); flipped[20] ^= 1;
  reject(`ECL1-${flipped.toString('base64url')}`, 'corrupt');
  reject(signed(Buffer.concat([body, Buffer.from([0])])), 'corrupt');
  const change = (index, value, kind = 'corrupt') => {
    const altered = Buffer.from(body); altered[index] = value; reject(signed(altered), kind);
  };
  change(0, 0); change(4, 3); change(5, 49); change(6, 0xff);
  const originOffset = 6 + body[5];
  change(originOffset, 2);
  const terrainOffset = originOffset + 6;
  change(terrainOffset, body[terrainOffset] | 3);
  const lockOffset = terrainOffset + 36 * 48 / 4 + 4;
  change(lockOffset, 2);
  const guardsOffset = lockOffset + 3;
  change(guardsOffset, 9);
  const spikesOffset = guardsOffset + 1 + 4;
  change(spikesOffset, 33);
  const launchersOffset = spikesOffset + 1 + 8;
  change(launchersOffset, 9);
});

test('encode rejects invalid drafts and invalid origin integer ranges', () => {
  for (const origin of [{ seed: -1, generatorVersion: 1 }, { seed: 2 ** 32, generatorVersion: 1 },
    { seed: 1.5, generatorVersion: 1 }, { seed: 1, generatorVersion: 256 },
    { seed: 1, generatorVersion: -1 }, { seed: 1, generatorVersion: 0.5 }]) {
    const value = draft(); value.origin = origin;
    assert.throws(() => encodeLevel(value), error => error.code === 'invalid');
  }
  for (const value of [null, {}, { ...draft(), name: '\ud800' }, { ...draft(), start: null }]) {
    assert.throws(() => encodeLevel(value), error => error.code === 'invalid');
  }
});

test('valid CRC cannot bypass draft validation or reachability', () => {
  const value = createBlankDraft('small', 'A'); value.start = [2, 2]; value.exit = [3, 2];
  const body = payload(encodeLevel(value)).subarray(0, -4);
  const startOffset = 8 + 36 * 48 / 4;
  const invalid = Buffer.from(body); invalid[startOffset] = 255;
  reject(signed(invalid), 'invalid');
  for (const [x, y] of [[2, 1], [1, 2], [2, 3], [3, 2]]) value.tiles[y * 36 + x] = 1;
  value.exit = [4, 2];
  assert.throws(() => encodeLevel(value), error => error.code === 'unreachable');
  const unreachable = Buffer.from(body);
  for (const [x, y] of [[2, 1], [1, 2], [2, 3], [3, 2]]) {
    const index = y * 36 + x; unreachable[8 + (index >> 2)] |= 1 << ((index % 4) * 2);
  }
  unreachable[startOffset + 2] = 4;
  reject(signed(unreachable), 'unreachable');
});

test('hazard codes work without the ES2019 Object.fromEntries builtin', () => {
  const original = Object.fromEntries;
  try {
    Object.fromEntries = undefined;
    const value = draft();
    const code = encodeLevel(value);
    const decoded = decodeLevel(code);
    assert.equal(encodeLevel(decoded), code);
    assert.deepEqual(decoded.spikes, [...value.spikes].reverse());
    assert.deepEqual(decoded.launchers, value.launchers);
  } finally {
    Object.fromEntries = original;
  }
});

test('name limits accept 16 characters and 48 UTF-8 bytes and reject either excess', () => {
  for (const name of ['A'.repeat(16), '声'.repeat(16)]) {
    const value = draft(); value.name = name;
    assert.equal(decodeLevel(encodeLevel(value)).name, name);
  }
  for (const name of ['A'.repeat(17), '😀'.repeat(13)]) {
    const value = draft(); value.name = name;
    assert.throws(() => encodeLevel(value), error => error.code === 'invalid');
  }
});
