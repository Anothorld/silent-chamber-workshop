const clamp = value => Math.max(0, Math.min(1, value));

function enemyAlerted(enemy) {
  return enemy.mode === 'chase' || enemy.mode === 'search';
}

function enemyAlertAmount(enemy, time) {
  const state = enemy.alertTransition;
  if (!state) return enemyAlerted(enemy) ? 1 : 0;
  const u = clamp((time - state.at) / (state.to ? .32 : 1.8));
  const progress = state.to ? 1 - (1 - u) ** 3 : u * u * (3 - 2 * u);
  return state.from + (state.to - state.from) * progress;
}

function syncEnemyAlert(enemy, time) {
  const to = enemyAlerted(enemy) ? 1 : 0;
  if (!enemy.alertTransition) enemy.alertTransition = { from: to, to, at: time };
  else if (enemy.alertTransition.to !== to) {
    enemy.alertTransition = { from: enemyAlertAmount(enemy, time), to, at: time };
  }
}

module.exports = { enemyAlerted, enemyAlertAmount, syncEnemyAlert };
