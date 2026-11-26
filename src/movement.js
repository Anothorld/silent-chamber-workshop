const { PLAYER_MAX_SPEED } = require('./world');
const { onSilentFloor } = require('./devices');
const MAX_FOOTSTEP_RADIUS = 8.5;

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
    emitSound(world, actor.x, actor.y, 'footstep',
      onSilentFloor(world, actor) ? Math.min(1.25, radius) : radius, 1, null, actor.id);
    const movedX = actor.x - fromX;
    const movedY = actor.y - fromY;
    if (world.footprints && Math.hypot(movedX, movedY) > 0.001) {
      const angle = Math.atan2(movedY, movedX);
      const side = actor.nextFootprintSide || -1;
      world.footprints.push({
        x: actor.x - Math.sin(angle) * side * 0.16,
        y: actor.y + Math.cos(angle) * side * 0.16,
        angle, at: world.time, ownerId: actor.id,
      });
      actor.nextFootprintSide = -side;
      if (actor === world.player) world.nextFootprintSide = -side;
    }
    control.footstepAt = world.time + 0.55 - amount * 0.27;
  }
}

module.exports = { stepMovement, movementSpeed, MAX_FOOTSTEP_RADIUS };
