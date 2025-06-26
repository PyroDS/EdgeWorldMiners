import Phaser from 'phaser';

// --- Configuration/constants ---
// Height (in pixels) of the generated carrier sprite.
// Formula mirrors the size used when drawing the texture below: PAD_TOP + HULL_HEIGHT + 20
const CARRIER_SPRITE_HEIGHT = 20 + 80 + 20; // 120px

/**
 * Attempts to find a safe X/Y position for the carrier so it hovers roughly at sea-level
 * while remaining at least `hoverHeight` pixels above the terrain column directly beneath it.
 *
 * @param {Phaser.Scene} scene – The current Phaser scene (used only for RNG helper).
 * @param {TerrainManager} terrainManager – Instance providing `getSurfaceY()` and `seaLevelRow`.
 * @param {number} worldWidth – The total width of the world.
 * @param {number} hoverHeight – Desired clearance from the terrain surface.
 * @returns {{x:number,y:number}} – Chosen world coordinates for the carrier.
 */
function findHoverPosition(scene, terrainManager, worldWidth, hoverHeight) {
  const margin = 150; // ensure full sprite visibility within camera bounds
  const seaLevelY = (terrainManager?.seaLevelRow ?? 40) * (terrainManager?.tileSize ?? 20);

  const MAX_ATTEMPTS = 80;
  const ACCEPTABLE_SURFACE_VARIANCE = 300; // how far the terrain surface can deviate from sea-level (soft cut-off)

  let bestCandidate = null;
  let bestDiff = Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const x = Phaser.Math.Between(margin, Math.max(margin, worldWidth - margin));

    // ---- Evaluate terrain clearance across the full carrier width ----
    const HULL_WIDTH = 300; // must match width used later for drawing
    const halfW = HULL_WIDTH * 0.5;
    const sampleXs = [x - halfW, x, x + halfW];

    let highestGround = Infinity;
    for (const sx of sampleXs) {
      const colSurface = terrainManager?.getSurfaceY(sx);
      if (colSurface != null && colSurface < highestGround) {
        highestGround = colSurface;
      }
    }

    if (highestGround === Infinity) continue; // no valid surface – skip

    // Prefer terrain columns whose average surface is close to sea-level so the carrier is nicely framed.
    const withinBand = Math.abs(highestGround - seaLevelY) <= ACCEPTABLE_SURFACE_VARIANCE;

    // Compute tentative Y – ensure the sprite bottom remains above the HIGHEST terrain surface across width.
    const tentativeY = highestGround - hoverHeight;
    const spriteBottom = tentativeY + CARRIER_SPRITE_HEIGHT / 2;

    // Must maintain at least 4px clearance above the highest ground.
    if (spriteBottom + 4 >= highestGround) continue;

    // Keep the candidate whose surface is closest to sea-level.
    const diff = Math.abs(highestGround - seaLevelY);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandidate = { x, y: tentativeY };
    }

    // If within soft band, return immediately (good enough)
    if (withinBand) {
      return { x, y: tentativeY };
    }
  }

  // If we failed to find a sea-level position, use the first safe fallback or center of the world.
  if (bestCandidate) return bestCandidate;
  const defaultX = worldWidth * 0.5;
  const defaultSurface = terrainManager?.getSurfaceY(defaultX) ?? seaLevelY;
  return { x: defaultX, y: defaultSurface - hoverHeight };
}

// Creates a hovering sci-fi carrier. The carrier spawns near sea-level but always
// maintains `hoverHeight` pixels of clearance above the terrain directly beneath it.
export function createCarrier(scene, terrainManager, worldWidth, hoverHeight = 120) {
  // Obtain a safe spawn coordinate.
  const { x: carrierX, y: carrierY } = findHoverPosition(scene, terrainManager, worldWidth, hoverHeight);

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

  // Persist hover parameters for dynamic altitude correction
  carrier.hoverHeight = hoverHeight;

  // Physics body so cargo can target it.
  scene.physics.add.existing(carrier);
  carrier.body.setAllowGravity(false);
  carrier.body.setImmovable(true);

  // Carrier combat & health properties
  carrier.maxHealth = 1000;
  carrier.health = carrier.maxHealth;

  // Damage function with flash feedback
  carrier.takeDamage = function(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      // Unregister so enemies no longer target a destroyed carrier
      if (this.enemyManager) {
        this.enemyManager.unregisterTarget(this);
      }
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
  
  // Alias for backward compatibility
  carrier.damage = carrier.takeDamage;

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
    // --- Maintain altitude above terrain surface ---
    if (terrainManager && typeof terrainManager.getSurfaceY === 'function') {
      const halfW = (this.displayWidth || this.width || 0) * 0.5;
      const samples = [this.x - halfW, this.x, this.x + halfW];
      let highestGround = Infinity;
      for (const sx of samples) {
        const y = terrainManager.getSurfaceY(sx);
        if (y != null && y < highestGround) {
          highestGround = y;
        }
      }
      const desiredY = (highestGround !== Infinity ? highestGround - this.hoverHeight : this.y);
      // Smoothly move toward desired altitude
      this.y = Phaser.Math.Linear(this.y, desiredY, 0.06);
    }

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
            const wasDestroyed = enemy.takeDamage(proj.getData('damage'));
            
            if (!wasDestroyed) {
              const damageText = scene.add.text(
                enemy.x, 
                enemy.y, 
                proj.getData('damage').toString(), 
                { 
                  fontFamily: 'Arial', 
                  fontSize: '16px', 
                  color: '#ffff00',
                  stroke: '#000000',
                  strokeThickness: 2
                }
              );
              damageText.setOrigin(0.5);
              
              scene.tweens.add({
                targets: damageText,
                y: enemy.y - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => {
                  damageText.destroy();
                }
              });
            }
            
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

  // Subtle hover bobbing by oscillating a dummy "bobOffset" property
  carrier.bobOffset = 0;
  scene.tweens.add({
    targets: carrier,
    bobOffset: 5,
    yoyo: true,
    repeat: -1,
    duration: 2000,
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      // keep vertical position centred at dynamically corrected base plus bobOffset
      if (terrainManager && typeof terrainManager.getSurfaceY === 'function') {
        const halfW = (carrier.displayWidth || carrier.width || 0) * 0.5;
        const samples = [carrier.x - halfW, carrier.x, carrier.x + halfW];
        let highestGround = Infinity;
        for (const sx of samples) {
          const y = terrainManager.getSurfaceY(sx);
          if (y != null && y < highestGround) {
            highestGround = y;
          }
        }
        const baseY = (highestGround !== Infinity ? highestGround - carrier.hoverHeight : carrier.y);
        carrier.y = baseY + carrier.bobOffset;
      }
    }
  });

  return carrier;
}
