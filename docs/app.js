(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/terrain-catalog.js
  var require_terrain_catalog = __commonJS({
    "src/terrain-catalog.js"(exports, module) {
      var terrainCatalog = {
        floor: { tile: 0, name: "\u5730\u9762", description: "\u53EF\u4EE5\u884C\u8D70\u7684\u57FA\u7840\u5730\u9762\u3002", walkable: true, color: "#d6dad0", gameColor: "#dcecf0" },
        wall: { tile: 1, name: "\u5899\u4F53", description: "\u963B\u6321\u79FB\u52A8\u4E0E\u58F0\u6CE2\uFF0C\u5F62\u6210\u56DE\u58F0\u8F6E\u5ED3\u3002", walkable: false, runtime: { key: "walls", shape: "set" }, color: "#364b3c", gameColor: "#547984" },
        pit: { tile: 2, name: "\u6DF1\u5751", description: "\u65E0\u6CD5\u901A\u884C\u7684\u5760\u843D\u533A\u57DF\u3002", walkable: false, runtime: { key: "pits", shape: "set" }, color: "#18221e", gameColor: "#ba727c" },
        fence: { tile: 3, name: "\u6805\u680F", description: "\u963B\u6321\u79FB\u52A8\uFF0C\u5141\u8BB8\u58F0\u6CE2\u7A7F\u8FC7\u3002", walkable: false, runtime: { key: "fences", shape: "set" }, color: "#719482", gameColor: "#dcecf0" }
      };
      var surfaceCatalog = {
        fragile: { name: "\u8106\u5F31\u5730\u677F", shortName: "\u88C2\u5730", description: "\u4EC5\u73A9\u5BB6\u8E29\u8E0F\u540E\u9884\u8B66\u5E76\u574D\u584C\uFF0C\u4E0D\u4F1A\u88AB\u58F0\u97F3\u89E6\u53D1\u3002", limit: 24, marker: "\u88C2", runtime: { key: "fragileFloors" } },
        noisy: { name: "\u54CD\u7816", description: "\u8E29\u8E0F\u65F6\u53D1\u51FA\u66F4\u5927\u7684\u811A\u6B65\u58F0\u3002", limit: 24, marker: "\u54CD", runtime: { key: "noisyFloors" } },
        silent: { name: "\u9759\u97F3\u5730\u6BEF", shortName: "\u9759\u6BEF", description: "\u538B\u4F4E\u811A\u6B65\u58F0\uFF0C\u4FBF\u4E8E\u6F5C\u884C\u3002", limit: 24, marker: "\u9759", color: "#8fdab7", runtime: { key: "silentFloors" } }
      };
      var TERRAIN_TYPES = Object.entries(terrainCatalog).map(([type, spec]) => ({ type, ...spec }));
      var TERRAIN_BY_TILE = Object.fromEntries(TERRAIN_TYPES.map((spec) => [spec.tile, spec]));
      var TERRAIN2 = Object.fromEntries(TERRAIN_TYPES.map((spec) => [spec.type, spec.tile]));
      function registerTerrain(type, spec) {
        if (!/^[a-z][A-Za-z0-9_-]{0,63}$/.test(type) || ["constructor", "prototype"].includes(type) || Object.hasOwn(terrainCatalog, type) || !Number.isInteger(spec?.tile) || spec.tile < 0 || spec.tile > 255 || Object.hasOwn(TERRAIN_BY_TILE, spec.tile) || typeof spec.name !== "string" || !spec.name || typeof spec.walkable !== "boolean") {
          throw new Error("invalid-terrain-registration");
        }
        const entry = { ...spec, type };
        terrainCatalog[type] = { ...spec };
        TERRAIN_TYPES.push(entry);
        TERRAIN_BY_TILE[spec.tile] = entry;
        TERRAIN2[type] = spec.tile;
        return entry;
      }
      function isKnownTile(tile) {
        return Number.isInteger(tile) && Object.hasOwn(TERRAIN_BY_TILE, tile);
      }
      function matchesTile(tile, expected = 0) {
        return isKnownTile(tile) && (expected === 0 ? TERRAIN_BY_TILE[tile].walkable : tile === expected);
      }
      module.exports = { terrainCatalog, surfaceCatalog, TERRAIN_TYPES, TERRAIN_BY_TILE, TERRAIN: TERRAIN2, isKnownTile, matchesTile, registerTerrain };
    }
  });

  // src/enemy-catalog.js
  var require_enemy_catalog = __commonJS({
    "src/enemy-catalog.js"(exports, module) {
      var ordinaryRules = [
        ["\u542C\u58F0", "\u811A\u6B65\u3001\u63A2\u8DEF\u58F0\u7B49\u6CBF\u53EF\u8FBE\u8DEF\u5F84\u4F20\u64AD\u5230\u8EAB\u8FB9\u540E\u624D\u4F1A\u5438\u5F15\u5B83\uFF1B\u672A\u8B66\u89C9\u65F6\u4E0D\u4F1A\u4EC5\u56E0\u73A9\u5BB6\u9760\u8FD1\u800C\u53D1\u73B0\u73A9\u5BB6\u3002\u9759\u6B65\u4ECD\u6709\u5FAE\u5F31\u58F0\u97F3\uFF0C\u63A5\u89E6\u602A\u7269\u4ECD\u4F1A\u6B7B\u4EA1\u3002"],
        ["\u8FFD\u8E2A", "\u5DF2\u8B66\u89C9\u4E14\u672A\u88AB\u8BF1\u9975\u5F15\u5F00\u65F6\uFF0C\u73A9\u5BB6\u5728 3 \u683C\u5185\u4E14\u65E0\u906E\u6321\uFF0C\u4F1A\u76F4\u63A5\u8FFD\u5411\u73A9\u5BB6\uFF1B\u5426\u5219\u8FFD\u5411\u6700\u540E\u542C\u5230\u7684\u58F0\u6E90\u3002"],
        ["\u8BF1\u5BFC", "\u77F3\u5934\u548C\u66FF\u58F0\u5668\u53EF\u8F6C\u79FB\u6CE8\u610F\uFF1B\u518D\u6B21\u542C\u5230\u73A9\u5BB6\u7684\u58F0\u97F3\u540E\u624D\u6539\u8FFD\u73A9\u5BB6\u3002"],
        ["\u663E\u5F62", "\u73A9\u5BB6\u89C6\u89D2\u4E0B\uFF0C\u8FD1\u8DDD\u79BB\u4E14\u65E0\u906E\u6321\u65F6\u53EF\u89C1\uFF1B\u63A2\u8DEF\u58F0\u6216\u6295\u77F3\u58F0\u62B5\u8FBE\u540E\u53EF\u77ED\u6682\u786E\u8BA4\u4F4D\u7F6E\u5E76\u7559\u4E0B\u6B8B\u5F71\u3002\u8FDC\u5904\u6216\u9694\u5899\u4E0D\u4F1A\u6301\u7EED\u663E\u793A\u3002"]
      ];
      var searchRule = (destination) => ["\u641C\u7D22", `\u5230\u8FBE\u6700\u540E\u58F0\u6E90\u540E\u641C\u7D22 8 \u79D2\uFF1B\u6CA1\u6709\u65B0\u7EBF\u7D22\u5C31${destination}\u3002`];
      var guard = {
        displayName: "???",
        ambientSample: "monster-original",
        continuousPitch: true,
        ambientDuration: 13.6088125,
        ambientVolume: 0.22,
        ambientGain: 1.05,
        editor: {
          description: "\u539F\u5730\u5F85\u547D\uFF0C\u542C\u58F0\u8FFD\u8E2A\uFF1B\u8B66\u89C9\u540E\u8FD1\u8DDD\u79BB\u76F4\u63A5\u8FFD\u4EBA\u3002",
          marker: "\u5B88",
          limit: 8,
          keywords: "\u5B88\u536B guard \u542C\u58F0 \u8B66\u89C9 \u8FFD\u8E2A \u641C\u7D22",
          details: [...ordinaryRules, searchRule("\u8FD4\u56DE\u539F\u5C97\u4F4D")]
        }
      };
      var enemyCatalog = {
        guard,
        mimic: { displayName: "???", ambientSample: null, continuousPitch: false, stepManifest: "mimic-audio-manifest", ambientVolume: guard.ambientVolume, ambientGain: guard.ambientGain },
        patrol: { displayName: "???", ambientSample: "monster-patrol-loop-diffuse", alertSample: "monster-patrol-loop-alert", ambientDuration: 2.42, ambientVolume: 0.28, ambientGain: 1.5 },
        bat: { displayName: "???", ambientSample: "monster-original", continuousPitch: true, ambientDuration: 13.6088125, ambientVolume: 0.22, ambientGain: 1.05 },
        wanderer: { displayName: "???", ambientSample: "monster-wanderer-diffuse", alertSample: "monster-wanderer-alert", ambientDuration: 3.9, ambientVolume: 0.22, ambientGain: 1.4 },
        sentinel: { displayName: "???", ambientSample: "sentinel-ambient-diffuse", alertSample: "sentinel-ambient-alert", ambientExtension: "mp3", ambientDuration: 30.35641723356, ambientVolume: 0.38, ambientGain: 1.2 }
      };
      var editorDefinitions = {
        mimic: {
          keywords: "\u62DF\u58F0\u8005 mimic \u63A2\u8DEF\u58F0 probe \u5927\u811A\u6B65 \u811A\u6B65 \u9759\u6B65 \u6295\u77F3 \u77F3\u5934 \u843D\u5730 \u56FA\u5B9A\u76EE\u6807 \u7C92\u5B50 \u663E\u5F62",
          description: "\u5355\u4EBA\u4E13\u5C5E\uFF0C\u542C\u58F0\u540E\u62DF\u58F0\u3001\u6C89\u9ED8\u518D\u8FFD\u8E2A\uFF1B\u77F3\u5934\u53EF\u5F15\u5F00\u3002",
          marker: "\u62DF",
          details: [
            ["\u5524\u9192", "\u5F85\u673A\u65F6\u65E0\u6301\u7EED\u73AF\u5883\u97F3\u3002\u63A2\u8DEF\u58F0\u3001\u534A\u5F84\u5927\u4E8E 1 \u683C\u7684\u5927\u811A\u6B65\u6216\u77F3\u5934\u6700\u7EC8\u843D\u5730\u58F0\u62B5\u8FBE\u540E\u624D\u5524\u9192\uFF1B\u9759\u6B65\u548C\u77F3\u5934\u5F39\u8DF3\u58F0\u4E0D\u4F1A\u5524\u9192\u3002"],
            ["\u521D\u6B21\u54CD\u5E94", "\u5148\u5B8C\u6574\u6A21\u4EFF\u4E00\u6B21\u811A\u6B65\u58F0\uFF0C\u518D\u6C89\u9ED8 1.3 \u79D2\uFF0C\u7136\u540E\u4EE5\u73A9\u5BB6\u6700\u5927\u901F\u5EA6\u7684 90% \u8FFD\u5411\u8BB0\u4F4F\u7684\u58F0\u6E90\u3002"],
            ["\u73A9\u5BB6\u58F0\u6E90", "\u8FD9\u4E00\u8D9F\u82E5\u7531\u63A2\u8DEF\u58F0\u6216\u5927\u811A\u6B65\u89E6\u53D1\uFF0C\u62DF\u58F0\u3001\u6C89\u9ED8\u6216\u6162\u884C\u65F6\uFF0C\u5FC5\u987B\u7B49\u4E0B\u4E00\u58F0\u5927\u811A\u6B65\u5B9E\u9645\u4F20\u5230\u62DF\u58F0\u8005\uFF0C\u624D\u4F1A\u52A0\u901F\u81F3\u73A9\u5BB6\u6700\u5927\u901F\u5EA6\u7684 110%\u3002\u540E\u7EED\u63A2\u8DEF\u58F0\u62B5\u8FBE\u53EA\u66F4\u65B0\u76EE\u6807\uFF0C\u4E0D\u52A0\u901F\u3001\u4E0D\u91CD\u64AD\u62DF\u58F0\u3002"],
            ["\u8FD1\u8EAB\u9501\u5B9A", "\u4EC5\u5728\u8FFD\u8E2A\u73A9\u5BB6\u58F0\u6E90\u4E14\u5DF2\u52A0\u901F\u65F6\uFF0C2 \u683C\u5185\u5B9E\u65F6\u9501\u5B9A\u73A9\u5BB6\uFF1B\u6162\u884C\u6216\u8D85\u8FC7 2 \u683C\u65F6\u8FFD\u5411\u6700\u540E\u58F0\u6E90\u3002"],
            ["\u77F3\u5934\u8BF1\u5BFC", "\u8FD9\u4E00\u8D9F\u82E5\u7531\u77F3\u5934\u6700\u7EC8\u843D\u5730\u58F0\u89E6\u53D1\uFF0C\u76EE\u6807\u56FA\u5B9A\u4E3A\u8BE5\u843D\u70B9\uFF1B\u9014\u4E2D\u5FFD\u7565\u540E\u7EED\u73A9\u5BB6\u58F0\u97F3\u3001\u65B0\u77F3\u5934\u548C\u8FD1\u8EAB\u73A9\u5BB6\uFF0C\u4E0D\u88AB\u5927\u811A\u6B65\u52A0\u901F\u3002\u63A5\u89E6\u4ECD\u4F1A\u6B7B\u4EA1\u3002"],
            ["\u8B66\u6212", "\u5230\u8FBE\u76EE\u6807\u540E\u505C\u7559\u8B66\u6212 10 \u79D2\uFF1B\u671F\u95F4\u65B0\u6709\u6548\u58F0\u97F3\u62B5\u8FBE\u4F1A\u76F4\u63A5\u5FEB\u901F\u8FFD\u8E2A\uFF0C\u4E0D\u518D\u5148\u62DF\u58F0\u3002\u8B66\u6212\u7ED3\u675F\u540E\u6062\u590D\u521D\u6B21\u54CD\u5E94\u6D41\u7A0B\u3002"],
            ["\u663E\u5F62\u4E0E\u6CE2\u7EB9", "5 \u683C\u5185\u7C92\u5B50\u9010\u6E10\u805A\u62E2\uFF0C2 \u683C\u5185\u5B8C\u5168\u805A\u62E2\u3002\u521D\u6B21\u62DF\u58F0\u4EA7\u751F 8 \u683C\u6CE2\u7EB9\uFF0C\u79FB\u52A8\u6BCF\u6B65\u4EA7\u751F 4 \u683C\u6CE2\u7EB9\uFF0C\u5747\u4EE5\u6BCF\u79D2 6 \u683C\u6269\u6563\uFF1B\u6CE2\u7EB9\u4E0D\u7167\u4EAE\u5730\u5F62\u3001\u4E0D\u89E6\u53D1\u673A\u5173\u3001\u4E0D\u5524\u9192\u5176\u4ED6\u602A\u7269\u3002"]
          ]
        },
        patrol: {
          description: "\u4E24\u70B9\u5F80\u8FD4\u5DE1\u903B\uFF0C\u542C\u58F0\u8FFD\u8E2A\uFF0C\u641C\u7D22\u540E\u56DE\u5F52\u5DE1\u903B\u3002",
          keywords: "\u5DE1\u903B\u8005 patrol \u8D77\u70B9 \u7EC8\u70B9 \u5F80\u8FD4 \u8FFD\u8E2A",
          details: [["\u8DEF\u7EBF", "\u5206\u4E24\u6B21\u653E\u7F6E\u5DE1\u903B\u8D77\u70B9\u548C\u7EC8\u70B9\uFF0C\u672A\u8B66\u89C9\u65F6\u6CBF\u53EF\u901A\u884C\u8DEF\u5F84\u5F80\u8FD4\u3002"], ...ordinaryRules, searchRule("\u8FD4\u56DE\u5DE1\u903B\u8DEF\u7EBF")],
          marker: "\u5DE1",
          pair: true,
          limit: 6,
          runtime: { key: "patrols", shape: "path" }
        },
        bat: {
          description: "\u5B9A\u5411\u58F0\u6CE2\u626B\u63CF\uFF0C\u547D\u4E2D\u73A9\u5BB6\u540E\u542C\u56DE\u58F0\u8FFD\u51FB\u3002",
          keywords: "\u8759\u8760 bat \u5B9A\u5411 \u626B\u63CF \u56DE\u58F0 \u8FFD\u8E2A",
          details: [
            ["\u626B\u63CF", "\u5F85\u673A\u65F6\u539F\u5730\u5B9A\u5411\u626B\u63CF\uFF1A\u9996\u6B21\u5728 0.8 \u79D2\u540E\uFF0C\u4E4B\u540E\u6BCF 2.5 \u79D2\u4E00\u6B21\uFF0C\u8303\u56F4 9 \u683C\u3002\u626B\u63CF\u547D\u4E2D\u73A9\u5BB6\u4F1A\u4EA7\u751F\u56DE\u58F0\uFF0C\u56DE\u58F0\u62B5\u8FBE\u540E\u8FFD\u51FB\uFF1B\u8FFD\u51FB\u4E2D\u6682\u505C\u626B\u63CF\u3002"],
            ...ordinaryRules,
            searchRule("\u8FD4\u56DE\u539F\u5C97\u4F4D\u5E76\u6062\u590D\u626B\u63CF")
          ],
          marker: "\u8760",
          runtime: { key: "bats", defaults: { phase: 0.8, period: 2.5, range: 9 } }
        },
        wanderer: {
          description: "\u81EA\u4E3B\u6E38\u8361\uFF0C\u542C\u58F0\u8FFD\u8E2A\uFF0C\u641C\u7D22\u540E\u6062\u590D\u6E38\u8361\u3002",
          keywords: "\u6E38\u8361\u8005 wanderer \u6E38\u8361 \u8FFD\u8E2A",
          details: [["\u6E38\u8361", "\u672A\u8B66\u89C9\u65F6\u5728\u53EF\u901A\u884C\u533A\u57DF\u81EA\u4E3B\u6E38\u8361\uFF0C\u65E0\u9700\u8BBE\u7F6E\u8DEF\u7EBF\u3002"], ...ordinaryRules, searchRule("\u8FD4\u56DE\u539F\u533A\u57DF\u5E76\u6062\u590D\u6E38\u8361")],
          marker: "\u6E38"
        },
        sentinel: {
          description: "\u73AF\u5F62\u58F0\u5450\u626B\u63CF\uFF0C\u547D\u4E2D\u73A9\u5BB6\u540E\u79BB\u5C97\u8FFD\u51FB\u3002",
          keywords: "\u58F0\u5450 sentinel \u54E8\u5175 \u73AF\u5F62 \u626B\u63CF \u56DE\u58F0 \u84C4\u529B",
          details: [
            ["\u626B\u63CF", "\u5F85\u673A\u65F6\u539F\u5730\u73AF\u5F62\u626B\u63CF\uFF1A\u9996\u6B21\u5728 2.2 \u79D2\u540E\uFF0C\u4E4B\u540E\u6BCF 5 \u79D2\u4E00\u6B21\uFF0C\u8303\u56F4 5 \u683C\uFF1B\u626B\u63CF\u524D\u6709 0.55 \u79D2\u84C4\u529B\u63D0\u793A\u3002\u547D\u4E2D\u73A9\u5BB6\u4EA7\u751F\u56DE\u58F0\uFF0C\u56DE\u58F0\u62B5\u8FBE\u540E\u79BB\u5C97\u8FFD\u51FB\uFF1B\u8FFD\u51FB\u4E2D\u6682\u505C\u626B\u63CF\u3002"],
            ...ordinaryRules,
            searchRule("\u8FD4\u56DE\u539F\u5C97\u4F4D\u5E76\u6062\u590D\u626B\u63CF")
          ],
          marker: "\u7EB3",
          runtime: { key: "sentinels", defaults: { phase: 2.2, period: 5, range: 5 } }
        }
      };
      for (const [type, editor] of Object.entries(editorDefinitions)) enemyCatalog[type].editor = editor;
      function getEnemyDefinition(type) {
        return Object.hasOwn(enemyCatalog, type) ? enemyCatalog[type] : enemyCatalog.guard;
      }
      function enemyDisplayName(type) {
        return getEnemyDefinition(type).displayName;
      }
      module.exports = { enemyCatalog, getEnemyDefinition, enemyDisplayName };
    }
  });

  // src/ugc/objects.js
  var require_objects = __commonJS({
    "src/ugc/objects.js"(exports, module) {
      var { enemyCatalog } = require_enemy_catalog();
      var { surfaceCatalog } = require_terrain_catalog();
      var LEGACY_CODES = {
        patrol: 1,
        bat: 2,
        wanderer: 3,
        sentinel: 4,
        mine: 5,
        alarm: 6,
        fragile: 7,
        gate: 8,
        noisy: 9,
        silent: 10,
        beacon: 11,
        decoy: 12,
        laser: 13,
        lockedWall: 14,
        relay: 15,
        sequence: 16
      };
      var devices = [
        { type: "mine", name: "\u5730\u96F7", description: "\u5371\u9669\u7684\u89E6\u53D1\u9677\u9631\u3002", group: "danger", marker: "\u96F7", limit: 16, runtime: { key: "mines" } },
        { type: "alarm", name: "\u8B66\u94C3", description: "\u89E6\u53D1\u540E\u4EA7\u751F\u566A\u58F0\uFF0C\u5438\u5F15\u5468\u56F4\u654C\u4EBA\u3002", group: "danger", marker: "\u94C3", runtime: { key: "alarms" } },
        { type: "gate", name: "\u58F0\u95F8", description: "\u968F\u58F0\u97F3\u6539\u53D8\u72B6\u6001\u7684\u95E8\u3002", group: "link", marker: "\u95F8", limit: 12, runtime: { key: "gates" } },
        { type: "beacon", name: "\u5F15\u8DEF\u706F", shortName: "\u5F15\u8DEF", description: "\u5468\u671F\u53D1\u51FA\u5F15\u8DEF\u58F0\u6CE2\u3002", group: "assist", marker: "\u5F15", limit: 12, runtime: { key: "beacons", defaults: { phase: 1.2, period: 4.5, radius: 3.5 } } },
        { type: "decoy", name: "\u66FF\u58F0\u5668", shortName: "\u66FF\u58F0", description: "\u5236\u9020\u58F0\u6E90\uFF0C\u6539\u53D8\u654C\u4EBA\u7684\u6CE8\u610F\u65B9\u5411\u3002", group: "assist", marker: "\u66FF", limit: 12, runtime: { key: "decoys" } },
        { type: "laser", name: "\u6FC0\u5149", description: "\u653E\u7F6E\u6FC0\u5149\u88C5\u7F6E\u3002", group: "assist", marker: "\u5149", limit: 12, runtime: { key: "lasers" } },
        { type: "lockedWall", name: "\u673A\u5173\u5899", description: "\u653E\u5728\u5899\u4F53\u4E0A\uFF1B\u58F0\u9501\u6216\u987A\u5E8F\u8282\u70B9\u6FC0\u6D3B\u540E\u6253\u5F00\u3002", group: "goal", marker: "\u9501", tile: 1, limit: 32, runtime: { key: "mechanismWalls", shape: "set" } },
        { type: "relay", name: "\u4F20\u58F0\u5668", shortName: "\u4F20\u58F0", description: "\u5148\u653E\u8F93\u5165\u7AEF\uFF0C\u518D\u653E\u8F93\u51FA\u7AEF\uFF1B\u5C06\u58F0\u97F3\u4F20\u5230\u8FDC\u5904\u3002", group: "link", marker: "\u4F20", pair: true, runtime: { key: "relays", shape: "relay" } },
        { type: "sequence", name: "\u987A\u5E8F\u8282\u70B9", shortName: "\u987A\u5E8F", description: "\u4F9D\u6B21\u8BBE\u7F6E\u4E24\u4E2A\u8282\u70B9\uFF0C\u7528\u58F0\u6CE2\u6309\u987A\u5E8F\u6FC0\u6D3B\u3002", group: "link", marker: "\u2460", pair: true, limit: 1, runtime: { key: "sequenceNodes", shape: "pairPoints" } }
      ];
      var enemies = Object.entries(enemyCatalog).filter(([type]) => type !== "guard").map(([type, definition]) => ({
        type,
        group: "enemy",
        name: definition.displayName,
        description: "\u653E\u5728\u5730\u9762\u4E0A\u7684\u654C\u4EBA\u3002",
        marker: "\u654C",
        runtime: { key: `${type}s`, shape: "coordinates" },
        ...definition.editor
      }));
      var surfaces = Object.entries(surfaceCatalog).map(([type, spec]) => ({ type, group: "terrain", ...spec }));
      var OBJECT_TYPES = Object.freeze([...enemies, ...surfaces, ...devices].map((spec) => Object.freeze({
        tile: 0,
        limit: 8,
        ...spec,
        code: Object.hasOwn(LEGACY_CODES, spec.type) ? LEGACY_CODES[spec.type] : void 0
      })).sort((a, b) => (a.code || 256) - (b.code || 256)));
      var OBJECT_BY_TYPE2 = Object.freeze(Object.assign(/* @__PURE__ */ Object.create(null), Object.fromEntries(OBJECT_TYPES.map((spec) => [spec.type, spec]))));
      var OBJECT_BY_CODE = Object.freeze(Object.fromEntries(OBJECT_TYPES.filter((spec) => spec.code).map((spec) => [spec.code, spec])));
      var MAX_OBJECTS = 64;
      var ENEMY_TYPES = new Set(enemies.map((spec) => spec.type));
      var MAX_ENEMIES = 16;
      function appendRuntime(target, runtime, item) {
        if (!runtime) return;
        const at = { x: item.x + 0.5, y: item.y + 0.5 };
        const end = { x: item.toX + 0.5, y: item.toY + 0.5 };
        if (runtime.shape === "set") {
          (target[runtime.key] ||= /* @__PURE__ */ new Set()).add(`${item.x},${item.y}`);
          return;
        }
        const entries = target[runtime.key] ||= [];
        if (runtime.shape === "coordinates") entries.push([at.x, at.y]);
        else if (runtime.shape === "path") entries.push({ path: [[at.x, at.y], [end.x, end.y]] });
        else if (runtime.shape === "relay") entries.push({ ...at, toX: end.x, toY: end.y });
        else if (runtime.shape === "pairPoints") entries.push(at, end);
        else entries.push({ ...at, ...runtime.defaults });
      }
      module.exports = { OBJECT_TYPES, OBJECT_BY_TYPE: OBJECT_BY_TYPE2, OBJECT_BY_CODE, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES, appendRuntime };
    }
  });

  // src/ugc/model.js
  var require_model = __commonJS({
    "src/ugc/model.js"(exports, module) {
      var { TERRAIN_TYPES, TERRAIN_BY_TILE } = require_terrain_catalog();
      var { OBJECT_TYPES, OBJECT_BY_TYPE: OBJECT_BY_TYPE2, appendRuntime } = require_objects();
      var SIZES2 = Object.freeze({ small: [36, 48], medium: [54, 72], large: [72, 96] });
      var TILE = Object.freeze(Object.fromEntries(TERRAIN_TYPES.map((spec) => [spec.type.toUpperCase(), spec.tile])));
      var PERIODS = [2.6, 3.4, 4.2];
      var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      function createBlankDraft2(size, name = "\u672A\u547D\u540D\u5173\u5361") {
        const dimensions = SIZES2[size];
        if (!dimensions) throw new Error("invalid-size");
        const [width, height] = dimensions;
        const tiles = Array.from({ length: width * height }, (_, index) => {
          const x = index % width;
          const y = Math.floor(index / width);
          return x === 0 || y === 0 || x === width - 1 || y === height - 1 ? TILE.WALL : TILE.FLOOR;
        });
        return {
          size,
          name,
          tiles,
          start: null,
          exit: null,
          mechanism: null,
          guards: [],
          spikes: [],
          launchers: [],
          objects: [],
          origin: null
        };
      }
      function toRuntimeLevel(draft) {
        const [width, height] = SIZES2[draft.size];
        const walls = /* @__PURE__ */ new Set();
        const pits = /* @__PURE__ */ new Set();
        const fences = /* @__PURE__ */ new Set();
        const center = ([x, y]) => [x + 0.5, y + 0.5];
        const timing = (item) => ({
          period: PERIODS[item.tempo],
          phase: PERIODS[item.tempo] * item.phase / 4
        });
        const objects = draft.objects || [];
        const level = {
          width,
          height,
          name: draft.name,
          hint: "\u73A9\u5BB6\u5236\u4F5C",
          walls,
          pits,
          fences,
          start: center(draft.start),
          exit: center(draft.exit),
          mechanism: draft.mechanism && center(draft.mechanism),
          enemies: draft.guards.map(center),
          spikes: draft.spikes.map((item) => ({
            x: item.x + 0.5,
            y: item.y + 0.5,
            ...timing(item),
            duration: 0.75
          })),
          launchers: draft.launchers.map((item) => ({
            x: item.x + 0.5,
            y: item.y + 0.5,
            dx: DIRS[item.dir][0],
            dy: DIRS[item.dir][1],
            ...timing(item),
            speed: 7.5,
            range: 15
          }))
        };
        for (const spec of OBJECT_TYPES) {
          if (spec.runtime) level[spec.runtime.key] ||= spec.runtime.shape === "set" ? /* @__PURE__ */ new Set() : [];
        }
        draft.tiles.forEach((tile, index) => appendRuntime(
          level,
          TERRAIN_BY_TILE[tile]?.runtime,
          { x: index % width, y: Math.floor(index / width) }
        ));
        for (const item of objects) appendRuntime(level, OBJECT_BY_TYPE2[item.type]?.runtime, item);
        return level;
      }
      module.exports = { SIZES: SIZES2, TILE, PERIODS, DIRS, createBlankDraft: createBlankDraft2, toRuntimeLevel };
    }
  });

  // src/ugc/editor.js
  var require_editor = __commonJS({
    "src/ugc/editor.js"(exports, module) {
      var { isKnownTile, matchesTile } = require_terrain_catalog();
      var { SIZES: SIZES2, TILE, DIRS } = require_model();
      var { OBJECT_BY_TYPE: OBJECT_BY_TYPE2, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require_objects();
      var copy = (value) => JSON.parse(JSON.stringify(value));
      var unique = ["start", "exit", "mechanism"];
      var collections = { guard: "guards", spike: "spikes", launcher: "launchers" };
      var caps = { guard: 8, spike: 32, launcher: 8 };
      var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      function createEditorState2(draft) {
        return {
          draft: { ...copy(draft), objects: copy(draft.objects || []) },
          past: [],
          future: [],
          stroke: null,
          zoom: 1,
          revision: 0,
          renderRevision: 0,
          renderDirty: true,
          baseTileSize: 20,
          camera: { x: 0, y: 0 },
          won: false
        };
      }
      function beginStroke2(state2) {
        if (!state2.stroke) state2.stroke = { before: copy(state2.draft), won: state2.won };
      }
      function cancelStroke2(state2) {
        if (!state2.stroke) return;
        if (!same(state2.draft, state2.stroke.before)) state2.revision++;
        state2.draft = state2.stroke.before;
        state2.won = state2.stroke.won;
        state2.stroke = null;
      }
      function endStroke2(state2) {
        if (!state2.stroke) return;
        if (!same(state2.stroke.before, state2.draft)) {
          state2.past.push(state2.stroke.before);
          if (state2.past.length > 40) state2.past.shift();
          state2.future.length = 0;
          state2.won = false;
        }
        state2.stroke = null;
      }
      function clearCell(draft, x, y, change) {
        for (const key of unique) if (draft[key] && draft[key][0] === x && draft[key][1] === y) {
          change();
          draft[key] = null;
        }
        for (const key of ["guards", "spikes", "launchers", "objects"]) {
          const items = draft[key] || [];
          const keep = (item) => key === "guards" ? item[0] !== x || item[1] !== y : (item.x !== x || item.y !== y) && !(key === "objects" && OBJECT_BY_TYPE2[item.type]?.pair && item.toX === x && item.toY === y);
          if (items.some((item) => !keep(item))) {
            change();
            draft[key] = items.filter(keep);
          }
        }
      }
      function occupied(draft, x, y, except) {
        return unique.some((key) => key !== except && draft[key] && draft[key][0] === x && draft[key][1] === y) || draft.guards.some((p) => p[0] === x && p[1] === y) || [...draft.spikes, ...draft.launchers].some((p) => p.x === x && p.y === y) || (draft.objects || []).some((item) => item.x === x && item.y === y || OBJECT_BY_TYPE2[item.type]?.pair && item.type !== "relay" && item.toX === x && item.toY === y);
      }
      function canStartObject2(draft, kind, x, y) {
        const spec = OBJECT_BY_TYPE2[kind];
        if (!spec || !Number.isInteger(x) || !Number.isInteger(y)) return false;
        const [width, height] = SIZES2[draft.size];
        const objects = draft.objects || [];
        return x > 0 && y > 0 && x < width - 1 && y < height - 1 && matchesTile(draft.tiles[x + y * width], spec.tile) && !occupied(draft, x, y) && objects.length < MAX_OBJECTS && (!ENEMY_TYPES.has(kind) || draft.guards.length + objects.filter((item) => ENEMY_TYPES.has(item.type)).length < MAX_ENEMIES) && objects.filter((item) => item.type === kind).length < spec.limit;
      }
      function launcherDirections(draft, x, y) {
        const [width, height] = SIZES2[draft.size];
        return DIRS.flatMap(([dx, dy], dir) => {
          const nx = x + dx, ny = y + dy;
          return nx >= 0 && ny >= 0 && nx < width && ny < height && matchesTile(draft.tiles[nx + ny * width]) ? [dir] : [];
        });
      }
      function applyEditorAction2(state2, action) {
        const auto = !state2.stroke;
        let changed2 = false;
        const change = () => {
          if (auto && !state2.stroke) beginStroke2(state2);
          changed2 = true;
        };
        const d = state2.draft, [width, height] = SIZES2[d.size];
        const { x, y } = action;
        const inside = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
        const interior = inside && x > 0 && y > 0 && x < width - 1 && y < height - 1;
        const tileValid = isKnownTile(action.tile);
        const paint = (px, py, tile) => {
          const index = px + py * width;
          if (d.tiles[index] !== tile) {
            change();
            clearCell(d, px, py, change);
            d.tiles[index] = tile;
          }
        };
        const tileAt = (px, py) => px >= 0 && py >= 0 && px < width && py < height ? d.tiles[px + py * width] : void 0;
        const tempo = action.tempo === void 0 ? 1 : action.tempo;
        const phase = action.phase === void 0 ? 0 : action.phase;
        const dir = action.dir === void 0 ? 0 : action.dir;
        const validTiming = [0, 1, 2].includes(tempo) && [0, 1, 2, 3].includes(phase);
        const facesFloor = (direction) => launcherDirections(d, x, y).includes(direction);
        if (action.type === "paint" && interior && tileValid) paint(x, y, action.tile);
        if (action.type === "erase" && inside) {
          clearCell(d, x, y, change);
          if (interior) paint(x, y, TILE.FLOOR);
        }
        if (action.type === "fill" && tileValid) {
          for (let py = 1; py < height - 1; py++) for (let px = 1; px < width - 1; px++) paint(px, py, action.tile);
        }
        if (action.type === "place" && inside && !occupied(d, x, y, action.kind)) {
          if (unique.includes(action.kind) && matchesTile(d.tiles[x + y * width]) && (d[action.kind]?.[0] !== x || d[action.kind]?.[1] !== y)) {
            change();
            d[action.kind] = [x, y];
          }
          const key = collections[action.kind];
          if (key && d[key].length < caps[action.kind] && validTiming && (action.kind !== "guard" || d.guards.length + d.objects.filter((item) => ENEMY_TYPES.has(item.type)).length < MAX_ENEMIES) && matchesTile(d.tiles[x + y * width], action.kind === "launcher" ? TILE.WALL : TILE.FLOOR) && (action.kind !== "launcher" || facesFloor(dir))) {
            change();
            d[key].push(action.kind === "guard" ? [x, y] : { x, y, tempo, phase, ...action.kind === "launcher" ? { dir } : {} });
          }
          const spec = OBJECT_BY_TYPE2[action.kind];
          if (spec && canStartObject2(d, action.kind, x, y)) {
            const toX = action.toX, toY = action.toY;
            const validPair = !spec.pair || Number.isInteger(toX) && Number.isInteger(toY) && (toX !== x || toY !== y) && matchesTile(tileAt(toX, toY)) && (action.kind === "relay" || !occupied(d, toX, toY));
            if (validPair) {
              change();
              d.objects.push({
                type: action.kind,
                x,
                y,
                ...spec.pair ? { toX, toY } : {}
              });
            }
          }
        }
        if (action.type === "timing" && inside && ["spike", "launcher"].includes(action.kind)) {
          const item = d[collections[action.kind]].find((p) => p.x === x && p.y === y);
          if (item) {
            const nextTempo = action.tempo === void 0 ? item.tempo : action.tempo;
            const nextPhase = action.phase === void 0 ? item.phase : action.phase;
            const nextDir = action.dir === void 0 ? item.dir : action.dir;
            if ([0, 1, 2].includes(nextTempo) && [0, 1, 2, 3].includes(nextPhase) && (action.kind !== "launcher" || facesFloor(nextDir))) {
              if (item.tempo !== nextTempo || item.phase !== nextPhase || action.kind === "launcher" && item.dir !== nextDir) change();
              item.tempo = nextTempo;
              item.phase = nextPhase;
              if (action.kind === "launcher") item.dir = nextDir;
            }
          }
        }
        if (action.type === "replace" && action.draft && Object.prototype.hasOwnProperty.call(SIZES2, action.draft.size) && !same(state2.draft, action.draft)) {
          change();
          state2.draft = copy(action.draft);
        }
        if (changed2) {
          state2.won = false;
          state2.revision++;
        }
        if (auto) endStroke2(state2);
        return changed2;
      }
      function undo2(state2) {
        endStroke2(state2);
        if (!state2.past.length) return false;
        state2.future.push(copy(state2.draft));
        state2.draft = state2.past.pop();
        state2.won = false;
        state2.revision++;
        return true;
      }
      function redo2(state2) {
        endStroke2(state2);
        if (!state2.future.length) return false;
        state2.past.push(copy(state2.draft));
        state2.draft = state2.future.pop();
        state2.won = false;
        state2.revision++;
        return true;
      }
      function screenToCell(state2, x, y, rect) {
        const [width, height] = SIZES2[state2.draft.size];
        if (!Number.isFinite(state2.zoom) || state2.zoom <= 0) state2.zoom = 1;
        if (!Number.isFinite(state2.baseTileSize) || state2.baseTileSize <= 0) state2.baseTileSize = 20;
        const scale = state2.baseTileSize * state2.zoom;
        const clamp = (value, max) => Math.max(0, Math.min(Number.isFinite(value) ? value : 0, Math.max(0, max)));
        state2.camera.x = clamp(state2.camera.x, width - rect.width / scale);
        state2.camera.y = clamp(state2.camera.y, height - rect.height / scale);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < rect.x || y < rect.y || x >= rect.x + rect.width || y >= rect.y + rect.height) return null;
        const cx = Math.floor((x - rect.x) / scale + state2.camera.x);
        const cy = Math.floor((y - rect.y) / scale + state2.camera.y);
        return cx >= 0 && cy >= 0 && cx < width && cy < height ? { x: cx, y: cy } : null;
      }
      module.exports = {
        createEditorState: createEditorState2,
        beginStroke: beginStroke2,
        cancelStroke: cancelStroke2,
        applyEditorAction: applyEditorAction2,
        canStartObject: canStartObject2,
        launcherDirections,
        endStroke: endStroke2,
        undo: undo2,
        redo: redo2,
        screenToCell
      };
    }
  });

  // src/geometry.js
  var require_geometry = __commonJS({
    "src/geometry.js"(exports, module) {
      var geometryCache = /* @__PURE__ */ new WeakMap();
      var EPSILON = 1e-3;
      function blocked(map2, x, y) {
        return x < 0 || y < 0 || x >= map2.width || y >= map2.height || map2.walls.has(`${x},${y}`) || !!map2.fences?.has(`${x},${y}`);
      }
      function blockedPoint(map2, x, y) {
        return blocked(map2, Math.floor(x), Math.floor(y));
      }
      function soundBlockedPoint(map2, x, y) {
        const cellX = Math.floor(x), cellY = Math.floor(y);
        return x < 0 || y < 0 || x >= map2.width || y >= map2.height || map2.walls.has(`${cellX},${cellY}`) || !!map2.pits?.has(`${cellX},${cellY}`);
      }
      function cellRectangles(map2, cells) {
        const rectangles = [];
        let active = /* @__PURE__ */ new Map();
        for (let y = 0; y < map2.height; y += 1) {
          const next = /* @__PURE__ */ new Map();
          for (let x = 0; x < map2.width; ) {
            if (!cells.has(`${x},${y}`)) {
              x += 1;
              continue;
            }
            const left = x;
            while (x < map2.width && cells.has(`${x},${y}`)) x += 1;
            const key = `${left},${x}`;
            const rectangle = active.get(key) || { left, right: x, top: y, bottom: y };
            rectangle.bottom = y + 1;
            if (!active.has(key)) rectangles.push(rectangle);
            next.set(key, rectangle);
          }
          active = next;
        }
        return rectangles;
      }
      function entersRectangle(ax, ay, bx, by, rect) {
        let start = 0;
        let end = 1;
        const dx = bx - ax;
        const left = rect.left + EPSILON;
        const right = rect.right - EPSILON;
        if (Math.abs(dx) < 1e-10) {
          if (ax <= left || ax >= right) return false;
        } else {
          const t1 = (left - ax) / dx;
          const t2 = (right - ax) / dx;
          start = Math.max(start, Math.min(t1, t2));
          end = Math.min(end, Math.max(t1, t2));
          if (start >= end) return false;
        }
        const dy = by - ay;
        const top = rect.top + EPSILON;
        const bottom = rect.bottom - EPSILON;
        if (Math.abs(dy) < 1e-10) {
          if (ay <= top || ay >= bottom) return false;
        } else {
          const t1 = (top - ay) / dy;
          const t2 = (bottom - ay) / dy;
          start = Math.max(start, Math.min(t1, t2));
          end = Math.min(end, Math.max(t1, t2));
          if (start >= end) return false;
        }
        return start < 1 && end > 0;
      }
      function boundaryFaces(map2, cells = map2.walls) {
        const faces = [];
        for (const key of cells) {
          const [x, y] = key.split(",").map(Number);
          const mechanismWall = !!map2.mechanismWalls?.has(key);
          if (!blocked(map2, x, y - 1)) faces.push({ x1: x, y1: y, x2: x + 1, y2: y, nx: 0, ny: -1, mechanismWall });
          if (!blocked(map2, x + 1, y)) faces.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1, nx: 1, ny: 0, mechanismWall });
          if (!blocked(map2, x, y + 1)) faces.push({ x1: x + 1, y1: y + 1, x2: x, y2: y + 1, nx: 0, ny: 1, mechanismWall });
          if (!blocked(map2, x - 1, y)) faces.push({ x1: x, y1: y + 1, x2: x, y2: y, nx: -1, ny: 0, mechanismWall });
        }
        return faces;
      }
      function getGeometry(map2) {
        if (geometryCache.has(map2)) return geometryCache.get(map2);
        const rectangles = cellRectangles(map2, map2.walls);
        const fenceRectangles = cellRectangles(map2, map2.fences || /* @__PURE__ */ new Set());
        const pitRectangles = cellRectangles(map2, map2.pits || /* @__PURE__ */ new Set());
        const obstacles = [...rectangles, ...pitRectangles];
        const obstacleCells = new Uint8Array(map2.width * map2.height);
        for (const rect of obstacles) for (let y = rect.top; y < rect.bottom; y++) {
          obstacleCells.fill(1, y * map2.width + rect.left, y * map2.width + rect.right);
        }
        const obstacleAt = (x, y) => x < 0 || y < 0 || x >= map2.width || y >= map2.height || obstacleCells[y * map2.width + x] === 1;
        const buckets = /* @__PURE__ */ new Map();
        obstacles.forEach((rect, id) => {
          for (let y = Math.floor(rect.top / 8); y <= Math.floor(rect.bottom / 8); y += 1) {
            for (let x = Math.floor(rect.left / 8); x <= Math.floor(rect.right / 8); x += 1) {
              const key = `${x},${y}`;
              if (!buckets.has(key)) buckets.set(key, []);
              buckets.get(key).push(id);
            }
          }
        });
        const visited = new Uint32Array(obstacles.length);
        let query = 0;
        const obstaclesIn = (box) => {
          query = query + 1 >>> 0;
          if (!query) {
            visited.fill(0);
            query = 1;
          }
          const found = [];
          for (let y = Math.floor(box.top / 8); y <= Math.floor(box.bottom / 8); y++) {
            for (let x = Math.floor(box.left / 8); x <= Math.floor(box.right / 8); x++) {
              for (const id of buckets.get(`${x},${y}`) || []) {
                if (visited[id] === query) continue;
                visited[id] = query;
                const rect = obstacles[id];
                if (rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom) found.push(rect);
              }
            }
          }
          return found;
        };
        const visible = (ax, ay, bx, by) => {
          if (soundBlockedPoint(map2, ax, ay) || soundBlockedPoint(map2, bx, by)) return false;
          const minX = Math.min(ax, bx);
          const maxX = Math.max(ax, bx);
          const minY = Math.min(ay, by);
          const maxY = Math.max(ay, by);
          query = query + 1 >>> 0;
          if (!query) {
            visited.fill(0);
            query = 1;
          }
          for (let y = Math.floor(minY / 8); y <= Math.floor(maxY / 8); y += 1) {
            for (let x = Math.floor(minX / 8); x <= Math.floor(maxX / 8); x += 1) {
              for (const id of buckets.get(`${x},${y}`) || []) {
                if (visited[id] === query) continue;
                visited[id] = query;
                const rect = obstacles[id];
                if (rect.right - EPSILON > minX && rect.left + EPSILON < maxX && rect.bottom - EPSILON > minY && rect.top + EPSILON < maxY && entersRectangle(ax, ay, bx, by, rect)) return false;
              }
            }
          }
          return true;
        };
        const corners = [];
        for (const rect of obstacles) {
          for (const [x, y, dx, dy] of [
            [rect.left, rect.top, -1, -1],
            [rect.right, rect.top, 1, -1],
            [rect.right, rect.bottom, 1, 1],
            [rect.left, rect.bottom, -1, 1]
          ]) {
            const point = { x: x + dx * 0.02, y: y + dy * 0.02 };
            if (!soundBlockedPoint(map2, point.x, point.y)) corners.push(point);
          }
        }
        let edges;
        function globalEdges() {
          if (edges) return edges;
          edges = corners.map(() => []);
          for (let i = 0; i < corners.length; i += 1) {
            for (let j = i + 1; j < corners.length; j += 1) {
              const a = corners[i];
              const b = corners[j];
              if (!visible(a.x, a.y, b.x, b.y)) continue;
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              edges[i].push([j, distance]);
              edges[j].push([i, distance]);
            }
          }
          return edges;
        }
        const pitDistance = (x, y) => pitRectangles.reduce((nearest, rect) => Math.min(
          nearest,
          Math.hypot(
            Math.max(rect.left - x, 0, x - rect.right),
            Math.max(rect.top - y, 0, y - rect.bottom)
          )
        ), Infinity);
        const geometry = {
          rectangles,
          fenceRectangles,
          pitRectangles,
          pitDistance,
          corners,
          obstaclesIn,
          obstacleAt,
          get edges() {
            return globalEdges();
          },
          visible,
          faces: boundaryFaces(map2),
          fenceFaces: boundaryFaces(map2, map2.fences || /* @__PURE__ */ new Set())
        };
        geometryCache.set(map2, geometry);
        return geometry;
      }
      module.exports = { blocked, blockedPoint, soundBlockedPoint, getGeometry };
    }
  });

  // src/propagation.js
  var require_propagation = __commonJS({
    "src/propagation.js"(exports, module) {
      var { blocked, soundBlockedPoint, getGeometry } = require_geometry();
      var SAMPLE_SIZE = 0.25;
      function propagate(map2, sx, sy, tone, maxDistance, visualRadius = maxDistance) {
        const geometry = getGeometry(map2);
        const corners = geometry.corners.filter((corner) => Math.hypot(corner.x - sx, corner.y - sy) < maxDistance);
        const penalty = tone === "high" ? 0.8 : 0.08;
        const distances = corners.map((corner) => geometry.visible(sx, sy, corner.x, corner.y) ? Math.hypot(corner.x - sx, corner.y - sy) + penalty : Infinity);
        const settled = new Uint8Array(corners.length);
        for (let step = 0; step < corners.length; step += 1) {
          let best = -1;
          for (let i = 0; i < distances.length; i += 1) {
            if (!settled[i] && (best === -1 || distances[i] < distances[best])) best = i;
          }
          if (best === -1 || distances[best] >= maxDistance) break;
          settled[best] = 1;
          const from = corners[best];
          for (let next = 0; next < corners.length; next += 1) {
            if (next === best) continue;
            const to = corners[next];
            const remaining = Math.min(distances[next], maxDistance) - distances[best] - penalty;
            if (remaining <= 0) continue;
            const dx = from.x - to.x;
            const dy = from.y - to.y;
            if (dx * dx + dy * dy >= remaining * remaining) continue;
            const cost = distances[best] + Math.hypot(dx, dy) + penalty;
            if (geometry.visible(from.x, from.y, to.x, to.y)) distances[next] = cost;
          }
        }
        function calculateAt(x, y) {
          if (soundBlockedPoint(map2, x, y)) return Infinity;
          const direct = Math.hypot(x - sx, y - sy);
          if (direct > maxDistance) return Infinity;
          if (geometry.visible(sx, sy, x, y)) return direct;
          let nearest = Infinity;
          for (let i = 0; i < corners.length; i += 1) {
            const cost = distances[i];
            if (cost >= maxDistance || cost >= nearest) continue;
            const corner = corners[i];
            const remaining = Math.hypot(x - corner.x, y - corner.y);
            if (cost + remaining >= nearest || cost + remaining > maxDistance) continue;
            if (geometry.visible(corner.x, corner.y, x, y)) nearest = cost + remaining;
          }
          return nearest;
        }
        const queried = /* @__PURE__ */ new Map();
        function at(x, y) {
          const key = `${x},${y}`;
          if (queried.has(key)) return queried.get(key);
          const distance = calculateAt(x, y);
          queried.set(key, distance);
          return distance;
        }
        let sampled;
        return {
          at,
          get visual() {
            if (sampled) return sampled;
            const width = Math.ceil(map2.width / SAMPLE_SIZE);
            const height = Math.ceil(map2.height / SAMPLE_SIZE);
            const reach = Math.min(maxDistance, visualRadius + SAMPLE_SIZE * 2);
            const minX = Math.max(0, Math.floor((sx - reach) / SAMPLE_SIZE) - 1);
            const maxX = Math.min(width - 1, Math.ceil((sx + reach) / SAMPLE_SIZE));
            const minY = Math.max(0, Math.floor((sy - reach) / SAMPLE_SIZE) - 1);
            const maxY = Math.min(height - 1, Math.ceil((sy + reach) / SAMPLE_SIZE));
            const stride = Math.max(0, maxX - minX + 1);
            const times = new Float32Array(stride * Math.max(0, maxY - minY + 1));
            const computed = new Uint8Array(times.length);
            sampled = {
              width,
              height,
              cellSize: SAMPLE_SIZE,
              bounds: { minX, maxX, minY, maxY },
              at(x, y) {
                if (x < minX || x > maxX || y < minY || y > maxY) return Infinity;
                const index = (y - minY) * stride + x - minX;
                if (!computed[index]) {
                  const px = (x + 0.5) * SAMPLE_SIZE;
                  const py = (y + 0.5) * SAMPLE_SIZE;
                  times[index] = (px - sx) ** 2 + (py - sy) ** 2 > reach ** 2 ? Infinity : calculateAt(px, py);
                  computed[index] = 1;
                }
                return times[index];
              }
            };
            return sampled;
          }
        };
      }
      function directionalField(map2, sx, sy, angle, halfAngle, maxDistance) {
        const geometry = getGeometry(map2);
        function at(x, y) {
          const dx = x - sx;
          const dy = y - sy;
          const distance = Math.hypot(dx, dy);
          const difference = Math.atan2(
            Math.sin(Math.atan2(dy, dx) - angle),
            Math.cos(Math.atan2(dy, dx) - angle)
          );
          if (distance > maxDistance || Math.abs(difference) > halfAngle || !geometry.visible(sx, sy, x, y)) return Infinity;
          return distance;
        }
        let sampled;
        return {
          at,
          get visual() {
            if (sampled) return sampled;
            const width = Math.ceil(map2.width / SAMPLE_SIZE);
            const height = Math.ceil(map2.height / SAMPLE_SIZE);
            const minX = Math.max(0, Math.floor((sx - maxDistance) / SAMPLE_SIZE) - 1);
            const maxX = Math.min(width - 1, Math.ceil((sx + maxDistance) / SAMPLE_SIZE));
            const minY = Math.max(0, Math.floor((sy - maxDistance) / SAMPLE_SIZE) - 1);
            const maxY = Math.min(height - 1, Math.ceil((sy + maxDistance) / SAMPLE_SIZE));
            const stride = Math.max(0, maxX - minX + 1);
            const times = new Float32Array(stride * Math.max(0, maxY - minY + 1));
            times.fill(Infinity);
            for (let y = minY; y <= maxY; y += 1) {
              for (let x = minX; x <= maxX; x += 1) {
                times[(y - minY) * stride + x - minX] = at(
                  (x + 0.5) * SAMPLE_SIZE,
                  (y + 0.5) * SAMPLE_SIZE
                );
              }
            }
            sampled = {
              width,
              height,
              cellSize: SAMPLE_SIZE,
              bounds: { minX, maxX, minY, maxY },
              at(x, y) {
                return x < minX || x > maxX || y < minY || y > maxY ? Infinity : times[(y - minY) * stride + x - minX];
              }
            };
            return sampled;
          }
        };
      }
      function traceImpact(map2, x, y, dx, dy, maxDistance = 22) {
        const geometry = getGeometry(map2);
        const magnitude = Math.hypot(dx, dy) || 1;
        const vx = dx / magnitude;
        const vy = dy / magnitude;
        let distance = maxDistance;
        let normalX = 0;
        let normalY = 0;
        let hit = false;
        for (const rect of [...geometry.rectangles, ...geometry.fenceRectangles]) {
          let entry = -Infinity;
          let exit = Infinity;
          let entryX = -Infinity;
          let entryY = -Infinity;
          for (const [axis, [origin, velocity, low, high]] of [
            [x, vx, rect.left, rect.right],
            [y, vy, rect.top, rect.bottom]
          ].entries()) {
            if (Math.abs(velocity) < 1e-10) {
              if (origin < low || origin > high) {
                entry = Infinity;
                break;
              }
              continue;
            }
            const a = (low - origin) / velocity;
            const b = (high - origin) / velocity;
            const axisEntry = Math.min(a, b);
            if (axis === 0) entryX = axisEntry;
            else entryY = axisEntry;
            entry = Math.max(entry, axisEntry);
            exit = Math.min(exit, Math.max(a, b));
          }
          if (entry >= 0 && entry <= exit && entry < distance) {
            distance = entry;
            hit = true;
            normalX = entryX >= entryY - 1e-8 ? -Math.sign(vx) : 0;
            normalY = entryY >= entryX - 1e-8 ? -Math.sign(vy) : 0;
          }
        }
        for (const [time, nx, ny] of [
          vx > 0 ? [(map2.width - x) / vx, -1, 0] : vx < 0 ? [-x / vx, 1, 0] : [Infinity, 0, 0],
          vy > 0 ? [(map2.height - y) / vy, 0, -1] : vy < 0 ? [-y / vy, 0, 1] : [Infinity, 0, 0]
        ]) {
          if (time >= 0 && time < distance) {
            distance = time;
            hit = true;
            normalX = nx;
            normalY = ny;
          }
        }
        const traveled = Math.max(0, distance - (hit ? 1e-3 : 0));
        return {
          x: x + vx * traveled,
          y: y + vy * traveled,
          distance: traveled,
          hit,
          normalX,
          normalY
        };
      }
      function traceRicochet(map2, x, y, dx, dy, maxDistance = 22) {
        const initialSpeed = 18;
        const stopSpeed = 2;
        const deceleration = (initialSpeed ** 2 - stopSpeed ** 2) / (2 * maxDistance);
        const restitution = 0.72;
        const magnitude = Math.hypot(dx, dy) || 1;
        let vx = dx / magnitude;
        let vy = dy / magnitude;
        let speed = initialSpeed;
        let distance = 0;
        let duration = 0;
        const segments = [];
        for (let bounce = 0; bounce < 32 && speed > stopSpeed; bounce += 1) {
          const stoppingDistance = (speed ** 2 - stopSpeed ** 2) / (2 * deceleration);
          const impact = traceImpact(map2, x, y, vx, vy, stoppingDistance);
          const endSpeed = impact.hit ? Math.sqrt(Math.max(stopSpeed ** 2, speed ** 2 - 2 * deceleration * impact.distance)) : stopSpeed;
          const endTime = duration + (speed - endSpeed) / deceleration;
          segments.push({
            fromX: x,
            fromY: y,
            toX: impact.x,
            toY: impact.y,
            startDistance: distance,
            distance: impact.distance,
            startTime: duration,
            endTime,
            startSpeed: speed,
            endSpeed,
            deceleration,
            hit: impact.hit,
            intensity: endSpeed / initialSpeed
          });
          distance += impact.distance;
          duration = endTime;
          x = impact.x;
          y = impact.y;
          if (!impact.hit) break;
          speed = endSpeed * restitution;
          if (impact.normalX) vx = -vx;
          if (impact.normalY) vy = -vy;
        }
        return { x, y, distance, duration, segments, hit: segments.some((segment) => segment.hit) };
      }
      module.exports = { blocked, propagate, directionalField, traceImpact, traceRicochet, getGeometry };
    }
  });

  // src/ugc/validation.js
  var require_validation = __commonJS({
    "src/ugc/validation.js"(exports, module) {
      var { isKnownTile, matchesTile } = require_terrain_catalog();
      var { SIZES: SIZES2, TILE, DIRS, toRuntimeLevel } = require_model();
      var { OBJECT_BY_TYPE: OBJECT_BY_TYPE2, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require_objects();
      var { propagate } = require_propagation();
      function utf8Size(value) {
        let bytes = 0;
        for (const char of value) {
          const code = char.codePointAt(0);
          if (code >= 55296 && code <= 57343) return Infinity;
          bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
        }
        return bytes;
      }
      function validateDraft2(draft) {
        const errors = [], warnings = [];
        const dimensions = draft && typeof draft.size === "string" && Object.prototype.hasOwnProperty.call(SIZES2, draft.size) ? SIZES2[draft.size] : null;
        if (!dimensions) return { errors: [{ code: "size", message: "\u5730\u56FE\u5C3A\u5BF8\u65E0\u6548" }], warnings };
        const [width, height] = dimensions;
        if (!Array.isArray(draft.tiles) || draft.tiles.length !== width * height || Array.from(draft.tiles).some((tile) => !isKnownTile(tile))) {
          return { errors: [{ code: "terrain", message: "\u5730\u5F62\u6570\u636E\u65E0\u6548" }], warnings };
        }
        if (typeof draft.name !== "string" || Array.from(draft.name).length < 1 || Array.from(draft.name).length > 16 || utf8Size(draft.name) > 48) {
          errors.push({ code: "placement", message: "\u5173\u5361\u540D\u79F0\u65E0\u6548" });
        }
        const tileAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? draft.tiles[y * width + x] : void 0;
        const occupied = /* @__PURE__ */ new Set();
        const point = (value, code, expectedTile = TILE.FLOOR) => {
          if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isInteger) || value[0] < 0 || value[0] >= width || value[1] < 0 || value[1] >= height || !matchesTile(tileAt(value[0], value[1]), expectedTile)) {
            errors.push({ code, message: "\u7269\u4EF6\u4F4D\u7F6E\u65E0\u6548" });
            return false;
          }
          const key = value.join(",");
          if (occupied.has(key)) errors.push({ code: "overlap", message: "\u7269\u4EF6\u4E0D\u80FD\u91CD\u5408" });
          occupied.add(key);
          return true;
        };
        for (let x = 0; x < width; x += 1) {
          if (tileAt(x, 0) !== TILE.WALL || tileAt(x, height - 1) !== TILE.WALL) {
            errors.push({ code: "terrain", message: "\u5730\u56FE\u8FB9\u754C\u5FC5\u987B\u662F\u5899" });
            break;
          }
        }
        for (let y = 0; y < height; y += 1) {
          if (tileAt(0, y) !== TILE.WALL || tileAt(width - 1, y) !== TILE.WALL) {
            errors.push({ code: "terrain", message: "\u5730\u56FE\u8FB9\u754C\u5FC5\u987B\u662F\u5899" });
            break;
          }
        }
        point(draft.start, "start");
        point(draft.exit, "exit");
        if (draft.mechanism !== null) point(draft.mechanism, "placement");
        for (const [items, limit] of [
          [draft.guards, 8],
          [draft.spikes, 32],
          [draft.launchers, 8],
          [draft.objects === void 0 ? [] : draft.objects, MAX_OBJECTS]
        ]) {
          if (!Array.isArray(items) || items.length > limit) {
            errors.push({ code: "count", message: "\u5371\u9669\u7269\u6570\u91CF\u8D85\u9650" });
          }
        }
        if (errors.length) return { errors, warnings };
        for (const guard of draft.guards) point(guard, "placement");
        for (const spike of draft.spikes) {
          if (!spike || typeof spike !== "object") {
            errors.push({ code: "placement", message: "\u5730\u523A\u6570\u636E\u65E0\u6548" });
            continue;
          }
          point([spike.x, spike.y], "placement");
          if (![0, 1, 2].includes(spike.tempo) || ![0, 1, 2, 3].includes(spike.phase)) {
            errors.push({ code: "placement", message: "\u5730\u523A\u8282\u594F\u65E0\u6548" });
          }
        }
        for (const launcher of draft.launchers) {
          if (!launcher || typeof launcher !== "object") {
            errors.push({ code: "placement", message: "\u5F13\u7BAD\u6570\u636E\u65E0\u6548" });
            continue;
          }
          if (point([launcher.x, launcher.y], "placement", TILE.WALL) && (!Number.isInteger(launcher.dir) || launcher.dir < 0 || launcher.dir > 3 || !matchesTile(tileAt(
            launcher.x + DIRS[launcher.dir][0],
            launcher.y + DIRS[launcher.dir][1]
          )) || ![0, 1, 2].includes(launcher.tempo) || ![0, 1, 2, 3].includes(launcher.phase))) {
            errors.push({ code: "placement", message: "\u5F13\u7BAD\u65B9\u5411\u6216\u8282\u594F\u65E0\u6548" });
          }
        }
        const objects = draft.objects || [];
        const counts = {};
        for (const item of objects) {
          const spec = item && typeof item.type === "string" && OBJECT_BY_TYPE2[item.type];
          if (!spec) {
            errors.push({ code: "placement", message: "\u673A\u5173\u7C7B\u578B\u65E0\u6548" });
            continue;
          }
          counts[item.type] = (counts[item.type] || 0) + 1;
          if (counts[item.type] > spec.limit) errors.push({ code: "count", message: "\u673A\u5173\u6570\u91CF\u8D85\u9650" });
          if (!point([item.x, item.y], "placement", spec.tile)) continue;
          if (item.type === "lockedWall" && (item.x === 0 || item.y === 0 || item.x === width - 1 || item.y === height - 1)) {
            errors.push({ code: "placement", message: "\u673A\u5173\u5899\u4E0D\u80FD\u653E\u5728\u5730\u56FE\u8FB9\u754C" });
          }
          if (spec.pair) {
            const target = [item.toX, item.toY];
            if (target[0] === item.x && target[1] === item.y) {
              errors.push({ code: "placement", message: "\u8D77\u70B9\u548C\u7EC8\u70B9\u4E0D\u80FD\u76F8\u540C" });
            } else if (item.type === "relay") {
              if (!target.every(Number.isInteger) || !matchesTile(tileAt(...target))) {
                errors.push({ code: "placement", message: "\u4F20\u58F0\u76EE\u6807\u4F4D\u7F6E\u65E0\u6548" });
              }
            } else point(target, "placement");
          } else if ("toX" in item || "toY" in item) {
            errors.push({ code: "placement", message: "\u673A\u5173\u6570\u636E\u65E0\u6548" });
          }
        }
        if (errors.length) return { errors, warnings };
        if (draft.guards.length + objects.filter((item) => ENEMY_TYPES.has(item.type)).length > MAX_ENEMIES) {
          errors.push({ code: "count", message: "\u654C\u4EBA\u6570\u91CF\u8D85\u9650" });
        }
        if (objects.some((item) => item.type === "lockedWall") && !draft.mechanism && !objects.some((item) => item.type === "sequence")) {
          errors.push({ code: "placement", message: "\u673A\u5173\u5899\u9700\u8981\u58F0\u9501\u6216\u987A\u5E8F\u58F0\u8282\u70B9" });
        }
        if (errors.length) return { errors, warnings };
        const level = toRuntimeLevel(draft);
        const lockedWalls = level.mechanismWalls;
        const flood = (unlocked) => {
          const reachable2 = /* @__PURE__ */ new Set([draft.start.join(",")]);
          const queue2 = [draft.start];
          for (let index = 0; index < queue2.length; index += 1) {
            const [x, y] = queue2[index];
            for (const [dx, dy] of DIRS) {
              const nx = x + dx, ny = y + dy;
              const key = `${nx},${ny}`;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height || !matchesTile(tileAt(nx, ny)) && !(unlocked && lockedWalls.has(key)) || reachable2.has(key)) continue;
              reachable2.add(key);
              queue2.push([nx, ny]);
            }
          }
          return { reachable: reachable2, queue: queue2 };
        };
        const beforeUnlock = flood(false);
        const reachable = beforeUnlock.reachable;
        const queue = beforeUnlock.queue;
        if (!(lockedWalls.size ? flood(true).reachable : reachable).has(draft.exit.join(","))) {
          errors.push({ code: "unreachable", message: "\u51FA\u53E3\u4E0D\u53EF\u8FBE" });
        }
        for (const item of objects.filter((object) => object.type === "sequence")) {
          if (!reachable.has(`${item.x},${item.y}`) || !reachable.has(`${item.toX},${item.toY}`)) {
            errors.push({ code: "unreachable", message: "\u987A\u5E8F\u58F0\u8282\u70B9\u4E0D\u53EF\u8FBE" });
          }
        }
        if (level.mechanism && !reachable.has(draft.mechanism.join(","))) {
          const reachableByProbe = (sx, sy) => {
            const candidates = queue.filter(([x, y]) => (x - sx) ** 2 + (y - sy) ** 2 <= 17 ** 2);
            if (!candidates.length) return false;
            const localCells = (cells) => new Set([...cells].filter((key) => {
              const [x, y] = key.split(",").map(Number);
              return Math.abs(x - sx) <= 18 && Math.abs(y - sy) <= 18;
            }));
            const acousticMap = {
              width,
              height,
              walls: localCells(level.walls),
              pits: localCells(level.pits),
              fences: localCells(level.fences)
            };
            const field = propagate(acousticMap, sx + 0.5, sy + 0.5, "low", 17);
            return candidates.some(([x, y]) => Number.isFinite(field.at(x + 0.5, y + 0.5)));
          };
          const activatable = reachableByProbe(...draft.mechanism) || objects.filter((item) => item.type === "relay").some((item) => reachableByProbe(item.x, item.y) && Number.isFinite(propagate(level, item.toX + 0.5, item.toY + 0.5, "low", 7).at(...level.mechanism)));
          if (!activatable) {
            errors.push({ code: "lock-unreachable", message: "\u58F0\u9501\u4E0D\u53EF\u8FBE" });
          }
        }
        let floorCount = 0, referenced = 0;
        for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
          if (!matchesTile(tileAt(x, y))) continue;
          floorCount += 1;
          let nearWall = false;
          for (let dy = -3; dy <= 3 && !nearWall; dy += 1) {
            for (let dx = -3; dx <= 3; dx += 1) {
              if (dx * dx + dy * dy <= 9 && x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height && [TILE.WALL, TILE.FENCE].includes(tileAt(x + dx, y + dy))) {
                nearWall = true;
                break;
              }
            }
          }
          if (nearWall) referenced += 1;
        }
        if (floorCount && referenced / floorCount < 0.9) {
          warnings.push({ code: "acoustic-reference", message: "\u5F00\u9614\u533A\u7F3A\u5C11\u58F0\u6CE2\u53C2\u7167\u7269" });
        }
        return { errors, warnings };
      }
      module.exports = { validateDraft: validateDraft2 };
    }
  });

  // src/ugc/codec.js
  var require_codec = __commonJS({
    "src/ugc/codec.js"(exports, module) {
      var { SIZES: SIZES2 } = require_model();
      var { validateDraft: validateDraft2 } = require_validation();
      var { OBJECT_BY_CODE, OBJECT_BY_TYPE: OBJECT_BY_TYPE2, MAX_OBJECTS } = require_objects();
      var SIZE_NAMES = ["small", "medium", "large"];
      var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      var MAX_CODE_LENGTH = 16384;
      function fail(code) {
        const error = new Error(`level-code-${code}`);
        error.code = code;
        throw error;
      }
      function checkDraft(draft) {
        const { errors } = validateDraft2(draft);
        if (errors.length) {
          fail(errors.some((error) => ["unreachable", "lock-unreachable"].includes(error.code)) ? "unreachable" : "invalid");
        }
        if (draft.origin !== null && (!draft.origin || !Number.isInteger(draft.origin.seed) || draft.origin.seed < 0 || draft.origin.seed > 4294967295 || !Number.isInteger(draft.origin.generatorVersion) || draft.origin.generatorVersion < 0 || draft.origin.generatorVersion > 255)) {
          fail("invalid");
        }
      }
      function canonicalDraft(draft) {
        const sortObjects = (items, keys) => items.map((item) => {
          const copy = {};
          for (const key of keys) copy[key] = item[key];
          return copy;
        }).sort((a, b) => {
          for (const key of keys) if (a[key] !== b[key]) return a[key] - b[key];
          return 0;
        });
        const objects = (draft.objects || []).map((item) => ({
          type: item.type,
          x: item.x,
          y: item.y,
          ...OBJECT_BY_TYPE2[item.type].pair ? { toX: item.toX, toY: item.toY } : {}
        }));
        objects.sort((a, b) => (OBJECT_BY_TYPE2[a.type].code || 256) - (OBJECT_BY_TYPE2[b.type].code || 256) || (a.type < b.type ? -1 : a.type > b.type ? 1 : 0) || a.x - b.x || a.y - b.y || (a.toX || 0) - (b.toX || 0) || (a.toY || 0) - (b.toY || 0));
        return {
          size: draft.size,
          name: draft.name,
          tiles: draft.tiles.slice(),
          start: draft.start.slice(),
          exit: draft.exit.slice(),
          mechanism: draft.mechanism && draft.mechanism.slice(),
          guards: draft.guards.map((point) => point.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
          spikes: sortObjects(draft.spikes, ["x", "y", "tempo", "phase"]),
          launchers: sortObjects(draft.launchers, ["x", "y", "dir", "tempo", "phase"]),
          objects,
          origin: draft.origin && { seed: draft.origin.seed, generatorVersion: draft.origin.generatorVersion }
        };
      }
      function crc32(bytes) {
        let crc = 4294967295;
        for (const byte of bytes) {
          crc ^= byte;
          for (let bit = 0; bit < 8; bit += 1) {
            crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
          }
        }
        return (crc ^ 4294967295) >>> 0;
      }
      function base64Encode(bytes) {
        let output = "";
        for (let index = 0; index < bytes.length; index += 3) {
          const bits = bytes[index] << 16 | (bytes[index + 1] || 0) << 8 | (bytes[index + 2] || 0);
          output += BASE64[bits >>> 18 & 63] + BASE64[bits >>> 12 & 63];
          if (index + 1 < bytes.length) output += BASE64[bits >>> 6 & 63];
          if (index + 2 < bytes.length) output += BASE64[bits & 63];
        }
        return output;
      }
      function base64Decode(text) {
        if (!text || !/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) fail("corrupt");
        const bytes = [];
        let bits = 0, count = 0;
        for (const char of text) {
          bits = bits << 6 | BASE64.indexOf(char);
          count += 6;
          if (count >= 8) {
            count -= 8;
            bytes.push(bits >>> count & 255);
            bits &= (1 << count) - 1;
          }
        }
        if (bits !== 0) fail("corrupt");
        return bytes;
      }
      function utf8Encode(text) {
        const escaped = encodeURIComponent(text);
        const bytes = [];
        for (let index = 0; index < escaped.length; index += 1) {
          if (escaped[index] === "%") {
            bytes.push(parseInt(escaped.slice(index + 1, index + 3), 16));
            index += 2;
          } else bytes.push(escaped.charCodeAt(index));
        }
        return bytes;
      }
      function utf8Decode(bytes) {
        try {
          return decodeURIComponent(bytes.map((byte) => `%${byte.toString(16).padStart(2, "0")}`).join(""));
        } catch (_) {
          return fail("corrupt");
        }
      }
      var Writer = class {
        constructor() {
          this.bytes = [];
        }
        u8(value) {
          this.bytes.push(value);
        }
        u32(value) {
          for (let shift = 0; shift < 32; shift += 8) this.u8(value >>> shift & 255);
        }
        point(point) {
          this.u8(point[0]);
          this.u8(point[1]);
        }
      };
      var Reader = class {
        constructor(bytes, end = bytes.length) {
          this.bytes = bytes;
          this.end = end;
          this.index = 0;
        }
        take(length) {
          if (this.index + length > this.end) fail("corrupt");
          const result = this.bytes.slice(this.index, this.index + length);
          this.index += length;
          return result;
        }
        u8() {
          return this.take(1)[0];
        }
        u32() {
          const bytes = this.take(4);
          return (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) >>> 0;
        }
        point() {
          return this.take(2);
        }
        flag() {
          const value = this.u8();
          if (value > 1) fail("corrupt");
          return value;
        }
        count(limit) {
          const value = this.u8();
          if (value > limit) fail("corrupt");
          return value;
        }
      };
      function encodeLevel2(input) {
        checkDraft(input);
        const draft = canonicalDraft(input);
        const extended = draft.tiles.some((tile) => tile > 3) || draft.objects.some((item) => !OBJECT_BY_TYPE2[item.type].code);
        const version = extended ? 4 : draft.tiles.includes(3) ? 3 : draft.objects.length ? 2 : 1;
        const writer = new Writer();
        writer.bytes.push(69, 67, 76, version, SIZE_NAMES.indexOf(draft.size));
        const name = utf8Encode(draft.name);
        writer.u8(name.length);
        writer.bytes.push(...name);
        writer.u8(draft.origin ? 1 : 0);
        if (draft.origin) {
          writer.u32(draft.origin.seed);
          writer.u8(draft.origin.generatorVersion);
        }
        if (version === 4) writer.bytes.push(...draft.tiles);
        else for (let index = 0; index < draft.tiles.length; index += 4) {
          let byte = 0;
          for (let offset = 0; offset < 4; offset += 1) byte |= (draft.tiles[index + offset] || 0) << offset * 2;
          writer.u8(byte);
        }
        writer.point(draft.start);
        writer.point(draft.exit);
        writer.u8(draft.mechanism ? 1 : 0);
        if (draft.mechanism) writer.point(draft.mechanism);
        writer.u8(draft.guards.length);
        for (const guard of draft.guards) writer.point(guard);
        for (const [items, keys] of [
          [draft.spikes, ["x", "y", "tempo", "phase"]],
          [draft.launchers, ["x", "y", "dir", "tempo", "phase"]]
        ]) {
          writer.u8(items.length);
          for (const item of items) for (const key of keys) writer.u8(item[key]);
        }
        if (version >= 2) {
          writer.u8(draft.objects.length);
          for (const item of draft.objects) {
            const spec = OBJECT_BY_TYPE2[item.type];
            if (version === 4) {
              const type = utf8Encode(item.type);
              if (type.length < 1 || type.length > 64) fail("invalid");
              writer.u8(type.length);
              writer.bytes.push(...type);
            } else writer.u8(spec.code);
            writer.u8(item.x);
            writer.u8(item.y);
            if (spec.pair) {
              writer.u8(item.toX);
              writer.u8(item.toY);
            }
          }
        }
        writer.u32(crc32(writer.bytes));
        const code = `ECL${version}-${base64Encode(writer.bytes)}`;
        if (code.length > MAX_CODE_LENGTH) fail("invalid");
        return code;
      }
      function decodeLevel(code) {
        if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) fail("corrupt");
        const prefix = /^ECL([1234])-/.exec(code);
        if (!prefix) {
          if (/^ECL\d+-/.test(code)) fail("unsupported");
          fail("corrupt");
        }
        const version = Number(prefix[1]);
        const bytes = base64Decode(code.slice(5));
        if (bytes.length < 8) fail("corrupt");
        if (bytes[0] !== 69 || bytes[1] !== 67 || bytes[2] !== 76) fail("corrupt");
        if (bytes[3] !== version) fail("unsupported");
        const checksum = new Reader(bytes);
        checksum.index = bytes.length - 4;
        if (checksum.u32() !== crc32(bytes.slice(0, -4))) fail("corrupt");
        const reader = new Reader(bytes, bytes.length - 4);
        reader.index = 4;
        const size = SIZE_NAMES[reader.u8()];
        if (!size) fail("corrupt");
        const nameLength = reader.u8();
        if (nameLength > 48) fail("corrupt");
        const name = utf8Decode(reader.take(nameLength));
        const origin = reader.flag() ? { seed: reader.u32(), generatorVersion: reader.u8() } : null;
        const [width, height] = SIZES2[size];
        const packed = reader.take(version === 4 ? 0 : width * height / 4);
        const tiles = version === 4 ? reader.take(width * height) : [];
        for (const byte of packed) for (let shift = 0; shift < 8; shift += 2) {
          const tile = byte >>> shift & 3;
          if (tile === 3 && version < 3) fail("corrupt");
          tiles.push(tile);
        }
        const start = reader.point(), exit = reader.point();
        const mechanism = reader.flag() ? reader.point() : null;
        const guards = Array.from({ length: reader.count(8) }, () => reader.point());
        const readObjects = (limit, keys) => Array.from({ length: reader.count(limit) }, () => {
          const values = reader.take(keys.length);
          const item = {};
          keys.forEach((key, index) => {
            item[key] = values[index];
          });
          return item;
        });
        const spikes = readObjects(32, ["x", "y", "tempo", "phase"]);
        const launchers = readObjects(8, ["x", "y", "dir", "tempo", "phase"]);
        const objects = [];
        if (version >= 2) for (let index = 0, count = reader.count(MAX_OBJECTS); index < count; index += 1) {
          let spec;
          if (version === 4) {
            const length = reader.u8();
            if (length < 1 || length > 64) fail("corrupt");
            spec = OBJECT_BY_TYPE2[utf8Decode(reader.take(length))];
          } else spec = OBJECT_BY_CODE[reader.u8()];
          if (!spec) fail("corrupt");
          const item = { type: spec.type, x: reader.u8(), y: reader.u8() };
          if (spec.pair) {
            item.toX = reader.u8();
            item.toY = reader.u8();
          }
          objects.push(item);
        }
        if (reader.index !== reader.end) fail("corrupt");
        const draft = { size, name, tiles, start, exit, mechanism, guards, spikes, launchers, objects, origin };
        checkDraft(draft);
        return canonicalDraft(draft);
      }
      module.exports = { encodeLevel: encodeLevel2, decodeLevel };
    }
  });

  // src/level-generator.js
  var require_level_generator = __commonJS({
    "src/level-generator.js"(exports, module) {
      var { SIZES: SIZES2, TILE, createBlankDraft: createBlankDraft2 } = require_model();
      var WIDTH = 36;
      var HEIGHT = 48;
      function randomFromSeed(seed) {
        let state2 = seed >>> 0;
        return () => {
          state2 = state2 + 1831565813 >>> 0;
          let value = state2;
          value = Math.imul(value ^ value >>> 15, value | 1);
          value ^= value + Math.imul(value ^ value >>> 7, value | 61);
          return ((value ^ value >>> 14) >>> 0) / 4294967296;
        };
      }
      function mechanismNode(route, nodes, point, start, exit) {
        const separated = (node) => {
          const [x, y] = point(node);
          return Math.hypot(x - exit[0], y - exit[1]) > 17.5 && Math.hypot(x - start[0], y - start[1]) > 7;
        };
        const routeChoices = route.filter(separated);
        if (routeChoices.length) {
          return routeChoices.reduce((best, node) => Math.abs(route.indexOf(node) / route.length - 0.5) < Math.abs(route.indexOf(best) / route.length - 0.5) ? node : best);
        }
        const midpoint = point(route[Math.floor(route.length / 2)]);
        const choices = nodes.filter(separated);
        if (!choices.length) throw new Error("No separate location for sound lock");
        return choices.reduce((best, node) => Math.hypot(point(node)[0] - midpoint[0], point(node)[1] - midpoint[1]) < Math.hypot(point(best)[0] - midpoint[0], point(best)[1] - midpoint[1]) ? node : best);
      }
      function generateLoopMaze(seed, difficulty, dimensions) {
        const width = dimensions?.width ?? 36;
        const height = dimensions?.height ?? 48;
        const random = randomFromSeed(seed);
        const columns = width / 6;
        const rows = height / 6;
        const count = columns * rows;
        const point = (node) => [3 + node % columns * 6, 3 + Math.floor(node / columns) * 6];
        const links = Array.from({ length: count }, () => []);
        const connect = (a, b) => {
          if (!links[a].includes(b)) {
            links[a].push(b);
            links[b].push(a);
          }
        };
        const neighbors = (node) => {
          const column = node % columns;
          const row = Math.floor(node / columns);
          return [
            column > 0 ? node - 1 : -1,
            column < columns - 1 ? node + 1 : -1,
            row > 0 ? node - columns : -1,
            row < rows - 1 ? node + columns : -1
          ].filter((next) => next >= 0);
        };
        const corners = [0, columns - 1, count - columns, count - 1];
        const startNode = corners[Math.floor(random() * corners.length)];
        const deadEnds = [3 * columns + 2, 4 * columns + 3];
        const visited = /* @__PURE__ */ new Set([startNode]);
        const active = [startNode];
        while (active.length) {
          const index = random() < 0.68 ? active.length - 1 : Math.floor(random() * active.length);
          const node = active[index];
          const choices = neighbors(node).filter((next2) => !visited.has(next2) && !deadEnds.includes(next2));
          if (!choices.length) {
            active.splice(index, 1);
            continue;
          }
          const next = choices[Math.floor(random() * choices.length)];
          connect(node, next);
          visited.add(next);
          active.push(next);
        }
        for (const node of deadEnds) {
          const choices = neighbors(node).filter((next) => visited.has(next));
          connect(node, choices[Math.floor(random() * choices.length)]);
        }
        const innerTop = 1 + Math.floor(random() * 2);
        const innerBottom = rows - 3 + Math.floor(random() * 2);
        const outer = [0, columns - 1, 0, rows - 1];
        for (const [left, right, top, bottom] of [outer, [1, columns - 2, innerTop, innerBottom]]) {
          for (let column = left; column < right; column += 1) {
            connect(top * columns + column, top * columns + column + 1);
            connect(bottom * columns + column, bottom * columns + column + 1);
          }
          for (let row = top; row < bottom; row += 1) {
            connect(row * columns + left, (row + 1) * columns + left);
            connect(row * columns + right, (row + 1) * columns + right);
          }
        }
        const graphDistance = (start, goal) => {
          const queue2 = [[start, 0]];
          const seen = /* @__PURE__ */ new Set([start]);
          for (let index = 0; index < queue2.length; index += 1) {
            const [node, distance] = queue2[index];
            if (node === goal) return distance;
            for (const next of links[node]) {
              if (seen.has(next)) continue;
              seen.add(next);
              queue2.push([next, distance + 1]);
            }
          }
          return Infinity;
        };
        const cycles = () => links.reduce((sum, next) => sum + next.length, 0) / 2 - count + 1;
        const targetCycles = Math.round((difficulty === "hard" ? 12 : difficulty === "normal" ? 10 : 8) * columns * rows / 48);
        while (cycles() < targetCycles) {
          const choices = [];
          for (let node = 0; node < count; node += 1) {
            if (deadEnds.includes(node)) continue;
            for (const next of neighbors(node)) {
              if (next <= node || deadEnds.includes(next) || links[node].includes(next)) continue;
              const distance = graphDistance(node, next);
              if (distance >= 6) choices.push({ node, next, distance });
            }
          }
          if (!choices.length) break;
          choices.sort((a, b) => b.distance - a.distance);
          const pool = Math.max(1, Math.ceil(choices.length / 3));
          const choice = choices[Math.floor(random() * pool)];
          connect(choice.node, choice.next);
        }
        const walls = /* @__PURE__ */ new Set();
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) walls.add(`${x},${y}`);
        }
        const carve = (x, y) => {
          for (let dy = 0; dy < 2; dy += 1) {
            for (let dx = 0; dx < 2; dx += 1) walls.delete(`${x + dx},${y + dy}`);
          }
        };
        for (let node = 0; node < count; node += 1) {
          const [x, y] = point(node);
          carve(x, y);
          for (const next of links[node]) {
            if (next < node) continue;
            const [nx, ny] = point(next);
            for (let cx = Math.min(x, nx); cx <= Math.max(x, nx); cx += 1) {
              for (let cy = Math.min(y, ny); cy <= Math.max(y, ny); cy += 1) carve(cx, cy);
            }
          }
        }
        const queue = [startNode];
        const parent = /* @__PURE__ */ new Map([[startNode, null]]);
        const distanceFromStart = /* @__PURE__ */ new Map([[startNode, 0]]);
        for (let index = 0; index < queue.length; index += 1) {
          for (const next of links[queue[index]]) {
            if (parent.has(next)) continue;
            parent.set(next, queue[index]);
            distanceFromStart.set(next, distanceFromStart.get(queue[index]) + 1);
            queue.push(next);
          }
        }
        const exits = Array.from({ length: count }, (_, node) => node).filter((node) => links[node].length === 1).sort((a, b) => distanceFromStart.get(b) - distanceFromStart.get(a) || a - b);
        const exitNode = exits[Math.floor(random() * Math.min(3, exits.length))];
        const route = [];
        for (let node = exitNode; node !== null; node = parent.get(node)) route.push(node);
        route.reverse();
        let routeTurns = 0;
        for (let index = 2; index < route.length; index += 1) {
          if (route[index] - route[index - 1] !== route[index - 1] - route[index - 2]) routeTurns += 1;
        }
        const center = (node) => point(node).map((value) => value + 0.5);
        const level = {
          width,
          height,
          name: `\u6DF1\u5DF7 ${seed}`,
          hint: "\u5FAA\u7740\u58F0\u6CE2\u5BFB\u627E\u51FA\u53E3",
          start: center(startNode),
          exit: center(exitNode),
          walls: [...walls],
          pits: [],
          enemies: []
        };
        if (difficulty !== "easy") {
          level.mechanism = center(mechanismNode(
            route,
            Array.from({ length: count }, (_, node) => node),
            center,
            level.start,
            level.exit
          ));
          const crossings = difficulty === "hard" ? [0.4, 1] : [1];
          level.spikes = crossings.flatMap((fraction, index) => {
            const edge = Math.min(route.length - 2, Math.floor((route.length - 1) * fraction));
            const [x, y] = point(route[edge]);
            const [nx, ny] = point(route[edge + 1]);
            const spikeX = (x + nx) / 2;
            const spikeY = (y + ny) / 2;
            return (x === nx ? [0, 1].map((dx) => [spikeX + dx, spikeY]) : [0, 1].map((dy) => [spikeX, spikeY + dy])).map(([sx, sy]) => ({
              x: sx + 0.5,
              y: sy + 0.5,
              phase: 0.8 + index * 0.6,
              period: 3.2,
              duration: difficulty === "hard" ? 0.8 : 0.55
            }));
          });
        }
        if (difficulty === "hard") {
          const sideNodes = Array.from({ length: count }, (_, node) => node).filter((node) => !route.includes(node));
          const patrol = center(sideNodes[0] ?? startNode);
          const bat = center(sideNodes[sideNodes.length - 1] ?? startNode);
          level.patrols = [{ path: [patrol, [patrol[0] + 1, patrol[1]]] }];
          level.bats = [{ x: bat[0], y: bat[1], phase: 0.9, period: 2.7, range: 7 }];
        }
        const leafDepth = (node) => {
          let depth = 0;
          let previous = -1;
          while (links[node].length <= 2) {
            const next = links[node].find((neighbor) => neighbor !== previous);
            if (next === void 0) break;
            previous = node;
            node = next;
            depth += 1;
          }
          return depth;
        };
        let floors = 0;
        let referencedFloors = 0;
        for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
            if (walls.has(`${x},${y}`)) continue;
            floors += 1;
            let reference = false;
            for (let dy = -3; dy <= 3 && !reference; dy += 1) {
              for (let dx = -3; dx <= 3; dx += 1) {
                if (dx * dx + dy * dy <= 9 && walls.has(`${x + dx},${y + dy}`)) {
                  reference = true;
                  break;
                }
              }
            }
            if (reference) referencedFloors += 1;
          }
        }
        const topology = {
          cycles: cycles(),
          forks: links.filter((next) => next.length >= 3).length,
          deadEnds: links.filter((next) => next.length === 1).length,
          maxDeadEndDepth: Math.max(...links.map((next, node) => next.length === 1 ? leafDepth(node) : 0)),
          routeTurns,
          acousticCoverage: referencedFloors / floors,
          innerLoop: [1, columns - 2, innerTop, innerBottom]
        };
        return {
          generatorVersion: width === WIDTH && height === HEIGHT ? 8 : 9,
          algorithm: "growing-tree-loops",
          seed,
          difficulty,
          maze: "dense",
          topology,
          level
        };
      }
      function generateCandidate(seed, difficulty, maze = "standard", dimensions) {
        if (!Number.isSafeInteger(seed) || !["easy", "normal", "hard"].includes(difficulty) || !["standard", "dense"].includes(maze)) {
          throw new Error("Expected an integer seed, easy/normal/hard difficulty, and standard/dense maze");
        }
        if (maze === "dense") return generateLoopMaze(seed, difficulty, dimensions);
        const columns = 4;
        const rows = 5;
        const stepX = 9;
        const stepY = 9;
        const random = randomFromSeed(seed);
        const walls = /* @__PURE__ */ new Set();
        const pits = /* @__PURE__ */ new Set();
        for (let x = 0; x < WIDTH; x += 1) {
          walls.add(`${x},0`);
          walls.add(`${x},${HEIGHT - 1}`);
        }
        for (let y = 0; y < HEIGHT; y += 1) {
          walls.add(`0,${y}`);
          walls.add(`${WIDTH - 1},${y}`);
        }
        for (let column = 1; column < columns; column += 1) {
          for (let y = 1; y < HEIGHT - 1; y += 1) walls.add(`${column * stepX},${y}`);
        }
        for (let row = 1; row < rows; row += 1) {
          for (let x = 1; x < WIDTH - 1; x += 1) walls.add(`${x},${row * stepY}`);
        }
        const roomCount = columns * rows;
        const roomCenter = (room) => [
          room % columns * stepX + 4.5,
          Math.floor(room / columns) * stepY + 4.5
        ];
        const startRoom = [0, columns - 1, roomCount - columns, roomCount - 1][Math.floor(random() * 4)];
        const visited = /* @__PURE__ */ new Set([startRoom]);
        const stack = [startRoom];
        const links = Array.from({ length: roomCount }, () => []);
        const doors = /* @__PURE__ */ new Map();
        const doorKey = (a, b) => `${Math.min(a, b)},${Math.max(a, b)}`;
        while (stack.length) {
          const room = stack[stack.length - 1];
          const column = room % columns;
          const row = Math.floor(room / columns);
          const neighbors = [
            column > 0 ? room - 1 : -1,
            column < columns - 1 ? room + 1 : -1,
            row > 0 ? room - columns : -1,
            row < rows - 1 ? room + columns : -1
          ].filter((next2) => next2 >= 0 && !visited.has(next2));
          if (!neighbors.length) {
            stack.pop();
            continue;
          }
          const next = neighbors[Math.floor(random() * neighbors.length)];
          const nextColumn = next % columns;
          const nextRow = Math.floor(next / columns);
          const cells = [];
          if (column !== nextColumn) {
            const x = Math.max(column, nextColumn) * stepX;
            const y = row * stepY + 3 + Math.floor(random() * 3);
            cells.push([x, y], [x, y + 1]);
          } else {
            const y = Math.max(row, nextRow) * stepY;
            const x = column * stepX + 3 + Math.floor(random() * 3);
            cells.push([x, y], [x + 1, y]);
          }
          for (const [x, y] of cells) walls.delete(`${x},${y}`);
          doors.set(doorKey(room, next), cells);
          links[room].push(next);
          links[next].push(room);
          visited.add(next);
          stack.push(next);
        }
        const queue = [startRoom];
        const parent = /* @__PURE__ */ new Map([[startRoom, null]]);
        for (let index = 0; index < queue.length; index += 1) {
          for (const next of links[queue[index]]) {
            if (parent.has(next)) continue;
            parent.set(next, queue[index]);
            queue.push(next);
          }
        }
        const exitRoom = queue[queue.length - 1];
        const routeRooms = [];
        for (let room = exitRoom; room !== null; room = parent.get(room)) routeRooms.push(room);
        routeRooms.reverse();
        const start = roomCenter(startRoom);
        const exit = roomCenter(exitRoom);
        const level = {
          width: WIDTH,
          height: HEIGHT,
          name: `\u56DE\u58F0 ${seed}`,
          hint: "\u5FAA\u7740\u58F0\u6CE2\u5BFB\u627E\u51FA\u53E3",
          start,
          exit,
          walls: [...walls],
          pits: [...pits],
          enemies: []
        };
        if (difficulty !== "easy") {
          level.mechanism = roomCenter(mechanismNode(
            routeRooms,
            Array.from({ length: roomCount }, (_, room) => room),
            roomCenter,
            start,
            exit
          ));
          const crossings = difficulty === "hard" ? [0.35, 0.7] : [0.5];
          level.spikes = crossings.flatMap((fraction, index) => {
            const edge = Math.max(0, Math.min(
              routeRooms.length - 2,
              Math.floor((routeRooms.length - 1) * fraction)
            ));
            return doors.get(doorKey(routeRooms[edge], routeRooms[edge + 1])).map(([x, y]) => ({
              x: x + 0.5,
              y: y + 0.5,
              phase: 0.8 + index * 0.6,
              period: 3.2,
              duration: difficulty === "hard" ? 0.8 : 0.55
            }));
          });
        }
        if (difficulty === "hard") {
          const sideRooms = Array.from({ length: roomCount }, (_, room) => room).filter((room) => !routeRooms.includes(room));
          const patrolCenter = roomCenter(sideRooms[0] ?? startRoom);
          const batCenter = roomCenter(sideRooms[sideRooms.length - 1] ?? startRoom);
          level.patrols = [{ path: [
            [patrolCenter[0] - 1, patrolCenter[1] - 1],
            [patrolCenter[0] + 1, patrolCenter[1] - 1]
          ] }];
          level.bats = [{
            x: batCenter[0],
            y: batCenter[1] - 2,
            phase: 0.9,
            period: 2.7,
            range: 7
          }];
        }
        for (let room = 0; room < roomCount; room += 1) {
          const x0 = room % columns * stepX;
          const y0 = Math.floor(room / columns) * stepY;
          const protectedPoints = [
            start,
            exit,
            level.mechanism,
            ...(level.patrols || []).flatMap((patrol) => patrol.path),
            ...(level.bats || []).map((bat) => [bat.x, bat.y])
          ].filter(Boolean);
          const placements = [[2, 2], [5, 5], [2, 5], [5, 2]];
          for (const [dx, dy] of placements) {
            const cells = [
              [x0 + dx, y0 + dy],
              [x0 + dx + 1, y0 + dy],
              [x0 + dx, y0 + dy + 1],
              [x0 + dx + 1, y0 + dy + 1]
            ];
            if (cells.some(([x, y]) => protectedPoints.some(([px, py]) => Math.hypot(x + 0.5 - px, y + 0.5 - py) < 0.8))) continue;
            for (const [x, y] of cells) walls.add(`${x},${y}`);
            break;
          }
        }
        level.walls = [...walls];
        return { generatorVersion: 5, seed, difficulty, level };
      }
      function generateEditableTerrain2(seed, size) {
        const dimensions = SIZES2[size];
        if (!dimensions || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
          throw new Error("invalid-generator-input");
        }
        const [mapWidth, mapHeight] = dimensions;
        const candidate = generateCandidate(
          seed,
          "easy",
          "dense",
          { width: mapWidth, height: mapHeight }
        );
        const draft = createBlankDraft2(size, candidate.level.name);
        draft.tiles.fill(TILE.FLOOR);
        for (const key of candidate.level.walls) {
          const [x, y] = key.split(",").map(Number);
          draft.tiles[y * mapWidth + x] = TILE.WALL;
        }
        draft.start = candidate.level.start.map(Math.floor);
        draft.exit = candidate.level.exit.map(Math.floor);
        draft.origin = { seed, generatorVersion: candidate.generatorVersion };
        return draft;
      }
      function hydrateLevel(level) {
        return { ...level, walls: new Set(level.walls), pits: new Set(level.pits || []) };
      }
      module.exports = { generateCandidate, generateEditableTerrain: generateEditableTerrain2, hydrateLevel, randomFromSeed };
    }
  });

  // src/hazards.js
  var require_hazards = __commonJS({
    "src/hazards.js"(exports, module) {
      var { blocked, propagate, traceImpact } = require_propagation();
      var playerSounds = /* @__PURE__ */ new Set([
        "probe",
        "footstep",
        "lure",
        "landing",
        "pickup",
        "reflection",
        "noisyFloor",
        "sniper",
        "shotgun",
        "dagger"
      ]);
      function pitSources(level) {
        const remaining = new Set(level.pits || []);
        const sources = [];
        while (remaining.size) {
          const first = remaining.values().next().value;
          const queue = [first];
          remaining.delete(first);
          for (let index = 0; index < queue.length; index += 1) {
            const [x2, y2] = queue[index].split(",").map(Number);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const next = `${x2 + dx},${y2 + dy}`;
              if (!remaining.delete(next)) continue;
              queue.push(next);
            }
          }
          const cells = queue.map((key) => key.split(",").map(Number));
          const centerX = cells.reduce((sum, [x2]) => sum + x2 + 0.5, 0) / cells.length;
          const centerY = cells.reduce((sum, [, y2]) => sum + y2 + 0.5, 0) / cells.length;
          const [x, y] = cells.reduce((best, cell) => Math.hypot(cell[0] + 0.5 - centerX, cell[1] + 0.5 - centerY) < Math.hypot(best[0] + 0.5 - centerX, best[1] + 0.5 - centerY) ? cell : best);
          sources.push({
            x: x + 0.5,
            y: y + 0.5,
            cells,
            cellKeys: new Set(queue),
            seed: (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0,
            nextAt: 0.65 + sources.length * 0.2
          });
        }
        return sources;
      }
      function pitWaveField(level, sx, sy, radius, cellKeys) {
        const cellSize = 0.25;
        const at = (x, y) => cellKeys.has(`${Math.floor(x)},${Math.floor(y)}`) && Math.hypot(x - sx, y - sy) <= radius ? Math.hypot(x - sx, y - sy) : Infinity;
        let visual;
        return { at, get visual() {
          if (visual) return visual;
          const width = Math.ceil(level.width / cellSize);
          const height = Math.ceil(level.height / cellSize);
          const times = new Float32Array(width * height);
          times.fill(Infinity);
          const bounds = {
            minX: Math.max(0, Math.floor((sx - radius) / cellSize)),
            maxX: Math.min(width - 1, Math.ceil((sx + radius) / cellSize)),
            minY: Math.max(0, Math.floor((sy - radius) / cellSize)),
            maxY: Math.min(height - 1, Math.ceil((sy + radius) / cellSize))
          };
          for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
            for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
              times[y * width + x] = at((x + 0.5) * cellSize, (y + 0.5) * cellSize);
            }
          }
          visual = {
            width,
            height,
            cellSize,
            bounds,
            at(x, y) {
              return times[y * width + x];
            }
          };
          return visual;
        } };
      }
      function pitRandom(source) {
        source.seed = Math.imul(source.seed, 1664525) + 1013904223 >>> 0;
        return source.seed / 4294967296;
      }
      function createHazards(level) {
        return {
          mines: (level.mines || []).map((mine) => ({
            ...mine,
            armedUntil: Infinity,
            readyAt: 0
          })),
          alarms: (level.alarms || []).map((alarm) => ({ ...alarm, readyAt: 0 })),
          spikes: (level.spikes || []).map((spike) => ({
            ...spike,
            nextAt: spike.phase ?? spike.period,
            activeUntil: -Infinity
          })),
          launchers: (level.launchers || []).map((launcher) => ({
            ...launcher,
            nextAt: launcher.phase ?? launcher.period
          })).filter((launcher) => {
            const x = Math.floor(launcher.x);
            const y = Math.floor(launcher.y);
            return Math.abs(launcher.dx) + Math.abs(launcher.dy) === 1 && (level.walls.has(`${x},${y}`) || level.debugGallery && launcher.debugFreeStanding) && !blocked(level, x + launcher.dx, y + launcher.dy);
          }),
          arrows: [],
          pitSources: pitSources(level)
        };
      }
      function checkGroundHazards(world) {
        if (world.invincible) return;
        for (const actor of world.actors) {
          if (actor.alive === false || actor.escaped) continue;
          const { x, y } = actor;
          if (world.level.pits?.has(`${Math.floor(x)},${Math.floor(y)}`)) world.killActor(actor, "pit");
          else if (world.spikes.some((spike) => world.time < spike.activeUntil && Math.hypot(x - spike.x, y - spike.y) < 0.46)) world.killActor(actor, "spike");
        }
      }
      function segmentDistance(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        const fraction = lengthSquared ? Math.max(0, Math.min(
          1,
          ((px - ax) * dx + (py - ay) * dy) / lengthSquared
        )) : 0;
        return Math.hypot(px - ax - dx * fraction, py - ay - dy * fraction);
      }
      function updateHazards(world, dt, emitSound) {
        for (const mine of world.mines) {
          if (world.time >= mine.armedUntil) {
            mine.armedUntil = Infinity;
            mine.readyAt = world.time + 4;
            const blast = emitSound(world, mine.x, mine.y, "mineBlast", 1.2);
            if (!world.invincible) {
              for (const actor of world.actors) {
                if (blast.field.at(actor.x, actor.y) <= 1.2) world.killActor(actor, "mine");
              }
            }
          }
          if (world.time < mine.readyAt || mine.armedUntil !== Infinity) continue;
          for (const wave of world.waves) {
            if (!playerSounds.has(wave.type)) continue;
            const distance = wave.field.at(mine.x, mine.y);
            if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
            mine.armedUntil = world.time + 0.9;
            emitSound(world, mine.x, mine.y, "mineWarning", 2.4);
            break;
          }
        }
        for (const alarm of world.alarms) {
          if (world.time < alarm.readyAt) continue;
          for (const wave of world.waves) {
            if (!playerSounds.has(wave.type)) continue;
            const distance = wave.field.at(alarm.x, alarm.y);
            if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
            alarm.readyAt = world.time + 6;
            const broadcast = emitSound(world, alarm.x, alarm.y, "alarm", 18);
            broadcast.targetOrigin = [wave.x, wave.y];
            broadcast.targetField = propagate(world.level, wave.x, wave.y, "low", 18);
            broadcast.targetType = wave.type;
            break;
          }
        }
        const heardSpikeGroups = /* @__PURE__ */ new Set();
        for (const spike of world.spikes) {
          while (world.time >= spike.nextAt) {
            spike.activeUntil = spike.nextAt + spike.duration;
            if (spike.waveGroup == null || !heardSpikeGroups.has(spike.waveGroup)) {
              emitSound(world, spike.soundX ?? spike.x, spike.soundY ?? spike.y, "spike", 4.2);
              if (spike.waveGroup != null) heardSpikeGroups.add(spike.waveGroup);
            }
            spike.nextAt += spike.period;
          }
        }
        for (const launcher of world.launchers) {
          while (world.time >= launcher.nextAt) {
            const magnitude = Math.hypot(launcher.dx, launcher.dy) || 1;
            const x = launcher.x + launcher.dx * 0.51;
            const y = launcher.y + launcher.dy * 0.51;
            world.arrows.push({
              x,
              y,
              dx: launcher.dx / magnitude,
              dy: launcher.dy / magnitude,
              speed: launcher.range,
              remaining: launcher.range,
              waveAt: world.time + 0.14
            });
            emitSound(world, x, y, "bow", 2.8);
            emitSound(world, x, y, "arrow", 0.9);
            launcher.nextAt += launcher.period;
          }
        }
        for (const source of world.pitSources) {
          while (world.time >= source.nextAt) {
            const [cellX, cellY] = source.cells[Math.floor(pitRandom(source) * source.cells.length)];
            const x = cellX + 0.3 + pitRandom(source) * 0.4;
            const y = cellY + 0.3 + pitRandom(source) * 0.4;
            const radius = 1.85 + pitRandom(source) * 0.3;
            const wave = emitSound(
              world,
              x,
              y,
              "pit",
              radius,
              0.38,
              pitWaveField(world.level, x, y, radius, source.cellKeys)
            );
            wave.speed = 2.8;
            wave.audioSilent = true;
            source.nextAt += 0.32 + pitRandom(source) * 0.2;
          }
        }
        world.arrows = world.arrows.filter((arrow) => {
          const distance = Math.min(arrow.remaining, arrow.speed * dt);
          const hit = traceImpact(world.level, arrow.x, arrow.y, arrow.dx, arrow.dy, distance);
          const fromX = arrow.x;
          const fromY = arrow.y;
          arrow.x = hit.x;
          arrow.y = hit.y;
          arrow.remaining -= hit.distance;
          if (!world.invincible) {
            for (const actor of world.actors) {
              if (segmentDistance(actor.x, actor.y, fromX, fromY, arrow.x, arrow.y) < 0.34) {
                world.killActor(actor, "arrow");
              }
            }
          }
          if (world.time >= arrow.waveAt && !hit.hit && arrow.remaining > 0) {
            emitSound(world, arrow.x, arrow.y, "arrow", 0.9).audioSilent = true;
            arrow.waveAt = world.time + 0.14;
          }
          return !hit.hit && arrow.remaining > 0;
        });
        checkGroundHazards(world);
      }
      module.exports = { pitSources, pitWaveField, createHazards, checkGroundHazards, updateHazards };
    }
  });

  // src/devices.js
  var require_devices = __commonJS({
    "src/devices.js"(exports, module) {
      var { traceImpact } = require_propagation();
      var playerSounds = /* @__PURE__ */ new Set([
        "probe",
        "footstep",
        "lure",
        "landing",
        "pickup",
        "reflection",
        "noisyFloor",
        "sniper",
        "shotgun",
        "dagger"
      ]);
      var probeSounds = /* @__PURE__ */ new Set(["probe"]);
      function traceLaser(map2, x, y, dx, dy, maxDistance = 160, maxSegments = Infinity) {
        const magnitude = Math.hypot(dx, dy) || 1;
        let vx = dx / magnitude;
        let vy = dy / magnitude;
        let length = 0;
        const segments = [];
        const visited = /* @__PURE__ */ new Set();
        while (length < maxDistance && segments.length < maxSegments) {
          const state2 = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(vx * 1e3)},${Math.round(vy * 1e3)}`;
          if (visited.has(state2)) break;
          visited.add(state2);
          const hit = traceImpact(map2, x, y, vx, vy, maxDistance - length);
          if (hit.distance < 0.02) break;
          segments.push({
            fromX: x,
            fromY: y,
            toX: hit.x,
            toY: hit.y,
            normalX: hit.normalX,
            normalY: hit.normalY,
            hit: hit.hit
          });
          length += hit.distance;
          x = hit.x;
          y = hit.y;
          if (!hit.hit) break;
          if (hit.normalX) vx = -vx;
          if (hit.normalY) vy = -vy;
        }
        return { length, segments };
      }
      function createDevices(level) {
        return {
          baseLevel: level,
          noisyFloors: level.noisyFloors || [],
          silentFloors: level.silentFloors || [],
          beacons: (level.beacons || []).map((item) => ({
            ...item,
            nextAt: item.phase ?? item.period ?? 4
          })),
          decoys: (level.decoys || []).map((item) => ({ ...item, readyAt: 0, fireAt: Infinity })),
          relays: (level.relays || []).map((item) => ({
            ...item,
            readyAt: 0,
            fireAt: Infinity,
            incomingCue: null
          })),
          gates: (level.gates || []).map((item) => ({
            ...item,
            phase: "open",
            changeAt: Infinity,
            readyAt: 0
          })),
          fragileFloors: (level.fragileFloors || []).map((item) => ({
            ...item,
            phase: "solid",
            changeAt: Infinity,
            readyAt: 0
          })),
          lasers: (level.lasers || []).map((item) => ({ ...item, readyAt: 0 })),
          sequence: {
            nodes: level.sequenceNodes || [],
            progress: 0,
            nextWaveId: 0,
            lastWrongWaveId: -1,
            complete: !(level.sequenceNodes || []).length
          },
          laserBeams: [],
          wallGlows: []
        };
      }
      function onSilentFloor(world, actor = world.player) {
        return (world.silentFloors || []).some((item) => Math.floor(item.x) === Math.floor(actor.x) && Math.floor(item.y) === Math.floor(actor.y));
      }
      function onPlayerMove(world, emitSound, actor = world.player) {
        const key = `${Math.floor(actor.x)},${Math.floor(actor.y)}`;
        if (actor.noisyFloorCell === key) return;
        actor.noisyFloorCell = key;
        const floor = world.noisyFloors.find((item) => Math.floor(item.x) === Math.floor(actor.x) && Math.floor(item.y) === Math.floor(actor.y));
        if (floor) emitSound(world, actor.x, actor.y, "noisyFloor", 12, 1, null, actor.id);
      }
      function arrivedWave(world, item, accepted = playerSounds) {
        return world.waves.find((wave) => {
          if (!accepted.has(wave.type)) return false;
          const distance = wave.field.at(item.x, item.y);
          return Number.isFinite(distance) && world.time - wave.start >= distance / wave.speed;
        });
      }
      function rebuildTerrain(world) {
        const walls = new Set(world.baseLevel.walls);
        const pits = new Set(world.baseLevel.pits || []);
        if (world.unlocked) {
          for (const key of world.baseLevel.mechanismWalls || []) walls.delete(key);
        }
        for (const gate of world.gates) {
          if (gate.phase === "closed") walls.add(`${Math.floor(gate.x)},${Math.floor(gate.y)}`);
        }
        for (const floor of world.fragileFloors) {
          if (floor.phase === "collapsed") pits.add(`${Math.floor(floor.x)},${Math.floor(floor.y)}`);
        }
        world.level = { ...world.baseLevel, walls, pits };
      }
      function wallGlow(map2, segment, until) {
        if (!segment.hit) return null;
        const x = segment.toX;
        const y = segment.toY;
        if (segment.normalX) {
          const wallX2 = Math.floor(x - segment.normalX * 0.02);
          const wallY2 = Math.floor(y);
          if (!map2.walls.has(`${wallX2},${wallY2}`)) return null;
          return { x1: Math.round(x), y1: wallY2, x2: Math.round(x), y2: wallY2 + 1, until };
        }
        const wallX = Math.floor(x);
        const wallY = Math.floor(y - segment.normalY * 0.02);
        if (!map2.walls.has(`${wallX},${wallY}`)) return null;
        return { x1: wallX, y1: Math.round(y), x2: wallX + 1, y2: Math.round(y), until };
      }
      function updateDevices(world, emitSound) {
        let terrainChanged = false;
        const afterTerrain = [];
        for (const beacon of world.beacons) {
          if (world.time < beacon.nextAt) continue;
          emitSound(world, beacon.x, beacon.y, "beacon", beacon.radius || 3.5, 0.48);
          beacon.nextAt = world.time + (beacon.period || 4);
        }
        for (const decoy of world.decoys) {
          if (world.time >= decoy.fireAt) {
            decoy.fireAt = Infinity;
            emitSound(world, decoy.x, decoy.y, "decoy", 12);
          }
          if (world.time < decoy.readyAt || decoy.fireAt !== Infinity) continue;
          if (arrivedWave(world, decoy)) {
            decoy.fireAt = world.time + 0.2;
            decoy.readyAt = world.time + 10;
          }
        }
        for (const relay of world.relays) {
          if (world.time >= relay.fireAt) {
            relay.fireAt = Infinity;
            const wave = emitSound(world, relay.toX, relay.toY, "relay", relay.radius || 7);
            wave.audioCue = relay.incomingCue;
          }
          if (world.time < relay.readyAt || relay.fireAt !== Infinity || relay.requiresSequence && !world.sequence.complete) continue;
          const incoming = arrivedWave(world, relay, relay.probeOnly ? probeSounds : playerSounds);
          if (incoming) {
            relay.incomingCue = incoming.type === "footstep" ? "step" : incoming.type;
            const response = emitSound(world, relay.x, relay.y, "relay", 3, 0.75);
            response.audioCue = relay.incomingCue;
            response.mechanismChecked = true;
            relay.fireAt = world.time + 0.25;
            relay.readyAt = world.time + 6;
          }
        }
        const sequence = world.sequence;
        if (!sequence.complete && sequence.nodes.length === 2) {
          const arrivedProbe = (target2, minId = sequence.nextWaveId) => world.waves.find((candidate) => {
            if (candidate.type !== "probe" || candidate.id < minId) return false;
            const distance = candidate.field.at(target2.x, target2.y);
            return Number.isFinite(distance) && world.time - candidate.start >= distance / candidate.speed;
          });
          const target = sequence.nodes[sequence.progress];
          const wave = arrivedProbe(target);
          if (wave && sequence.progress === 0) {
            sequence.progress = 1;
            sequence.nextWaveId = world.nextWave;
            emitSound(world, target.x, target.y, "sequenceCue", 4);
          } else if (wave) {
            sequence.progress = 2;
            sequence.complete = true;
            emitSound(world, target.x, target.y, "sequenceDone", 4);
          } else if (sequence.progress === 0) {
            const wrongNode = sequence.nodes[1];
            const wrongWave = arrivedProbe(
              wrongNode,
              Math.max(sequence.nextWaveId, sequence.lastWrongWaveId + 1)
            );
            if (wrongWave) {
              sequence.lastWrongWaveId = wrongWave.id;
              emitSound(world, wrongNode.x, wrongNode.y, "sequenceReset", 2.2);
            }
          }
        }
        for (const gate of world.gates) {
          if (world.time >= gate.changeAt && gate.phase === "warning") {
            const occupied = [...world.actors.filter((actor) => actor.alive !== false && !actor.escaped), ...world.enemies].some((actor) => Math.floor(actor.x) === Math.floor(gate.x) && Math.floor(actor.y) === Math.floor(gate.y));
            if (occupied) gate.changeAt = world.time + 0.1;
            else {
              gate.phase = "closed";
              gate.changeAt = world.time + 3;
              emitSound(world, gate.x, gate.y, "gateClose", 2.5);
              terrainChanged = true;
            }
          } else if (world.time >= gate.changeAt && gate.phase === "closed") {
            gate.phase = "open";
            gate.changeAt = Infinity;
            gate.readyAt = world.time + 1;
            afterTerrain.push([gate.x, gate.y, "gateOpen", 2.5]);
            terrainChanged = true;
          }
          if (gate.phase === "open" && world.time >= gate.readyAt && arrivedWave(world, gate)) {
            gate.phase = "warning";
            gate.changeAt = world.time + 0.6;
            emitSound(world, gate.x, gate.y, "gateWarning", 3);
          }
        }
        for (const floor of world.fragileFloors) {
          if (world.time >= floor.changeAt && floor.phase === "warning") {
            floor.phase = "collapsed";
            floor.changeAt = world.time + 2;
            emitSound(world, floor.x, floor.y, "fragileFall", 3);
            terrainChanged = true;
          } else if (world.time >= floor.changeAt && floor.phase === "collapsed") {
            floor.phase = "solid";
            floor.changeAt = Infinity;
            floor.readyAt = world.time + 1;
            afterTerrain.push([floor.x, floor.y, "fragileReset", 2]);
            terrainChanged = true;
          }
          if (floor.phase === "solid" && world.time >= floor.readyAt && world.actors.some((actor) => actor.alive !== false && !actor.escaped && Math.floor(actor.x) === Math.floor(floor.x) && Math.floor(actor.y) === Math.floor(floor.y))) {
            floor.phase = "warning";
            floor.changeAt = world.time + 0.9;
            emitSound(world, floor.x, floor.y, "fragileWarning", 3);
          }
        }
        if (terrainChanged) rebuildTerrain(world);
        for (const sound of afterTerrain) emitSound(world, ...sound);
        for (const laser of world.lasers) {
          if (world.time < laser.readyAt) continue;
          const wave = arrivedWave(world, laser);
          if (!wave) continue;
          const source = wave.ownerId == null ? wave : world.actors.find((actor) => actor.id === wave.ownerId) || wave;
          const dx = laser.x - source.x;
          const dy = laser.y - source.y;
          const path = traceLaser(world.level, laser.x, laser.y, dx, dy);
          world.laserBeams.push({ ...path, until: world.time + 0.4 });
          for (const segment of path.segments) {
            const glow = wallGlow(world.level, segment, world.time + 2.5);
            if (glow) world.wallGlows.push(glow);
          }
          emitSound(world, laser.x, laser.y, "laser", 3);
          laser.readyAt = world.time + 4;
        }
        world.laserBeams = world.laserBeams.filter((beam) => beam.until > world.time);
        world.wallGlows = world.wallGlows.filter((glow) => glow.until > world.time);
      }
      module.exports = {
        traceLaser,
        wallGlow,
        createDevices,
        onSilentFloor,
        onPlayerMove,
        rebuildTerrain,
        updateDevices
      };
    }
  });

  // src/acoustic-signatures.js
  var require_acoustic_signatures = __commonJS({
    "src/acoustic-signatures.js"(exports, module) {
      var presence = {
        minePresence: { period: 3.4, radius: 2.2, intensity: 0.24, phase: 0.6 },
        alarmPresence: { period: 4.1, radius: 2.3, intensity: 0.25, phase: 0.85 },
        decoyPresence: { period: 0.42, radius: 1.2, intensity: 0.22, phase: 0.35 },
        relayPresence: { period: 4, radius: 2.3, intensity: 0.22, phase: 1.76 }
      };
      var waveStyles = {
        exitLockedPresence: { rgb: "230,188,96", shape: "double" },
        exitOpenPresence: { rgb: "167,240,202", shape: "double" },
        lockPresence: { rgb: "230,188,96", shape: "double" },
        minePresence: { rgb: "226,75,77", shape: "broken" },
        mineWarning: { rgb: "242,90,80", shape: "rough" },
        mineBlast: { rgb: "242,70,65", shape: "rough" },
        alarmPresence: { rgb: "230,103,96", shape: "rough" },
        alarm: { rgb: "244,114,91", shape: "rough" },
        noisyPresence: { rgb: "220,102,103", shape: "broken" },
        noisyFloor: { rgb: "220,102,103", shape: "rough" },
        silentPresence: { rgb: "123,205,170", shape: "broken" },
        fragilePresence: { rgb: "216,113,100", shape: "rough" },
        fragileWarning: { rgb: "232,118,91", shape: "rough" },
        fragileFall: { rgb: "232,83,79", shape: "rough" },
        gatePresence: { rgb: "217,97,97", shape: "double" },
        gateWarning: { rgb: "236,102,94", shape: "double" },
        gateClose: { rgb: "232,86,85", shape: "double" },
        gateOpen: { rgb: "232,86,85", shape: "double" },
        decoyPresence: { rgb: "143,230,223", shape: "smooth" },
        decoy: { rgb: "143,230,223", shape: "double" },
        laserPresence: { rgb: "112,215,222", shape: "rough" },
        laser: { rgb: "112,215,222", shape: "rough" },
        relayPresence: { rgb: "143,230,223", shape: "double" },
        relay: { rgb: "143,230,223", shape: "double" },
        sequenceFirstPresence: { rgb: "230,188,96", shape: "smooth" },
        sequenceSecondPresence: { rgb: "230,188,96", shape: "double" },
        sequenceCue: { rgb: "230,188,96", shape: "double" },
        sequenceDone: { rgb: "167,240,202", shape: "double" },
        spike: { rgb: "240,110,79", shape: "rough" },
        bow: { rgb: "226,75,77", shape: "broken" },
        arrow: { rgb: "226,75,77", shape: "broken" },
        pit: { rgb: "226,75,77", shape: "smooth" },
        bat: { rgb: "240,105,145", shape: "rough" },
        sentinel: { rgb: "237,106,155", shape: "double" },
        beacon: { rgb: "143,230,223", shape: "smooth" }
      };
      function isPresence(type) {
        return Object.prototype.hasOwnProperty.call(presence, type);
      }
      function createAmbientSources(world) {
        const sources = [];
        const add = (type, item, offset = 0) => {
          const config = presence[type];
          sources.push({
            type,
            x: item.x,
            y: item.y,
            radius: config.radius,
            intensity: config.intensity,
            period: config.period,
            nextAt: config.phase + offset,
            seed: (Math.imul(Math.floor(item.x) + 1, 73856093) ^ Math.imul(Math.floor(item.y) + 1, 19349663)) >>> 0
          });
        };
        const addAll = (type, items) => {
          (items || []).forEach((item, index) => add(type, item, index * 0.19));
        };
        addAll("minePresence", world.mines);
        addAll("alarmPresence", world.alarms);
        addAll("decoyPresence", world.decoys);
        addAll("relayPresence", world.relays);
        return sources;
      }
      function updateAmbient(world, emitSound) {
        for (const source of world.ambientSources) {
          if (world.time < source.nextAt) continue;
          source.nextAt += source.period * (Math.floor((world.time - source.nextAt) / source.period) + 1);
          if (!(world.actors || [world.player]).some((actor) => actor.alive !== false && !actor.escaped && Math.hypot(source.x - actor.x, source.y - actor.y) <= 16)) continue;
          if (source.type === "minePresence" && world.mines.some((mine) => mine.x === source.x && mine.y === source.y && mine.armedUntil !== Infinity)) continue;
          if (source.type === "decoyPresence") {
            source.seed = Math.imul(source.seed, 1664525) + 1013904223 >>> 0;
            const angle = source.seed / 4294967296 * Math.PI * 2;
            source.seed = Math.imul(source.seed, 1664525) + 1013904223 >>> 0;
            const offset = Math.sqrt(source.seed / 4294967296) * 0.35;
            const wave = emitSound(
              world,
              source.x + Math.cos(angle) * offset,
              source.y + Math.sin(angle) * offset,
              source.type,
              source.radius,
              source.intensity
            );
            wave.speed = 3;
            wave.audioSilent = true;
          } else {
            emitSound(world, source.x, source.y, source.type, source.radius, source.intensity);
          }
        }
      }
      module.exports = { isPresence, waveStyles, createAmbientSources, updateAmbient };
    }
  });

  // src/enemy-state.js
  var require_enemy_state = __commonJS({
    "src/enemy-state.js"(exports, module) {
      var clamp = (value) => Math.max(0, Math.min(1, value));
      function enemyAlerted(enemy) {
        return enemy.mode === "chase" || enemy.mode === "search";
      }
      function enemyAlertAmount(enemy, time) {
        const state2 = enemy.alertTransition;
        if (!state2) return enemyAlerted(enemy) ? 1 : 0;
        const u = clamp((time - state2.at) / (state2.to ? 0.32 : 1.8));
        const progress = state2.to ? 1 - (1 - u) ** 3 : u * u * (3 - 2 * u);
        return state2.from + (state2.to - state2.from) * progress;
      }
      function syncEnemyAlert(enemy, time) {
        const to = enemyAlerted(enemy) ? 1 : 0;
        if (!enemy.alertTransition) enemy.alertTransition = { from: to, to, at: time };
        else if (enemy.alertTransition.to !== to) {
          enemy.alertTransition = { from: enemyAlertAmount(enemy, time), to, at: time };
        }
      }
      module.exports = { enemyAlerted, enemyAlertAmount, syncEnemyAlert };
    }
  });

  // src/mimic-audio-manifest.js
  var require_mimic_audio_manifest = __commonJS({
    "src/mimic-audio-manifest.js"(exports, module) {
      module.exports = { clips: [
        { id: "mimic-step-1-low", duration: 0.557375 },
        { id: "mimic-step-1-mid", duration: 0.5548125 },
        { id: "mimic-step-1-high", duration: 0.55225 },
        { id: "mimic-step-2-low", duration: 0.557375 },
        { id: "mimic-step-2-mid", duration: 0.5548125 },
        { id: "mimic-step-2-high", duration: 0.55225 },
        { id: "mimic-step-3-low", duration: 0.557375 },
        { id: "mimic-step-3-mid", duration: 0.5548125 },
        { id: "mimic-step-3-high", duration: 0.55225 },
        { id: "mimic-step-4-low", duration: 0.557375 },
        { id: "mimic-step-4-mid", duration: 0.5548125 },
        { id: "mimic-step-4-high", duration: 0.55225 }
      ] };
    }
  });

  // src/enemies/mimic.js
  var require_mimic = __commonJS({
    "src/enemies/mimic.js"(exports, module) {
      var { clips } = require_mimic_audio_manifest();
      var loudStep = (wave) => wave.type === "footstep" && wave.radius > 1;
      var playerSound = (wave) => loudStep(wave) || wave.type === "probe";
      var newer = (wave, last) => !last || wave.start > last.start || wave.start === last.start && wave.id > last.id;
      function mimicState(id, now, stoppedAt = -Infinity) {
        return {
          id,
          enteredAt: now,
          triggerKind: null,
          lastHeard: null,
          fixedTarget: null,
          locked: false,
          mimicEndsAt: 0,
          quietUntil: 0,
          stoppedAt,
          alertUntil: 0,
          stride: 1,
          voiceIndex: 0,
          consumed: /* @__PURE__ */ new Set(),
          cue: null,
          stepCues: []
        };
      }
      function createMimic(x, y, id, now = 0) {
        return {
          type: "mimic",
          x,
          y,
          home: [x, y],
          mode: "idle",
          target: null,
          mimic: mimicState(id, now)
        };
      }
      function resetMimic(enemy, now) {
        enemy.mode = "idle";
        enemy.target = null;
        enemy.mimic = mimicState(enemy.mimic.id, now, now);
      }
      function remember(enemy, wave) {
        enemy.mimic.lastHeard = {
          id: wave.id,
          start: wave.start,
          x: wave.x,
          y: wave.y,
          kind: wave.type === "landing" ? "stone" : wave.type
        };
        enemy.target = [wave.x, wave.y];
      }
      function advanceMimicTimers(enemy, now) {
        const m = enemy.mimic;
        if (enemy.mode === "alert" && now >= m.alertUntil) {
          enemy.mode = "idle";
          m.enteredAt = m.alertUntil;
        }
        if (enemy.mode === "mimic" && now >= m.mimicEndsAt) {
          enemy.mode = "quiet";
          m.enteredAt = m.mimicEndsAt;
        }
        if (enemy.mode === "quiet" && now >= m.quietUntil) {
          enemy.mode = "slow";
          m.enteredAt = m.quietUntil;
          m.cue = null;
        }
      }
      function effect(enemy, kind, at) {
        const m = enemy.mimic;
        const clip = clips[m.voiceIndex++ % clips.length];
        return { enemyId: m.id, kind, x: enemy.x, y: enemy.y, at, clipId: clip.id };
      }
      function hearMimic(enemy, wave, heardAt) {
        advanceMimicTimers(enemy, heardAt);
        const m = enemy.mimic;
        if (!playerSound(wave) && wave.type !== "landing" || m.consumed.has(wave.id) || wave.start <= m.stoppedAt || !newer(wave, m.lastHeard)) return [];
        m.consumed.add(wave.id);
        const stationary = enemy.mode === "idle" || enemy.mode === "alert";
        if (!stationary) {
          if (m.triggerKind !== "footstep" || !playerSound(wave)) return [];
          remember(enemy, wave);
          if (loudStep(wave) && ["mimic", "quiet", "slow"].includes(enemy.mode)) {
            enemy.mode = "fast";
            m.enteredAt = heardAt;
            m.cue = null;
          }
          return [];
        }
        m.triggerKind = wave.type === "landing" ? "stone" : "footstep";
        remember(enemy, wave);
        m.fixedTarget = m.triggerKind === "stone" ? [wave.x, wave.y] : null;
        m.stride = 1;
        m.locked = false;
        m.enteredAt = heardAt;
        if (enemy.mode === "alert") {
          enemy.mode = "fast";
          m.cue = null;
          return [];
        }
        enemy.mode = "mimic";
        const sound = effect(enemy, "mimic", heardAt);
        const clip = clips[(m.voiceIndex - 1) % clips.length];
        m.mimicEndsAt = heardAt + clip.duration;
        m.quietUntil = m.mimicEndsAt + 1.3;
        m.cue = { x: enemy.x, y: enemy.y, at: heardAt, radius: 8, speed: 6 };
        return [sound];
      }
      function stopMimic(enemy, now) {
        const m = enemy.mimic;
        enemy.mode = "alert";
        enemy.target = null;
        m.cue = null;
        m.locked = false;
        m.enteredAt = now;
        m.stoppedAt = now;
        m.alertUntil = now + 10;
      }
      function updateMimic(enemy, { now, dt, player, maxSpeed, move, resolveStoneTarget }) {
        advanceMimicTimers(enemy, now);
        const m = enemy.mimic;
        m.stepCues = m.stepCues.filter((cue) => now - cue.at < cue.radius / cue.speed);
        if (enemy.mode !== "slow" && enemy.mode !== "fast") return [];
        m.locked = enemy.mode === "fast" && m.triggerKind === "footstep" && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 2;
        const stoneTarget = m.triggerKind === "stone" ? [...m.fixedTarget] : null;
        enemy.target = stoneTarget ? resolveStoneTarget?.(enemy, stoneTarget) ?? stoneTarget : m.locked ? [player.x, player.y] : [m.lastHeard.x, m.lastHeard.y];
        const arrived = () => !m.locked && Math.hypot(enemy.x - enemy.target[0], enemy.y - enemy.target[1]) < 0.06;
        if (arrived()) {
          stopMimic(enemy, now);
          return [];
        }
        const movingDt = Math.max(0, now - Math.max(now - dt, m.enteredAt));
        const oldX = enemy.x, oldY = enemy.y;
        move(enemy, enemy.target, movingDt, maxSpeed * (enemy.mode === "fast" ? 1.1 : 0.9));
        const traveled = Math.hypot(enemy.x - oldX, enemy.y - oldY);
        const effects = [];
        if (traveled > 0) {
          const strideLength = enemy.mode === "fast" && m.triggerKind === "footstep" ? 0.5 : 1;
          m.stride = Math.min(m.stride, strideLength) + traveled;
          while (m.stride >= strideLength) {
            effects.push(effect(enemy, "step", now));
            m.stepCues.push({ x: enemy.x, y: enemy.y, at: now, radius: 4, speed: 6 });
            m.stride -= strideLength;
          }
        }
        if (arrived()) stopMimic(enemy, now);
        return effects;
      }
      module.exports = {
        createMimic,
        resetMimic,
        hearMimic,
        advanceMimicTimers,
        updateMimic
      };
    }
  });

  // src/world.js
  var require_world = __commonJS({
    "src/world.js"(exports, module) {
      var { blocked, propagate, directionalField, traceRicochet, getGeometry } = require_propagation();
      var { createHazards, checkGroundHazards, updateHazards } = require_hazards();
      var { createDevices, onPlayerMove, rebuildTerrain, updateDevices } = require_devices();
      var { isPresence, createAmbientSources, updateAmbient } = require_acoustic_signatures();
      var { enemyAlerted, syncEnemyAlert } = require_enemy_state();
      var {
        createMimic,
        resetMimic,
        hearMimic,
        advanceMimicTimers,
        updateMimic
      } = require_mimic();
      var PLAYER_MAX_SPEED = 4.1;
      var ACTOR_RADIUS = 0.19;
      var ENEMY_ALERT_SPEED = PLAYER_MAX_SPEED * 0.9;
      var ENEMY_SEARCH_SPEED = ENEMY_ALERT_SPEED / 2;
      var ENEMY_TRACK_RANGE = 3;
      var DISTRACTION_SOUNDS = /* @__PURE__ */ new Set(["lure", "landing", "decoy"]);
      var STONE_PICKUP_DISTANCE = 0.45;
      var LURE_TRAIL_HOLD = 0.45;
      var SEARCH_DURATION = 8;
      var FOOTPRINT_LIFETIME = 15;
      var SEARCH_DIRECTIONS = [
        [1, 0],
        [Math.SQRT1_2, Math.SQRT1_2],
        [0, 1],
        [-Math.SQRT1_2, Math.SQRT1_2],
        [-1, 0],
        [-Math.SQRT1_2, -Math.SQRT1_2],
        [0, -1],
        [Math.SQRT1_2, -Math.SQRT1_2]
      ];
      var SEARCH_OFFSETS = [1.4, 2.8].flatMap((radius) => SEARCH_DIRECTIONS.map(([dx, dy]) => [dx * radius, dy * radius]));
      var routeFields = /* @__PURE__ */ new WeakMap();
      function createWorld(level, options = {}) {
        if (options.actors && level.mimics?.length) throw new Error("mimic placement requires solo world");
        const enemyState = (x, y, index, extra = {}) => ({
          x,
          y,
          home: [x, y],
          mode: "idle",
          target: null,
          searchUntil: 0,
          searchCenter: null,
          searchTarget: null,
          searchSeed: Math.imul(index + 1, 2654435761) >>> 0,
          targetField: null,
          alertTransition: { from: 0, to: 0, at: 0 },
          ...extra
        });
        const guards = (level.enemies || []).map(([x, y], index) => enemyState(x, y, index));
        const patrols = (level.patrols || []).map((patrol, index) => enemyState(
          ...patrol.path[0],
          guards.length + index,
          { type: "patrol", mode: "patrol", path: patrol.path, patrolIndex: 1 % patrol.path.length }
        ));
        const bats = (level.bats || []).map((bat, index) => enemyState(
          bat.x,
          bat.y,
          guards.length + patrols.length + index,
          {
            type: "bat",
            scanAt: bat.phase ?? bat.period,
            period: bat.period,
            range: bat.range || 9,
            angles: bat.angles,
            scanIndex: 0
          }
        ));
        const wanderers = (level.wanderers || []).map(([x, y], index) => enemyState(
          x,
          y,
          guards.length + patrols.length + bats.length + index,
          { type: "wanderer", mode: "wander", wanderTarget: null, wanderPrevious: null }
        ));
        const sentinels = (level.sentinels || []).map((sentinel, index) => enemyState(
          sentinel.x,
          sentinel.y,
          guards.length + patrols.length + bats.length + wanderers.length + index,
          {
            type: "sentinel",
            scanAt: sentinel.phase ?? sentinel.period,
            period: sentinel.period,
            range: sentinel.range || 6,
            warned: false
          }
        ));
        const mimics = (level.mimics || []).map(([x, y], index) => createMimic(x, y, `mimic:${index}`));
        const world = {
          level,
          time: 0,
          player: { x: level.start[0], y: level.start[1] },
          enemies: [...guards, ...patrols, ...bats, ...wanderers, ...sentinels, ...mimics],
          waves: [],
          lures: [],
          stones: [],
          stonesHeld: 1,
          nextWave: 0,
          mimicAudioEvents: [],
          nextMimicEvent: 0,
          footprints: [],
          nextFootprintSide: -1,
          mechanismActive: !level.mechanism,
          unlocked: !level.mechanism && !(level.sequenceNodes || []).length,
          ...createHazards(level),
          ...createDevices(level),
          invincible: !!level.debugGallery,
          failed: false,
          complete: false
        };
        world.shared = !!options.actors;
        if (world.shared) world.actors = options.actors;
        else {
          let player = world.player;
          Object.defineProperty(world, "player", {
            enumerable: true,
            get: () => player,
            set: (actor) => {
              actor.stonesHeld ??= player.stonesHeld;
              player = actor;
            }
          });
          Object.defineProperty(world, "actors", {
            enumerable: true,
            get: () => [world.player]
          });
        }
        if (world.shared && world.actors.length) world.player = world.actors[0];
        for (const actor of world.actors) actor.stonesHeld ??= 1;
        Object.defineProperty(world, "stonesHeld", {
          enumerable: true,
          get: () => world.player.stonesHeld,
          set: (value) => {
            world.player.stonesHeld = value;
          }
        });
        world.killActor = (actor, cause, metadata = {}) => {
          if (actor.alive === false || actor.escaped || !world.shared && world.time < (world.protectedUntil || 0)) return false;
          actor.deathEvent = Object.freeze({
            cause,
            enemyType: cause === "enemy" ? metadata.enemyType ?? null : null,
            enemyId: cause === "enemy" ? metadata.enemyId ?? null : null,
            at: world.time
          });
          actor.alive = false;
          if (options.onActorKilled) options.onActorKilled(actor, cause, actor.deathEvent);
          else if (!world.shared) world.failed = true;
          return true;
        };
        world.ambientSources = createAmbientSources(world);
        return world;
      }
      function emitSound(world, x, y, type, radius, intensity = 1, fieldOverride = null, ownerId) {
        const tone = type === "bat" || type === "footstep" && radius < 8 ? "high" : "low";
        let field = fieldOverride || propagate(world.level, x, y, tone, type === "enemy" ? Math.max(16, radius) : radius, radius);
        if (type === "enemy" && !fieldOverride) {
          const acoustic = field;
          field = {
            at(px, py) {
              const distance = acoustic.at(px, py);
              return Number.isFinite(distance) ? distance : Math.max(16, Math.hypot(px - x, py - y));
            },
            get visual() {
              return acoustic.visual;
            }
          };
        }
        const wave = {
          id: world.nextWave++,
          x,
          y,
          type,
          tone,
          radius,
          intensity,
          ownerId,
          start: world.time,
          speed: tone === "high" ? 8 : 6,
          field,
          heard: /* @__PURE__ */ new Set(),
          mechanismChecked: false,
          passive: isPresence(type)
        };
        world.waves.push(wave);
        return wave;
      }
      function queueMimicEffects(world, effects) {
        for (const effect of effects) {
          world.mimicAudioEvents.push({ ...effect, id: world.nextMimicEvent++ });
        }
      }
      function takeMimicAudioEvents(world) {
        return world.mimicAudioEvents.splice(0);
      }
      function emitLure(world, dx, dy, actor = world.player) {
        if (actor.alive === false || actor.escaped || actor.stonesHeld <= 0) return null;
        const path = traceRicochet(world.level, actor.x, actor.y, dx, dy);
        actor.stonesHeld -= 1;
        world.lures.push({
          ...path,
          ownerId: actor.id,
          toX: path.x,
          toY: path.y,
          start: world.time,
          arrived: false,
          impactIndex: 0,
          trailUntil: world.time + path.duration + LURE_TRAIL_HOLD
        });
        return path;
      }
      function canStand(level, x, y) {
        const r = ACTOR_RADIUS;
        return !blocked(level, Math.floor(x - r), Math.floor(y - r)) && !blocked(level, Math.floor(x + r), Math.floor(y - r)) && !blocked(level, Math.floor(x - r), Math.floor(y + r)) && !blocked(level, Math.floor(x + r), Math.floor(y + r));
      }
      function reviveWorld(world) {
        if (!world.failed || world.complete || world.invincible) return false;
        const level = world.level;
        const origin = world.baseLevel?.start || level.start;
        const queue = [[Math.floor(origin[0]), Math.floor(origin[1])]];
        const seen = /* @__PURE__ */ new Set();
        let best = null, bestScore = Infinity;
        for (let index = 0; index < queue.length; index++) {
          const [x, y] = queue[index], key = `${x},${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (blocked(level, x, y) || level.pits?.has(key)) continue;
          const px = x + 0.5, py = y + 0.5;
          const dangerous = (world.enemies || []).some((enemy) => Math.hypot(enemy.x - px, enemy.y - py) < 2) || [...world.spikes || [], ...world.mines || [], ...world.arrows || []].some((hazard) => Math.hypot(hazard.x - px, hazard.y - py) < 1.6) || Math.hypot(px - level.exit[0], py - level.exit[1]) < 1;
          const score = Math.hypot(px - world.player.x, py - world.player.y) + (dangerous ? level.width * level.height : 0);
          if (canStand(level, px, py) && score < bestScore) {
            best = { x: px, y: py };
            bestScore = score;
          }
          for (const [dx, dy] of SEARCH_DIRECTIONS.filter(([dx2, dy2]) => dx2 === 0 || dy2 === 0)) queue.push([x + dx, y + dy]);
        }
        if (!best) return false;
        Object.assign(world.player, best);
        world.failed = false;
        world.player.alive = true;
        delete world.player.deathEvent;
        world.protectedUntil = world.time + 3;
        world.mimicAudioEvents.length = 0;
        for (const enemy of world.enemies) {
          if (enemy.type === "mimic") resetMimic(enemy, world.time);
        }
        emitSound(world, best.x, best.y, "probe", 2.5, 0.35);
        return true;
      }
      function movePlayer(world, dx, dy) {
        return moveActor(world, world.player, dx, dy);
      }
      function activeActors(world) {
        return world.actors.filter((actor) => actor.alive !== false && !actor.escaped);
      }
      function movePosition(level, position, dx, dy) {
        if (canStand(level, position.x + dx, position.y)) position.x += dx;
        if (canStand(level, position.x, position.y + dy)) position.y += dy;
      }
      function moveActor(world, player, dx, dy) {
        if (player.alive === false || player.escaped) return;
        movePosition(world.level, player, dx, dy);
        world.stones = world.stones.filter((stone) => {
          if (Math.hypot(player.x - stone.x, player.y - stone.y) > STONE_PICKUP_DISTANCE) return true;
          player.stonesHeld += 1;
          emitSound(world, player.x, player.y, "pickup", 2.5, 1, null, player.id);
          return false;
        });
        onPlayerMove(world, emitSound, player);
        checkGroundHazards(world);
      }
      function routeStep(level, fromX, fromY, targetX, targetY) {
        const tx = Math.floor(targetX);
        const ty = Math.floor(targetY);
        const sx = Math.floor(fromX);
        const sy = Math.floor(fromY);
        if (blocked(level, tx, ty) || level.pits?.has(`${tx},${ty}`)) return null;
        let fields = routeFields.get(level);
        if (!fields) {
          fields = /* @__PURE__ */ new Map();
          routeFields.set(level, fields);
        }
        const goal = `${tx},${ty}`;
        let parents = fields.get(goal);
        if (!parents) {
          const queue = [[tx, ty]];
          parents = /* @__PURE__ */ new Map([[goal, null]]);
          for (let i = 0; i < queue.length; i += 1) {
            const [x, y] = queue[i];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx;
              const ny = y + dy;
              const key = `${nx},${ny}`;
              if (blocked(level, nx, ny) || level.pits?.has(key) || parents.has(key)) continue;
              parents.set(key, [x, y]);
              queue.push([nx, ny]);
            }
          }
          if (fields.size >= 32) fields.delete(fields.keys().next().value);
          fields.set(goal, parents);
        }
        if (sx === tx && sy === ty) return [tx, ty];
        return parents.get(`${sx},${sy}`) || null;
      }
      function stoneMovementTarget(world, enemy, target) {
        if (canStand(world.level, ...target)) return target;
        const inset = ACTOR_RADIUS + 1e-6;
        const endpoint = target.map((value) => {
          const cell = Math.floor(value);
          return Math.max(cell + inset, Math.min(cell + 1 - inset, value));
        });
        return canStand(world.level, ...endpoint) && routeStep(world.level, enemy.x, enemy.y, ...endpoint) ? endpoint : target;
      }
      function clearEnemyPath(level, enemy, target) {
        const dx = target[0] - enemy.x, dy = target[1] - enemy.y;
        const left = Math.floor(Math.min(enemy.x, target[0]) - ACTOR_RADIUS);
        const right = Math.floor(Math.max(enemy.x, target[0]) + ACTOR_RADIUS);
        const top = Math.floor(Math.min(enemy.y, target[1]) - ACTOR_RADIUS);
        const bottom = Math.floor(Math.max(enemy.y, target[1]) + ACTOR_RADIUS);
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
          if (!blocked(level, x, y) && !level.pits?.has(`${x},${y}`)) continue;
          let enter = 0, leave = 1;
          for (const [origin, delta, low, high] of [
            [enemy.x, dx, x - ACTOR_RADIUS, x + 1 + ACTOR_RADIUS],
            [enemy.y, dy, y - ACTOR_RADIUS, y + 1 + ACTOR_RADIUS]
          ]) {
            if (delta === 0) {
              if (origin < low || origin > high) {
                enter = Infinity;
                break;
              }
            } else {
              const a = (low - origin) / delta, b = (high - origin) / delta;
              enter = Math.max(enter, Math.min(a, b));
              leave = Math.min(leave, Math.max(a, b));
            }
          }
          if (enter <= leave) return false;
        }
        return true;
      }
      function moveEnemyToward(world, enemy, target, dt, speed, direct = false) {
        let waypointX = target[0], waypointY = target[1];
        if (!direct || !clearEnemyPath(world.level, enemy, target)) {
          const step = routeStep(world.level, enemy.x, enemy.y, ...target);
          if (!step) return;
          const [cellX, cellY] = step;
          if (cellX !== Math.floor(enemy.x) || cellY !== Math.floor(enemy.y)) {
            waypointX = cellX + 0.5;
            waypointY = cellY + 0.5;
          }
        }
        const dx = waypointX - enemy.x;
        const dy = waypointY - enemy.y;
        const distance = Math.hypot(dx, dy);
        const amount = Math.min(distance, dt * speed);
        if (distance > 0) {
          const nextX = enemy.x + dx / distance * amount;
          const nextY = enemy.y + dy / distance * amount;
          if (canStand(world.level, nextX, enemy.y)) enemy.x = nextX;
          if (canStand(world.level, enemy.x, nextY)) enemy.y = nextY;
        }
      }
      function chooseSearchTarget(world, enemy) {
        const [cx, cy] = enemy.searchCenter;
        const candidates = SEARCH_OFFSETS.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => canStand(world.level, x, y) && !world.level.pits?.has(`${Math.floor(x)},${Math.floor(y)}`) && (!enemy.targetField || enemy.targetField.at(x, y) <= 3.8) && Math.hypot(x - enemy.x, y - enemy.y) > 0.45);
        if (!candidates.length) return null;
        enemy.searchSeed = Math.imul(enemy.searchSeed, 1664525) + 1013904223 >>> 0;
        return candidates[enemy.searchSeed % candidates.length];
      }
      function chooseWanderTarget(world, enemy) {
        const x = Math.floor(enemy.x);
        const y = Math.floor(enemy.y);
        const choices = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => [x + dx + 0.5, y + dy + 0.5]).filter(([nx, ny]) => canStand(world.level, nx, ny) && !world.level.pits?.has(`${Math.floor(nx)},${Math.floor(ny)}`));
        const forward = choices.filter(([nx, ny]) => !enemy.wanderPrevious || nx !== enemy.wanderPrevious[0] || ny !== enemy.wanderPrevious[1]);
        const pool = forward.length ? forward : choices;
        if (!pool.length) return null;
        enemy.searchSeed = Math.imul(enemy.searchSeed, 1664525) + 1013904223 >>> 0;
        enemy.wanderPrevious = [x + 0.5, y + 0.5];
        return pool[enemy.searchSeed % pool.length];
      }
      function updateEnemy(world, enemy, dt) {
        let trackingPlayer = false;
        if (enemyAlerted(enemy) && !enemy.distracted) {
          let target = null, nearest = ENEMY_TRACK_RANGE;
          for (const actor of activeActors(world)) {
            const distance = Math.hypot(actor.x - enemy.x, actor.y - enemy.y);
            if (distance <= nearest && getGeometry(world.level).visible(enemy.x, enemy.y, actor.x, actor.y)) {
              target = actor;
              nearest = distance;
            }
          }
          if (target) {
            trackingPlayer = true;
            enemy.mode = "chase";
            enemy.target = [target.x, target.y];
            enemy.targetField = null;
            enemy.searchCenter = null;
            enemy.searchTarget = null;
          }
        }
        if (enemy.mode === "wander") {
          if (!enemy.wanderTarget || Math.hypot(enemy.x - enemy.wanderTarget[0], enemy.y - enemy.wanderTarget[1]) < 0.2) {
            enemy.wanderTarget = chooseWanderTarget(world, enemy);
          }
          if (enemy.wanderTarget) moveEnemyToward(world, enemy, enemy.wanderTarget, dt, ENEMY_SEARCH_SPEED);
        }
        if (enemy.mode === "patrol") {
          const waypoint = enemy.path[enemy.patrolIndex];
          moveEnemyToward(world, enemy, waypoint, dt, ENEMY_SEARCH_SPEED);
          if (Math.hypot(enemy.x - waypoint[0], enemy.y - waypoint[1]) < 0.2) {
            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.path.length;
          }
        }
        if (enemy.mode === "chase" && enemy.target) {
          if (Math.hypot(enemy.x - enemy.target[0], enemy.y - enemy.target[1]) < 0.3) {
            enemy.mode = "search";
            enemy.searchCenter = enemy.target;
            enemy.searchTarget = null;
            enemy.searchUntil = world.time + SEARCH_DURATION;
            enemy.target = null;
          } else {
            moveEnemyToward(world, enemy, enemy.target, dt, ENEMY_ALERT_SPEED, trackingPlayer);
          }
        }
        if (enemy.mode === "search") {
          if (world.time >= enemy.searchUntil) {
            enemy.mode = "return";
            enemy.searchCenter = null;
            enemy.searchTarget = null;
            enemy.targetField = null;
          } else {
            if (!enemy.searchTarget || Math.hypot(enemy.x - enemy.searchTarget[0], enemy.y - enemy.searchTarget[1]) < 0.2) {
              enemy.searchTarget = chooseSearchTarget(world, enemy);
            }
            if (enemy.searchTarget) moveEnemyToward(world, enemy, enemy.searchTarget, dt, ENEMY_SEARCH_SPEED);
          }
        }
        if (enemy.mode === "return") {
          const post = enemy.type === "patrol" ? enemy.path[enemy.patrolIndex] : enemy.home;
          if (Math.hypot(enemy.x - post[0], enemy.y - post[1]) < 0.2) {
            [enemy.x, enemy.y] = post;
            enemy.mode = enemy.type === "patrol" ? "patrol" : enemy.type === "wanderer" ? "wander" : "idle";
            enemy.wanderTarget = null;
            if (enemy.type === "sentinel") enemy.warned = false;
          } else {
            moveEnemyToward(world, enemy, post, dt, ENEMY_SEARCH_SPEED);
          }
        }
      }
      function checkEnemyContact(world, enemy) {
        if (!world.invincible) {
          for (const actor of activeActors(world)) {
            if (Math.hypot(enemy.x - actor.x, enemy.y - actor.y) < 0.48) {
              world.killActor(actor, "enemy", { enemyType: enemy.type ?? "guard", enemyId: enemy.id ?? null });
            }
          }
        }
      }
      function updateStep(world, dt) {
        if (!world.shared && (world.failed || world.complete)) return;
        const stepStart = world.time;
        world.time += dt;
        while (world.footprints.length && world.time - world.footprints[0].at >= FOOTPRINT_LIFETIME) {
          world.footprints.shift();
        }
        for (const lure of world.lures) {
          while (lure.impactIndex < lure.segments.length) {
            const segment = lure.segments[lure.impactIndex];
            if (world.time - lure.start < segment.endTime) break;
            if (segment.hit) emitSound(
              world,
              segment.toX,
              segment.toY,
              "lure",
              4 + 13 * segment.intensity,
              segment.intensity,
              null,
              lure.ownerId
            );
            lure.impactIndex += 1;
          }
          if (!lure.arrived && world.time - lure.start >= lure.duration) {
            lure.arrived = true;
            world.stones.push({ x: lure.toX, y: lure.toY, ownerId: lure.ownerId });
            const lastImpact = [...lure.segments].reverse().find((segment) => segment.hit);
            const intensity = lastImpact ? Math.max(0.08, lastImpact.intensity * 0.45) : 0.25;
            emitSound(world, lure.toX, lure.toY, "landing", 3 + 5 * intensity, intensity, null, lure.ownerId);
          }
        }
        world.lures = world.lures.filter((lure) => world.time < lure.trailUntil);
        updateHazards(world, dt, emitSound);
        updateDevices(world, emitSound);
        updateAmbient(world, emitSound);
        checkGroundHazards(world);
        for (const enemy of world.enemies) {
          if (enemy.type === "sentinel" && enemy.mode === "idle") {
            if (world.time - enemy.scanAt >= enemy.period) enemy.scanAt = world.time + enemy.period;
            if (!enemy.warned && world.time >= enemy.scanAt - 0.55) {
              emitSound(world, enemy.x, enemy.y, "sentinelCharge", 2.2);
              enemy.warned = true;
            }
            if (world.time >= enemy.scanAt) {
              emitSound(world, enemy.x, enemy.y, "sentinel", enemy.range);
              enemy.scanAt = world.time + enemy.period;
              enemy.warned = false;
            }
          }
          if (enemy.type !== "bat" || enemy.mode !== "idle") continue;
          if (world.time - enemy.scanAt >= enemy.period) enemy.scanAt = world.time;
          if (world.time >= enemy.scanAt) {
            enemy.searchSeed = Math.imul(enemy.searchSeed, 1664525) + 1013904223 >>> 0;
            const angle = enemy.angles?.[enemy.scanIndex % enemy.angles.length] ?? enemy.searchSeed / 4294967296 * Math.PI * 2;
            enemy.scanIndex += 1;
            const scan = emitSound(
              world,
              enemy.x,
              enemy.y,
              "bat",
              enemy.range,
              1,
              directionalField(world.level, enemy.x, enemy.y, angle, 0.16, enemy.range)
            );
            scan.angle = angle;
            scan.halfAngle = 0.16;
            enemy.scanAt = world.time + enemy.period;
          }
        }
        for (const wave of world.waves) {
          if (wave.type === "bat" || wave.type === "sentinel") {
            wave.hitActors ||= /* @__PURE__ */ new Set();
            for (const actor of activeActors(world)) {
              if (wave.hitActors.has(actor)) continue;
              const distance = wave.field.at(actor.x, actor.y);
              const front = (world.time - wave.start) * wave.speed;
              if (Number.isFinite(distance) && front >= distance - 0.25 && front - distance <= wave.speed * dt + 0.24) {
                wave.hitActors.add(actor);
                if (actor === world.player) wave.hitPlayer = true;
                emitSound(world, actor.x, actor.y, "reflection", 9, 1, null, actor.id);
              }
            }
          }
          for (const enemy of world.enemies) {
            if (enemy.type === "mimic") continue;
            if (wave.passive || [
              "enemy",
              "spike",
              "bow",
              "arrow",
              "pit",
              "bat",
              "mineWarning",
              "mineBlast",
              "sentinelCharge",
              "sentinel",
              "beacon",
              "gateWarning",
              "gateClose",
              "gateOpen",
              "fragileWarning",
              "fragileFall",
              "fragileReset",
              "laser",
              "relay",
              "sequenceCue",
              "sequenceDone",
              "sequenceReset"
            ].includes(wave.type) || wave.heard.has(enemy)) continue;
            const distance = wave.field.at(enemy.x, enemy.y);
            if (!Number.isFinite(distance) || world.time - wave.start < distance / wave.speed) continue;
            wave.heard.add(enemy);
            enemy.mode = "chase";
            syncEnemyAlert(enemy, world.time);
            enemy.target = wave.targetOrigin || [wave.x, wave.y];
            enemy.targetField = wave.targetField || wave.field;
            enemy.distracted = DISTRACTION_SOUNDS.has(wave.targetType || wave.type);
            enemy.searchCenter = null;
            enemy.searchTarget = null;
          }
          if (world.level.mechanism && !world.mechanismActive && (wave.type === "probe" || wave.type === "relay") && !wave.mechanismChecked) {
            const distance = wave.field.at(...world.level.mechanism);
            if (Number.isFinite(distance) && world.time - wave.start >= distance / wave.speed) {
              wave.mechanismChecked = true;
              world.mechanismActive = true;
            }
          }
        }
        for (const enemy of world.enemies) {
          if (enemy.type !== "mimic") continue;
          const arrivals = world.waves.map((wave) => {
            const distance = wave.field.at(enemy.x, enemy.y);
            return { wave, at: Math.max(stepStart, wave.start + distance / wave.speed) };
          }).filter((item) => Number.isFinite(item.at) && item.at <= world.time && !item.wave.heard.has(enemy)).sort((a, b) => a.at - b.at || a.wave.start - b.wave.start || a.wave.id - b.wave.id);
          for (const { wave, at } of arrivals) {
            wave.heard.add(enemy);
            queueMimicEffects(world, hearMimic(enemy, wave, at));
          }
          advanceMimicTimers(enemy, world.time);
        }
        if (!world.unlocked && world.mechanismActive && world.sequence.complete) {
          world.unlocked = true;
          if (world.baseLevel.mechanismWalls?.size) rebuildTerrain(world);
          emitSound(world, ...world.level.mechanism || world.level.exit, "unlock", 3.5);
          if (world.level.mechanism) {
            emitSound(world, ...world.level.exit, "exitUnlock", 3.5, 0.65);
          }
        }
        world.waves = world.waves.filter((w) => world.time - w.start < w.radius / w.speed + 0.6);
        const activeWaveIds = new Set(world.waves.map((wave) => wave.id));
        for (const enemy of world.enemies) {
          if (enemy.type === "mimic") {
            queueMimicEffects(world, updateMimic(enemy, {
              now: world.time,
              dt,
              player: world.player,
              maxSpeed: PLAYER_MAX_SPEED,
              resolveStoneTarget: (e, target) => stoneMovementTarget(world, e, target),
              move: (e, target, delta, speed) => moveEnemyToward(world, e, target, delta, speed)
            }));
            for (const id of enemy.mimic.consumed) {
              if (!activeWaveIds.has(id)) enemy.mimic.consumed.delete(id);
            }
          } else {
            updateEnemy(world, enemy, dt);
            syncEnemyAlert(enemy, world.time);
          }
          checkEnemyContact(world, enemy);
        }
        if (!world.shared && !world.failed && !world.invincible && world.unlocked && Math.hypot(world.player.x - world.level.exit[0], world.player.y - world.level.exit[1]) < 0.58) {
          world.complete = true;
        }
      }
      function updateWorld(world, dt) {
        const steps = Math.max(1, Math.ceil(dt / 0.08));
        for (let i = 0; i < steps; i += 1) updateStep(world, dt / steps);
      }
      module.exports = {
        createWorld,
        reviveWorld,
        emitSound,
        emitLure,
        movePlayer,
        moveActor,
        movePosition,
        canStand,
        updateWorld,
        takeMimicAudioEvents,
        PLAYER_MAX_SPEED,
        FOOTPRINT_LIFETIME
      };
    }
  });

  // scripts/web-editor/core.js
  var require_core = __commonJS({
    "scripts/web-editor/core.js"(exports, module) {
      var { TERRAIN: TERRAIN2, isKnownTile, matchesTile } = require_terrain_catalog();
      var { SIZES: SIZES2, TILE, createBlankDraft: createBlankDraft2, toRuntimeLevel } = require_model();
      var { OBJECT_BY_TYPE: OBJECT_BY_TYPE2, MAX_OBJECTS, ENEMY_TYPES, MAX_ENEMIES } = require_objects();
      var { createEditorState: createEditorState2, beginStroke: beginStroke2, endStroke: endStroke2, applyEditorAction: applyEditorAction2 } = require_editor();
      var { validateDraft: validateDraft2 } = require_validation();
      var { decodeLevel } = require_codec();
      var { createWorld } = require_world();
      var copy = (value) => JSON.parse(JSON.stringify(value));
      var UNIQUE = ["start", "exit", "mechanism"];
      var COLLECTIONS = { guard: "guards", spike: "spikes", launcher: "launchers" };
      function lineCells(from, to) {
        const count = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        return Array.from({ length: count + 1 }, (_, i) => ({
          x: Math.round(from.x + (to.x - from.x) * i / (count || 1)),
          y: Math.round(from.y + (to.y - from.y) * i / (count || 1))
        }));
      }
      function paintRegion2(state2, tool, from, to, options = {}) {
        const ownStroke = !state2.stroke;
        if (ownStroke) beginStroke2(state2);
        let changed2 = false;
        const cells = options.shape === "rectangle" ? [] : lineCells(from, to);
        if (options.shape === "rectangle") {
          for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
            for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) cells.push({ x, y });
          }
        }
        const size = Math.max(1, Math.min(3, options.brushSize || 1));
        const offset = Math.floor((size - 1) / 2);
        for (const cell of cells) for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
          const at = { x: cell.x + dx - offset, y: cell.y + dy - offset };
          const action = tool === "erase" ? { type: "erase", ...at } : tool in TERRAIN2 ? { type: "paint", ...at, tile: TERRAIN2[tool] } : { type: "place", kind: tool, ...at, ...options.timing };
          changed2 = applyEditorAction2(state2, action) || changed2;
        }
        if (ownStroke) endStroke2(state2);
        return changed2;
      }
      function floodFill2(state2, at, tool) {
        if (!(tool in TERRAIN2)) return false;
        const [width, height] = SIZES2[state2.draft.size];
        if (at.x <= 0 || at.y <= 0 || at.x >= width - 1 || at.y >= height - 1) return false;
        const source = state2.draft.tiles[at.x + at.y * width];
        if (source === TERRAIN2[tool]) return false;
        const original = state2.draft.tiles.slice(), queue = [at], visited = /* @__PURE__ */ new Set();
        const ownStroke = !state2.stroke;
        if (ownStroke) beginStroke2(state2);
        for (let i = 0; i < queue.length; i++) {
          const { x, y } = queue[i], index = x + y * width;
          if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1 || visited.has(index) || original[index] !== source) continue;
          visited.add(index);
          applyEditorAction2(state2, { type: "paint", x, y, tile: TERRAIN2[tool] });
          queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
        }
        if (ownStroke) endStroke2(state2);
        return visited.size > 0;
      }
      function entities2(draft) {
        return [
          ...UNIQUE.filter((kind) => draft[kind]).map((kind) => ({ kind, x: draft[kind][0], y: draft[kind][1] })),
          ...Object.entries(COLLECTIONS).flatMap(([kind, key]) => draft[key].map((item, index) => ({
            kind,
            index,
            ...kind === "guard" ? { x: item[0], y: item[1] } : item
          }))),
          ...(draft.objects || []).map((item, index) => ({ ...item, kind: item.type, index }))
        ];
      }
      function entityAt2(draft, x, y) {
        const items = entities2(draft);
        return items.find((item) => item.x === x && item.y === y) || items.filter((item) => OBJECT_BY_TYPE2[item.kind]?.pair).map((item) => ({ ...item, endpoint: true })).find((item) => item.toX === x && item.toY === y) || null;
      }
      function moveEntity2(state2, entity, target) {
        if (!entity) return false;
        const draft = copy(state2.draft), { kind, index } = entity;
        let action = { type: "place", kind, ...entity, x: target.x, y: target.y };
        action.type = "place";
        if (entity.endpoint) {
          action.x = entity.x;
          action.y = entity.y;
          action.toX = target.x;
          action.toY = target.y;
        }
        if (UNIQUE.includes(kind)) draft[kind] = null;
        else if (COLLECTIONS[kind]) draft[COLLECTIONS[kind]].splice(index, 1);
        else draft.objects.splice(index, 1);
        const attempt = createEditorState2(draft);
        if (!applyEditorAction2(attempt, action)) return false;
        return applyEditorAction2(state2, { type: "replace", draft: attempt.draft });
      }
      function importDraft2(text) {
        if (typeof text !== "string" || text.length > 262144) throw new Error("\u6587\u4EF6\u8FC7\u5927\uFF0C\u6700\u591A\u652F\u6301 256 KB");
        text = text.trim();
        if (/^ECL/.test(text)) return decodeLevel(text);
        let input;
        try {
          input = JSON.parse(text);
        } catch (_) {
          throw new Error("\u8BF7\u7C98\u8D34\u6709\u6548\u5173\u5361\u7801\u6216\u8349\u7A3F JSON");
        }
        const fail = () => {
          throw new Error("\u8349\u7A3F\u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u5C3A\u5BF8\u3001\u5730\u5F62\u4E0E\u7269\u4EF6\u6570\u636E");
        };
        if (!input || typeof input !== "object" || !Object.hasOwn(SIZES2, input.size)) fail();
        const [width, height] = SIZES2[input.size];
        if (typeof input.name !== "string" || !input.name.trim() || [...input.name].length > 16) fail();
        try {
          if (encodeURIComponent(input.name).replace(/%[A-F\d]{2}|./gi, "x").length > 48) fail();
        } catch (_) {
          fail();
        }
        if (!Array.isArray(input.tiles) || input.tiles.length !== width * height || input.tiles.some((tile) => !isKnownTile(tile))) fail();
        const point = (x, y, tile = 0) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height && matchesTile(input.tiles[x + y * width], tile);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && input.tiles[x + y * width] !== 1) fail();
        }
        for (const kind of UNIQUE) if (input[kind] !== null && (!Array.isArray(input[kind]) || input[kind].length !== 2 || !point(...input[kind]))) fail();
        for (const [key, max] of [["guards", 8], ["spikes", 32], ["launchers", 8], ["objects", MAX_OBJECTS]]) {
          if (key === "objects" && input[key] === void 0) input.objects = [];
          if (!Array.isArray(input[key]) || input[key].length > max) fail();
        }
        for (const at of input.guards) if (!Array.isArray(at) || at.length !== 2 || !point(...at)) fail();
        for (const [key, tile] of [["spikes", 0], ["launchers", 1]]) for (const item of input[key]) {
          if (!item || !point(item.x, item.y, tile) || ![0, 1, 2].includes(item.tempo) || ![0, 1, 2, 3].includes(item.phase)) fail();
          if (key === "launchers") {
            const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]][item.dir];
            if (!Number.isInteger(item.dir) || !dir || !point(item.x + dir[0], item.y + dir[1])) fail();
          }
        }
        const counts = {}, used = /* @__PURE__ */ new Set();
        const occupy = (x, y) => {
          const key = `${x},${y}`;
          if (used.has(key)) fail();
          used.add(key);
        };
        for (const kind of UNIQUE) if (input[kind]) occupy(...input[kind]);
        for (const at of input.guards) occupy(...at);
        for (const item of [...input.spikes, ...input.launchers]) occupy(item.x, item.y);
        for (const item of input.objects) {
          const spec = item && typeof item.type === "string" && OBJECT_BY_TYPE2[item.type];
          if (!spec || !point(item.x, item.y, spec.tile) || (counts[item.type] = (counts[item.type] || 0) + 1) > spec.limit) fail();
          if (item.type === "lockedWall" && (item.x === 0 || item.y === 0 || item.x === width - 1 || item.y === height - 1)) fail();
          occupy(item.x, item.y);
          if (spec.pair) {
            if (!point(item.toX, item.toY) || item.x === item.toX && item.y === item.toY) fail();
            if (item.type !== "relay") occupy(item.toX, item.toY);
          } else if ("toX" in item || "toY" in item) fail();
        }
        if (input.guards.length + input.objects.filter((item) => ENEMY_TYPES.has(item.type)).length > MAX_ENEMIES) fail();
        if (input.origin !== null && (!input.origin || !Number.isInteger(input.origin.seed) || input.origin.seed < 0 || input.origin.seed > 4294967295 || !Number.isInteger(input.origin.generatorVersion) || input.origin.generatorVersion < 0 || input.origin.generatorVersion > 255)) fail();
        const result = createBlankDraft2(input.size, input.name);
        for (const key of Object.keys(result)) result[key] = copy(input[key]);
        return result;
      }
      function makeExample2() {
        const d = createBlankDraft2("small", "\u56DE\u58F0\u4E4B\u95F4");
        d.tiles.fill(TILE.WALL);
        const room = (x1, y1, x2, y2) => {
          for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) d.tiles[x + y * 36] = TILE.FLOOR;
        };
        room(4, 34, 15, 43);
        room(9, 23, 11, 36);
        room(5, 18, 19, 27);
        room(17, 22, 28, 24);
        room(26, 7, 28, 37);
        room(22, 4, 31, 13);
        room(20, 31, 31, 41);
        d.start = [7, 40];
        d.exit = [27, 7];
        d.mechanism = [7, 21];
        d.objects = [
          { type: "patrol", x: 23, y: 37, toX: 29, toY: 37 },
          { type: "beacon", x: 10, y: 25 },
          { type: "silent", x: 26, y: 32 },
          { type: "silent", x: 27, y: 32 },
          { type: "silent", x: 28, y: 32 },
          { type: "noisy", x: 18, y: 23 },
          { type: "relay", x: 25, y: 11, toX: 7, toY: 21 }
        ];
        d.spikes = [{ x: 27, y: 19, tempo: 1, phase: 0 }];
        for (const [x, y] of [[13, 40], [14, 40], [13, 41], [14, 41]]) d.tiles[x + y * 36] = TILE.PIT;
        for (let y = 19; y <= 23; y++) d.tiles[16 + y * 36] = TILE.FENCE;
        return d;
      }
      function createPreviewWorld(draft) {
        const { errors } = validateDraft2(draft);
        if (errors.length) throw new Error(errors.map((error) => error.message).join("\uFF1B"));
        return createWorld(toRuntimeLevel(copy(draft)));
      }
      module.exports = { TERRAIN: TERRAIN2, lineCells, paintRegion: paintRegion2, floodFill: floodFill2, entities: entities2, entityAt: entityAt2, moveEntity: moveEntity2, importDraft: importDraft2, makeExample: makeExample2, createPreviewWorld };
    }
  });

  // src/ugc/catalog.js
  var require_catalog = __commonJS({
    "src/ugc/catalog.js"(exports, module) {
      var { enemyCatalog } = require_enemy_catalog();
      var { TERRAIN_TYPES } = require_terrain_catalog();
      var { OBJECT_TYPES } = require_objects();
      var GROUPS2 = [
        { id: "terrain", name: "\u5730\u5F62\u4E0E\u5730\u9762" },
        { id: "goal", name: "\u76EE\u6807" },
        { id: "enemy", name: "\u654C\u4EBA" },
        { id: "danger", name: "\u9677\u9631" },
        { id: "assist", name: "\u58F0\u97F3\u4E0E\u8F85\u52A9" },
        { id: "link", name: "\u673A\u5173" }
      ];
      var MATERIALS = [
        ...TERRAIN_TYPES.map((spec) => ({ ...spec, kind: spec.type, group: "terrain" })),
        { kind: "start", group: "goal", name: "\u73A9\u5BB6\u8D77\u70B9", shortName: "\u8D77\u70B9", description: "\u653E\u7F6E\u73A9\u5BB6\u51FA\u751F\u70B9\u3002\u6BCF\u5F20\u5730\u56FE\u53EA\u6709\u4E00\u4E2A\u3002" },
        { kind: "exit", group: "goal", name: "\u5173\u5361\u51FA\u53E3", shortName: "\u51FA\u53E3", description: "\u653E\u7F6E\u5230\u8FBE\u540E\u901A\u5173\u7684\u7EC8\u70B9\u3002" },
        { kind: "mechanism", group: "goal", name: "\u58F0\u9501", description: "\u7528\u58F0\u6CE2\u6FC0\u6D3B\uFF0C\u5F00\u542F\u673A\u5173\u5899\u3002" },
        { kind: "guard", group: "enemy", name: enemyCatalog.guard.displayName, ...enemyCatalog.guard.editor },
        { kind: "spike", group: "danger", name: "\u5730\u523A", description: "\u5468\u671F\u5F39\u51FA\u7684\u5730\u523A\uFF0C\u53EF\u8C03\u6574\u8282\u594F\u4E0E\u76F8\u4F4D\u3002" },
        { kind: "launcher", group: "danger", name: "\u5F13\u7BAD\u673A\u5173", shortName: "\u5F13\u7BAD", description: "\u653E\u5728\u5899\u4E0A\u5E76\u671D\u5411\u76F8\u90BB\u5730\u9762\uFF0C\u53EF\u8C03\u6574\u65B9\u5411\u3001\u8282\u594F\u4E0E\u76F8\u4F4D\u3002" },
        ...OBJECT_TYPES.map((spec) => ({ ...spec, kind: spec.type })),
        { kind: "erase", name: "\u6A61\u76AE\u64E6", shortName: "\u64E6\u9664", description: "\u79FB\u9664\u7269\u4EF6\u5E76\u6062\u590D\u5730\u9762\u3002\u4E5F\u53EF\u4EE5\u6309\u9F20\u6807\u53F3\u952E\u64E6\u9664\u3002" }
      ];
      var MATERIAL_BY_KIND = Object.fromEntries(MATERIALS.map((spec) => [spec.kind, spec]));
      function materialsFor(group) {
        return MATERIALS.filter((spec) => spec.group === group);
      }
      module.exports = { GROUPS: GROUPS2, MATERIALS, MATERIAL_BY_KIND, materialsFor };
    }
  });

  // scripts/web-editor/palette.js
  var require_palette = __commonJS({
    "scripts/web-editor/palette.js"(exports, module) {
      var { GROUPS: CATEGORIES, MATERIALS, MATERIAL_BY_KIND } = require_catalog();
      var PATHS = {
        floor: "M5 5h2v2H5zM17 5h2v2h-2zM5 17h2v2H5zM17 17h2v2h-2z",
        wall: "M3 4h18v16H3zM3 12h18M12 4v8M8 12v8M17 12v8",
        fence: "M4 4v16M9 4v16M15 4v16M20 4v16M3 8h18M3 16h18",
        pit: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
        erase: "m3 14 9-10 9 8-7 8H9zM8 9l9 8M14 20h8",
        start: "M6 21V3h13l-4 5 4 5H6",
        exit: "M5 21V3h14v18M9 12h7m-3-3 3 3-3 3",
        mechanism: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12",
        guard: "M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3a7 7 0 0 1 14 0v3",
        patrol: "M8 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 14l8-6",
        bat: "m2 8 5 9 5-6 5 6 5-9-7 3-3-5-3 5z",
        wanderer: "m12 3 9 9-9 9-9-9zM12 9v6M9 12h6",
        mimic: "M5 4h5v6H5zM14 14h5v6h-5zM7 10v4M17 10V6M10 7h4M10 17h4",
        sentinel: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 5a9 9 0 0 0 0 14M18 5a9 9 0 0 1 0 14",
        spike: "m2 20 4-15 4 15 4-15 4 15 4-15",
        launcher: "M6 3q14 9 0 18V3M6 12h16m-5-5 5 5-5 5",
        mine: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M9 9l6 6M15 9l-6 6",
        alarm: "M4 18h16l-2-6V9a6 6 0 0 0-12 0v3zM10 21h4",
        fragile: "M3 3h18v18H3zM10 3l4 6-5 4 6 8M14 9l7 2",
        noisy: "m3 7 5-3 8 6 5-3M3 13l5-3 8 6 5-3M3 19l5-3 8 6 5-3",
        silent: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M6 18 18 6",
        beacon: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M12 1v5M12 18v5M1 12h5M18 12h5",
        decoy: "M10 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M13 7a7 7 0 0 1 0 10M17 3a12 12 0 0 1 0 18",
        laser: "m3 4 10 8L3 20M13 12h10M18 8l4 4-4 4",
        lockedWall: "M3 4h18v16H3zM3 12h6M15 12h6M12 4v5M15 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        relay: "M9 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M9 12h6",
        sequence: "M10 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M6 10v4M17 11h2l-2 2h2",
        gate: "M3 5h18M3 12h18M6 19h12",
        select: "m5 3 14 11-7 1-4 7z",
        brush: "m14 3 7 7-10 10H4v-7zM12 5l7 7",
        rectangle: "M4 4h16v16H4z",
        fill: "m10 2 10 10-9 9L2 12l9-9M4 11h15M21 16q5 6 0 6t0-6",
        undo: "M9 4 3 10l6 6M3 10h11a7 7 0 0 1 0 14",
        redo: "m15 4 6 6-6 6M21 10H10a7 7 0 0 0 0 14",
        play: "m8 4 13 8-13 8z",
        save: "M4 3h14l3 3v15H3V3zM7 3v6h10V3M7 21v-8h10v8",
        plus: "M12 4v16M4 12h16",
        import: "M4 16v5h16v-5M12 3v12m-5-5 5 5 5-5",
        export: "M4 16v5h16v-5M12 15V3M7 8l5-5 5 5",
        search: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0M16 16l6 6",
        grid: "M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18",
        fit: "M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6",
        arrow: "M20 12H4m6-6-6 6 6 6",
        close: "m5 5 14 14M19 5 5 19",
        eye: "M2 12q10-15 20 0-10 15-20 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 8a3 3 0 1 1 5 3l-2 2M12 17v1",
        sound: "m3 9 5 0 5-5v16l-5-5H3zM17 8a6 6 0 0 1 0 8M20 4a11 11 0 0 1 0 16",
        trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"
      };
      var GROUPS2 = CATEGORIES.map((group) => ({ ...group, items: MATERIALS.filter((item) => item.group === group.id).map((item) => [item.kind, item.name, item.description]) }));
      var ITEMS2 = MATERIAL_BY_KIND;
      function pathFor(kind) {
        return PATHS[kind] || (ITEMS2[kind]?.group === "enemy" ? PATHS.guard : ITEMS2[kind]?.group === "terrain" ? PATHS.floor : PATHS.mechanism);
      }
      function colorFor(kind) {
        const item = ITEMS2[kind];
        if (item?.color) return item.color;
        if (["start", "exit", "beacon", "silent"].includes(kind)) return "#8fdab7";
        if (item?.group === "enemy" || item?.group === "danger") return "#e5a38f";
        return "#cfbf8f";
      }
      function icon2(name, cls = "") {
        return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${pathFor(name)}"/></svg>`;
      }
      module.exports = { PATHS, GROUPS: GROUPS2, ITEMS: ITEMS2, colorFor, pathFor, icon: icon2 };
    }
  });

  // scripts/web-editor/map.js
  var require_map = __commonJS({
    "scripts/web-editor/map.js"(exports, module) {
      var { SIZES: SIZES2 } = require_model();
      var { entities: entities2 } = require_core();
      var { pathFor, colorFor } = require_palette();
      var { TERRAIN: TERRAIN2, TERRAIN_BY_TILE } = require_terrain_catalog();
      var paths = /* @__PURE__ */ new Map();
      function glyph(ctx, kind, x, y, size) {
        if (!paths.has(kind)) paths.set(kind, new Path2D(pathFor(kind)));
        ctx.save();
        ctx.translate(x - size / 2, y - size / 2);
        ctx.scale(size / 24, size / 24);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke(paths.get(kind));
        ctx.restore();
      }
      function createMap2(canvas2, minimap, getState) {
        const ctx = canvas2.getContext("2d"), mini = minimap.getContext("2d");
        const view = { x: 0, y: 0, scale: 14, fitScale: 14, grid: true };
        let width = 0, height = 0, queued = false, miniView;
        function fit() {
          const [cols, rows] = SIZES2[getState().editor.draft.size];
          view.scale = Math.max(3, Math.min((width - 100) / cols, (height - 110) / rows, 25));
          view.fitScale = view.scale;
          view.x = (width - cols * view.scale) / 2;
          view.y = (height - rows * view.scale) / 2;
          draw();
        }
        function zoom(factor, x = width / 2, y = height / 2) {
          const old = view.scale;
          view.scale = Math.max(3, Math.min(60, old * factor));
          view.x = x - (x - view.x) * view.scale / old;
          view.y = y - (y - view.y) * view.scale / old;
          draw();
        }
        function cell(event) {
          const rect = canvas2.getBoundingClientRect();
          const [cols, rows] = SIZES2[getState().editor.draft.size];
          const x = Math.floor((event.clientX - rect.left - view.x) / view.scale);
          const y = Math.floor((event.clientY - rect.top - view.y) / view.scale);
          return x >= 0 && y >= 0 && x < cols && y < rows ? { x, y } : null;
        }
        function paintMap(target, draft, ox, oy, scale, grid) {
          const [cols, rows] = SIZES2[draft.size];
          target.fillStyle = "#26382c";
          target.fillRect(ox, oy, cols * scale, rows * scale);
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const tile = draft.tiles[x + y * cols];
            if (tile === 1) continue;
            target.fillStyle = TERRAIN_BY_TILE[tile]?.color || "#d6dad0";
            target.fillRect(ox + x * scale, oy + y * scale, scale + 0.2, scale + 0.2);
            if (tile === 2 && scale > 7) {
              target.strokeStyle = "#6e8d79";
              target.lineWidth = 0.5;
              target.beginPath();
              target.moveTo(ox + x * scale + 2, oy + (y + 1) * scale - 2);
              target.lineTo(ox + (x + 1) * scale - 2, oy + y * scale + 2);
              target.stroke();
            }
            if (tile === 3 && scale > 6) {
              target.strokeStyle = "#365b46";
              target.lineWidth = 1;
              for (const at of [0.3, 0.7]) {
                target.beginPath();
                target.moveTo(ox + (x + at) * scale, oy + y * scale);
                target.lineTo(ox + (x + at) * scale, oy + (y + 1) * scale);
                target.stroke();
              }
            }
          }
          if (grid && scale >= 8) {
            target.strokeStyle = "#203b3028";
            target.lineWidth = 0.5;
            target.beginPath();
            for (let x = 0; x <= cols; x++) {
              target.moveTo(ox + x * scale, oy);
              target.lineTo(ox + x * scale, oy + rows * scale);
            }
            for (let y = 0; y <= rows; y++) {
              target.moveTo(ox, oy + y * scale);
              target.lineTo(ox + cols * scale, oy + y * scale);
            }
            target.stroke();
          }
          for (const item of entities2(draft)) {
            const cx = ox + (item.x + 0.5) * scale, cy = oy + (item.y + 0.5) * scale;
            const color = colorFor(item.kind);
            if (item.toX != null) {
              const tx = ox + (item.toX + 0.5) * scale, ty = oy + (item.toY + 0.5) * scale;
              target.strokeStyle = item.kind === "patrol" ? "#bc745e" : "#927e4e";
              target.lineWidth = Math.max(1, scale * 0.08);
              target.setLineDash([scale * 0.25, scale * 0.22]);
              target.beginPath();
              target.moveTo(cx, cy);
              target.lineTo(tx, ty);
              target.stroke();
              target.setLineDash([]);
              target.fillStyle = color;
              target.beginPath();
              target.arc(tx, ty, scale * 0.23, 0, Math.PI * 2);
              target.fill();
              target.strokeStyle = "#20352b";
              target.lineWidth = Math.max(1, scale * 0.06);
              target.stroke();
            }
            target.fillStyle = color;
            target.beginPath();
            target.roundRect(cx - scale * 0.43, cy - scale * 0.43, scale * 0.86, scale * 0.86, scale * 0.15);
            target.fill();
            if (scale > 6) {
              target.strokeStyle = "#243b2c";
              glyph(target, item.kind, cx, cy, scale * 0.69);
            }
            if (item.kind === "launcher" && scale > 9) {
              target.save();
              target.translate(cx, cy);
              target.rotate((item.dir - 1) * Math.PI / 2);
              target.strokeStyle = "#784636";
              target.lineWidth = 1.4;
              target.beginPath();
              target.moveTo(scale * 0.5, 0);
              target.lineTo(scale * 1.05, 0);
              target.moveTo(scale * 0.82, -scale * 0.17);
              target.lineTo(scale * 1.05, 0);
              target.lineTo(scale * 0.82, scale * 0.17);
              target.stroke();
              target.restore();
            }
          }
          target.strokeStyle = "#749e7d";
          target.lineWidth = 1;
          target.strokeRect(ox, oy, cols * scale, rows * scale);
        }
        function render() {
          queued = false;
          const state2 = getState(), draft = state2.editor.draft;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, width, height);
          const [cols, rows] = SIZES2[draft.size];
          ctx.shadowColor = "#0007";
          ctx.shadowBlur = 30;
          ctx.fillStyle = "#233329";
          ctx.fillRect(view.x, view.y, cols * view.scale, rows * view.scale);
          ctx.shadowBlur = 0;
          paintMap(ctx, draft, view.x, view.y, view.scale, view.grid);
          if (view.scale > 9) {
            ctx.fillStyle = "#688b71";
            ctx.font = "9px ui-monospace,monospace";
            ctx.textAlign = "center";
            for (let x = 0; x < cols; x += 5) ctx.fillText(x, view.x + (x + 0.5) * view.scale, view.y - 10);
            ctx.textAlign = "right";
            for (let y = 0; y < rows; y += 5) ctx.fillText(y, view.x - 10, view.y + (y + 0.7) * view.scale);
          }
          const highlight = (at, color, line = 2) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = line;
            ctx.strokeRect(view.x + at.x * view.scale + 1, view.y + at.y * view.scale + 1, view.scale - 2, view.scale - 2);
          };
          if (state2.selection) highlight(state2.selection.endpoint ? { x: state2.selection.toX, y: state2.selection.toY } : state2.selection, "#d5a64c");
          if (state2.hover) {
            const size = state2.mode === "brush" && (state2.tool in TERRAIN2 || state2.tool === "erase") ? state2.brushSize : 1;
            const offset = Math.floor((size - 1) / 2);
            ctx.strokeStyle = "#a4e9c7";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(
              view.x + (state2.hover.x - offset) * view.scale + 1,
              view.y + (state2.hover.y - offset) * view.scale + 1,
              view.scale * size - 2,
              view.scale * size - 2
            );
          }
          if (state2.gesture?.type === "rectangle" && state2.hover) {
            const a = state2.gesture.from, b = state2.hover;
            ctx.fillStyle = "#a4e9c733";
            ctx.strokeStyle = "#a4e9c7";
            ctx.lineWidth = 1.5;
            const x = view.x + Math.min(a.x, b.x) * view.scale, y = view.y + Math.min(a.y, b.y) * view.scale;
            const w = (Math.abs(a.x - b.x) + 1) * view.scale, h = (Math.abs(a.y - b.y) + 1) * view.scale;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
          }
          if (state2.pending) {
            highlight(state2.pending, "#d8c798");
            if (state2.hover) {
              ctx.strokeStyle = "#d8c798";
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(view.x + (state2.pending.x + 0.5) * view.scale, view.y + (state2.pending.y + 0.5) * view.scale);
              ctx.lineTo(view.x + (state2.hover.x + 0.5) * view.scale, view.y + (state2.hover.y + 0.5) * view.scale);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          const mw = minimap.clientWidth, mh = minimap.clientHeight;
          if (minimap.width !== Math.round(mw * dpr) || minimap.height !== Math.round(mh * dpr)) {
            minimap.width = Math.round(mw * dpr);
            minimap.height = Math.round(mh * dpr);
          }
          mini.setTransform(dpr, 0, 0, dpr, 0, 0);
          mini.clearRect(0, 0, mw, mh);
          const ms = Math.min((mw - 18) / cols, (mh - 16) / rows), mx = (mw - cols * ms) / 2, my = (mh - rows * ms) / 2;
          miniView = { x: mx, y: my, scale: ms };
          paintMap(mini, draft, mx, my, ms, false);
          mini.save();
          mini.beginPath();
          mini.rect(mx, my, cols * ms, rows * ms);
          mini.clip();
          mini.fillStyle = "#c5e7b51a";
          mini.strokeStyle = "#c2dfa8";
          mini.lineWidth = 1;
          const vx = mx - view.x / view.scale * ms, vy = my - view.y / view.scale * ms;
          mini.fillRect(vx, vy, width / view.scale * ms, height / view.scale * ms);
          mini.strokeRect(vx, vy, width / view.scale * ms, height / view.scale * ms);
          mini.restore();
          document.getElementById("zoom-value").textContent = `${Math.round(view.scale / view.fitScale * 100)}%`;
        }
        function draw() {
          if (!queued) {
            queued = true;
            requestAnimationFrame(render);
          }
        }
        const observer = new ResizeObserver(() => {
          if (!canvas2.clientWidth || !canvas2.clientHeight) return;
          const oldWidth = width, oldHeight = height;
          width = canvas2.clientWidth;
          height = canvas2.clientHeight;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          canvas2.width = Math.round(width * dpr);
          canvas2.height = Math.round(height * dpr);
          if (!oldWidth) fit();
          else {
            view.x += (width - oldWidth) / 2;
            view.y += (height - oldHeight) / 2;
            draw();
          }
        });
        observer.observe(canvas2);
        minimap.addEventListener("pointerdown", (event) => {
          const r = minimap.getBoundingClientRect();
          const [cols, rows] = SIZES2[getState().editor.draft.size];
          const x = Math.max(0, Math.min(cols, (event.clientX - r.left - miniView.x) / miniView.scale));
          const y = Math.max(0, Math.min(rows, (event.clientY - r.top - miniView.y) / miniView.scale));
          view.x = width / 2 - x * view.scale;
          view.y = height / 2 - y * view.scale;
          draw();
        });
        return { view, fit, zoom, cell, draw };
      }
      module.exports = { createMap: createMap2 };
    }
  });

  // src/movement.js
  var require_movement = __commonJS({
    "src/movement.js"(exports, module) {
      var { PLAYER_MAX_SPEED } = require_world();
      var { onSilentFloor } = require_devices();
      var MAX_FOOTSTEP_RADIUS = 8.5;
      function movementSpeed(strength) {
        const amount = Math.max(0, Math.min(1, strength));
        return 0.8 + amount * (PLAYER_MAX_SPEED - 0.8);
      }
      function stepMovement(world, control, dx, dy, strength, dt, movePlayer, emitSound, actor = world.player) {
        if (dt <= 0 || actor.alive === false || actor.escaped) return;
        const amount = Math.max(0, Math.min(1, strength));
        const speed = movementSpeed(amount);
        const fromX = actor.x;
        const fromY = actor.y;
        movePlayer(world, dx * speed * dt, dy * speed * dt);
        if (world.time >= control.footstepAt) {
          const radius = 0.95 + (MAX_FOOTSTEP_RADIUS - 0.95) * amount ** 2.4;
          emitSound(
            world,
            actor.x,
            actor.y,
            "footstep",
            onSilentFloor(world, actor) ? Math.min(1.25, radius) : radius,
            1,
            null,
            actor.id
          );
          const movedX = actor.x - fromX;
          const movedY = actor.y - fromY;
          if (world.footprints && Math.hypot(movedX, movedY) > 1e-3) {
            const angle = Math.atan2(movedY, movedX);
            const side = actor.nextFootprintSide || -1;
            world.footprints.push({
              x: actor.x - Math.sin(angle) * side * 0.16,
              y: actor.y + Math.cos(angle) * side * 0.16,
              angle,
              at: world.time,
              ownerId: actor.id
            });
            actor.nextFootprintSide = -side;
            if (actor === world.player) world.nextFootprintSide = -side;
          }
          control.footstepAt = world.time + 0.55 - amount * 0.27;
        }
      }
      module.exports = { stepMovement, movementSpeed, MAX_FOOTSTEP_RADIUS };
    }
  });

  // src/contours.js
  var require_contours = __commonJS({
    "src/contours.js"(exports, module) {
      var CELL_CHUNK = 16;
      var FIELD_CHUNKS = 512;
      var TOTAL_CHUNKS = 16384;
      var sampledFields = /* @__PURE__ */ new WeakMap();
      var sampledChunks = new Array(TOTAL_CHUNKS);
      var nextChunk = 0;
      function cellChunk(grid, x, y) {
        let chunks = sampledFields.get(grid);
        if (!chunks) {
          chunks = /* @__PURE__ */ new Map();
          sampledFields.set(grid, chunks);
        }
        const start = Math.floor(x / CELL_CHUNK) * CELL_CHUNK;
        const key = y * Math.ceil(grid.width / CELL_CHUNK) + start / CELL_CHUNK;
        let chunk = chunks.get(key);
        if (!chunk) {
          if (chunks.size >= FIELD_CHUNKS) return null;
          chunk = { start, readyCount: 0, min: Infinity, max: -Infinity, values: new Float64Array(CELL_CHUNK * 6), ready: new Uint8Array(CELL_CHUNK) };
          chunks.set(key, chunk);
          const oldest = sampledChunks[nextChunk];
          if (oldest) oldest.chunks.delete(oldest.key);
          sampledChunks[nextChunk] = { chunks, key };
          nextChunk = (nextChunk + 1) % TOTAL_CHUNKS;
        }
        return chunk;
      }
      function sampleCell(grid, x, y, chunk) {
        const i = chunk ? x - chunk.start : 0, offset = i * 6;
        const values = chunk ? chunk.values : new Float64Array(6);
        if (!chunk || !chunk.ready[i]) {
          values[offset] = grid.at(x, y);
          values[offset + 1] = grid.at(x + 1, y);
          values[offset + 2] = grid.at(x + 1, y + 1);
          values[offset + 3] = grid.at(x, y + 1);
          const a = values[offset], b = values[offset + 1], c = values[offset + 2], d = values[offset + 3];
          values[offset + 4] = Math.min(a, b, c, d);
          values[offset + 5] = Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d) ? Math.max(a, b, c, d) : -Infinity;
          if (chunk) {
            chunk.ready[i] = 1;
            chunk.readyCount++;
            if (values[offset + 5] !== -Infinity) {
              chunk.min = Math.min(chunk.min, values[offset + 4]);
              chunk.max = Math.max(chunk.max, values[offset + 5]);
            }
          }
        }
        return values;
      }
      function contourLines(field, threshold, clip) {
        const grid = field.visual || field;
        const size = grid.cellSize || 1;
        const segments = [];
        const bounds = grid.bounds;
        const minX = Math.max(
          0,
          (bounds?.minX ?? 0) - 1,
          clip ? Math.floor(clip.left / size - 0.5) - 1 : 0
        );
        const maxX = Math.min(
          grid.width - 2,
          bounds?.maxX ?? grid.width - 2,
          clip ? Math.ceil(clip.right / size - 0.5) + 1 : grid.width - 2
        );
        const minY = Math.max(
          0,
          (bounds?.minY ?? 0) - 1,
          clip ? Math.floor(clip.top / size - 0.5) - 1 : 0
        );
        const maxY = Math.min(
          grid.height - 2,
          bounds?.maxY ?? grid.height - 2,
          clip ? Math.ceil(clip.bottom / size - 0.5) + 1 : grid.height - 2
        );
        for (let y = minY; y <= maxY; y += 1) {
          let chunk;
          for (let x = minX; x <= maxX; x += 1) {
            if (x === minX || x % CELL_CHUNK === 0) chunk = cellChunk(grid, x, y);
            if (chunk && chunk.readyCount === CELL_CHUNK && !(chunk.min < threshold && chunk.max >= threshold)) {
              x = Math.min(maxX, chunk.start + CELL_CHUNK - 1);
              continue;
            }
            const values = sampleCell(grid, x, y, chunk);
            const offset = chunk ? (x - chunk.start) * 6 : 0;
            if (!(values[offset + 4] < threshold && values[offset + 5] >= threshold)) continue;
            const corners = [
              [(x + 0.5) * size, (y + 0.5) * size, values[offset]],
              [(x + 1.5) * size, (y + 0.5) * size, values[offset + 1]],
              [(x + 1.5) * size, (y + 1.5) * size, values[offset + 2]],
              [(x + 0.5) * size, (y + 1.5) * size, values[offset + 3]]
            ];
            const crossings = [];
            for (let edge = 0; edge < 4; edge += 1) {
              const a = corners[edge];
              const b = corners[(edge + 1) % 4];
              if (a[2] < threshold === b[2] < threshold) continue;
              const t = (threshold - a[2]) / (b[2] - a[2]);
              crossings[edge] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            }
            const edges = crossings.map((point, edge) => point && edge).filter((edge) => edge !== void 0);
            if (edges.length === 2) {
              segments.push([crossings[edges[0]], crossings[edges[1]]]);
            } else if (edges.length === 4) {
              const pairs = corners[0][2] < threshold ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
              for (const [a, b] of pairs) segments.push([crossings[a], crossings[b]]);
            }
          }
        }
        const key = (point) => `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
        const links = /* @__PURE__ */ new Map();
        segments.forEach((segment, index) => {
          for (let end = 0; end < 2; end += 1) {
            const id = key(segment[end]);
            if (!links.has(id)) links.set(id, []);
            links.get(id).push([index, end]);
          }
        });
        const used = /* @__PURE__ */ new Set();
        const lines = [];
        function extend(line, front) {
          while (true) {
            const candidates = links.get(key(front ? line[0] : line[line.length - 1])) || [];
            const next = candidates.find(([index2]) => !used.has(index2));
            if (!next) break;
            const [index, end] = next;
            used.add(index);
            const point = segments[index][1 - end];
            if (front) line.unshift(point);
            else line.push(point);
          }
        }
        segments.forEach((segment, index) => {
          if (used.has(index)) return;
          used.add(index);
          const line = [segment[0], segment[1]];
          extend(line, false);
          extend(line, true);
          lines.push(line);
        });
        return lines;
      }
      module.exports = { contourLines };
    }
  });

  // src/reveal-symbols.js
  var require_reveal_symbols = __commonJS({
    "src/reveal-symbols.js"(exports, module) {
      function drawAcousticSymbol(ctx, kind, x, y, size) {
        ctx.save();
        ctx.lineWidth = Math.max(1.1, size * 0.085);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (kind === "soundLock") {
          ctx.arc(x - size * 0.14, y, size * 0.14, 0, Math.PI * 2);
          ctx.moveTo(x, y);
          ctx.lineTo(x + size * 0.3, y);
          ctx.lineTo(x + size * 0.3, y + size * 0.13);
          ctx.moveTo(x + size * 0.18, y);
          ctx.lineTo(x + size * 0.18, y + size * 0.1);
          ctx.stroke();
          ctx.beginPath();
          for (const radius of [0.32, 0.47]) {
            ctx.moveTo(
              x - size * 0.14 + Math.cos(Math.PI * 0.68) * size * radius,
              y + Math.sin(Math.PI * 0.68) * size * radius
            );
            ctx.arc(x - size * 0.14, y, size * radius, Math.PI * 0.68, Math.PI * 1.32);
          }
        } else if (kind === "lockedExit") {
          ctx.arc(x, y - size * 0.06, size * 0.17, Math.PI, 0);
          ctx.rect(x - size * 0.24, y - size * 0.06, size * 0.48, size * 0.36);
          ctx.moveTo(x, y + size * 0.08);
          ctx.lineTo(x, y + size * 0.17);
        }
        ctx.stroke();
        ctx.restore();
      }
      module.exports = { drawAcousticSymbol };
    }
  });

  // src/mimic-draw.js
  var require_mimic_draw = __commonJS({
    "src/mimic-draw.js"(exports, module) {
      function drawMimicEffects(ctx, frames, viewport) {
        ctx.save();
        ctx.shadowBlur = 0;
        for (const frame of frames) {
          for (const point of frame.points) {
            if (point.alpha <= 0) continue;
            ctx.globalAlpha = point.alpha;
            ctx.fillStyle = "#ff6464";
            ctx.fillRect(viewport.left + point.x, viewport.top + point.y, point.size, point.size);
          }
          for (const cue of [frame.cue, ...frame.stepCues || []]) {
            if (!cue) continue;
            ctx.globalAlpha = cue.alpha;
            ctx.strokeStyle = "#c8d9d3";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
              viewport.left + cue.x,
              viewport.top + cue.y,
              cue.radius,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      module.exports = { drawMimicEffects };
    }
  });

  // src/render.js
  var require_render = __commonJS({
    "src/render.js"(exports, module) {
      var { contourLines } = require_contours();
      var { getGeometry } = require_geometry();
      var { FOOTPRINT_LIFETIME } = require_world();
      var { waveStyles } = require_acoustic_signatures();
      var { drawAcousticSymbol } = require_reveal_symbols();
      var { drawMimicEffects } = require_mimic_draw();
      var { enemyAlerted } = require_enemy_state();
      var hostileWaves = /* @__PURE__ */ new Set([
        "enemy",
        "spike",
        "bow",
        "arrow",
        "pit",
        "mineWarning",
        "mineBlast",
        "alarm",
        "sentinelCharge",
        "sentinel",
        "noisyFloor",
        "gateWarning",
        "gateClose",
        "gateOpen",
        "fragileWarning",
        "fragileFall",
        "fragileReset",
        "minePresence",
        "alarmPresence",
        "noisyPresence",
        "fragilePresence",
        "gatePresence"
      ]);
      var wallColors = ["180,228,226", "225,86,85", "228,173,79", "238,112,75"];
      var wallGlowColors = ["#b4e4e2", "#e15655", "#e4ad4f", "#ee704b"];
      function cameraFor(viewport, level, player) {
        const visibleWidth = viewport.width / viewport.size;
        const visibleHeight = viewport.height / viewport.size;
        return {
          x: Math.max(0, Math.min(level.width - visibleWidth, player.x - visibleWidth / 2)),
          y: Math.max(0, Math.min(level.height - visibleHeight, player.y - visibleHeight / 2))
        };
      }
      function waveAge(wave, now) {
        return wave.age ?? now - wave.start;
      }
      function effectTime(effect, now) {
        return effect.age == null ? now : effect.at + effect.age;
      }
      var wallGeometrySamples = /* @__PURE__ */ new WeakMap();
      var wallFieldSamples = /* @__PURE__ */ new WeakMap();
      var wallSampleEntries = /* @__PURE__ */ new Set();
      function wallSamples(geometry) {
        if (geometry.faces.length > 2048) return null;
        if (wallGeometrySamples.has(geometry)) return wallGeometrySamples.get(geometry);
        const samples = new Float64Array(geometry.faces.length * 4 * 6);
        geometry.faces.forEach((face, faceIndex) => {
          for (let segment = 0; segment < 4; segment++) {
            const start = segment / 4, end = (segment + 1) / 4, middle = (start + end) / 2;
            samples.set([
              face.x1 + (face.x2 - face.x1) * middle + face.nx * 0.03,
              face.y1 + (face.y2 - face.y1) * middle + face.ny * 0.03,
              face.x1 + (face.x2 - face.x1) * start,
              face.y1 + (face.y2 - face.y1) * start,
              face.x1 + (face.x2 - face.x1) * end,
              face.y1 + (face.y2 - face.y1) * end
            ], (faceIndex * 4 + segment) * 6);
          }
        });
        wallGeometrySamples.set(geometry, samples);
        return samples;
      }
      function wallDistance(field, samples, index, x, y) {
        let entry = wallFieldSamples.get(field);
        if (!entry || entry.samples !== samples || !entry.distances) {
          if (entry) wallSampleEntries.delete(entry);
          entry = { samples, distances: new Float64Array(samples.length / 6) };
          entry.distances.fill(NaN);
          wallFieldSamples.set(field, entry);
          wallSampleEntries.add(entry);
          if (wallSampleEntries.size > 128) {
            const oldest = wallSampleEntries.values().next().value;
            oldest.distances = null;
            wallSampleEntries.delete(oldest);
          }
        }
        if (Number.isNaN(entry.distances[index])) entry.distances[index] = field.at(x, y);
        return entry.distances[index];
      }
      function visibilityAt(waves, x, y, now, samples, sampleIndex) {
        let strength = 0;
        for (const wave of waves) {
          const travel = waveAge(wave, now) * wave.speed;
          if (travel < 0) continue;
          if (Number.isFinite(wave.x) && Number.isFinite(wave.y)) {
            const dx = x - wave.x;
            const dy = y - wave.y;
            const limit = wave.radius ? Math.min(travel, wave.radius) : travel;
            if (dx * dx + dy * dy > limit * limit) continue;
          }
          const distance = samples ? wallDistance(wave.field, samples, sampleIndex, x, y) : wave.field.at(x, y);
          if (!Number.isFinite(distance)) continue;
          const afterArrival = waveAge(wave, now) - distance / wave.speed;
          if (afterArrival >= 0 && afterArrival < 1) {
            const reach = wave.radius ? Math.max(0, 1 - distance / wave.radius) ** 0.8 : 1;
            strength = Math.max(strength, (1 - afterArrival) * reach);
          }
        }
        return strength;
      }
      function waveOpacity(wave, now) {
        if (!wave.radius) return 1;
        const progress = Math.max(0, waveAge(wave, now) * wave.speed / wave.radius);
        return progress >= 1 ? 0 : (1 - progress) ** 0.8;
      }
      function waveOpacityAt(wave, now, level, x, y) {
        const opacity = waveOpacity(wave, now);
        if (!level.pits?.size) return opacity;
        if (wave.type === "pit") {
          const rectangle = getGeometry(level).pitRectangles.find((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
          if (!rectangle) return 0;
          const edge = Math.min(
            x - rectangle.left,
            rectangle.right - x,
            y - rectangle.top,
            rectangle.bottom - y
          );
          return opacity * Math.min(1, Math.max(0, edge / 0.55));
        }
        return opacity * Math.min(1, getGeometry(level).pitDistance(x, y) / 0.55);
      }
      function enemyWallLightAt(enemies, geometry, x, y) {
        let strength = 0;
        for (const enemy of enemies) {
          const distance = Math.hypot(x - enemy.x, y - enemy.y);
          const light = (1 - distance / 3.1) * enemy.intensity;
          if (light <= strength || !geometry.visible(enemy.x, enemy.y, x, y)) continue;
          strength = light;
        }
        return strength;
      }
      function drawScene(ctx, l, world, ui = {}) {
        const fullReveal = !!(ui.developerAvailable && ui.fullReveal);
        const camera = ui.camera || cameraFor(l, world.level, world.player);
        const px = (x) => l.left + (x - camera.x) * l.size;
        const py = (y) => l.top + (y - camera.y) * l.size;
        const inView = (x, y, margin = 1) => x >= camera.x - margin && x <= camera.x + l.width / l.size + margin && y >= camera.y - margin && y <= camera.y + l.height / l.size + margin;
        ctx.save();
        ctx.beginPath();
        ctx.rect(l.left, l.top, l.width, l.height);
        ctx.clip();
        const now = world.time;
        const geometry = getGeometry(world.level);
        if (fullReveal) {
          ctx.fillStyle = "rgba(90,18,24,0.18)";
          ctx.strokeStyle = "#a04d54";
          ctx.lineWidth = 1;
          for (const pit of geometry.pitRectangles) {
            if (!inView(
              (pit.left + pit.right) / 2,
              (pit.top + pit.bottom) / 2,
              Math.max(pit.right - pit.left, pit.bottom - pit.top) / 2
            )) continue;
            const left = px(pit.left);
            const top = py(pit.top);
            const pitWidth = (pit.right - pit.left) * l.size;
            const pitHeight = (pit.bottom - pit.top) * l.size;
            ctx.fillRect(left, top, pitWidth, pitHeight);
            ctx.strokeRect(left, top, pitWidth, pitHeight);
          }
        }
        const perception = fullReveal ? null : ui.enemyPerception;
        const enemyLights = (perception ? perception.samples : world.enemies || []).filter((enemy) => enemy.type !== "mimic" && (enemy.opacity ?? 1) > 0 && inView(enemy.x, enemy.y, 4)).map((enemy) => {
          const alerted = enemyAlerted(enemy);
          const sampleTime = enemy.sampleTime ?? now;
          const phase = sampleTime * (alerted ? 9.2 : 5.2) + enemy.x * 1.7;
          const pulse = alerted ? 0.72 + 0.28 * Math.sin(phase) : 0.78 + 0.22 * Math.sin(phase);
          return { x: enemy.x, y: enemy.y, intensity: pulse * (alerted ? 0.38 : 0.32) * (enemy.opacity ?? 1) };
        });
        for (const mark of world.footprints || []) {
          const age = mark.age ?? now - mark.at;
          if (age < 0 || age >= FOOTPRINT_LIFETIME || !inView(mark.x, mark.y)) continue;
          const w = l.size * 0.11;
          const h = l.size * 0.24;
          ctx.save();
          ctx.translate(px(mark.x), py(mark.y));
          ctx.rotate(mark.angle + Math.PI / 2);
          ctx.globalAlpha = 0.48 * (1 - age / FOOTPRINT_LIFETIME);
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#bddbd5";
          ctx.beginPath();
          ctx.moveTo(-w * 0.55, h * 0.9);
          ctx.quadraticCurveTo(-w, h * 0.4, -w, -h * 0.3);
          ctx.quadraticCurveTo(-w * 0.85, -h, 0, -h);
          ctx.quadraticCurveTo(w * 0.85, -h, w, -h * 0.3);
          ctx.quadraticCurveTo(w, h * 0.55, w * 0.5, h * 0.9);
          ctx.quadraticCurveTo(0, h, -w * 0.55, h * 0.9);
          ctx.fill();
          ctx.restore();
        }
        for (const wave of world.waves) {
          if (wave.type === "enemy") continue;
          if (Number.isFinite(wave.x) && Number.isFinite(wave.y) && !inView(wave.x, wave.y, wave.radius + 1)) continue;
          const elapsed = waveAge(wave, now) * wave.speed;
          const opacity = waveOpacity(wave, now);
          if (opacity <= 0) continue;
          const hostile = hostileWaves.has(wave.type);
          const style = waveStyles[wave.type];
          const shape = style?.shape || "smooth";
          const rgb = style?.rgb || (hostile ? "226,75,77" : ["unlock", "exitUnlock", "sequenceCue", "sequenceDone", "sequenceReset"].includes(wave.type) ? "230,188,96" : wave.type === "bat" ? "240,105,145" : ["lure", "beacon", "decoy", "laser", "relay"].includes(wave.type) ? "143,230,223" : "210,240,237");
          ctx.lineWidth = wave.tone === "high" ? 1.3 : 1.7;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash?.(shape === "broken" ? [2.5, 3.5] : []);
          ctx.strokeStyle = `rgba(${rgb},${((hostile ? 0.58 : wave.type === "unlock" ? 0.35 : 0.8) * opacity * (wave.intensity ?? 1)).toFixed(2)})`;
          ctx.shadowColor = `rgba(${rgb},${(0.6 * opacity * (wave.intensity ?? 1)).toFixed(2)})`;
          ctx.shadowBlur = hostile ? 5 : 7;
          const pitSegments = world.level.pits?.size ? Array.from({ length: 8 }, () => []) : null;
          const fronts = shape === "double" && elapsed > 0.18 ? [elapsed, elapsed - 0.18] : [elapsed];
          for (const front of fronts) for (const line of contourLines(wave.field, front, {
            left: Number.isFinite(wave.x) ? Math.max(camera.x, wave.x - front) : camera.x,
            right: Number.isFinite(wave.x) ? Math.min(camera.x + l.width / l.size, wave.x + front) : camera.x + l.width / l.size,
            top: Number.isFinite(wave.y) ? Math.max(camera.y, wave.y - front) : camera.y,
            bottom: Number.isFinite(wave.y) ? Math.min(camera.y + l.height / l.size, wave.y + front) : camera.y + l.height / l.size
          })) {
            if (line.length < 2) continue;
            const toScreen = (point) => {
              if (shape !== "rough") return [px(point[0]), py(point[1])];
              const angle = Math.atan2(point[1] - wave.y, point[0] - wave.x);
              const offset = 0.045 * Math.sin(angle * 19 - (wave.age == null ? now : wave.start + wave.age) * 7);
              return [
                px(point[0] + Math.cos(angle) * offset),
                py(point[1] + Math.sin(angle) * offset)
              ];
            };
            if (pitSegments) {
              for (let i = 1; i < line.length; i += 1) {
                const from = line[i - 1];
                const to = line[i];
                const localOpacity = waveOpacityAt(
                  wave,
                  now,
                  world.level,
                  (from[0] + to[0]) / 2,
                  (from[1] + to[1]) / 2
                );
                if (localOpacity < 0.02) continue;
                const bucket = Math.min(
                  pitSegments.length - 1,
                  Math.floor(localOpacity / opacity * pitSegments.length)
                );
                pitSegments[bucket].push(from[0], from[1], to[0], to[1]);
              }
              continue;
            }
            const closed = line.length > 3 && Math.hypot(
              line[0][0] - line[line.length - 1][0],
              line[0][1] - line[line.length - 1][1]
            ) < 1e-3;
            ctx.beginPath();
            if (closed) {
              if (shape === "rough") {
                ctx.moveTo(...toScreen(line[0]));
                for (let i = 1; i < line.length; i += 1) ctx.lineTo(...toScreen(line[i]));
              } else {
                const last = toScreen(line[line.length - 2]);
                const first = toScreen(line[0]);
                ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
                for (let i = 0; i < line.length - 1; i += 1) {
                  const point = toScreen(line[i]);
                  const next = toScreen(line[i + 1]);
                  ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
                }
              }
              ctx.closePath();
            } else {
              const first = toScreen(line[0]);
              ctx.moveTo(first[0], first[1]);
              for (let i = 1; i < line.length - 1; i += 1) {
                const point = toScreen(line[i]);
                const next = toScreen(line[i + 1]);
                if (shape === "rough") ctx.lineTo(point[0], point[1]);
                else ctx.quadraticCurveTo(
                  point[0],
                  point[1],
                  (point[0] + next[0]) / 2,
                  (point[1] + next[1]) / 2
                );
              }
              const last = toScreen(line[line.length - 1]);
              ctx.lineTo(last[0], last[1]);
            }
            ctx.globalAlpha = front === elapsed ? 1 : 0.5;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          if (pitSegments) {
            for (let bucket = 0; bucket < pitSegments.length; bucket += 1) {
              const segments = pitSegments[bucket];
              if (!segments.length) continue;
              const fade = bucket === pitSegments.length - 1 ? 1 : (bucket + 0.5) / pitSegments.length;
              const alpha = opacity * fade * (wave.intensity ?? 1);
              ctx.strokeStyle = `rgba(${rgb},${((hostile ? 0.58 : 0.8) * alpha).toFixed(2)})`;
              ctx.shadowColor = `rgba(${rgb},${(0.6 * alpha).toFixed(2)})`;
              ctx.lineWidth = (wave.tone === "high" ? 1.3 : 1.7) * Math.max(0.25, fade);
              ctx.beginPath();
              for (let i = 0; i < segments.length; i += 4) {
                ctx.moveTo(px(segments[i]), py(segments[i + 1]));
                ctx.lineTo(px(segments[i + 2]), py(segments[i + 3]));
              }
              ctx.stroke();
            }
          }
          ctx.shadowBlur = 0;
          ctx.setLineDash?.([]);
        }
        if (perception) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.lineCap = "round";
          const directions = /* @__PURE__ */ new Map();
          for (const clue of perception.clues) {
            const key = `${clue.dx},${clue.dy}`, previous = directions.get(key);
            if (!previous || clue.urgent && !previous.urgent || clue.urgent === previous.urgent && clue.opacity > previous.opacity) directions.set(key, clue);
          }
          for (const clue of directions.values()) {
            const angle = Math.atan2(clue.dy, clue.dx);
            ctx.strokeStyle = clue.urgent ? "#eab199" : "#a98a8d";
            ctx.lineWidth = clue.urgent ? 1.5 : 1.1;
            for (let band = 0; band < 3; band++) {
              const phase = (now * 1.15 + band / 3) % 1;
              const radius = Math.max(13, l.size * 0.72) + (clue.response ? 1 - phase : phase) * Math.max(9, l.size * 0.45);
              ctx.globalAlpha = clue.opacity * Math.sin(phase * Math.PI) * 0.85;
              ctx.beginPath();
              for (let step = 0; step <= 16; step++) {
                const u = step / 16, theta = angle + (u - 0.5) * 1.05;
                const ripple = Math.sin(u * Math.PI * 6 - now * 9) * Math.sin(u * Math.PI) * 1.3;
                const x = px(world.player.x) + Math.cos(theta) * (radius + ripple);
                const y = py(world.player.y) + Math.sin(theta) * (radius + ripple);
                if (step) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
              }
              ctx.stroke();
            }
          }
          ctx.restore();
        }
        const whiteWaves = world.waves.filter((wave) => !hostileWaves.has(wave.type));
        const redWaves = world.waves.filter((wave) => wave.type !== "enemy" && hostileWaves.has(wave.type));
        const wallShades = 12;
        const wallSegments = Array.from({ length: wallShades * 4 }, () => []);
        const samples = wallSamples(geometry);
        for (let faceIndex = 0; faceIndex < geometry.faces.length; faceIndex++) {
          const face = geometry.faces[faceIndex];
          if (!inView((face.x1 + face.x2) / 2, (face.y1 + face.y2) / 2)) continue;
          for (let segment = 0; segment < 4; segment += 1) {
            const start = segment / 4;
            const end = (segment + 1) / 4;
            const middle = (start + end) / 2;
            const sampleIndex = faceIndex * 4 + segment, offset = sampleIndex * 6;
            const x = samples ? samples[offset] : face.x1 + (face.x2 - face.x1) * middle + face.nx * 0.03;
            const y = samples ? samples[offset + 1] : face.y1 + (face.y2 - face.y1) * middle + face.ny * 0.03;
            const white = fullReveal ? 0.7 : visibilityAt(whiteWaves, x, y, now, samples, sampleIndex);
            const enemyLight = enemyWallLightAt(enemyLights, geometry, x, y);
            const enemyTint = enemyLight >= 0.03;
            const red = Math.max(visibilityAt(redWaves, x, y, now, samples, sampleIndex), enemyLight);
            if (Math.max(white, red) < 0.03) continue;
            const isRed = enemyTint || red > white;
            const shade = Math.min(
              wallShades - 1,
              Math.floor((isRed ? red : white) * wallShades)
            );
            const palette = enemyTint ? 1 : face.mechanismWall ? isRed ? 3 : 2 : isRed ? 1 : 0;
            wallSegments[palette * wallShades + shade].push(
              samples ? samples[offset + 2] : face.x1 + (face.x2 - face.x1) * start,
              samples ? samples[offset + 3] : face.y1 + (face.y2 - face.y1) * start,
              samples ? samples[offset + 4] : face.x1 + (face.x2 - face.x1) * end,
              samples ? samples[offset + 5] : face.y1 + (face.y2 - face.y1) * end
            );
          }
        }
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.5;
        for (let index = 0; index < wallSegments.length; index += 1) {
          const segments = wallSegments[index];
          if (!segments.length) continue;
          const palette = Math.floor(index / wallShades);
          const shade = index % wallShades;
          const brightness = shade === wallShades - 1 ? 1 : (shade + 0.5) / wallShades;
          ctx.strokeStyle = `rgba(${wallColors[palette]},${(brightness * (palette === 2 ? 0.9 : palette === 0 ? 0.82 : 0.72)).toFixed(2)})`;
          ctx.shadowColor = wallGlowColors[palette];
          ctx.beginPath();
          for (let i = 0; i < segments.length; i += 4) {
            ctx.moveTo(px(segments[i]), py(segments[i + 1]));
            ctx.lineTo(px(segments[i + 2]), py(segments[i + 3]));
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.strokeStyle = "#a1d7c5";
        ctx.lineWidth = 1.5;
        ctx.setLineDash?.([l.size * 0.25, l.size * 0.17]);
        for (const face of geometry.fenceFaces) {
          const x = (face.x1 + face.x2) / 2;
          const y = (face.y1 + face.y2) / 2;
          if (!inView(x, y)) continue;
          const light = fullReveal ? 0.85 : visibilityAt(
            world.waves,
            x + face.nx * 0.03,
            y + face.ny * 0.03,
            now
          );
          if (light < 0.03) continue;
          ctx.globalAlpha = light;
          ctx.beginPath();
          ctx.moveTo(px(face.x1), py(face.y1));
          ctx.lineTo(px(face.x2), py(face.y2));
          ctx.stroke();
        }
        ctx.restore();
        if (fullReveal) {
          for (const [items, color] of [
            [world.mines, "#e15655"],
            [world.alarms, "#ee704b"],
            [world.spikes, "#ee704b"],
            [world.launchers, "#e15655"],
            [world.gates, "#e4ad4f"],
            [world.beacons, "#8fe6df"],
            [world.decoys, "#8fe6df"],
            [world.relays, "#8fe6df"],
            [world.lasers, "#8fe6df"]
          ]) {
            ctx.fillStyle = color;
            for (const item of items || []) {
              if (!inView(item.x, item.y)) continue;
              ctx.beginPath();
              ctx.arc(px(item.x), py(item.y), l.size * 0.12, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        const drawHatchedFloor = (item, rgb, reverse = false) => {
          if (!inView(item.x, item.y)) return;
          const light = fullReveal ? 1 : visibilityAt(world.waves, item.x, item.y, now);
          if (light < 0.03) return;
          const left = Math.floor(item.x) + 0.11;
          const top = Math.floor(item.y) + 0.11;
          const side = 0.78;
          ctx.strokeStyle = `rgba(${rgb},${(light * 0.78).toFixed(2)})`;
          ctx.lineWidth = reverse ? 1.4 : 1;
          ctx.beginPath();
          for (let i = 1; i <= (reverse ? 5 : 7); i += 1) {
            const diagonal = i * side / (reverse ? 3 : 4);
            const startX = Math.max(0, diagonal - side);
            const endX = Math.min(side, diagonal);
            const startY = diagonal - startX;
            const endY = diagonal - endX;
            ctx.moveTo(px(left + startX), py(top + (reverse ? side - startY : startY)));
            ctx.lineTo(px(left + endX), py(top + (reverse ? side - endY : endY)));
          }
          ctx.stroke();
          return light;
        };
        for (const item of world.silentFloors || []) drawHatchedFloor(item, "185,196,195");
        for (const item of world.fragileFloors || []) {
          const light = drawHatchedFloor(item, "145,58,58");
          if (ui.mode !== "campaign" || item.phase !== "warning" || !light) continue;
          const x = Math.floor(item.x), y = Math.floor(item.y);
          ctx.strokeStyle = `rgba(242,152,117,${(light * 0.88).toFixed(2)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px(x + 0.19), py(y + 0.22));
          ctx.lineTo(px(x + 0.43), py(y + 0.46));
          ctx.lineTo(px(x + 0.56), py(y + 0.4));
          ctx.lineTo(px(x + 0.8), py(y + 0.77));
          ctx.moveTo(px(x + 0.43), py(y + 0.46));
          ctx.lineTo(px(x + 0.32), py(y + 0.75));
          ctx.stroke();
        }
        for (const item of world.noisyFloors || []) drawHatchedFloor(item, "118,38,48", true);
        const drawRevealedRing = (x, y, rgb, label, symbol) => {
          if (!inView(x, y)) return;
          const light = fullReveal ? 1 : visibilityAt(world.waves, x, y, now);
          if (light < 0.03) return;
          ctx.strokeStyle = `rgba(${rgb},${(light * 0.9).toFixed(2)})`;
          ctx.lineWidth = 1.5;
          for (const radius of symbol ? [0.42, 0.58] : [0.29, 0.42]) {
            ctx.beginPath();
            ctx.arc(px(x), py(y), l.size * radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (symbol) drawAcousticSymbol(ctx, symbol, px(x), py(y), l.size);
          if (label) {
            ctx.fillStyle = `rgba(${rgb},${light.toFixed(2)})`;
            ctx.font = "600 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, px(x), py(y));
          }
        };
        if (world.level.mechanism) drawRevealedRing(
          ...world.level.mechanism,
          world.mechanismActive ? "167,240,202" : "230,188,96",
          null,
          "soundLock"
        );
        if (world.level.exit) drawRevealedRing(
          ...world.level.exit,
          world.unlocked ? "167,240,202" : "230,188,96",
          null,
          world.unlocked ? null : "lockedExit"
        );
        if (world.sequence && !world.sequence.complete) (world.sequence.nodes || []).forEach((node, index) => drawRevealedRing(
          node.x,
          node.y,
          index === 0 && world.sequence.progress > 0 ? "167,240,202" : "230,188,96",
          String(index + 1)
        ));
        for (const laser of world.lasers || []) {
          drawRevealedRing(laser.x, laser.y, "112,215,222");
        }
        for (const beam of world.laserBeams || []) {
          const alpha = Math.min(1, Math.max(0, (beam.until - effectTime(beam, now)) / 0.4));
          ctx.strokeStyle = `rgba(143,230,223,${(alpha * 0.8).toFixed(2)})`;
          ctx.shadowColor = "#8fe6df";
          ctx.shadowBlur = 12;
          ctx.lineWidth = 2.3;
          for (const segment of beam.segments) {
            if (!inView(
              (segment.fromX + segment.toX) / 2,
              (segment.fromY + segment.toY) / 2,
              Math.hypot(
                segment.toX - segment.fromX,
                segment.toY - segment.fromY
              ) / 2
            )) continue;
            ctx.beginPath();
            ctx.moveTo(px(segment.fromX), py(segment.fromY));
            ctx.lineTo(px(segment.toX), py(segment.toY));
            ctx.stroke();
          }
        }
        for (const glow of world.wallGlows || []) {
          if (!inView((glow.x1 + glow.x2) / 2, (glow.y1 + glow.y2) / 2)) continue;
          const alpha = Math.min(1, Math.max(0, glow.until - effectTime(glow, now)));
          ctx.strokeStyle = `rgba(143,230,223,${(alpha * 0.86).toFixed(2)})`;
          ctx.shadowColor = "#8fe6df";
          ctx.shadowBlur = 14;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(px(glow.x1), py(glow.y1));
          ctx.lineTo(px(glow.x2), py(glow.y2));
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(l.left, l.top, l.width, l.height);
        ctx.clip();
        for (const lure of world.lures || []) {
          const arrivalTime = lure.duration ?? lure.distance / lure.speed;
          const elapsed = Math.max(0, waveAge(lure, now));
          if (elapsed >= (lure.trailUntil == null ? arrivalTime + 0.45 : lure.trailUntil - lure.start)) continue;
          const traveled = lure.duration == null ? Math.min(lure.distance, elapsed * lure.speed) : elapsed >= lure.duration ? lure.distance : lure.segments.reduce((covered, segment) => {
            if (elapsed >= segment.endTime) return segment.startDistance + segment.distance;
            if (elapsed <= segment.startTime) return covered;
            const t = elapsed - segment.startTime;
            return segment.startDistance + Math.min(
              segment.distance,
              segment.startSpeed * t - segment.deceleration * t * t / 2
            );
          }, 0);
          const tail = Math.max(0, traveled - 2.4);
          const segments = lure.segments || [{
            fromX: lure.fromX,
            fromY: lure.fromY,
            toX: lure.toX,
            toY: lure.toY,
            startDistance: 0,
            distance: lure.distance
          }];
          const pointAt = (distance) => {
            const segment = segments.find((part) => distance <= part.startDistance + part.distance) || segments[segments.length - 1];
            const progress = segment.distance ? Math.max(0, Math.min(1, (distance - segment.startDistance) / segment.distance)) : 1;
            return [
              px(segment.fromX + (segment.toX - segment.fromX) * progress),
              py(segment.fromY + (segment.toY - segment.fromY) * progress)
            ];
          };
          for (const segment of segments) {
            const visibleStart = Math.max(tail, segment.startDistance);
            const visibleEnd = Math.min(traveled, segment.startDistance + segment.distance);
            for (let part = 0; part < 4; part += 1) {
              const from = visibleStart + (visibleEnd - visibleStart) * part / 4;
              const to = visibleStart + (visibleEnd - visibleStart) * (part + 1) / 4;
              if (to - from < 0.01) continue;
              const start = pointAt(from);
              const end = pointAt(to);
              const brightness = traveled > tail ? (to - tail) / (traveled - tail) : 1;
              ctx.strokeStyle = `rgba(132,211,227,${(0.12 + brightness * 0.42).toFixed(2)})`;
              ctx.lineWidth = 1.2 + brightness * 0.6;
              ctx.beginPath();
              ctx.moveTo(...start);
              ctx.lineTo(...end);
              ctx.stroke();
            }
          }
          if (!lure.arrived && elapsed < arrivalTime) {
            const head = pointAt(traveled);
            ctx.fillStyle = "rgba(177,237,244,0.85)";
            ctx.shadowColor = "#84d3e3";
            ctx.shadowBlur = 7;
            ctx.beginPath();
            ctx.arc(...head, l.size * 0.09, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
        ctx.restore();
        for (const stone of world.stones || []) {
          if (!inView(stone.x, stone.y)) continue;
          const light = fullReveal ? 1 : visibilityAt(world.waves, stone.x, stone.y, now);
          if (light <= 0) continue;
          ctx.save();
          ctx.globalAlpha = light;
          ctx.strokeStyle = "#e8d49b";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#e8d49b";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(px(stone.x), py(stone.y), l.size * 0.12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        drawMimicEffects(ctx, ui.mimicFrames || [], l);
        const playerX = px(world.player.x);
        const playerY = py(world.player.y);
        ctx.save();
        if (ui.hidePlayer) ctx.globalAlpha = 0;
        ctx.shadowColor = "#d4ffff";
        ctx.shadowBlur = 19;
        ctx.fillStyle = "#ebffff";
        ctx.beginPath();
        ctx.arc(playerX, playerY, l.size * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (Number.isFinite(ui.probeCharge) && !ui.hidePlayer) {
          const charge = Math.max(0, Math.min(1, ui.probeCharge));
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(201,241,230,0.18)";
          ctx.beginPath();
          ctx.arc(playerX, playerY, l.size * 0.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#c9f1e6";
          ctx.beginPath();
          ctx.arc(playerX, playerY, l.size * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
          ctx.stroke();
          ctx.restore();
        }
        if (ui.touch && ui.touch.action === 1 && world.stonesHeld !== 0) {
          let dx = ui.touch.x - ui.touch.startX;
          let dy = ui.touch.y - ui.touch.startY;
          const magnitude = Math.hypot(dx, dy);
          if (magnitude < 8) {
            dx = 0;
            dy = -1;
          } else {
            dx /= magnitude;
            dy /= magnitude;
          }
          ctx.save();
          ctx.beginPath();
          ctx.rect(l.left, l.top, l.width, l.height);
          ctx.clip();
          const startX = playerX + dx * l.size * 0.38;
          const startY = playerY + dy * l.size * 0.38;
          const tipX = playerX + dx * l.size * 2.6;
          const tipY = playerY + dy * l.size * 2.6;
          ctx.strokeStyle = "rgba(132,211,227,0.10)";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          ctx.strokeStyle = "rgba(132,211,227,0.36)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          ctx.strokeStyle = "rgba(132,211,227,0.48)";
          ctx.lineWidth = 1.25;
          const wing = l.size * 0.28;
          const backX = tipX - dx * wing;
          const backY = tipY - dy * wing;
          ctx.beginPath();
          ctx.moveTo(backX - dy * wing * 0.45, backY + dx * wing * 0.45);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(backX + dy * wing * 0.45, backY - dx * wing * 0.45);
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + dx * wing * 0.25, tipY + dy * wing * 0.25);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      module.exports = { drawScene, cameraFor };
    }
  });

  // src/atmosphere-acoustics.js
  var require_atmosphere_acoustics = __commonJS({
    "src/atmosphere-acoustics.js"(exports, module) {
      var { getGeometry } = require_geometry();
      var { onSilentFloor } = require_devices();
      var ROUTE_RANGE = 18;
      var DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      var unit = (value) => Math.max(0, Math.min(1, value));
      var panFor = (dx, dy) => 0.75 * dx / Math.max(1, Math.hypot(dx, dy));
      function roomAt(geometry, x, y) {
        const clearances = DIRECTIONS.map(([dx, dy]) => {
          let steps = 0;
          while (steps < 5 && !geometry.obstacleAt(x + dx * (steps + 1), y + dy * (steps + 1))) steps++;
          return steps;
        });
        const shortSpan = 1 + Math.min(clearances[0] + clearances[1], clearances[2] + clearances[3]);
        return unit((shortSpan - 3) / 3);
      }
      function surfaceAt(world, wave) {
        if (onSilentFloor(world, wave)) return "silent";
        const x = Math.floor(wave.x), y = Math.floor(wave.y);
        const matches = (floor) => Math.floor(floor.x) === x && Math.floor(floor.y) === y;
        if (world.fragileFloors?.some((floor) => floor.phase !== "collapsed" && matches(floor))) return "fragile";
        if (world.noisyFloors?.some(matches)) return "noisy";
        return "floor";
      }
      function nearbySoundRoutes(level, geometry, x, y) {
        const { width, height } = level;
        const start = y * width + x;
        const steps = new Uint8Array(width * height);
        const parents = new Int32Array(steps.length);
        const queue = [start];
        steps[start] = 1;
        for (let head = 0; head < queue.length; head++) {
          const cell = queue[head];
          if (steps[cell] > ROUTE_RANGE) continue;
          for (const [dx, dy] of DIRECTIONS) {
            const nextX = cell % width + dx, nextY = Math.floor(cell / width) + dy;
            if (geometry.obstacleAt(nextX, nextY)) continue;
            const next = nextY * width + nextX;
            if (steps[next]) continue;
            steps[next] = steps[cell] + 1;
            parents[next] = cell;
            queue.push(next);
          }
        }
        return { steps, parents, start };
      }
      function createSceneAcoustics() {
        let world, level, geometry, listenerX, listenerY, routes, roomOpenness, targetRoom, blend;
        let enemyMix = /* @__PURE__ */ new WeakMap();
        function update(nextWorld, dt) {
          const changedWorld = nextWorld !== world;
          world = nextWorld;
          const x = Math.floor(world.player.x), y = Math.floor(world.player.y);
          if (changedWorld || world.level !== level || x !== listenerX || y !== listenerY) {
            level = world.level;
            geometry = getGeometry(level);
            listenerX = x;
            listenerY = y;
            routes = null;
            targetRoom = roomAt(geometry, x, y);
          }
          blend = 1 - Math.exp(-dt / 0.18);
          if (changedWorld) {
            roomOpenness = targetRoom;
            enemyMix = /* @__PURE__ */ new WeakMap();
          } else roomOpenness += (targetRoom - roomOpenness) * blend;
        }
        function waveOptions(wave) {
          if (wave.type === "footstep") return { surface: surfaceAt(world, wave), roomOpenness };
          if (wave.type === "probe") return { roomOpenness };
        }
        function enemySound(enemy) {
          const { player } = world;
          const dx = enemy.x - player.x, dy = enemy.y - player.y;
          const directDistance = Math.hypot(dx, dy);
          let distance = directDistance, occlusion = 0, pan = panFor(dx, dy);
          if (!geometry.visible(player.x, player.y, enemy.x, enemy.y)) {
            const x = Math.floor(enemy.x), y = Math.floor(enemy.y);
            if (directDistance > ROUTE_RANGE || geometry.obstacleAt(x, y)) return null;
            routes ||= nearbySoundRoutes(level, geometry, listenerX, listenerY);
            const source = y * level.width + x;
            const steps = routes.steps[source];
            if (!steps) return null;
            distance = Math.max(directDistance, steps - 1);
            occlusion = 0.43 + 0.27 * unit((distance - directDistance) / 9);
            for (let cell = source; cell !== routes.start; cell = routes.parents[cell]) {
              const px = cell % level.width + 0.5, py = Math.floor(cell / level.width) + 0.5;
              if (geometry.visible(player.x, player.y, px, py)) {
                pan = panFor(px - player.x, py - player.y);
                break;
              }
            }
          }
          const previous = enemyMix.get(enemy);
          if (previous) {
            distance = previous.distance + (distance - previous.distance) * blend;
            occlusion = previous.occlusion + (occlusion - previous.occlusion) * blend;
            pan = previous.pan + (pan - previous.pan) * blend;
          }
          const mix = { distance, occlusion, pan };
          enemyMix.set(enemy, mix);
          return mix;
        }
        return { update, waveOptions, enemySound };
      }
      module.exports = { createSceneAcoustics };
    }
  });

  // src/scene-audio.js
  var require_scene_audio = __commonJS({
    "src/scene-audio.js"(exports, module) {
      var { isPresence } = require_acoustic_signatures();
      var { createSceneAcoustics } = require_atmosphere_acoustics();
      var globalResponseWaves = /* @__PURE__ */ new Set([
        "unlock",
        "exitUnlock",
        "sequenceCue",
        "sequenceDone",
        "sequenceReset",
        "relay",
        "gateWarning",
        "gateClose",
        "gateOpen",
        "decoy",
        "laser"
      ]);
      function playSceneWave(audio, wave, player, viewport, camera, acoustics) {
        const play = (name, volume) => {
          const distance = Math.hypot(wave.x - player.x, wave.y - player.y);
          const visible = wave.x >= camera.x && wave.x <= camera.x + viewport.width / viewport.size && wave.y >= camera.y && wave.y <= camera.y + viewport.height / viewport.size;
          audio.play(name, volume, {
            distance,
            visible,
            global: globalResponseWaves.has(wave.type),
            sourceX: wave.x,
            sourceY: wave.y,
            ...acoustics?.waveOptions(wave)
          });
        };
        if (wave.audioSilent) return;
        if (["sniper", "shotgun", "dagger"].includes(wave.type)) play(wave.type, 0.5);
        else if (wave.type === "footstep") play("step", 6e-3 + Math.max(0, Math.min(1, (wave.radius - 0.95) / 7.55)) * 0.45);
        else if (wave.type === "probe") play("probe", 0.1 + 0.8 * (wave.intensity ?? 1));
        else if (wave.type === "lure") play("lure", 0.2 + 0.55 * (wave.intensity ?? 1));
        else if (wave.type === "landing") play("landing", 0.16 + 0.4 * (wave.intensity ?? 1));
        else if (wave.type === "pickup") play("pickup", 0.36);
        else if (wave.type === "unlock") play("unlock", 0.32);
        else if (wave.type === "exitUnlock") play("exitUnlock", 0.3);
        else if (wave.type === "spike") play("spike", 0.48);
        else if (wave.type === "bow") play("bow", 0.45);
        else if (wave.type === "arrow") play("arrow", 0.3);
        else if (wave.type === "bat") play("bat", 0.47);
        else if (wave.type === "mineWarning") play("mineWarning", 0.43);
        else if (wave.type === "mineBlast") play("mineBlast", 0.65);
        else if (wave.type === "alarm") play("alarm", 0.58);
        else if (wave.type === "sentinel") play("sentinel", 0.48);
        else if (wave.type === "noisyFloor") play("noisyFloor", 0.48);
        else if (wave.type === "beacon") play("beacon", 0.2);
        else if (wave.type === "decoy") play("decoy", 0.48);
        else if (wave.type === "gateWarning") play("gateWarning", 0.34);
        else if (wave.type === "gateClose") play("gateClose", 0.44);
        else if (wave.type === "gateOpen") play("gateOpen", 0.34);
        else if (wave.type === "fragileWarning") play("fragileWarning", 0.3);
        else if (wave.type === "fragileFall") play("fragileFall", 0.45);
        else if (wave.type === "fragileReset") play("fragileReset", 0.32);
        else if (wave.type === "laser") play("laser", 0.46);
        else if (wave.type === "relay") play(wave.audioCue || "probe", 0.38);
        else if (wave.type === "sequenceCue") play("sequenceCue", 0.35);
        else if (wave.type === "sequenceDone") play("sequenceDone", 0.48);
        else if (wave.type === "sequenceReset") play("sequenceReset", 0.32);
        else if (wave.type === "reflection") play("reflection", 0.52);
        else if (isPresence(wave.type) && wave.type !== "decoyPresence") play(
          wave.type,
          wave.type === "alarmPresence" ? 0.15 : wave.type.includes("exit") || wave.type === "lockPresence" ? 0.14 : 0.1
        );
      }
      function stopSceneLoops(audio) {
        audio.setEnemy(null);
        audio.setDecoys([]);
        audio.setPits([]);
        audio.stopMimics?.();
      }
      function updateMimicSceneAudio(audio, world, events, viewport, camera, dt) {
        const spatial = (source) => ({
          distance: Math.hypot(source.x - world.player.x, source.y - world.player.y),
          visible: source.x >= camera.x && source.x <= camera.x + viewport.width / viewport.size && source.y >= camera.y && source.y <= camera.y + viewport.height / viewport.size
        });
        for (const event of events) audio.playMimic(event, spatial(event));
        const sources = world.enemies.filter((enemy) => enemy.type === "mimic").map((enemy) => ({ enemyId: enemy.mimic.id, x: enemy.x, y: enemy.y, ...spatial(enemy) }));
        audio.updateMimics(sources, dt);
      }
      function updateSceneLoops(audio, world, viewport, camera, acoustics) {
        let nearestEnemy = null;
        for (const enemy of world.enemies) {
          if (enemy.type === "mimic") continue;
          const mix = acoustics?.enemySound(enemy);
          if (acoustics && !mix) continue;
          const distance = mix?.distance ?? Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
          if (nearestEnemy && distance >= nearestEnemy.distance) continue;
          const visible = enemy.x >= camera.x && enemy.x <= camera.x + viewport.width / viewport.size && enemy.y >= camera.y && enemy.y <= camera.y + viewport.height / viewport.size;
          nearestEnemy = { distance, visible, type: enemy.type, mode: enemy.mode, mix };
        }
        const enemyOptions = nearestEnemy?.mix ? [{ occlusion: nearestEnemy.mix.occlusion, pan: nearestEnemy.mix.pan }] : [];
        audio.setEnemy(
          nearestEnemy?.distance,
          nearestEnemy?.visible,
          nearestEnemy?.type,
          nearestEnemy?.mode,
          ...enemyOptions
        );
        audio.setDecoys((world.decoys || []).map((decoy) => ({
          x: decoy.x,
          y: decoy.y,
          distance: Math.hypot(decoy.x - world.player.x, decoy.y - world.player.y),
          visible: decoy.x >= camera.x && decoy.x <= camera.x + viewport.width / viewport.size && decoy.y >= camera.y && decoy.y <= camera.y + viewport.height / viewport.size
        })));
        audio.setPits((world.pitSources || []).map((source) => ({
          x: source.x,
          y: source.y,
          distance: Math.hypot(source.x - world.player.x, source.y - world.player.y),
          visible: source.x >= camera.x && source.x <= camera.x + viewport.width / viewport.size && source.y >= camera.y && source.y <= camera.y + viewport.height / viewport.size
        })));
      }
      module.exports = { createSceneAcoustics, playSceneWave, updateSceneLoops, updateMimicSceneAudio, stopSceneLoops };
    }
  });

  // src/mimic-reveal.js
  var require_mimic_reveal = __commonJS({
    "src/mimic-reveal.js"(exports, module) {
      var clamp = (value) => Math.max(0, Math.min(1, value));
      var smooth = (value) => {
        const u = clamp(value);
        return u * u * (3 - 2 * u);
      };
      var REVEAL_DISTANCE = 5;
      var FULL_REVEAL_DISTANCE = 2;
      var seed = 2221713035;
      var random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
      };
      var clouds = [
        { x: 0.12, y: 0.2, sx: 0.17, sy: 0.1 },
        { x: 0.73, y: 0.12, sx: 0.12, sy: 0.17 },
        { x: 0.46, y: 0.53, sx: 0.13, sy: 0.18 },
        { x: 0.85, y: 0.81, sx: 0.17, sy: 0.11 },
        { x: 0.13, y: 0.85, sx: 0.12, sy: 0.15 }
      ];
      var particles = Object.freeze(Array.from({ length: 1200 }, () => {
        const cloud = clouds[Math.floor(random() * clouds.length)];
        const tail = Math.sqrt(-2 * Math.log(Math.max(1e-6, random()))), direction = random() * Math.PI * 2;
        const gx = Math.cos(direction) * tail, gy = Math.sin(direction) * tail;
        const x = cloud.x + gx * cloud.sx + gy * 0.06, y = cloud.y + gy * cloud.sy + Math.sin(gx * 2) * 0.06;
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random()) * (0.28 + 0.12 * Math.sin(angle * 3 + 0.4) + 0.09 * Math.cos(angle * 5));
        return Object.freeze({
          x,
          y,
          dx: Math.cos(angle) * radius,
          dy: Math.sin(angle) * radius,
          delay: random() * 0.2,
          size: 0.5 + random() * 0.8,
          alpha: 0.2 + random() * 0.55,
          phase: random() * Math.PI * 2
        });
      }));
      function createBrownianMotion(seed2 = 3039394381) {
        const offsets = particles.map(() => ({ x: 0, y: 0 }));
        let randomState = seed2, accumulator = 0;
        const noise = () => {
          randomState ^= randomState << 13;
          randomState ^= randomState >>> 17;
          randomState ^= randomState << 5;
          return (randomState >>> 0) / 2147483648 - 1;
        };
        const impulse = () => (noise() + noise() + noise()) * 0.16;
        return { offsets, advance(seconds) {
          if (!Number.isFinite(seconds) || seconds <= 0) return;
          accumulator += Math.min(0.1, seconds);
          while (accumulator + 1e-9 >= 1 / 60) {
            for (const p of offsets) {
              p.x = Math.max(-1.5, Math.min(1.5, p.x * 0.96 + impulse()));
              p.y = Math.max(-1.5, Math.min(1.5, p.y * 0.96 + impulse()));
            }
            accumulator = Math.max(0, accumulator - 1 / 60);
          }
        } };
      }
      function particleFrame({ distance, width, height, cell, enemyX, enemyY, time, motion }) {
        if (distance >= REVEAL_DISTANCE || !Number.isFinite(distance)) return { points: [], opacity: 0, progress: 0 };
        const progress = clamp((REVEAL_DISTANCE - distance) / (REVEAL_DISTANCE - FULL_REVEAL_DISTANCE)), opacity = smooth(progress / 0.32);
        const jitterRadius = cell * (0.012 + 0.24 * progress ** 1.4);
        const points = particles.map((p, i) => {
          const gather = smooth((progress + 0.04 - p.delay) / (1.04 - p.delay));
          const drift = Math.sin(time * 0.8 + p.phase) * 1.5;
          const x = p.x * width + drift;
          const y = p.y * height + Math.cos(time * 0.6 + p.phase) * 1.5;
          const px = x + (enemyX + p.dx * cell - x) * gather + (motion?.[i]?.x ?? 0) * jitterRadius;
          const py = y + (enemyY + p.dy * cell - y) * gather + (motion?.[i]?.y ?? 0) * jitterRadius;
          const edge = smooth(Math.min(px, width - px, py, height - py) / (Math.min(width, height) * 0.035));
          return {
            x: Math.max(0, Math.min(width, px)),
            y: Math.max(0, Math.min(height, py)),
            size: p.size * (1 - gather * 0.35),
            alpha: p.alpha * opacity * edge
          };
        });
        return { points, opacity, progress };
      }
      module.exports = { particleFrame, createBrownianMotion, REVEAL_DISTANCE, FULL_REVEAL_DISTANCE };
    }
  });

  // src/mimic-presentation.js
  var require_mimic_presentation = __commonJS({
    "src/mimic-presentation.js"(exports, module) {
      var { particleFrame, createBrownianMotion } = require_mimic_reveal();
      function seedFor(key) {
        let seed = 2166136261;
        for (const character of String(key)) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
        return seed >>> 0 || 3039394381;
      }
      function cueFrame(cue, now, viewport, camera) {
        if (!cue) return null;
        const age = now - cue.at, lifetime = cue.radius / cue.speed;
        if (age < 0 || age > lifetime) return null;
        return {
          x: (cue.x - camera.x) * viewport.size,
          y: (cue.y - camera.y) * viewport.size,
          radius: age * cue.speed * viewport.size,
          alpha: 0.7 * (1 - age / lifetime)
        };
      }
      function createMimicPresentation() {
        const instances = /* @__PURE__ */ new Map();
        let wasActive = false;
        function update(world, viewport, camera, dt, active) {
          const elapsed = active && wasActive && Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
          wasActive = !!active;
          const current = /* @__PURE__ */ new Set(), frames = [];
          for (const [index, enemy] of (world.enemies || []).entries()) {
            if (enemy.type !== "mimic") continue;
            const key = enemy.mimic?.id ?? enemy.id ?? "npc:" + index;
            current.add(key);
            let instance = instances.get(key);
            if (!instance) {
              instance = { motion: createBrownianMotion(seedFor(key)), time: 0 };
              instances.set(key, instance);
            } else {
              const motionTime = enemy.mode === "fast" && enemy.mimic?.triggerKind === "footstep" ? elapsed * 1.8 : elapsed;
              instance.time += motionTime;
              instance.motion.advance(motionTime);
            }
            const { points } = particleFrame({
              distance: Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y),
              width: viewport.width,
              height: viewport.height,
              cell: viewport.size,
              enemyX: (enemy.x - camera.x) * viewport.size,
              enemyY: (enemy.y - camera.y) * viewport.size,
              time: instance.time,
              motion: instance.motion.offsets
            });
            frames.push({
              enemyId: key,
              points,
              cue: cueFrame(enemy.mimic?.cue, world.time, viewport, camera),
              stepCues: (enemy.mimic?.stepCues || []).map((cue) => cueFrame(cue, world.time, viewport, camera)).filter(Boolean)
            });
          }
          for (const key of instances.keys()) if (!current.has(key)) instances.delete(key);
          return frames;
        }
        return { update, suspend() {
          wasActive = false;
        }, reset() {
          instances.clear();
          wasActive = false;
        } };
      }
      module.exports = { createMimicPresentation };
    }
  });

  // scripts/web-editor/web-audio.js
  var require_web_audio = __commonJS({
    "scripts/web-editor/web-audio.js"(exports, module) {
      function createReplayAudio() {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const master = context.createGain();
        master.gain.value = 0.45;
        master.connect(context.destination);
        let muted = false;
        const ambience = /* @__PURE__ */ new Map();
        const cues = {
          step: [122, 54, 0.08],
          probe: [740, 310, 0.34],
          lure: [490, 680, 0.14],
          landing: [300, 90, 0.11],
          pickup: [460, 820, 0.13],
          reflection: [510, 360, 0.23],
          unlock: [392, 784, 0.28],
          exitUnlock: [494, 988, 0.4],
          exitPresence: [392, 494, 0.2],
          lockPresence: [294, 262, 0.2],
          beacon: [620, 784, 0.22],
          bat: [1300, 650, 0.1],
          spike: [240, 80, 0.12],
          mineBlast: [150, 38, 0.38],
          alarm: [680, 430, 0.3],
          laser: [1040, 380, 0.22],
          sequenceCue: [523, 659, 0.15],
          sequenceDone: [523, 1046, 0.3],
          sequenceReset: [330, 165, 0.24],
          mimic: [155, 68, 0.15]
        };
        function play(name, volume, spatial = {}) {
          if (muted) return;
          const distance = spatial.global ? 0 : spatial.distance || 0;
          const gain = volume / (1 + 0.15 * distance);
          if (gain < 2e-3) return;
          const fingerprint = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const [start, end, seconds] = cues[name] || [185 + fingerprint % 370, 100 + fingerprint % 230, 0.16];
          const now = context.currentTime;
          const oscillator = context.createOscillator();
          oscillator.type = name === "step" || name === "mimic" ? "triangle" : "sine";
          oscillator.frequency.setValueAtTime(start, now);
          oscillator.frequency.exponentialRampToValueAtTime(end, now + seconds);
          const envelope = context.createGain();
          envelope.gain.setValueAtTime(1e-4, now);
          envelope.gain.exponentialRampToValueAtTime(Math.max(1e-3, gain), now + 8e-3);
          envelope.gain.exponentialRampToValueAtTime(1e-4, now + seconds);
          oscillator.connect(envelope);
          envelope.connect(master);
          oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
          };
          oscillator.start(now);
          oscillator.stop(now + seconds + 0.015);
        }
        function hum(name, frequency, distance) {
          const audible = !muted && Number.isFinite(distance) && distance < 14;
          let voice = ambience.get(name);
          if (!audible) {
            if (voice) {
              voice.oscillator.stop();
              voice.oscillator.disconnect();
              voice.gain.disconnect();
              ambience.delete(name);
            }
            return;
          }
          if (!voice) {
            voice = { oscillator: context.createOscillator(), gain: context.createGain() };
            voice.gain.gain.value = 0;
            voice.oscillator.connect(voice.gain);
            voice.gain.connect(master);
            voice.oscillator.start();
            ambience.set(name, voice);
          }
          voice.oscillator.frequency.setTargetAtTime(frequency, context.currentTime, 0.08);
          voice.gain.gain.setTargetAtTime(0.055 * (1 - distance / 14), context.currentTime, 0.06);
        }
        const nearest = (sources) => sources.reduce((min, source) => Math.min(min, source.distance), Infinity);
        const audio = {
          get muted() {
            return muted;
          },
          toggle() {
            muted = !muted;
            master.gain.value = muted ? 0 : 0.45;
            if (muted) for (const name of ambience.keys()) hum(name, 0, null);
          },
          play,
          setEnemy(distance, visible, type, mode) {
            hum("enemy", mode === "chase" ? 108 : 72, distance);
          },
          setDecoys(sources) {
            hum("decoy", 178, nearest(sources));
          },
          setPits(sources) {
            hum("pit", 49, nearest(sources));
          },
          playMimic(event, spatial) {
            play("mimic", 0.44, spatial);
          },
          updateMimics() {
          }
        };
        return { context, audio, resume: () => context.resume() };
      }
      module.exports = { createReplayAudio };
    }
  });

  // src/sound-ranges.js
  var require_sound_ranges = __commonJS({
    "src/sound-ranges.js"(exports, module) {
      var MAX_PROBE_RADIUS = 17;
      var GUNSHOT_RADIUS = MAX_PROBE_RADIUS * 1.2;
      module.exports = { MAX_PROBE_RADIUS, GUNSHOT_RADIUS };
    }
  });

  // scripts/web-editor/preview.js
  var require_preview = __commonJS({
    "scripts/web-editor/preview.js"(exports, module) {
      var { createPreviewWorld } = require_core();
      var { emitSound, emitLure, movePlayer, updateWorld, takeMimicAudioEvents } = require_world();
      var { stepMovement } = require_movement();
      var { drawScene, cameraFor } = require_render();
      var { playSceneWave, updateSceneLoops, updateMimicSceneAudio, stopSceneLoops } = require_scene_audio();
      var { createMimicPresentation } = require_mimic_presentation();
      var { createReplayAudio } = require_web_audio();
      var { MAX_PROBE_RADIUS } = require_sound_ranges();
      function createPreview2(onExit, onAudioError) {
        const $2 = (id) => document.getElementById(id);
        const screen = $2("preview-screen"), canvas2 = $2("game-canvas"), ctx = canvas2.getContext("2d");
        let world, draft, control, frame = 0, last = 0, audio, muted = false, paused = false, reveal = false, chargeAt = null;
        let waves = /* @__PURE__ */ new WeakSet(), outcome = null, viewport, aim = { dx: 0, dy: -1 };
        const keys = /* @__PURE__ */ new Set();
        const mimicPresentation = createMimicPresentation();
        const chargeFor = (now) => chargeAt === null ? 0 : Math.max(0, Math.min(1, (now - chargeAt) / 1500));
        function stopAudio() {
          if (audio) {
            stopSceneLoops(audio.audio);
            if (!audio.audio.muted) audio.audio.toggle();
            audio.context.suspend().catch(() => {
            });
          }
        }
        function ensureAudio() {
          if (muted) return;
          try {
            if (!audio) audio = createReplayAudio();
            if (audio.audio.muted) audio.audio.toggle();
            audio.resume().catch(() => onAudioError("\u6D4F\u89C8\u5668\u6682\u672A\u5F00\u542F\u97F3\u6548\uFF0C\u53EF\u70B9\u51FB\u300C\u97F3\u6548\u300D\u91CD\u8BD5"));
          } catch (_) {
            muted = true;
            $2("preview-sound").textContent = "\u97F3\u6548\u5173";
            onAudioError("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u97F3\u6548\uFF0C\u4ECD\u53EF\u7EE7\u7EED\u8BD5\u73A9");
          }
        }
        function resize() {
          const available = canvas2.parentElement.getBoundingClientRect();
          const h = Math.max(240, Math.min(available.height - 32, (available.width - 300) * 4 / 3, 900));
          const w = Math.round(h * 0.75), height = Math.round(h);
          canvas2.style.width = `${w}px`;
          canvas2.style.height = `${height}px`;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          if (canvas2.width !== Math.round(w * dpr) || canvas2.height !== Math.round(height * dpr)) {
            canvas2.width = Math.round(w * dpr);
            canvas2.height = Math.round(height * dpr);
          }
          viewport = { left: 0, top: 0, width: w, height, size: Math.min(w / 18, height / 24) };
          return { width: w, height, dpr };
        }
        function restart() {
          stopAudio();
          mimicPresentation.reset();
          world = createPreviewWorld(draft);
          control = { footstepAt: 0 };
          waves = /* @__PURE__ */ new WeakSet();
          paused = false;
          outcome = null;
          chargeAt = null;
          keys.clear();
          $2("preview-pause").textContent = "\u6682\u505C";
          $2("preview-outcome").hidden = true;
          emitSound(world, world.player.x, world.player.y, "probe", 2.5, 0.35);
          ensureAudio();
          canvas2.focus();
        }
        function start(input) {
          draft = JSON.parse(JSON.stringify(input));
          createPreviewWorld(draft);
          reveal = false;
          $2("preview-reveal").setAttribute("aria-pressed", false);
          screen.hidden = false;
          for (const node of document.querySelectorAll(".app-header,.workspace,.statusbar")) node.inert = true;
          $2("preview-name").textContent = draft.name;
          restart();
          last = performance.now();
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(tick);
        }
        function exit() {
          screen.hidden = true;
          cancelAnimationFrame(frame);
          stopAudio();
          mimicPresentation.reset();
          keys.clear();
          chargeAt = null;
          for (const node of document.querySelectorAll(".app-header,.workspace,.statusbar")) node.inert = false;
          onExit();
        }
        function togglePause() {
          if (outcome) return;
          paused = !paused;
          chargeAt = null;
          keys.clear();
          $2("preview-pause").textContent = paused ? "\u7EE7\u7EED" : "\u6682\u505C";
          if (paused) stopAudio();
          else ensureAudio();
          canvas2.focus();
        }
        function tick(now) {
          if (screen.hidden) return;
          const dt = Math.min(0.04, Math.max(0, (now - last) / 1e3));
          last = now;
          const stage = resize();
          if (!paused && !world.failed && !world.complete) {
            let dx = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
            let dy = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
            if (dx || dy) {
              chargeAt = null;
              const magnitude = Math.hypot(dx, dy);
              dx /= magnitude;
              dy /= magnitude;
              stepMovement(world, control, dx, dy, keys.has("ShiftLeft") || keys.has("ShiftRight") ? 0.1 : 0.65, dt, movePlayer, emitSound);
            }
            updateWorld(world, dt);
          }
          ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, stage.width, stage.height);
          const camera = cameraFor(viewport, world.level, world.player);
          const sceneActive = !paused && !world.failed && !world.complete;
          if (!sceneActive) chargeAt = null;
          const charge = chargeFor(now);
          const events = takeMimicAudioEvents(world);
          const mimicFrames = mimicPresentation.update(world, viewport, camera, dt, sceneActive);
          drawScene(ctx, viewport, world, {
            developerAvailable: true,
            fullReveal: reveal,
            camera,
            mimicFrames,
            probeCharge: chargeAt === null ? null : charge
          });
          if (audio && !muted && sceneActive) {
            for (const wave of world.waves) if (!waves.has(wave)) {
              waves.add(wave);
              playSceneWave(audio.audio, wave, world.player, viewport, camera);
            }
            updateSceneLoops(audio.audio, world, viewport, camera);
            updateMimicSceneAudio(audio.audio, world, events, viewport, camera, dt);
          }
          if ((world.failed || world.complete) && !outcome) {
            outcome = world.complete ? "complete" : "failed";
            stopAudio();
            keys.clear();
            $2("preview-outcome").innerHTML = `<h2>${world.complete ? "\u62B5\u8FBE\u51FA\u53E3" : "\u518D\u8BD5\u4E00\u6B21"}</h2><p>${world.complete ? "\u8FD9\u5F20\u5730\u56FE\u5DF2\u7ECF\u53EF\u4EE5\u987A\u5229\u901A\u5173\u3002" : "\u8C03\u6574\u8DEF\u7EBF\uFF0C\u6216\u8FD4\u56DE\u7F16\u8F91\u5B8C\u5584\u4F60\u7684\u8BBE\u8BA1\u3002"}</p><button id="outcome-restart">\u91CD\u65B0\u5F00\u59CB</button>`;
            $2("preview-outcome").hidden = false;
            $2("outcome-restart").onclick = restart;
          }
          $2("preview-state").textContent = outcome === "complete" ? "\u5DF2\u901A\u5173" : outcome === "failed" ? "\u8BD5\u73A9\u7ED3\u675F" : paused ? "\u5DF2\u6682\u505C" : `\u6B63\u5728\u8BD5\u73A9 \xB7 ${world.time.toFixed(1)}s`;
          $2("preview-charge").textContent = chargeAt === null ? "\u6309\u4F4F\u7A7A\u683C\u84C4\u529B\u58F0\u6CE2 \xB7 E \u6295\u63B7\u8BF1\u9975" : `\u58F0\u6CE2\u84C4\u529B ${Math.round(charge * 100)}%`;
          $2("preview-player").textContent = `X ${world.player.x.toFixed(1)}   Y ${world.player.y.toFixed(1)}  \xB7  \u8BF1\u9975 ${world.stonesHeld}`;
          frame = requestAnimationFrame(tick);
        }
        function lure() {
          if (!paused && !outcome) emitLure(world, aim.dx, aim.dy);
        }
        $2("back-to-editor").onclick = exit;
        $2("preview-restart").onclick = restart;
        $2("preview-pause").onclick = togglePause;
        $2("preview-reveal").onclick = () => {
          reveal = !reveal;
          $2("preview-reveal").setAttribute("aria-pressed", reveal);
          canvas2.focus();
        };
        $2("preview-sound").onclick = () => {
          muted = !muted;
          $2("preview-sound").innerHTML = muted ? "\u97F3\u6548\u5173" : "\u97F3\u6548\u5F00";
          $2("preview-sound").setAttribute("aria-pressed", !muted);
          if (muted || paused) stopAudio();
          else ensureAudio();
          canvas2.focus();
        };
        document.addEventListener("keydown", (event) => {
          if (screen.hidden) return;
          if (event.code === "Escape") {
            event.preventDefault();
            exit();
            return;
          }
          if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) && ["Space", "Enter"].includes(event.code)) return;
          if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyE"].includes(event.code)) event.preventDefault();
          const held = keys.has(event.code);
          keys.add(event.code);
          if (held || event.repeat || paused || outcome) return;
          if (event.code === "Space" && ![...keys].some((key) => /^(Key[WASD]|Arrow)/.test(key))) {
            chargeAt = performance.now();
            ensureAudio();
          }
          if (event.code === "KeyE") lure();
        });
        document.addEventListener("keyup", (event) => {
          keys.delete(event.code);
          if (screen.hidden || event.code !== "Space" || chargeAt === null) return;
          event.preventDefault();
          if (!paused && !outcome) {
            const charge = chargeFor(performance.now());
            emitSound(world, world.player.x, world.player.y, "probe", 4 + (MAX_PROBE_RADIUS - 4) * charge, 0.35 + 0.65 * charge);
          }
          chargeAt = null;
        });
        canvas2.addEventListener("pointermove", (event) => {
          const r = canvas2.getBoundingClientRect(), camera = cameraFor(viewport, world.level, world.player);
          aim = {
            dx: (event.clientX - r.left) / viewport.size + camera.x - world.player.x,
            dy: (event.clientY - r.top) / viewport.size + camera.y - world.player.y
          };
        });
        canvas2.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          lure();
        });
        window.addEventListener("blur", () => {
          keys.clear();
          chargeAt = null;
          if (!screen.hidden && !paused && !outcome) togglePause();
        });
        return { start, active: () => !screen.hidden };
      }
      module.exports = { createPreview: createPreview2 };
    }
  });

  // src/ugc/hazard-timing.js
  var require_hazard_timing = __commonJS({
    "src/ugc/hazard-timing.js"(exports, module) {
      var { PERIODS } = require_model();
      var TEMPO_OPTIONS2 = PERIODS.map((period, value) => [value, `${["\u5FEB", "\u4E2D", "\u6162"][value]} \xB7 ${period} \u79D2`]);
      var PHASE_OPTIONS2 = [[0, "0 \xB7 \u540C\u62CD"], [1, "\xBC \u5468\u671F"], [2, "\xBD \xB7 \u4EA4\u66FF"], [3, "\xBE \u5468\u671F"]];
      var ALTERNATING_HINT2 = "\u76F8\u540C\u8282\u594F\u4E0B\uFF0C0 \u4E0E \xBD \u5468\u671F\u4EA4\u66FF\u89E6\u53D1";
      function timingSummary2(tempo = 1, phase = 0) {
        const period = PERIODS[tempo];
        const delay = Number((period * phase / 4).toFixed(2));
        return `\u5468\u671F ${period} \u79D2 \xB7 \u9996\u6B21\u89E6\u53D1 ${delay} \u79D2`;
      }
      module.exports = { TEMPO_OPTIONS: TEMPO_OPTIONS2, PHASE_OPTIONS: PHASE_OPTIONS2, ALTERNATING_HINT: ALTERNATING_HINT2, timingSummary: timingSummary2 };
    }
  });

  // scripts/web-editor/app.js
  var { SIZES, createBlankDraft } = require_model();
  var { OBJECT_BY_TYPE } = require_objects();
  var { createEditorState, beginStroke, endStroke, cancelStroke, applyEditorAction, canStartObject, undo, redo } = require_editor();
  var { validateDraft } = require_validation();
  var { encodeLevel } = require_codec();
  var { generateEditableTerrain } = require_level_generator();
  var { TERRAIN, paintRegion, floodFill, entities, entityAt, moveEntity, importDraft, makeExample } = require_core();
  var { GROUPS, ITEMS, icon } = require_palette();
  var { createMap } = require_map();
  var { createPreview } = require_preview();
  var { TEMPO_OPTIONS, PHASE_OPTIONS, ALTERNATING_HINT, timingSummary } = require_hazard_timing();
  var $ = (id) => document.getElementById(id);
  var STORAGE_KEY = "echo.level-studio.draft.v1";
  var esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  var toastTimer;
  var saveTimer;
  var storageError;
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").classList.toggle("error-toast", error);
    $("toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("toast").hidden = true;
    }, error ? 5500 : 2600);
  }
  var initial = makeExample();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) initial = importDraft(stored);
  } catch (_) {
    storageError = "\u672C\u5730\u8349\u7A3F\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u5DF2\u6253\u5F00\u793A\u4F8B\u3002\u53EF\u901A\u8FC7\u5BFC\u5165\u6062\u590D\u5907\u4EFD\u3002";
  }
  var state = {
    editor: createEditorState(initial),
    tool: "wall",
    mode: "brush",
    group: "all",
    hover: null,
    pending: null,
    selection: null,
    gesture: null,
    space: false,
    brushSize: 1,
    timing: { tempo: 1, phase: 0, dir: 1 }
  };
  for (const node of document.querySelectorAll("[data-icon]")) node.insertAdjacentHTML("afterbegin", icon(node.dataset.icon));
  for (const node of document.querySelectorAll("[data-symbol]")) node.innerHTML = icon(node.dataset.symbol);
  var map = createMap($("map"), $("minimap"), () => state);
  var preview = createPreview(() => {
    $("map").focus();
    map.draw();
  }, (message) => toast(message, true));
  var dialog = $("file-dialog");
  function save(silent = false) {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.editor.stroke?.before || state.editor.draft));
      $("save-status").innerHTML = '<span class="status-dot"></span>\u6240\u6709\u66F4\u6539\u5DF2\u4FDD\u5B58';
      if (!silent) toast("\u8349\u7A3F\u5DF2\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668");
      return true;
    } catch (_) {
      $("save-status").textContent = "\u4FDD\u5B58\u5931\u8D25 \xB7 \u8BF7\u5BFC\u51FA\u5907\u4EFD";
      if (!silent || !storageError) toast("\u672C\u5730\u5B58\u50A8\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5BFC\u51FA JSON \u4FDD\u5B58\u8349\u7A3F", true);
      storageError = "unavailable";
      return false;
    }
  }
  function changed({ fit = false } = {}) {
    state.selection = null;
    refresh();
    map.draw();
    if (fit) map.fit();
    $("save-status").innerHTML = '<span class="status-dot"></span>\u6B63\u5728\u4FDD\u5B58\u2026';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(true), 350);
  }
  function setMode(mode) {
    finishGesture(true);
    state.mode = mode;
    state.pending = null;
    refreshTools();
    refreshAsset();
    map.draw();
  }
  function selectTool(tool) {
    finishGesture(true);
    state.tool = tool;
    state.pending = null;
    state.selection = null;
    if (state.mode === "select" || !(tool in TERRAIN)) state.mode = "brush";
    refreshPalette();
    refreshTools();
    refreshInspector();
    map.draw();
  }
  function refreshPalette() {
    const scrollTop = $("palette").scrollTop;
    const query = $("search").value.trim().toLowerCase();
    $("categories").innerHTML = [["all", "\u5168\u90E8"], ...GROUPS.map((group) => [group.id, group.name])].map(([id, name]) => `<button data-group="${id}" class="${state.group === id ? "active" : ""}" aria-pressed="${state.group === id}">${name}</button>`).join("");
    let count = 0;
    $("palette").innerHTML = GROUPS.filter((group) => state.group === "all" || group.id === state.group).map((group) => {
      const items = group.items.filter(([kind, name, description]) => `${kind} ${name} ${description} ${ITEMS[kind].keywords || ""}`.toLowerCase().includes(query));
      count += items.length;
      return items.length ? `<section><h3>${group.name}<span>${String(items.length).padStart(2, "0")}</span></h3><div class="asset-list">${items.map(([kind, name, desc]) => `<button class="asset ${state.tool === kind ? "active" : ""}" data-tool="${kind}" aria-pressed="${state.tool === kind}" aria-label="${esc(name)} \xB7 ${esc(desc)}" title="${esc(name)} \xB7 ${esc(desc)}">${icon(kind)}<span class="asset-copy"><span class="asset-title"><strong>${esc(name)}</strong><code>${esc(kind)}</code></span><small>${esc(desc)}</small></span></button>`).join("")}</div></section>` : "";
    }).join("");
    if (!count) $("palette").innerHTML = '<p class="empty-search">\u6CA1\u6709\u627E\u5230\u5BF9\u5E94\u7D20\u6750<br>\u8BD5\u8BD5\u201C\u5899\u201D\u201C\u58F0\u201D\u6216\u201C\u654C\u4EBA\u201D</p>';
    $("palette").scrollTop = scrollTop;
  }
  function refreshTools() {
    for (const button of document.querySelectorAll("[data-mode]")) {
      const active = state.mode === button.dataset.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
      button.disabled = ["rectangle", "fill"].includes(button.dataset.mode) && !(state.tool in TERRAIN) && state.tool !== "erase";
      if (button.dataset.mode === "fill" && state.tool === "erase") button.disabled = true;
    }
    $("eraser").classList.toggle("active", state.tool === "erase");
    $("eraser").setAttribute("aria-pressed", state.tool === "erase");
    $("brush-size").disabled = state.mode !== "brush" || !(state.tool in TERRAIN) && state.tool !== "erase";
    $("undo").disabled = !state.editor.past.length;
    $("redo").disabled = !state.editor.future.length;
    const modes = { select: "\u9009\u62E9\u4E0E\u79FB\u52A8", brush: "\u753B\u7B14", rectangle: "\u77E9\u5F62", fill: "\u8FDE\u901A\u586B\u5145" };
    $("tool-status").textContent = `${modes[state.mode]} \xB7 ${ITEMS[state.tool].name}`;
    $("interaction-hint").textContent = state.mode === "select" ? "\u70B9\u51FB\u9009\u62E9 \xB7 \u62D6\u52A8\u5BF9\u8C61 \xB7 Delete \u5220\u9664 \xB7 \u7A7A\u683C\u5E73\u79FB" : state.mode === "rectangle" ? "\u62D6\u52A8\u6846\u9009\u533A\u57DF \xB7 \u677E\u5F00\u586B\u6EE1 \xB7 Esc \u53D6\u6D88" : state.mode === "fill" ? "\u70B9\u51FB\u586B\u5145\u8FDE\u901A\u533A\u57DF \xB7 \u2318/Ctrl Z \u64A4\u9500" : "\u5DE6\u952E\u7ED8\u5236 \xB7 \u53F3\u952E\u64E6\u9664 \xB7 \u7A7A\u683C\u62D6\u52A8\u5E73\u79FB";
    $("map").style.cursor = state.space || state.gesture?.type === "pan" ? "grab" : state.mode === "select" ? "default" : "crosshair";
    $("pair-hint").hidden = !state.pending;
    if (state.pending) $("pair-hint").textContent = `${ITEMS[state.tool].name}\uFF1A\u70B9\u51FB\u7B2C\u4E8C\u4E2A\u4F4D\u7F6E\u5B8C\u6210\u8FDE\u7EBF \xB7 Esc \u53D6\u6D88`;
  }
  function refreshAsset() {
    const item = ITEMS[state.tool];
    $("current-asset").innerHTML = `<div class="asset-preview">${icon(state.tool)}</div><div>${item.name}<small>${state.tool.toUpperCase()}</small></div>`;
    $("asset-description").textContent = item.description;
    $("placement-note").textContent = OBJECT_BY_TYPE[state.tool]?.pair ? "\u2197 \u5206\u4E24\u6B21\u70B9\u51FB\u653E\u7F6E\uFF1B\u9009\u62E9\u5DE5\u5177\u53EF\u79FB\u52A8\u4EFB\u4E00\u7AEF\u70B9\u3002" : ["launcher", "lockedWall"].includes(state.tool) ? "\u25A7 \u9700\u8981\u653E\u5728\u5899\u4F53\u4E0A\u3002" : state.tool in TERRAIN || state.tool === "erase" ? "\u21B3 \u652F\u6301\u62D6\u52A8\u7ED8\u5236\u3002\u5916\u8FB9\u754C\u59CB\u7EC8\u4FDD\u6301\u4E3A\u5899\u4F53\u3002" : "\u21B3 \u653E\u5728\u7A7A\u5730\u4E0A\uFF1B\u4E0D\u80FD\u4E0E\u5DF2\u6709\u7269\u4EF6\u91CD\u53E0\u3002";
    const kind = state.selection?.kind || state.tool, details = ITEMS[kind].details || [];
    $("behavior-section").hidden = !details.length;
    $("behavior-heading").textContent = `${state.selection ? "\u9009\u4E2D\u5BF9\u8C61" : "\u5F53\u524D\u7D20\u6750"}\u89C4\u5219 \xB7 ${kind.toUpperCase()}`;
    $("behavior-details").innerHTML = details.map(([label, text]) => `<dt>${esc(label)}</dt><dd>${esc(text)}</dd>`).join("");
  }
  function hazardProperties(timing, kind, placement = false) {
    const row = (label, key, values) => `<label class="property-row">${label}<select data-timing="${key}" data-placement="${placement}" aria-label="${label}">${values.map(([value, text]) => `<option value="${value}" ${timing[key] === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
    return `<p class="property-hint">${placement ? "\u540E\u7EED\u653E\u7F6E\u9ED8\u8BA4\u503C" : "\u5F53\u524D\u5BF9\u8C61\u8BBE\u7F6E"}</p>` + row(placement ? "\u653E\u7F6E\u8282\u594F" : "\u8282\u594F", "tempo", TEMPO_OPTIONS) + row(placement ? "\u653E\u7F6E\u76F8\u4F4D" : "\u76F8\u4F4D", "phase", PHASE_OPTIONS) + (kind === "launcher" ? row(placement ? "\u653E\u7F6E\u5F13\u7BAD\u671D\u5411" : "\u65B9\u5411", "dir", [[0, "\u2191 \u4E0A"], [1, "\u2192 \u53F3"], [2, "\u2193 \u4E0B"], [3, "\u2190 \u5DE6"]]) : "") + `<p class="property-hint">${timingSummary(timing.tempo, timing.phase)}<br>${ALTERNATING_HINT}\u3002</p>`;
  }
  function refreshInspector() {
    refreshAsset();
    const selected = state.selection;
    $("selection-count").textContent = selected ? "1 \u4E2A\u5BF9\u8C61" : "\u672A\u9009\u62E9";
    $("selection").className = selected ? "" : "selection-empty";
    $("object-properties").innerHTML = "";
    if (selected) {
      const at = selected.endpoint ? { x: selected.toX, y: selected.toY } : selected;
      $("selection").innerHTML = `<div class="selected-object">${icon(selected.kind)}<span>${ITEMS[selected.kind].name}${selected.endpoint ? " \xB7 \u7EC8\u70B9" : ""}</span><button id="delete-object" class="text-button" title="\u5220\u9664\u6574\u4E2A\u5BF9\u8C61">\u5220\u9664</button></div>
      <div class="coordinate-row"><label>X<input id="object-x" type="number" aria-label="\u5BF9\u8C61 X \u5750\u6807" value="${at.x}"></label><label>Y<input id="object-y" type="number" aria-label="\u5BF9\u8C61 Y \u5750\u6807" value="${at.y}"></label></div>`;
      if (["spike", "launcher"].includes(selected.kind)) {
        $("object-properties").innerHTML = hazardProperties(selected, selected.kind);
      }
      $("object-properties").insertAdjacentHTML("beforeend", '<p class="property-hint">\u62D6\u52A8\u5BF9\u8C61\u6216\u8F93\u5165\u5750\u6807\u8C03\u6574\u4F4D\u7F6E\u3002\u4FEE\u6539\u53EF\u64A4\u9500\u3002</p>');
    } else {
      $("selection").innerHTML = "\u5207\u6362\u9009\u62E9\u5DE5\u5177\uFF0C\u70B9\u51FB\u5730\u56FE\u4E2D\u7684\u5BF9\u8C61<br>\u62D6\u52A8\u5373\u53EF\u8C03\u6574\u4F4D\u7F6E";
      if (["spike", "launcher"].includes(state.tool)) {
        $("object-properties").innerHTML = hazardProperties(state.timing, state.tool, true);
      }
    }
  }
  function refreshValidation() {
    const { errors, warnings } = validateDraft(state.editor.draft);
    const messages = errors.map((error) => ({ ...error, message: error.code === "start" ? "\u8BF7\u5728\u5730\u9762\u653E\u7F6E\u4E00\u4E2A\u73A9\u5BB6\u8D77\u70B9" : error.code === "exit" ? "\u8BF7\u5728\u5730\u9762\u653E\u7F6E\u4E00\u4E2A\u5173\u5361\u51FA\u53E3" : error.message }));
    $("validation").innerHTML = `<div class="check-head ${errors.length ? "invalid" : ""}"><span class="check-badge">${errors.length ? "!" : "\u2713"}</span>${errors.length ? `${errors.length} \u9879\u9700\u8981\u4FEE\u590D` : "\u53EF\u4EE5\u8FDB\u5165\u771F\u5B9E\u573A\u666F"}</div>` + (errors.length ? messages.slice(0, 5).map((error) => `<div class="issue error-item">\xB7 ${esc(error.message)}</div>`).join("") : '<div class="check-note">\u8D77\u70B9\u4E0E\u51FA\u53E3\u5B8C\u6574 \xB7 \u8DEF\u5F84\u53EF\u8FBE<br>\u8BD5\u73A9\u65F6\u53EF\u68C0\u67E5\u673A\u5173\u3001\u8282\u594F\u4E0E\u901A\u5173\u4F53\u9A8C</div>') + warnings.map((warning) => `<div class="issue">\u25B3 ${esc(warning.message)}</div>`).join("");
    return errors;
  }
  function refresh() {
    $("level-name").value = state.editor.draft.name;
    const [w, h] = SIZES[state.editor.draft.size];
    $("map-dimensions").textContent = `${w} \xD7 ${h}`;
    $("object-count").textContent = `${entities(state.editor.draft).length} \u4E2A\u7269\u4EF6`;
    $("size-label").textContent = `${{ small: "\u5C0F\u578B", medium: "\u4E2D\u578B", large: "\u5927\u578B" }[state.editor.draft.size]} \xB7 ${w} \xD7 ${h}`;
    refreshPalette();
    refreshTools();
    refreshInspector();
    refreshValidation();
  }
  function rename() {
    const name = $("level-name").value.trim();
    if (!name || [...name].length > 16 || new TextEncoder().encode(name).length > 48) {
      $("level-name").value = state.editor.draft.name;
      toast("\u540D\u79F0\u987B\u4E3A 1\u201316 \u4E2A\u5B57\uFF0C\u6700\u591A 48 \u5B57\u8282", true);
      return;
    }
    if (name !== state.editor.draft.name) {
      applyEditorAction(state.editor, { type: "replace", draft: { ...state.editor.draft, name } });
      changed();
    }
  }
  function finishGesture(cancel = false, at = state.hover) {
    const gesture = state.gesture;
    if (!gesture) return;
    state.gesture = null;
    if (cancel) {
      cancelStroke(state.editor);
      map.draw();
      refreshTools();
      return;
    }
    if (gesture.type === "rectangle" && at) paintRegion(state.editor, gesture.tool, gesture.from, at, { shape: "rectangle" });
    if (gesture.type === "move" && at && (at.x !== gesture.from.x || at.y !== gesture.from.y)) {
      if (!moveEntity(state.editor, gesture.entity, at)) toast("\u8FD9\u4E2A\u4F4D\u7F6E\u65E0\u6CD5\u653E\u7F6E\u8BE5\u5BF9\u8C61\uFF0C\u8BF7\u68C0\u67E5\u5730\u5F62\u6216\u91CD\u53E0", true);
      else {
        const entity = entityAt(state.editor.draft, at.x, at.y);
        changed();
        state.selection = entity;
        refreshInspector();
        map.draw();
        return;
      }
    }
    if (gesture.type === "brush") endStroke(state.editor);
    if (["brush", "rectangle"].includes(gesture.type)) changed();
    refreshTools();
    map.draw();
  }
  function placePair(at) {
    if (!state.pending) {
      if (!canStartObject(state.editor.draft, state.tool, at.x, at.y)) {
        toast("\u8BF7\u9009\u62E9\u672A\u88AB\u5360\u7528\u7684\u5730\u9762\u683C", true);
        return;
      }
      state.pending = { ...at };
      refreshTools();
      map.draw();
      return;
    }
    if (applyEditorAction(state.editor, { type: "place", kind: state.tool, ...state.pending, toX: at.x, toY: at.y })) {
      state.pending = null;
      changed();
    } else toast("\u7B2C\u4E8C\u4E2A\u4F4D\u7F6E\u4E0D\u53EF\u7528\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u5730\u9762\u683C\uFF0CEsc \u53EF\u53D6\u6D88", true);
  }
  var canvas = $("map");
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    if (preview.active() || dialog.open || ![0, 1, 2].includes(event.button)) return;
    canvas.focus();
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const at = map.cell(event);
    state.hover = at;
    if (event.button === 1 || state.space) {
      state.gesture = { type: "pan", clientX: event.clientX, clientY: event.clientY, x: map.view.x, y: map.view.y };
      refreshTools();
      return;
    }
    if (!at) return;
    const tool = event.button === 2 ? "erase" : state.tool;
    if (state.mode === "select" && event.button !== 2) {
      const entity = entityAt(state.editor.draft, at.x, at.y);
      state.selection = entity;
      if (entity) state.gesture = { type: "move", entity, from: at };
      refreshInspector();
      map.draw();
      return;
    }
    state.selection = null;
    if (OBJECT_BY_TYPE[tool]?.pair) {
      placePair(at);
      return;
    }
    if (state.mode === "fill" && tool in TERRAIN) {
      floodFill(state.editor, at, tool);
      changed();
      return;
    }
    if (state.mode === "rectangle" && (tool in TERRAIN || tool === "erase")) {
      state.gesture = { type: "rectangle", from: at, tool };
      map.draw();
      return;
    }
    if (tool in TERRAIN || tool === "erase") {
      beginStroke(state.editor);
      state.gesture = { type: "brush", from: at, last: at, tool };
      paintRegion(state.editor, tool, at, at, { brushSize: state.brushSize });
      map.draw();
    } else {
      if (paintRegion(state.editor, tool, at, at, { timing: state.timing })) changed();
      else toast(["launcher", "lockedWall"].includes(tool) ? "\u8BF7\u653E\u5728\u5408\u9002\u7684\u5899\u4F53\u4E0A\uFF1B\u5F13\u7BAD\u9700\u8981\u671D\u5411\u76F8\u90BB\u5730\u9762" : "\u65E0\u6CD5\u653E\u7F6E\uFF1A\u68C0\u67E5\u5730\u9762\u3001\u7269\u4EF6\u91CD\u53E0\u6216\u6570\u91CF\u4E0A\u9650", true);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    const at = map.cell(event);
    state.hover = at;
    $("coordinates").textContent = at ? `X ${String(at.x).padStart(2, "0")}   Y ${String(at.y).padStart(2, "0")}` : "X \u2014   Y \u2014";
    const gesture = state.gesture;
    if (gesture?.type === "pan") {
      map.view.x = gesture.x + event.clientX - gesture.clientX;
      map.view.y = gesture.y + event.clientY - gesture.clientY;
    }
    if (gesture?.type === "brush" && at) {
      paintRegion(state.editor, gesture.tool, gesture.last, at, { brushSize: state.brushSize });
      gesture.last = at;
    }
    map.draw();
  });
  canvas.addEventListener("pointerup", (event) => {
    finishGesture(false, map.cell(event));
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => finishGesture(true));
  canvas.addEventListener("lostpointercapture", () => {
    if (state.gesture) finishGesture(true);
  });
  canvas.addEventListener("pointerleave", () => {
    if (!state.gesture) {
      state.hover = null;
      map.draw();
    }
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const r = canvas.getBoundingClientRect();
    map.zoom(Math.exp(-event.deltaY * (event.ctrlKey ? 0.012 : 2e-3)), event.clientX - r.left, event.clientY - r.top);
  }, { passive: false });
  $("categories").onclick = (event) => {
    const button = event.target.closest("[data-group]");
    if (button) {
      state.group = button.dataset.group;
      $("palette").scrollTop = 0;
      refreshPalette();
    }
  };
  $("palette").onclick = (event) => {
    const button = event.target.closest("[data-tool]");
    if (button) selectTool(button.dataset.tool);
  };
  $("search").oninput = () => {
    $("palette").scrollTop = 0;
    refreshPalette();
  };
  for (const button of document.querySelectorAll("[data-mode]")) button.onclick = () => setMode(button.dataset.mode);
  $("eraser").onclick = () => selectTool("erase");
  $("brush-size").onchange = () => {
    state.brushSize = Number($("brush-size").value);
    map.draw();
  };
  function history(direction) {
    finishGesture(true);
    state.pending = null;
    const size = state.editor.draft.size;
    if (direction(state.editor)) changed({ fit: size !== state.editor.draft.size });
  }
  $("undo").onclick = () => history(undo);
  $("redo").onclick = () => history(redo);
  $("zoom-in").onclick = () => map.zoom(1.25);
  $("zoom-out").onclick = () => map.zoom(0.8);
  $("fit").onclick = $("zoom-value").onclick = () => map.fit();
  $("grid").onclick = () => {
    map.view.grid = !map.view.grid;
    $("grid").setAttribute("aria-pressed", map.view.grid);
    map.draw();
  };
  $("level-name").onchange = rename;
  $("validate").onclick = () => {
    const errors = refreshValidation();
    toast(errors.length ? "\u8BF7\u5148\u4FEE\u590D\u53F3\u4FA7\u5217\u51FA\u7684\u95EE\u9898" : "\u68C0\u67E5\u901A\u8FC7\uFF0C\u53EF\u4EE5\u8FDB\u5165\u5FEB\u901F\u9884\u89C8", !!errors.length);
  };
  function startPreview() {
    finishGesture(false);
    state.pending = null;
    rename();
    save(true);
    refreshTools();
    if (refreshValidation().length) {
      toast("\u6682\u65F6\u65E0\u6CD5\u9884\u89C8\uFF0C\u8BF7\u4FEE\u590D\u53F3\u4FA7\u5173\u5361\u68C0\u67E5\u4E2D\u7684\u95EE\u9898", true);
      return;
    }
    try {
      preview.start(state.editor.draft);
    } catch (error) {
      toast(`\u9884\u89C8\u672A\u542F\u52A8\uFF1A${error.message}`, true);
    }
  }
  $("preview").onclick = startPreview;
  function deleteSelection() {
    if (!state.selection) return;
    const d = JSON.parse(JSON.stringify(state.editor.draft)), item = state.selection;
    if (["start", "exit", "mechanism"].includes(item.kind)) d[item.kind] = null;
    else if (["guard", "spike", "launcher"].includes(item.kind)) d[{ guard: "guards", spike: "spikes", launcher: "launchers" }[item.kind]].splice(item.index, 1);
    else d.objects.splice(item.index, 1);
    applyEditorAction(state.editor, { type: "replace", draft: d });
    changed();
  }
  $("selection").addEventListener("click", (event) => {
    if (event.target.closest("#delete-object")) deleteSelection();
  });
  $("selection").addEventListener("change", (event) => {
    if (!["object-x", "object-y"].includes(event.target.id)) return;
    const to = { x: Number($("object-x").value), y: Number($("object-y").value) };
    if (moveEntity(state.editor, state.selection, to)) {
      changed();
      state.selection = entityAt(state.editor.draft, to.x, to.y);
      refreshInspector();
      map.draw();
    } else {
      toast("\u5750\u6807\u65E0\u6548\u6216\u76EE\u6807\u4F4D\u7F6E\u4E0D\u53EF\u7528", true);
      refreshInspector();
    }
  });
  $("object-properties").addEventListener("change", (event) => {
    const key = event.target.dataset.timing;
    if (!key) return;
    if (event.target.dataset.placement === "true") {
      state.timing[key] = Number(event.target.value);
      refreshInspector();
      return;
    }
    if (!state.selection) return;
    const item = state.selection;
    if (applyEditorAction(state.editor, { type: "timing", kind: item.kind, x: item.x, y: item.y, [key]: Number(event.target.value) })) {
      changed();
      state.selection = entityAt(state.editor.draft, item.x, item.y);
      refreshInspector();
      map.draw();
    } else {
      toast("\u8FD9\u4E2A\u65B9\u5411\u6CA1\u6709\u76F8\u90BB\u5730\u9762\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u65B9\u5411", true);
      refreshInspector();
    }
  });
  function openDialog(title, body, footer) {
    finishGesture(true);
    rename();
    state.pending = null;
    refreshTools();
    $("dialog-title").textContent = title;
    $("dialog-body").innerHTML = body;
    $("dialog-footer").innerHTML = footer;
    $("dialog-error").textContent = "";
    dialog.showModal();
  }
  function replaceDraft(draft) {
    applyEditorAction(state.editor, { type: "replace", draft });
    state.pending = null;
    changed({ fit: true });
    dialog.close();
  }
  $("new").onclick = () => {
    openDialog(
      "\u5F00\u59CB\u4E00\u4E2A\u65B0\u5173\u5361",
      '<p>\u4ECE\u7A7A\u767D\u5730\u56FE\u5F00\u59CB\uFF0C\u6216\u7528\u8FF7\u5BAB\u4F5C\u4E3A\u521B\u4F5C\u5E95\u56FE\u3002\u6B64\u64CD\u4F5C\u5C06\u66FF\u6362\u5F53\u524D\u8349\u7A3F\uFF0C\u53EF\u901A\u8FC7\u64A4\u9500\u6062\u590D\uFF1B\u9700\u8981\u957F\u671F\u4FDD\u7559\u7684\u4F5C\u54C1\u8BF7\u5148\u5BFC\u51FA\u3002</p><label>\u5173\u5361\u540D\u79F0<input id="new-name" value="\u6211\u7684\u65B0\u5173\u5361" maxlength="16"></label><div class="size-options">' + [["small", "\u5C0F\u578B", "36 \xD7 48"], ["medium", "\u4E2D\u578B", "54 \xD7 72"], ["large", "\u5927\u578B", "72 \xD7 96"]].map(([value, title, size], i) => `<label><input type="radio" name="map-size" value="${value}" ${i ? "" : "checked"}><span>${title}<br><small>${size}</small></span></label>`).join("") + '</div><p class="dialog-info">\u7A7A\u767D\u5730\u56FE\u9700\u8981\u81EA\u884C\u653E\u7F6E\u8D77\u70B9\u548C\u51FA\u53E3\u3002\u8FF7\u5BAB\u5DF2\u914D\u7F6E\u57FA\u7840\u8DEF\u7EBF\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u6DFB\u52A0\u654C\u4EBA\u4E0E\u673A\u5173\u3002</p>',
      '<button type="button" id="create-example">\u6253\u5F00\u793A\u4F8B</button><button type="button" id="create-maze">\u751F\u6210\u8FF7\u5BAB</button><button type="button" id="create-blank" class="primary">\u521B\u5EFA\u7A7A\u767D\u5730\u56FE</button>'
    );
    const create = (generated) => {
      const size = dialog.querySelector('input[name="map-size"]:checked').value, name = $("new-name").value.trim();
      if (!name || [...name].length > 16 || new TextEncoder().encode(name).length > 48) {
        $("dialog-error").textContent = "\u540D\u79F0\u987B\u4E3A 1\u201316 \u4E2A\u5B57\uFF0C\u6700\u591A 48 \u5B57\u8282";
        return;
      }
      try {
        const draft = generated ? generateEditableTerrain(crypto.getRandomValues(new Uint32Array(1))[0], size) : createBlankDraft(size);
        draft.name = name;
        replaceDraft(draft);
        toast(generated ? "\u8FF7\u5BAB\u5DF2\u751F\u6210\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u7F16\u8F91" : "\u5730\u56FE\u5DF2\u521B\u5EFA\uFF0C\u5148\u8BD5\u7740\u653E\u7F6E\u8D77\u70B9\u548C\u51FA\u53E3");
      } catch (error) {
        $("dialog-error").textContent = error.message;
      }
    };
    $("create-blank").onclick = () => create(false);
    $("create-maze").onclick = () => create(true);
    $("create-example").onclick = () => replaceDraft(makeExample());
  };
  $("import").onclick = () => {
    openDialog(
      "\u5BFC\u5165\u5173\u5361",
      '<p>\u7C98\u8D34\u5DF2\u4FDD\u5B58\u7684 ECL \u5173\u5361\u7801\uFF0C\u6216\u6253\u5F00\u4E4B\u524D\u5BFC\u51FA\u7684 JSON \u8349\u7A3F\u3002\u5BFC\u5165\u540E\u53EF\u4EE5\u64A4\u9500\u3002</p><textarea id="import-text" aria-label="\u5173\u5361\u7801\u6216 JSON" placeholder="ECL1\u20134 \u5173\u5361\u7801 / JSON \u8349\u7A3F" spellcheck="false"></textarea><label class="file-drop">\u4ECE\u7535\u8111\u9009\u62E9\u6587\u4EF6<input id="import-file" type="file" accept=".json,.txt,.ecl,application/json,text/plain"></label>',
      '<button value="cancel">\u53D6\u6D88</button><button type="button" id="import-confirm" class="primary">\u5BFC\u5165\u5E76\u7F16\u8F91</button>'
    );
    $("import-file").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 262144) {
        $("dialog-error").textContent = "\u6587\u4EF6\u8FC7\u5927\uFF0C\u6700\u591A\u652F\u6301 256 KB";
        return;
      }
      try {
        $("import-text").value = await file.text();
        $("dialog-error").textContent = "";
      } catch (_) {
        $("dialog-error").textContent = "\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9";
      }
    };
    $("import-confirm").onclick = () => {
      try {
        const draft = importDraft($("import-text").value);
        replaceDraft(draft);
        toast("\u5BFC\u5165\u6210\u529F\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u5B58");
      } catch (error) {
        $("dialog-error").textContent = /^level-code-/.test(error.message) ? "\u5173\u5361\u7801\u65E0\u6548\u3001\u635F\u574F\u6216\u5305\u542B\u4E0D\u53EF\u8FBE\u4F4D\u7F6E\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5" : error.message;
      }
    };
  };
  function download(text, extension) {
    const url = URL.createObjectURL(new Blob([text], { type: extension === "json" ? "application/json" : "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.editor.draft.name.replace(/[\\/:*?"<>|]/g, "_")}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  $("export").onclick = () => {
    save(true);
    let format = "json", output;
    openDialog(
      "\u5BFC\u51FA\u4F60\u7684\u5173\u5361",
      '<p>JSON \u4FDD\u5B58\u5B8C\u6574\u8349\u7A3F\uFF0C\u652F\u6301\u672A\u5B8C\u6210\u5730\u56FE\uFF1B\u5173\u5361\u7801\u53EF\u5728\u5C0F\u6E38\u620F\u5DE5\u574A\u624B\u52A8\u7C98\u8D34\uFF0C\u5BA1\u6838\u901A\u8FC7\u540E\u5373\u53EF\u5BFC\u5165\u3002</p><div class="categories" style="margin:16px 0 0"><button type="button" id="format-json" class="active">\u8349\u7A3F JSON</button><button type="button" id="format-code">\u6E38\u620F\u5173\u5361\u7801</button></div><textarea id="export-text" aria-label="\u5BFC\u51FA\u5185\u5BB9" readonly spellcheck="false"></textarea>',
      '<button type="button" id="copy-export">\u590D\u5236\u5185\u5BB9</button><button type="button" id="download-export" class="primary">\u4E0B\u8F7D JSON</button>'
    );
    const update = (value) => {
      try {
        output = value === "json" ? JSON.stringify(state.editor.draft, null, 2) : encodeLevel(state.editor.draft);
        format = value;
        $("export-text").value = output;
        $("dialog-error").textContent = "";
        $("format-json").classList.toggle("active", value === "json");
        $("format-code").classList.toggle("active", value === "code");
        $("download-export").textContent = value === "json" ? "\u4E0B\u8F7D JSON" : "\u4E0B\u8F7D\u5173\u5361\u7801";
      } catch (_) {
        $("dialog-error").textContent = "\u751F\u6210\u5173\u5361\u7801\u524D\uFF0C\u8BF7\u5148\u4FEE\u590D\u53F3\u4FA7\u5173\u5361\u68C0\u67E5\u4E2D\u7684\u95EE\u9898\u3002\u5F53\u524D\u4ECD\u53EF\u5BFC\u51FA JSON\u3002";
      }
    };
    $("format-json").onclick = () => update("json");
    $("format-code").onclick = () => update("code");
    $("download-export").onclick = () => download(output, format === "json" ? "json" : "txt");
    $("copy-export").onclick = async () => {
      try {
        await navigator.clipboard.writeText(output);
        toast("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
      } catch (_) {
        $("export-text").focus();
        $("export-text").select();
        toast("\u8BF7\u6309 \u2318/Ctrl C \u590D\u5236\u9009\u4E2D\u7684\u5185\u5BB9");
      }
    };
    update("json");
  };
  function showHelp() {
    const shortcuts = [["\u9009\u62E9 / \u753B\u7B14 / \u77E9\u5F62 / \u586B\u5145", "V / B / R / F"], ["\u6A61\u76AE\u64E6 / \u4E34\u65F6\u64E6\u9664", "X / \u53F3\u952E\u62D6\u52A8"], ["\u79FB\u52A8\u753B\u5E03", "\u7A7A\u683C + \u62D6\u52A8 / \u4E2D\u952E"], ["\u4EE5\u6307\u9488\u4E3A\u4E2D\u5FC3\u7F29\u653E", "\u6EDA\u8F6E"], ["\u64A4\u9500 / \u91CD\u505A", "\u2318 Ctrl Z / Shift Z"], ["\u4FDD\u5B58\u8349\u7A3F", "\u2318 Ctrl S"], ["\u9002\u5E94\u753B\u5E03 / \u7F51\u683C", "0 / G"], ["\u5FEB\u901F\u9884\u89C8 / \u8FD4\u56DE\u7F16\u8F91", "P / Esc"], ["\u5220\u9664\u6240\u9009\u5BF9\u8C61 / \u53D6\u6D88\u64CD\u4F5C", "Delete / Esc"], ["\u641C\u7D22\u7D20\u6750", "/"]];
    openDialog("\u8BA9\u521B\u4F5C\u5FEB\u4E00\u70B9", '<div class="shortcut-list">' + shortcuts.map(([label, keys]) => `<span>${label}</span><kbd>${keys}</kbd>`).join("") + '</div><p class="dialog-info">\u5C0F\u6E38\u620F\u5DE5\u574A\u53EF\u5BFC\u5165\u7ECF\u5BA1\u6838\u7684\u5173\u5361\u7801\u3002\u8349\u7A3F\u53EA\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668\uFF0C\u91CD\u8981\u4F5C\u54C1\u8BF7\u4E0B\u8F7D JSON \u5907\u4EFD\u3002</p>', '<button value="cancel" class="primary">\u5F00\u59CB\u521B\u4F5C</button>');
  }
  $("help").onclick = $("shortcuts").onclick = showHelp;
  document.addEventListener("keydown", (event) => {
    if (preview.active() || dialog.open || event.isComposing) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.code === "KeyS") {
      event.preventDefault();
      rename();
      save();
      return;
    }
    if (typing) return;
    if (mod && event.code === "KeyZ") {
      event.preventDefault();
      history(event.shiftKey ? redo : undo);
      return;
    }
    if (mod && event.code === "KeyY") {
      event.preventDefault();
      history(redo);
      return;
    }
    if (mod || event.altKey) return;
    if (event.code === "Space") {
      event.preventDefault();
      state.space = true;
      refreshTools();
      return;
    }
    if (event.code === "Escape") {
      finishGesture(true);
      state.pending = null;
      state.selection = null;
      refreshTools();
      refreshInspector();
      map.draw();
      return;
    }
    if (["Delete", "Backspace"].includes(event.code)) {
      event.preventDefault();
      deleteSelection();
      return;
    }
    const mode = { KeyV: "select", KeyB: "brush", KeyR: "rectangle", KeyF: "fill" }[event.code];
    if (mode) {
      event.preventDefault();
      if (["rectangle", "fill"].includes(mode) && !(state.tool in TERRAIN)) selectTool("wall");
      setMode(mode);
      return;
    }
    if (event.code === "KeyX") selectTool("erase");
    if (event.code === "KeyP") {
      event.preventDefault();
      startPreview();
    }
    if (event.code === "KeyG") $("grid").click();
    if (event.code === "Digit0") map.fit();
    if (["Equal", "NumpadAdd"].includes(event.code)) map.zoom(1.25);
    if (["Minus", "NumpadSubtract"].includes(event.code)) map.zoom(0.8);
    if (event.code === "Slash") {
      event.preventDefault();
      if (event.shiftKey) showHelp();
      else $("search").focus();
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      state.space = false;
      refreshTools();
    }
  });
  window.addEventListener("blur", () => {
    state.space = false;
    finishGesture(true);
    refreshTools();
  });
  window.addEventListener("pagehide", () => {
    endStroke(state.editor);
    rename();
    save(true);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
  refresh();
  save(true);
  if (storageError && storageError !== "unavailable") toast(storageError, true);
})();
