/**
 * BaseEnemy.js
 * ----------------------------------------------------------------------------
 * Base class for all enemy types in EdgeWorldMiners.
 * 
 * This abstract base class provides common functionality and properties that
 * all enemy types share. It is designed to be extended by specific enemy
 * implementations (MeleeEnemy, ShooterEnemy, etc).
 * 
 * EXTENDING THIS CLASS:
 * 1. Create a new file in the src/enemies/ directory
 * 2. Import and extend this class
 * 3. Implement the required methods (especially update())
 * 4. Define static STATS property with enemy-specific values
 * 
 * RELATIONSHIP WITH OTHER COMPONENTS:
 * - Managed by EnemyManager (creation, updates, destruction)
 * - Interacts with DrillManager, TurretManager, and TerrainManager
 * - Can be targeted by Turrets
 * 
 * @author EdgeWorldMiners Team
 */

export class BaseEnemy {
  /**
   * Creates a new enemy instance
   * 
   * @param {Phaser.Scene} scene - The Phaser scene this enemy belongs to
   * @param {EnemyManager} manager - Reference to the enemy manager
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   * @param {object} stats - Stats object containing health, speed, size, damage values
   * @param {number} stats.HEALTH - Maximum health points
   * @param {number} stats.SPEED - Movement speed
   * @param {number} stats.SIZE - Size/radius of the enemy
   * @param {number} stats.DAMAGE - Damage dealt to targets
   * @param {number} stats.COLOR - Color to use for the enemy graphics
   */
  constructor(scene, manager, x, y, stats) {
    // Core references
    this.scene = scene;
    this.manager = manager;
    this.x = x;
    this.y = y;

    // Stats from the provided stats object
    this.STATS = stats;
    this.health = stats.HEALTH;
    this.maxHealth = stats.HEALTH;
    this.speed = stats.SPEED;
    this.size = stats.SIZE;
    this.damage = stats.DAMAGE;
    
    // State tracking
    this.active = true;
    this.target = null;
    this.targetType = null; // 'drill' or 'turret'
    this.attackCooldown = 0;

    // Graphics-related references – should be assigned in subclass
    this.sprite = null;
  }

  /**
   * Apply damage to this enemy
   * 
   * @param {number} amount - Amount of damage to apply
   * @returns {boolean} - True if the enemy was destroyed, false otherwise
   */
  takeDamage(amount) {
    if (!this.active) return false;
    
    this.health -= amount;
    
    // Check if the enemy is destroyed
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    
    return false;
  }

  /**
   * Updates the enemy's position, behavior, and state
   * MUST be implemented by subclasses
   */
  update() {
    // This method should be overridden by subclasses
    console.warn('BaseEnemy.update() called - this method should be overridden by subclasses');
  }

  /**
   * Destroys this enemy instance and cleans up resources
   */
  destroy() {
    if (!this.active) return;
    
    this.active = false;
    
    // Clean up sprite if it exists
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    
    // Remove from manager's array (handled by manager)
  }
  
  /**
   * Convenience accessor for Phaser.Math functions
   */
  get math() {
    return Phaser.Math;
  }
} 