/**
 * MacroTurret.js
 * 
 * A heavy turret that deals high damage but fires slowly.
 * Specializes in taking down larger enemies.
 * 
 * Dependencies:
 * - entities/BaseTurret.js
 */
import { BaseTurret } from './BaseTurret.js';

export class MacroTurret extends BaseTurret {
  /**
   * Create a new macro turret entity
   * @param {Object} scene - Phaser scene
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {Object} config - Turret configuration
   */
  constructor(scene, x, y, config = {}) {
    // Set default macro turret configuration
    const macroConfig = {
      type: 'macro',
      health: 150,
      maxHealth: 150,
      damage: 40,
      range: 250,
      fireRate: 2000, // ms between shots (slower)
      rotationSpeed: 0.02, // slower rotation
      texture: 'macroTurret',
      scale: 1.2,
      projectileTexture: 'macroProjectile',
      projectileSpeed: 180, // slower projectiles
      projectileDamage: 40,
      ...config
    };
    
    // Call parent constructor with macro config
    super(scene, x, y, macroConfig);
    
    // Add macro turret specific tags
    this.addTag('macroTurret');
    this.addTag('heavyDefense');
    
    // Macro turret specific properties
    this.chargeLevel = 0;
    this.maxChargeLevel = 3;
    this.chargeRate = 0.5; // charge per second
  }
  
  /**
   * Create the turret sprite with macro-specific visuals
   * @param {number} x - X position
   * @param {number} y - Y position
   * @private
   */
  _createSprite(x, y) {
    // Call parent method to create base sprite
    super._createSprite(x, y);
    
    // Add charge indicator
    this.chargeIndicator = this.scene.add.graphics();
    this.updateChargeIndicator();
  }
  
  /**
   * Update the charge indicator visual
   * @private
   */
  updateChargeIndicator() {
    if (!this.chargeIndicator || !this.sprite) return;
    
    this.chargeIndicator.clear();
    
    // Skip if charge is zero
    if (this.chargeLevel <= 0) return;
    
    // Draw charge level indicator
    const chargeRatio = this.chargeLevel / this.maxChargeLevel;
    const color = this.getChargeColor(chargeRatio);
    
    this.chargeIndicator.fillStyle(color, 0.7);
    this.chargeIndicator.fillRect(
      this.sprite.x - 15,
      this.sprite.y + 20,
      30 * chargeRatio,
      5
    );
  }
  
  /**
   * Get color based on charge level
   * @param {number} ratio - Charge ratio (0-1)
   * @returns {number} Color in hex format
   * @private
   */
  getChargeColor(ratio) {
    if (ratio < 0.33) {
      return 0x00ff00; // green
    } else if (ratio < 0.66) {
      return 0xffff00; // yellow
    } else {
      return 0xff0000; // red
    }
  }
  
  /**
   * Fire with charge mechanic
   * @returns {boolean} Whether the turret fired
   */
  fire() {
    if (!this.target) return false;
    
    const now = Date.now();
    if (now - this.lastFireTime < this.config.fireRate) {
      return false;
    }
    
    const transform = this.getComponent('transform');
    if (!transform) return false;
    
    const position = transform.getPosition();
    const targetTransform = this.target.getComponent('transform');
    if (!targetTransform) return false;
    
    const targetPosition = targetTransform.getPosition();
    
    // Calculate damage based on charge
    const damage = this.config.projectileDamage * (1 + this.chargeLevel);
    
    // Create projectile with charge-based damage
    const projectile = this._createChargedProjectile(position, targetPosition, damage);
    
    // Reset charge after firing
    this.chargeLevel = 0;
    this.updateChargeIndicator();
    
    // Update last fire time
    this.lastFireTime = now;
    
    // Play firing effect
    this._playFiringEffect();
    
    // Emit turret fired event with charge info
    this.emit('turret:fired', {
      id: this.id,
      target: this.target.id,
      position: position,
      targetPosition: targetPosition,
      damage: damage,
      wasCharged: true
    });
    
    return true;
  }
  
  /**
   * Create a charged projectile
   * @param {Object} startPos - Starting position
   * @param {Object} targetPos - Target position
   * @param {number} damage - Projectile damage
   * @returns {Object} The created projectile
   * @private
   */
  _createChargedProjectile(startPos, targetPos, damage) {
    // Calculate direction to target
    const angle = Phaser.Math.Angle.Between(
      startPos.x, startPos.y,
      targetPos.x, targetPos.y
    );
    
    // Create projectile sprite
    const projectile = this.scene.physics.add.sprite(
      startPos.x, startPos.y,
      this.config.projectileTexture
    );
    
    // Set projectile properties
    projectile.setRotation(angle);
    
    // Scale based on charge level
    const scale = 0.5 + (this.chargeLevel * 0.2);
    projectile.setScale(scale);
    
    // Set damage and owner
    projectile.damage = damage;
    projectile.owner = this;
    
    // Set tint based on charge level
    if (this.chargeLevel > 0) {
      const chargeRatio = this.chargeLevel / this.maxChargeLevel;
      const color = this.getChargeColor(chargeRatio);
      projectile.setTint(color);
    }
    
    // Calculate velocity
    const velocity = this.scene.physics.velocityFromRotation(
      angle, this.config.projectileSpeed
    );
    
    // Set velocity
    projectile.setVelocity(velocity.x, velocity.y);
    
    // Set up collision with enemies
    const enemyGroup = this.scene.physics.add.group();
    const enemies = services.get('entityRegistry').getEntitiesWithTag('enemy');
    
    if (enemies && enemies.length > 0) {
      for (const enemy of enemies) {
        if (enemy.gameObject) {
          enemyGroup.add(enemy.gameObject);
        }
      }
      
      // Add collision between projectile and enemies
      this.scene.physics.add.overlap(
        projectile, enemyGroup,
        this._onProjectileHit.bind(this),
        null, this
      );
    }
    
    // Destroy projectile after time
    this.scene.time.delayedCall(2000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
    
    return projectile;
  }
  
  /**
   * Play firing effect based on charge level
   * @private
   */
  _playFiringEffect() {
    // Create muzzle flash effect
    const transform = this.getComponent('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    
    // Scale effect based on charge level
    const scale = 0.5 + (this.chargeLevel * 0.2);
    
    // Create flash sprite
    const flash = this.scene.add.sprite(
      position.x + Math.cos(transform.rotation) * 20,
      position.y + Math.sin(transform.rotation) * 20,
      'muzzleFlash'
    );
    
    flash.setRotation(transform.rotation);
    flash.setScale(scale);
    flash.setAlpha(0.8);
    
    // Add tint based on charge level
    if (this.chargeLevel > 0) {
      const chargeRatio = this.chargeLevel / this.maxChargeLevel;
      const color = this.getChargeColor(chargeRatio);
      flash.setTint(color);
    }
    
    // Fade out and destroy
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: scale * 1.5,
      duration: 100,
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Add camera shake for high charge levels
    if (this.chargeLevel > 1) {
      this.scene.cameras.main.shake(100, 0.005 * this.chargeLevel);
    }
  }
  
  /**
   * Handle projectile hit with enhanced effects for charged shots
   * @param {Object} projectile - The projectile that hit
   * @param {Object} enemy - The enemy that was hit
   * @private
   */
  _onProjectileHit(projectile, enemyObject) {
    // Get enemy entity
    const enemy = enemyObject.entity;
    if (!enemy) {
      projectile.destroy();
      return;
    }
    
    // Deal damage to enemy
    const healthComponent = enemy.getComponent('health');
    if (healthComponent) {
      healthComponent.damage(projectile.damage, {
        type: 'macroProjectile',
        source: this
      });
    }
    
    // Create enhanced hit effect based on projectile size
    const scale = projectile.scale;
    const hitEffect = this.scene.add.sprite(
      projectile.x, projectile.y,
      'macroHitEffect'
    );
    
    hitEffect.setScale(scale);
    hitEffect.play('macroHit');
    hitEffect.once('animationcomplete', () => {
      hitEffect.destroy();
    });
    
    // Add explosion effect for large projectiles
    if (scale > 0.7) {
      // Create explosion
      const explosion = this.scene.add.sprite(
        projectile.x, projectile.y,
        'explosion'
      );
      
      explosion.setScale(scale * 0.5);
      explosion.play('explosion');
      explosion.once('animationcomplete', () => {
        explosion.destroy();
      });
      
      // Add camera shake
      this.scene.cameras.main.shake(200, 0.01 * scale);
      
      // Apply area damage for large explosions
      this._applyAreaDamage(projectile.x, projectile.y, 50 * scale, projectile.damage * 0.5);
    }
    
    // Destroy projectile
    projectile.destroy();
    
    // Emit projectile hit event
    this.emit('turret:projectileHit', {
      id: this.id,
      target: enemy.id,
      damage: projectile.damage,
      position: { x: projectile.x, y: projectile.y },
      wasCharged: scale > 0.5
    });
  }
  
  /**
   * Apply area damage to nearby enemies
   * @param {number} x - X position of explosion
   * @param {number} y - Y position of explosion
   * @param {number} radius - Explosion radius
   * @param {number} damage - Damage amount
   * @private
   */
  _applyAreaDamage(x, y, radius, damage) {
    const entityRegistry = services.get('entityRegistry');
    if (!entityRegistry) return;
    
    // Find all enemies
    const enemies = entityRegistry.getEntitiesWithTag('enemy');
    if (!enemies || enemies.length === 0) return;
    
    // Check each enemy for distance
    for (const enemy of enemies) {
      const enemyTransform = enemy.getComponent('transform');
      if (!enemyTransform) continue;
      
      const enemyPosition = enemyTransform.getPosition();
      const distance = Phaser.Math.Distance.Between(
        x, y,
        enemyPosition.x, enemyPosition.y
      );
      
      // Apply damage with falloff based on distance
      if (distance <= radius) {
        const falloff = 1 - (distance / radius);
        const damageAmount = damage * falloff;
        
        const healthComponent = enemy.getComponent('health');
        if (healthComponent) {
          healthComponent.damage(damageAmount, {
            type: 'explosion',
            source: this
          });
        }
      }
    }
  }
  
  /**
   * Update the turret behavior with charging mechanic
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Call parent update for basic behavior
    super.update(delta);
    
    // Skip if not active or not placed
    if (!this.active || !this.isPlaced) {
      return;
    }
    
    // Charge up if we have a target and not at max charge
    if (this.target && this.chargeLevel < this.maxChargeLevel) {
      // Convert delta to seconds
      const deltaSeconds = delta / 1000;
      
      // Increase charge
      this.chargeLevel = Math.min(
        this.maxChargeLevel,
        this.chargeLevel + (this.chargeRate * deltaSeconds)
      );
      
      // Update charge indicator
      this.updateChargeIndicator();
    } else if (!this.target && this.chargeLevel > 0) {
      // Discharge when no target
      const deltaSeconds = delta / 1000;
      
      // Decrease charge
      this.chargeLevel = Math.max(
        0,
        this.chargeLevel - (this.chargeRate * 0.5 * deltaSeconds)
      );
      
      // Update charge indicator
      this.updateChargeIndicator();
    }
    
    // Update charge indicator position
    if (this.chargeIndicator && this.sprite) {
      this.updateChargeIndicator();
    }
  }
  
  /**
   * Find the nearest enemy with preference for larger enemies
   * @returns {Object|null} The selected enemy or null if none in range
   */
  findTarget() {
    // This would typically use the entity registry to find enemies
    const entityRegistry = services.get('entityRegistry');
    if (!entityRegistry) return null;
    
    const transform = this.getComponent('transform');
    if (!transform) return null;
    
    const position = transform.getPosition();
    
    // Find all enemies within range
    const enemies = entityRegistry.getEntitiesWithTag('enemy');
    if (!enemies || enemies.length === 0) return null;
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    for (const enemy of enemies) {
      const enemyTransform = enemy.getComponent('transform');
      if (!enemyTransform) continue;
      
      const enemyPosition = enemyTransform.getPosition();
      const distance = Phaser.Math.Distance.Between(
        position.x, position.y,
        enemyPosition.x, enemyPosition.y
      );
      
      // Skip if out of range
      if (distance > this.config.range) continue;
      
      // Calculate score based on enemy type and distance
      let score = 0;
      
      // Prefer closer enemies
      score -= distance * 0.5;
      
      // Prefer larger enemies
      if (enemy.hasTag('heavyEnemy')) {
        score += 500;
      } else if (enemy.hasTag('mediumEnemy')) {
        score += 200;
      }
      
      // Prefer enemies with more health
      const healthComponent = enemy.getComponent('health');
      if (healthComponent) {
        score += healthComponent.health * 0.2;
      }
      
      // Update best target if this enemy has a better score
      if (score > bestScore) {
        bestTarget = enemy;
        bestScore = score;
      }
    }
    
    return bestTarget;
  }
  
  /**
   * Clean up resources when destroyed
   */
  destroy() {
    // Destroy charge indicator
    if (this.chargeIndicator) {
      this.chargeIndicator.destroy();
      this.chargeIndicator = null;
    }
    
    // Call parent destroy
    super.destroy();
  }
} 