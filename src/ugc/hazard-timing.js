const { PERIODS } = require('./model');

const TEMPO_OPTIONS = PERIODS.map((period, value) => [value, `${['快', '中', '慢'][value]} · ${period} 秒`]);
const PHASE_OPTIONS = [[0, '0 · 同拍'], [1, '¼ 周期'], [2, '½ · 交替'], [3, '¾ 周期']];
const ALTERNATING_HINT = '相同节奏下，0 与 ½ 周期交替触发';
function timingSummary(tempo = 1, phase = 0) {
  const period = PERIODS[tempo];
  const delay = Number((period * phase / 4).toFixed(2));
  return `周期 ${period} 秒 · 首次触发 ${delay} 秒`;
}
module.exports = { TEMPO_OPTIONS, PHASE_OPTIONS, ALTERNATING_HINT, timingSummary };
