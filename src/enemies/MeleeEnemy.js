/**
 * MeleeEnemy.js
 * ----------------------------------------------------------------------------
 * Implementation of melee-type enemies that attack by direct contact.
 * 
 * This class handles three tiers of melee enemies (SMALL, MEDIUM, LARGE),
 * which differ in health, speed, size, and damage. All melee enemies share
 * the same basic behavior: they move towards the nearest target and deal
 * damage on contact.
 * 
 * VISUAL DESIGN:
 * Melee enemies are represented as elongated hexagons with forward-swept wings,
 * resembling aggressive attack craft. Their size is 20% larger than in the
 * previous implementation for better visual proportions.
 * 
 * RELATIONSHIP WITH OTHER COMPONENTS:
 * - Extends BaseEnemy
 * - Managed by EnemyManager
 * - Targets drills and turrets
 * 
 * @author EdgeWorldMiners Team
 */

import { BaseEnemy } from './BaseEnemy.js';

export class MeleeEnemy extends BaseEnemy {
  /**
   * Stats for the three tiers of melee enemies
   * These values match the original ENEMY_TIERS with a 20% size increase
   */
  static TIER_STATS = {
    SMALL: {
      HEALTH: 30,
      SPEED: 70,
      SIZE: 18, // Increased from 15
      DAMAGE: 3,
      COLOR: 0xff0000,
    },
    MEDIUM: {
      HEALTH: 60,
      SPEED: 50,
      SIZE: 30, // Increased from 25
      DAMAGE: 5,
      COLOR: 0xff3300,
    },
    LARGE: {
      HEALTH: 120,
      SPEED: 35,
      SIZE: 48, // Increased from 40
      DAMAGE: 10,
      COLOR: 0xff6600,
    }
  };

  /**
   * Wave settings that affect melee enemy behavior
   * Moved from EnemyManager to keep behavior consistent
   */
  static WAVE_SETTINGS = {
    TERRAIN_DAMAGE_RADIUS: 20,
    TERRAIN_DAMAGE_STRENGTH: 5,
    ATTACK_RANGE: 140,
    ATTACK_COOLDOWN: 60,
    PATROL_DURATION: 180, // frames before changing patrol direction
    PATROL_SPEED_FACTOR: 0.8 // How much of normal speed is used for patrol movement
  };

  /**
   * Creates a new melee enemy
   * 
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {EnemyManager} manager - Reference to the enemy manager
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   * @param {string} tier - The tier of this enemy: 'SMALL', 'MEDIUM', or 'LARGE'
   */
  constructor(scene, manager, x, y, tier) {
    // Validate tier and get the appropriate stats
    if (!MeleeEnemy.TIER_STATS[tier]) {
      console.error(`Invalid melee enemy tier: ${tier}`);
      tier = 'SMALL'; // Default to SMALL if invalid tier
    }
    
    // Call parent constructor with the stats for this tier
    super(scene, manager, x, y, MeleeEnemy.TIER_STATS[tier]);
    
    // Store the tier for reference
    this.tier = tier;
    
    // Create the enemy sprite with the new attack craft design
    this.createSprite();
    
    // Initialize patrol behavior
    this.patrolDirection = Math.random() > 0.5 ? 1 : -1; // Random initial direction
    this.patrolTimer = Math.floor(Math.random() * MeleeEnemy.WAVE_SETTINGS.PATROL_DURATION);
  }

  /**
   * Creates the visual representation of this enemy
   * Uses a sleek triangular fighter shape to better match the
   * sci-fi aesthetic.  The geometry is purely cosmetic and does not
   * affect hit-box or gameplay behaviour.
   */
  createSprite() {
    const graphics = this.scene.add.graphics();
    const color = this.STATS.COLOR;
    const size = this.STATS.SIZE;

    // ---------- MAIN HULL (isosceles triangle) ----------
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -size);                // Nose
    graphics.lineTo(size * 0.6, size);        // Right tail
    graphics.lineTo(-size * 0.6, size);       // Left tail
    graphics.closePath();
    graphics.fillPath();

    // ---------- CANARDS / SMALL WINGS ----------
    graphics.fillStyle(color, 0.85);
    graphics.beginPath();
    graphics.moveTo(-size * 0.4, size * 0.2);
    graphics.lineTo(-size * 0.9, size * 0.8);
    graphics.lineTo(-size * 0.2, size * 0.6);
    graphics.closePath();
    graphics.fillPath();

    graphics.beginPath();
    graphics.moveTo(size * 0.4, size * 0.2);
    graphics.lineTo(size * 0.9, size * 0.8);
    graphics.lineTo(size * 0.2, size * 0.6);
    graphics.closePath();
    graphics.fillPath();

    // ---------- COCKPIT DETAIL ----------
    graphics.fillStyle(0x222222, 1);
    graphics.fillCircle(0, size * 0.2, size * 0.3);

    // ---------- ENGINE GLOW ----------
    graphics.fillStyle(0xffaa33, 0.8);
    graphics.fillCircle(0, size * 0.9, size * 0.25);

    // Generate texture.  Width/height chosen to fully enclose shape.
    const textureKey = `enemy_melee_${this.tier}_${Date.now()}`;
    graphics.generateTexture(textureKey, size * 2, size * 2);
    graphics.destroy();

    // Create the sprite with physics
    this.sprite = this.scene.add.sprite(this.x, this.y, textureKey);
    this.scene.physics.add.existing(this.sprite);

    // Face downward towards the mining base initially
    this.sprite.rotation = Math.PI / 2;
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
    
    // Find a target if we don't have one or it's been destroyed
    if (!this.target || 
        (this.target.sprite && !this.target.sprite.active) ||
        !this.manager.getTargetables().includes(this.target)) {
      this.findNewTarget();
    }
    
    // If we have a target, move towards it
    if (this.target) {
      this.moveTowardsTarget();
    } else {
      // No target, patrol the area
      this.patrol();
    }
  }
  
  /**
   * Finds a new target (drill or turret) to attack
   */
  findNewTarget() {
    // Reset target info
    this.target = null;
    this.targetType = null;

    const allTargets = this.manager.getTargetables();
    if (!allTargets || allTargets.length === 0) return;

    const closestTarget = this.manager.findClosestTarget(this.x, this.y, allTargets);

    if (closestTarget) {
      this.target = closestTarget;
      this.targetType = (closestTarget.priorityTag || '').toLowerCase();
    }
  }
  
  /**
   * Moves the enemy towards its current target
   */
  moveTowardsTarget() {
    // Calculate direction to target
    let targetX, targetY;
    
    if (this.targetType === 'drill' || this.targetType === 'turret') {
      targetX = this.target.x;
      targetY = this.target.y;
    } else if (this.targetType === 'carrier') {
      targetX = this.target.x;
      targetY = this.target.y;
    } else {
      // Shouldn't happen, but just in case
      this.patrol();
      return;
    }
    
    // Calculate angle to target
    const angle = this.math.Angle.Between(this.x, this.y, targetX, targetY);
    
    // Rotate sprite to face target
    this.sprite.rotation = angle + Math.PI/2;
    
    // Calculate distance to target
    const distance = this.math.Distance.Between(this.x, this.y, targetX, targetY);
    
    /*
     * Desired behaviour:
     * 1. If outside our attack range, close the distance.
     * 2. If inside (or equal to) attack range, stop and attack from current
     *    position instead of colliding with the target.
     */

    if (distance > MeleeEnemy.WAVE_SETTINGS.ATTACK_RANGE) {
      // --- APPROACH PHASE ---
      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;
      this.sprite.body.setVelocity(vx, vy);
    } else {
      // --- STAND-OFF & ATTACK PHASE ---
      this.sprite.body.setVelocity(0, 0);

      if (this.attackCooldown <= 0) {
        this.attackTarget();
      }
    }
  }
  
  /**
   * Attacks the current target
   */
  attackTarget() {
    if (!this.target || this.attackCooldown > 0) return;

    // Reset attack cooldown
    this.attackCooldown = MeleeEnemy.WAVE_SETTINGS.ATTACK_COOLDOWN;

    // Prefer direct takeDamage if available, else fallback for drills
    if (typeof this.target.takeDamage === 'function') {
      this.target.takeDamage(this.damage);
    } else if (this.targetType === 'drill' && this.manager.drillManager) {
      this.manager.drillManager.damageDrill(this.target, this.damage);
    }

    // Show attack effect
    this.showAttackEffect();
  }
  
  /**
   * Shows a visual effect when attacking
   */
  showAttackEffect() {
    if (!this.target) return;
    
    let targetX, targetY;
    
    if (this.targetType === 'drill' || this.targetType === 'turret') {
      targetX = this.target.x;
      targetY = this.target.y;
    } else if (this.targetType === 'carrier') {
      targetX = this.target.x;
      targetY = this.target.y;
    } else {
      return;
    }
    
    // Create a line from enemy to target
    const line = this.scene.add.line(
      0, 0,
      this.x, this.y,
      targetX, targetY,
      0xff0000
    );
    line.setLineWidth(2);
    line.setOrigin(0, 0);
    
    // Fade out and destroy
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        line.destroy();
      }
    });
    
    // Also damage terrain around the target
    this.manager.terrainManager.damageCircle(
      targetX, 
      targetY, 
      MeleeEnemy.WAVE_SETTINGS.TERRAIN_DAMAGE_RADIUS,
      MeleeEnemy.WAVE_SETTINGS.TERRAIN_DAMAGE_STRENGTH
    );
  }
  
  /**
   * Patrol behavior when no target is available
   */
  patrol() {
    // Update patrol timer
    this.patrolTimer--;
    if (this.patrolTimer <= 0) {
      // Change direction
      this.patrolDirection = -this.patrolDirection;
      this.patrolTimer = MeleeEnemy.WAVE_SETTINGS.PATROL_DURATION;
    }
    
    // Move horizontally at reduced speed
    const patrolSpeed = this.speed * MeleeEnemy.WAVE_SETTINGS.PATROL_SPEED_FACTOR;
    this.sprite.body.setVelocity(
      this.patrolDirection * patrolSpeed,
      patrolSpeed * 0.5
    );
    
    // Rotate to face movement direction
    const angle = Math.atan2(patrolSpeed * 0.5, this.patrolDirection * patrolSpeed);
    this.sprite.rotation = angle + Math.PI/2;
    
    // Check world bounds and reverse direction if needed
    const worldBounds = this.scene.cameras.main.getBounds();
    if ((this.x < worldBounds.x + 50 && this.patrolDirection < 0) || 
        (this.x > worldBounds.right - 50 && this.patrolDirection > 0)) {
      this.patrolDirection = -this.patrolDirection;
    }
  }
} 