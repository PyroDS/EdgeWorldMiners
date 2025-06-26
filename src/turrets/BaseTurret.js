export class BaseTurret {
  /**
   * @param {Phaser.Scene} scene - Phaser scene reference
   * @param {TurretManager} manager - Owning manager for callbacks and shared arrays
   * @param {number} x - world x
   * @param {number} y - world y
   * @param {object} stats - STAT data for this turret
   * @param {object} colors - COLOR palette for this turret
   */
  constructor(scene, manager, x, y, stats, colors) {
    this.scene = scene;
    this.manager = manager;
    this.x = x;
    this.y = y;

    this.STATS = stats;
    this.COLORS = colors;

    // Graphics-related references – should be assigned in subclass
    this.container = null;
    this.barrel = null;

    // State
    this.health = stats.HEALTH;
    this.maxHealth = stats.HEALTH;
    this.fireTimer = 0;
    this.active = true;
  }

  /**
   * Subclasses should implement an update that handles cooldown & firing.
   */
  update() {
    // To be implemented by subclasses.
  }

  /**
   * Apply incoming damage.
   * Utilises the manager's existing damage & destroy helpers so we keep visuals consistent.
   */
  takeDamage(amount) {
    this.manager.damageTurret(this, amount);
  }

  /**
   * Convenience accessor for Phaser.Math functions.
   */
  get math() {
    return Phaser.Math;
  }
} 