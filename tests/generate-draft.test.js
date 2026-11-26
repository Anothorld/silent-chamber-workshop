const test = require('node:test');
const assert = require('node:assert/strict');
const { generateDraft } = require('../scripts/generate-draft');
const { importDraft, createPreviewWorld } = require('../scripts/web-editor/core');
const { encodeLevel, decodeLevel } = require('../src/ugc/codec');
const { routeFor } = require('../src/level-solver');

for (const algorithm of ['dfs', 'prim', 'growing-tree']) {
  test(algorithm + ' generates a repeatable, importable and connected map', () => {
    const { draft, stats } = generateDraft(314, algorithm);
    assert.deepEqual(generateDraft(314, algorithm).draft, draft);
    assert.notDeepEqual(generateDraft(315, algorithm).draft.tiles, draft.tiles);
    assert.ok(stats.forks && stats.deadEnds && stats.cycles);
    assert.deepEqual(importDraft(JSON.stringify(draft)), draft);
    const world = createPreviewWorld(decodeLevel(encodeLevel(draft)));
    assert.ok(routeFor(world.level).length > 2);
  });
}
test('rejects unsupported generator settings', () => {
  assert.throws(() => generateDraft(-1));
  assert.throws(() => generateDraft(2 ** 32));
  assert.throws(() => generateDraft(3, 'unknown'));
});
