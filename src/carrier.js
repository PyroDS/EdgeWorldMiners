import Phaser from 'phaser';

// Creates a hovering sci-fi carrier near the terrain surface at the supplied X position.
// The carrier is generated from vector graphics, converted to a texture, then used as a sprite.
// It spawns "hoverHeight" pixels above the first solid terrain tile so it always appears to float.
export function createCarrier(scene, terrainManager, worldWidth, hoverHeight = 120) {
  // Choose a random X within the terrain bounds, leaving a small margin so the sprite stays fully on-screen.
  const margin = 150; // account for carrier width
  const carrierX = Phaser.Math.Between(margin, Math.max(margin, worldWidth - margin));

  // Determine surface height under the chosen X position.
  let surfaceY = terrainManager?.getSurfaceY(carrierX);
  if (surfaceY === null || surfaceY === undefined) {
    surfaceY = 400; // fallback so we do not place off-screen if terrain missing.
  }

  const carrierY = surfaceY - hoverHeight;

  // Build a simple sci-fi looking ship with Phaser graphics.
  const g = scene.add.graphics();

  // Hull
  const PAD_TOP = 20; // offset so we have room for a bridge above the hull
  const HULL_WIDTH = 300;
  const HULL_HEIGHT = 80;

  g.fillStyle(0x39395A);
  g.fillRoundedRect(0, PAD_TOP, HULL_WIDTH, HULL_HEIGHT, 16);

  // Bridge (command deck) – sits centred atop the hull
  g.fillStyle(0x4c4c7a);
  g.fillRoundedRect(HULL_WIDTH/2 - 40, PAD_TOP - 15, 80, 30, 6);
  // Bridge windows
  g.fillStyle(0x66CCFF);
  g.fillRect(HULL_WIDTH/2 - 30, PAD_TOP - 10, 60, 12);

  // Cockpit
  g.fillStyle(0x66CCFF);
  // Central cockpit window on the front of the hull
  g.fillRect(HULL_WIDTH/2 - 40, PAD_TOP + 10, 80, 36);

  // Engine pods
  g.fillStyle(0x5A5A7A);
  // Left & right engines beneath the wings
  g.fillRect(20, PAD_TOP + HULL_HEIGHT - 4, 60, 20);
  g.fillRect(HULL_WIDTH - 80, PAD_TOP + HULL_HEIGHT - 4, 60, 20);

  // Generate texture and clean up graphics object.
  const textureKey = 'carrierTexture';
  if (!scene.textures.exists(textureKey)) {
    g.generateTexture(textureKey, HULL_WIDTH, PAD_TOP + HULL_HEIGHT + 20);
  }
  g.destroy();

  // Create the sprite using the generated texture.
  const carrier = scene.add.sprite(carrierX, carrierY, textureKey);
  carrier.setOrigin(0.5, 0.5);

  // Physics body so cargo can target it.
  scene.physics.add.existing(carrier);
  carrier.body.setAllowGravity(false);
  carrier.body.setImmovable(true);

  // Carrier combat & health properties
  carrier.maxHealth = 1000;
  carrier.health = carrier.maxHealth;

  // Damage function with flash feedback
  carrier.damage = function(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      // TODO: implement game-over logic – for now destroy sprite
      this.destroy();
      return;
    }
    // flash red
    const originalTint = this.tintTopLeft;
    this.setTint(0xff5555);
    scene.time.delayedCall(100, () => {
      this.setTint(originalTint);
    });
  };

  // Mini-turret stats
  const MINI_STATS = {
    RANGE: 300,
    FIRE_RATE: 15, // frames between shots
    PROJECTILE_SPEED: 450,
    DAMAGE: 5,
    ACCURACY: 0.85,
    COLOR: 0xffdd33
  };

  // Offsets for two turrets on top of the carrier
  const turretOffsets = [
    { x: -100, y: -40 },
    { x:  100, y: -40 }
  ];

  // Create mini turret barrels for nice visuals (optional)
  carrier.miniTurrets = turretOffsets.map(offset => {
    const barrel = scene.add.rectangle(carrier.x + offset.x, carrier.y + offset.y, 6, 14, 0xaaaaaa);
    barrel.setOrigin(0.5, 1);
    barrel.setDepth(carrier.depth + 1);
    return { offset, barrel, fireTimer: 0 };
  });

  carrier.projectiles = [];
  carrier.enemyManager = null; // linked later
  carrier.setEnemyManager = function(em) { this.enemyManager = em; };

  // Helper to spawn a projectile from a mini turret
  function spawnMiniProjectile(startX, startY, targetX, targetY) {
    const baseAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const inaccuracy = 1 - (MINI_STATS.ACCURACY ?? 1);
    const maxSpread = Math.PI / 8; // 22.5 degrees
    const spreadRange = inaccuracy * maxSpread;
    const randomOffset = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
    const angle = baseAngle + randomOffset;
    const proj = scene.add.circle(startX, startY, 3, MINI_STATS.COLOR);
    scene.physics.add.existing(proj);
    proj.body.setAllowGravity(false);
    proj.body.setVelocity(Math.cos(angle) * MINI_STATS.PROJECTILE_SPEED, Math.sin(angle) * MINI_STATS.PROJECTILE_SPEED);
    proj.setData('damage', MINI_STATS.DAMAGE);
    proj.setData('angle', angle);
    carrier.projectiles.push(proj);
  }

  // Update loop for carrier (called by main scene)
  carrier.update = function() {
    // update turret barrels & firing
    for (const turret of this.miniTurrets) {
      // keep barrel positioned
      turret.barrel.x = this.x + turret.offset.x;
      turret.barrel.y = this.y + turret.offset.y;

      turret.fireTimer++;
      if (!this.enemyManager) continue;
      // find nearest enemy within range
      let nearest = null;
      let nearestDist = MINI_STATS.RANGE;
      for (const enemy of this.enemyManager.getEnemies()) {
        const dist = Phaser.Math.Distance.Between(turret.barrel.x, turret.barrel.y, enemy.x, enemy.y);
        if (dist < nearestDist) { nearestDist = dist; nearest = enemy; }
      }
      if (nearest && turret.fireTimer >= MINI_STATS.FIRE_RATE) {
        turret.fireTimer = 0;
        // rotate barrel
        const ang = Phaser.Math.Angle.Between(turret.barrel.x, turret.barrel.y, nearest.x, nearest.y);
        turret.barrel.rotation = ang - Math.PI/2;
        spawnMiniProjectile(turret.barrel.x, turret.barrel.y, nearest.x, nearest.y);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      // Remove out-of-bounds
      const bounds = scene.cameras.main.getBounds();
      if (proj.x < bounds.x || proj.x > bounds.right || proj.y < bounds.y || proj.y > bounds.bottom) {
        proj.destroy();
        this.projectiles.splice(i,1);
        continue;
      }
      // Collision with enemies
      if (this.enemyManager) {
        for (const enemy of this.enemyManager.getEnemies()) {
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
          if (dist < enemy.size) {
            enemy.health -= proj.getData('damage');
            if (enemy.health <= 0) {
              // remove enemy via enemyManager method for consistency
              const idx = this.enemyManager.getEnemies().indexOf(enemy);
              if (idx !== -1) this.enemyManager.damageEnemy(idx, 0); // triggers cleanup
            }
            // impact visual
            const impact = scene.add.circle(proj.x, proj.y, 6, MINI_STATS.COLOR, 0.8);
            impact.setDepth(100);
            scene.tweens.add({
              targets: impact,
              alpha: 0,
              scale: 2,
              duration: 250,
              onComplete: () => impact.destroy()
            });
            proj.destroy();
            this.projectiles.splice(i,1);
            break;
          }
        }
      }
    }
  };

  // Subtle hover bobbing tween for life.
  scene.tweens.add({
    targets: carrier,
    y: carrierY + 5,
    yoyo: true,
    repeat: -1,
    duration: 2000,
    ease: 'Sine.easeInOut'
  });

  return carrier;
}
