/**
 * ShooterEnemy.js
 * ----------------------------------------------------------------------------
 * Implementation of ranged shooter enemies that attack from a distance.
 * 
 * Shooter enemies fly horizontally across the screen and fire projectiles
 * at targets below. They maintain distance and avoid direct contact,
 * preferring to deal damage through their projectiles which can also
 * damage terrain.
 * 
 * VISUAL DESIGN:
 * Shooter enemies are represented as diamond-shaped craft with twin prongs
 * at the front suggesting guns. Their size is 20% larger than in the
 * previous implementation for better visual proportions.
 * 
 * RELATIONSHIP WITH OTHER COMPONENTS:
 * - Extends BaseEnemy
 * - Managed by EnemyManager
 * - Creates projectiles that are managed by EnemyManager
 * - Targets drills and turrets from a distance
 * 
 * @author EdgeWorldMiners Team
 */

import { BaseEnemy } from './BaseEnemy.js';

export class ShooterEnemy extends BaseEnemy {
  /**
   * Stats for the shooter enemy
   */
  static STATS = {
    HEALTH: 80,
    SPEED: 60,
    SIZE: 30, // Increased from 20
    DAMAGE: 6,
    COLOR: 0x9933ff // purple
  };

  /**
   * Configuration for shooter enemy projectiles and behavior
   * Moved from EnemyManager to keep behavior consistent
   */
  static SHOOTER_CONFIG = {
    PROJECTILE_SPEED: 120,
    PROJECTILE_DAMAGE: 4,
    PROJECTILE_AOE: 3,
    // Shooter accuracy (0-1). Lower accuracy => wider spread
    ACCURACY: 0.75,
    TERRAIN_DAMAGE_STRENGTH: 1,
    ATTACK_RANGE: 800, // doubled per new design
    ATTACK_COOLDOWN: 120,
    STRAFE_HEIGHT: 100, // Height at which shooter flies
    DIRECTION_CHANGE_CHANCE: 0.005, // Chance per frame to change direction
    BURST_SHOTS: 3,
    BURST_INTERVAL: 120 // frames between shots in a burst
  };

  /**
   * Creates a new shooter enemy
   * 
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {EnemyManager} manager - Reference to the enemy manager
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   * @param {number} hDir - Horizontal direction (1 for right, -1 for left)
   */
  constructor(scene, manager, x, y, hDir = 1) {
    // Call parent constructor with shooter stats
    super(scene, manager, x, y, ShooterEnemy.STATS);
    
    // Store the tier for reference
    this.tier = 'SHOOTER';
    this.isShooter = true;
    
    // Set horizontal direction
    this.hDir = hDir || (Math.random() < 0.5 ? 1 : -1);
    
    // Movement / strike state machine
    // States: PATROL – cruising at top height; STRIKE – diving toward target; RETREAT – climbing back up
    this.state = 'PATROL';
    this.firedThisStrike = false;
    
    this.burstShotsRemaining = 0;
    this.strikeAngleOffset = 0;
    
    // Create the enemy sprite with the new attack craft design
    this.createSprite();
  }

  /**
   * Creates the visual representation of this enemy
   * Uses a heavy bomber silhouette with broad wings and twin engines to
   * deliver a distinct sci-fi look.  The drawing is purely cosmetic and
   * leaves all hit-detection unchanged.
   */
  createSprite() {
    const graphics = this.scene.add.graphics();
    const color = this.STATS.COLOR;
    const size = this.STATS.SIZE;

    // Sizing helpers
    const wingSpan = size * 3;          // total width tip-to-tip
    const fuselageLength = size * 2;    // nose to tail
    const fuselageWidth  = size * 0.6;

    // ---------- MAIN FUSELAGE ----------
    graphics.fillStyle(color, 1);
    graphics.fillRect(-fuselageLength / 2, -fuselageWidth / 2, fuselageLength, fuselageWidth);

    // ---------- WING SHAPES ----------
    graphics.fillStyle(color, 0.85);
    graphics.beginPath();
    graphics.moveTo(-wingSpan / 2, 0);
    graphics.lineTo(-fuselageLength / 4, -size);
    graphics.lineTo(-fuselageLength / 4, size);
    graphics.closePath();
    graphics.fillPath();

    graphics.beginPath();
    graphics.moveTo(wingSpan / 2, 0);
    graphics.lineTo(fuselageLength / 4, -size);
    graphics.lineTo(fuselageLength / 4, size);
    graphics.closePath();
    graphics.fillPath();

    // ---------- COCKPIT CANOPY ----------
    graphics.fillStyle(0x111111, 1);
    graphics.fillRect(-size * 0.3, -size * 0.28, size * 0.6, size * 0.56);

    // ---------- ENGINES ----------
    graphics.fillStyle(0xffaa33, 0.8);
    graphics.fillCircle(-fuselageLength / 2 - size * 0.2, -size * 0.25, size * 0.25);
    graphics.fillCircle(-fuselageLength / 2 - size * 0.2,  size * 0.25, size * 0.25);

    // Create a unique texture key (wider than default)
    const textureKey = `enemy_shooter_${Date.now()}`;
    graphics.generateTexture(textureKey, wingSpan, size * 2);
    graphics.destroy();

    // Create the sprite with physics
    this.sprite = this.scene.add.sprite(this.x, this.y, textureKey);
    this.scene.physics.add.existing(this.sprite);

    // Orient sprite along horizontal direction
    this.sprite.rotation = this.hDir > 0 ? 0 : Math.PI;
  }

  /**
   * Updates the enemy's position, behavior, and state
   * Called every frame by the EnemyManager
   */
  update() {
    if (!this.active) return;
    
    // Update position from sprite
    this.x = this.sprite.x;
    this.y = this.sprite.y;
    
    // Decrement attack cooldown if it's active
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
    
    switch (this.state) {
      case 'PATROL':
        this.strafe();
        break;
      case 'STRIKE':
        this.performStrike();
        break;
      case 'RETREAT':
        this.performRetreat();
        break;
    }
    
    // Find a target if we don't have one or it's been destroyed
    if (!this.target || 
        (this.target.sprite && !this.target.sprite.active) ||
        !this.manager.getTargetables().includes(this.target)) {
      this.findNewTarget();
    }
    
    // Transition from PATROL to STRIKE if target in range
    if (this.state === 'PATROL' && this.target) {
      const dist = this.math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist <= ShooterEnemy.SHOOTER_CONFIG.ATTACK_RANGE) {
        this.state = 'STRIKE';
        this.firedThisStrike = false;
        this.burstShotsRemaining = ShooterEnemy.SHOOTER_CONFIG.BURST_SHOTS;
        this.strikeAngleOffset = this.math.FloatBetween(-Math.PI / 6, Math.PI / 6); // +/-30°
      }
    }

    // Ensure we never get stuck outside horizontal bounds
    this.handleWorldEdges();
  }
  
  /**
   * Strafing behavior - moves horizontally at a fixed height
   */
  strafe() {
    // Get world bounds
    const worldBounds = this.scene.cameras.main.getBounds();
    
    // Maintain a fixed height
    const targetY = Math.min(ShooterEnemy.SHOOTER_CONFIG.STRAFE_HEIGHT, worldBounds.height / 3);
    const yDiff = targetY - this.y;
    const yVelocity = Math.sign(yDiff) * Math.min(Math.abs(yDiff), this.speed);
    
    // Move horizontally based on direction
    const xVelocity = this.hDir * this.speed;
    
    // Set velocity
    this.sprite.body.setVelocity(xVelocity, yVelocity);
    
    // Rotate based on horizontal direction
    this.sprite.rotation = this.hDir > 0 ? 0 : Math.PI;
    
    const margin = 60;
    // Clamp X inside bounds a bit to avoid stuck jitter
    if (this.x < worldBounds.x + margin) {
      this.x = worldBounds.x + margin;
      this.sprite.x = this.x;
      if (this.hDir < 0) this.hDir = 1; // force rightwards
    } else if (this.x > worldBounds.right - margin) {
      this.x = worldBounds.right - margin;
      this.sprite.x = this.x;
      if (this.hDir > 0) this.hDir = -1; // force leftwards
    }
  }
  
  /**
   * Finds a new target (drill, turret, or carrier hardpoint) to attack
   */
  findNewTarget() {
    // Reset target
    this.target = null;
    this.targetType = null;

    const allTargets = this.manager.getTargetables();
    if (!allTargets || allTargets.length === 0) return;

    // Create priority lists - shooters prefer different targets based on game state
    const drillTargets = allTargets.filter(t => t.priorityTag === 'DRILL');
    const hardpointTargets = allTargets.filter(t => t.priorityTag === 'CARRIER_HARDPOINT' && !t.destroyed);
    
    // Check if carrier has all hardpoints destroyed - if so, it becomes a valid target
    const carrier = allTargets.find(t => t.priorityTag === 'CARRIER');
    const isCarrierVulnerable = carrier && 
                               carrier.hardpoints && 
                               carrier.hardpoints.length > 0 &&
                               carrier.hardpoints.every(hp => !hp || hp.destroyed);
    
    // Determine target priority - 60% chance to prefer hardpoints if they exist
    let candidateList;
    
    if (hardpointTargets.length > 0 && Math.random() < 0.6) {
      // Target hardpoints first (higher priority)
      candidateList = hardpointTargets;
    } else if (isCarrierVulnerable && Math.random() < 0.8) {
      // Vulnerable carrier becomes high priority
      candidateList = [carrier];
    } else if (drillTargets.length > 0) {
      // Target drills if no hardpoints to attack
      candidateList = drillTargets; 
    } else {
      // Default to all targets
      candidateList = allTargets;
    }

    const closestTarget = this.manager.findClosestTarget(this.x, this.y, candidateList);

    if (closestTarget) {
      const distance = this.math.Distance.Between(this.x, this.y, closestTarget.x, closestTarget.y);
      if (distance <= ShooterEnemy.SHOOTER_CONFIG.ATTACK_RANGE) {
        this.target = closestTarget;
        this.targetType = (closestTarget.priorityTag || '').toLowerCase();
      }
    }
  }
  
  /**
   * Attacks the current target by firing a projectile
   */
  attackTarget() {
    if (!this.target || this.attackCooldown > 0) return;

    // Reset attack cooldown
    this.attackCooldown = ShooterEnemy.SHOOTER_CONFIG.ATTACK_COOLDOWN;

    // Get target position
    const targetX = this.target.x;
    const targetY = this.target.y;

    this.fireProjectile(targetX, targetY);
  }
  
  /**
   * Fires a projectile at the specified coordinates
   * 
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   */
  fireProjectile(targetX, targetY) {
    // Calculate base angle toward target
    const baseAngle = this.math.Angle.Between(this.x, this.y, targetX, targetY);

    // Compute spread based on shooter accuracy
    const inaccuracy = 1 - ShooterEnemy.SHOOTER_CONFIG.ACCURACY;
    const maxSpread = Math.PI / 4; // 45 degrees max spread
    const spreadRange = inaccuracy * maxSpread;
    const randomOffset = this.math.FloatBetween(-spreadRange, spreadRange);
    const finalAngle = baseAngle + randomOffset;

    // Create projectile
    const projectile = this.scene.add.circle(
      this.x, 
      this.y, 
      4, 
      this.STATS.COLOR
    );
    
    // Add physics
    this.scene.physics.add.existing(projectile);
    projectile.body.setVelocity(
      Math.cos(finalAngle) * ShooterEnemy.SHOOTER_CONFIG.PROJECTILE_SPEED,
      Math.sin(finalAngle) * ShooterEnemy.SHOOTER_CONFIG.PROJECTILE_SPEED
    );
    projectile.body.setGravity(0, 0);

    // Register projectile with manager
    this.manager.projectiles.push({
      sprite: projectile,
      damage: ShooterEnemy.SHOOTER_CONFIG.PROJECTILE_DAMAGE,
      aoeRange: ShooterEnemy.SHOOTER_CONFIG.PROJECTILE_AOE,
      terrainDamage: ShooterEnemy.SHOOTER_CONFIG.TERRAIN_DAMAGE_STRENGTH
    });
    
    // Show muzzle flash effect
    this.showMuzzleFlash();

    // After firing in STRIKE mode we start retreat on next update cycle
  }
  
  /**
   * Shows a muzzle flash effect when firing
   */
  showMuzzleFlash() {
    // Calculate position for muzzle flash (in front of the ship)
    const flashX = this.x + (this.hDir * this.STATS.SIZE * 0.7);
    const flashY = this.y;
    
    // Create flash effect
    const flash = this.scene.add.circle(flashX, flashY, this.STATS.SIZE * 0.2, 0xffff99, 0.8);
    
    // Fade out and destroy
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.5,
      duration: 100,
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  /**
   * Performs the dive toward the target; fires once when in range.
   */
  performStrike() {
    if (!this.target) {
      // Lost target – abort strike
      this.state = 'RETREAT';
      return;
    }

    // Approach with stored offset for variety
    const baseAngle = this.math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const approachAngle = baseAngle + this.strikeAngleOffset;
    const vx = Math.cos(approachAngle) * (this.speed * 1.4);
    const vy = Math.sin(approachAngle) * (this.speed * 1.4);
    this.sprite.body.setVelocity(vx, vy);
    this.sprite.rotation = approachAngle + Math.PI / 2;

    const dist = this.math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    // Keep firing burst rounds until we are within 200 px of the target
    if (dist > 200) {
      if (this.attackCooldown <= 0) {
        this.attackTarget();
        this.attackCooldown = ShooterEnemy.SHOOTER_CONFIG.BURST_INTERVAL;
      }
    } else {
      // Too close – break off
      if (this.attackCooldown <= 0) {
        this.state = 'RETREAT';
      }
    }
  }

  /**
   * Climbs back to cruising height and resumes patrol.
   */
  performRetreat() {
    const cruisingY = Math.min(ShooterEnemy.SHOOTER_CONFIG.STRAFE_HEIGHT, this.scene.cameras.main.getBounds().height / 3);

    // Horizontal velocity maintained
    const xVelocity = this.hDir * this.speed;
    const yVelocity = -this.speed; // upward
    this.sprite.body.setVelocity(xVelocity, yVelocity);

    // Rotate to match upward flight
    this.sprite.rotation = this.hDir > 0 ? -Math.PI / 6 : -5 * Math.PI / 6;

    if (this.y <= cruisingY) {
      // Reached top – resume patrol
      this.state = 'PATROL';
      this.sprite.body.setVelocity(0, 0);

      // randomly flip horizontal direction on exit to vary pattern
      if (Math.random() < 0.5) this.hDir = -this.hDir;
    }
  }

  /**
   * Keeps the enemy within horizontal camera bounds and flips direction if needed.
   */
  handleWorldEdges() {
    const bounds = this.scene.cameras.main.getBounds();
    const margin = 60;
    if (this.x < bounds.x + margin) {
      this.x = bounds.x + margin;
      this.sprite.x = this.x;
      if (this.hDir < 0) this.hDir = 1;
    } else if (this.x > bounds.right - margin) {
      this.x = bounds.right - margin;
      this.sprite.x = this.x;
      if (this.hDir > 0) this.hDir = -1;
    }
  }
} 