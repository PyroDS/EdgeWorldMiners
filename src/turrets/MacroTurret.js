import { BaseTurret } from './BaseTurret.js';

export class MacroTurret extends BaseTurret {
  static STATS = {
    NAME: 'Macro Turret',
    HEALTH: 100,
    COST: 20,
    RANGE: 500,
    FIRE_RATE: 60, // frames between shots
    PROJECTILE_DAMAGE: 25,
    PROJECTILE_SPEED: 300,
    ACCURACY: 0.9,
    MAX_SPREAD_RAD: Math.PI / 6,
    AOE_RANGE: 80,
    AOE_DAMAGE: 15
  };

  static COLORS = {
    TURRET: 0x226622,
    TURRET_BASE: 0x111111,
    RANGE: 0x44aa44,
    PROJECTILE: 0x00ff33,
    EXPLOSION: 0x33ff99,
    DAMAGE_INDICATOR: 0xff0000
  };

  constructor(scene, manager, x, y) {
    super(scene, manager, x, y, MacroTurret.STATS, MacroTurret.COLORS);

    // Build graphics
    this.container = scene.add.container(x, y);

    // Base rectangle
    const base = scene.add.rectangle(0, 0, 30, 30, this.COLORS.TURRET);
    // Barrel rectangle
    this.barrel = scene.add.rectangle(0, -20, 10, 20, this.COLORS.TURRET);
    // AOE indicator (small)
    const aoeIndicator = scene.add.circle(0, -15, 5, this.COLORS.EXPLOSION, 0.6);

    this.container.add([base, this.barrel, aoeIndicator]);

    scene.physics.add.existing(this.container, true); // static body
  }

  update() {
    if (!this.active) return;

    this.fireTimer++;

    // Query manager for nearest enemy
    const enemy = this.manager.findNearestEnemy(this.x, this.y, this.STATS.RANGE);

    if (enemy && this.fireTimer >= this.STATS.FIRE_RATE) {
      this.fireTimer = 0;

      // Rotate barrel towards enemy
      const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
      if (this.barrel) {
        this.barrel.rotation = angle - Math.PI / 2;
      }

      // Fire!
      this.spawnProjectile(enemy.x, enemy.y);
    }
  }

  spawnProjectile(targetX, targetY) {
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);

    // Spread based on accuracy
    const inaccuracy = 1 - (this.STATS.ACCURACY ?? 1);
    const spreadRange = inaccuracy * (this.STATS.MAX_SPREAD_RAD ?? 0);
    const randomOffset = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
    const finalAngle = baseAngle + randomOffset;

    const projectile = this.scene.add.circle(this.x, this.y - 20, 5, this.COLORS.PROJECTILE);
    this.scene.physics.add.existing(projectile);

    const speed = this.STATS.PROJECTILE_SPEED;
    projectile.body.setVelocity(Math.cos(finalAngle) * speed, Math.sin(finalAngle) * speed);
    projectile.body.setGravity(0, 0);

    // Register projectile with manager so existing update logic can handle collisions & cleanup
    this.manager.projectiles.push({
      sprite: projectile,
      damage: this.STATS.PROJECTILE_DAMAGE,
      aoeRange: this.STATS.AOE_RANGE,
      aoeDamage: this.STATS.AOE_DAMAGE
    });
  }
} 