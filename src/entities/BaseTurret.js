/**
 * BaseTurret.js
 * 
 * Base class for all turret entities in the game.
 * Uses the entity-component system for modular behavior.
 * 
 * Dependencies:
 * - core/entity.js
 * - core/components/transformComponent.js
 * - core/components/healthComponent.js
 */
import { Entity } from '../core/entity.js';
import { TransformComponent } from '../core/components/transformComponent.js';
import { HealthComponent } from '../core/components/healthComponent.js';
import services from '../core/services.js';

export class BaseTurret extends Entity {
  /**
   * Create a new turret entity
   * @param {Object} scene - Phaser scene
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {Object} config - Turret configuration
   */
  constructor(scene, x, y, config = {}) {
    // Create base entity with 'turret' type and unique ID
    const id = `turret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    super('turret', { id, tags: ['turret', 'building', 'defense'] });
    
    this.scene = scene;
    this.config = {
      health: 100,
      maxHealth: 100,
      damage: 10,
      range: 150,
      fireRate: 1000, // ms between shots
      rotationSpeed: 0.05,
      texture: 'turret',
      scale: 1,
      projectileTexture: 'projectile',
      projectileSpeed: 200,
      projectileDamage: 10,
      ...config
    };
    
    // Create sprite
    this._createSprite(x, y);
    
    // Add components
    this._addComponents();
    
    // Set up turret state
    this.target = null;
    this.lastFireTime = 0;
    this.active = true;
    this.isPlaced = false;
    
    // Services
    this.gameState = services.get('gameState');
    this.eventBus = services.get('eventBus');
    
    // Set up event handlers
    this._setupEventHandlers();
  }
  
  /**
   * Create the turret sprite
   * @param {number} x - X position
   * @param {number} y - Y position
   * @private
   */
  _createSprite(x, y) {
    // Create main sprite
    this.sprite = this.scene.add.sprite(x, y, this.config.texture);
    this.sprite.setScale(this.config.scale);
    
    // Create range indicator (hidden by default)
    this.rangeIndicator = this.scene.add.circle(
      x, y, this.config.range, 0x00ff00, 0.1
    );
    this.rangeIndicator.setVisible(false);
    
    // Store reference to this entity in the sprite
    this.sprite.entity = this;
    
    // Set as game object for the entity
    this.gameObject = this.sprite;
  }
  
  /**
   * Add components to the turret
   * @private
   */
  _addComponents() {
    // Add transform component
    this.addComponent(new TransformComponent({
      x: this.sprite.x,
      y: this.sprite.y,
      rotation: this.sprite.rotation
    }));
    
    // Add health component
    this.addComponent(new HealthComponent({
      maxHealth: this.config.maxHealth,
      health: this.config.health,
      destroyOnDeath: true,
      flashOnDamage: true,
      damageTypes: {
        enemy: 1,
        projectile: 0.8,
        explosion: 1.2
      }
    }));
    
    // Initialize all components
    this.init();
  }
  
  /**
   * Set up event handlers
   * @private
   */
  _setupEventHandlers() {
    // Listen for health component events
    this.listenTo('entity:damaged', (data) => {
      if (data.entityId === this.id) {
        this._onDamaged(data);
      }
    });
    
    this.listenTo('entity:died', (data) => {
      if (data.entityId === this.id) {
        this._onDeath(data);
      }
    });
  }
  
  /**
   * Handle damage event
   * @param {Object} data - Damage event data
   * @private
   */
  _onDamaged(data) {
    // Play damage animation or sound
    if (this.sprite && this.sprite.scene) {
      this.sprite.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => {
        if (this.sprite && this.sprite.scene) {
          this.sprite.clearTint();
        }
      });
    }
    
    // Emit turret damaged event
    this.emit('turret:damaged', {
      id: this.id,
      health: this.getComponent('health').health,
      maxHealth: this.getComponent('health').maxHealth,
      damage: data.damage,
      source: data.source
    });
  }
  
  /**
   * Handle death event
   * @param {Object} data - Death event data
   * @private
   */
  _onDeath(data) {
    // Play death animation
    if (this.sprite && this.sprite.scene) {
      // Explosion effect
      this.scene.cameras.main.shake(200, 0.01);
      
      // Fade out
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: this.sprite.scale * 0.8,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.destroy();
        }
      });
    }
    
    // Emit turret destroyed event
    this.emit('turret:destroyed', {
      id: this.id,
      position: this.getComponent('transform').getPosition()
    });
  }
  
  /**
   * Find the nearest enemy within range
   * @returns {Object|null} The nearest enemy or null if none in range
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
    
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    
    for (const enemy of enemies) {
      const enemyTransform = enemy.getComponent('transform');
      if (!enemyTransform) continue;
      
      const enemyPosition = enemyTransform.getPosition();
      const distance = Phaser.Math.Distance.Between(
        position.x, position.y,
        enemyPosition.x, enemyPosition.y
      );
      
      if (distance <= this.config.range && distance < nearestDistance) {
        nearestEnemy = enemy;
        nearestDistance = distance;
      }
    }
    
    return nearestEnemy;
  }
  
  /**
   * Fire at the current target
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
    
    // Create projectile
    this._createProjectile(position, targetPosition);
    
    // Update last fire time
    this.lastFireTime = now;
    
    // Emit turret fired event
    this.emit('turret:fired', {
      id: this.id,
      target: this.target.id,
      position: position,
      targetPosition: targetPosition
    });
    
    return true;
  }
  
  /**
   * Create a projectile to fire at the target
   * @param {Object} startPos - Starting position
   * @param {Object} targetPos - Target position
   * @private
   */
  _createProjectile(startPos, targetPos) {
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
    projectile.setScale(0.5);
    projectile.damage = this.config.projectileDamage;
    projectile.owner = this;
    
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
   * Handle projectile hit
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
        type: 'projectile',
        source: this
      });
    }
    
    // Create hit effect
    const hitEffect = this.scene.add.sprite(
      projectile.x, projectile.y,
      'hitEffect'
    );
    
    hitEffect.setScale(0.5);
    hitEffect.play('hit');
    hitEffect.once('animationcomplete', () => {
      hitEffect.destroy();
    });
    
    // Destroy projectile
    projectile.destroy();
    
    // Emit projectile hit event
    this.emit('turret:projectileHit', {
      id: this.id,
      target: enemy.id,
      damage: projectile.damage,
      position: { x: projectile.x, y: projectile.y }
    });
  }
  
  /**
   * Rotate turret to face target
   * @param {Object} target - Target entity or position
   * @returns {boolean} Whether the rotation is complete
   */
  rotateToTarget(target) {
    if (!target) return false;
    
    const transform = this.getComponent('transform');
    if (!transform) return false;
    
    // Get target position
    let targetPosition;
    if (target.getComponent) {
      const targetTransform = target.getComponent('transform');
      if (!targetTransform) return false;
      targetPosition = targetTransform.getPosition();
    } else {
      targetPosition = target;
    }
    
    // Calculate angle to target
    const position = transform.getPosition();
    const targetAngle = Phaser.Math.Angle.Between(
      position.x, position.y,
      targetPosition.x, targetPosition.y
    );
    
    // Get current angle
    const currentAngle = transform.rotation;
    
    // Calculate angle difference
    let angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
    
    // Check if we need to rotate
    if (Math.abs(angleDiff) < 0.05) {
      // Already facing target
      transform.rotation = targetAngle;
      this.sprite.rotation = targetAngle;
      return true;
    }
    
    // Determine rotation direction
    const rotationAmount = Math.min(
      this.config.rotationSpeed,
      Math.abs(angleDiff)
    ) * Math.sign(angleDiff);
    
    // Apply rotation
    transform.rotation = Phaser.Math.Angle.Wrap(currentAngle + rotationAmount);
    this.sprite.rotation = transform.rotation;
    
    return false;
  }
  
  /**
   * Show the range indicator
   */
  showRange() {
    if (this.rangeIndicator) {
      this.rangeIndicator.setVisible(true);
    }
  }
  
  /**
   * Hide the range indicator
   */
  hideRange() {
    if (this.rangeIndicator) {
      this.rangeIndicator.setVisible(false);
    }
  }
  
  /**
   * Place the turret at the specified position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  place(x, y) {
    const transform = this.getComponent('transform');
    if (transform) {
      transform.setPosition(x, y);
      this.sprite.x = x;
      this.sprite.y = y;
      
      if (this.rangeIndicator) {
        this.rangeIndicator.x = x;
        this.rangeIndicator.y = y;
      }
    }
    
    this.isPlaced = true;
    
    // Emit turret placed event
    this.emit('turret:placed', {
      id: this.id,
      position: { x, y },
      type: this.config.type || 'basic'
    });
  }
  
  /**
   * Update the turret behavior
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Call parent update (updates all components)
    super.update(delta);
    
    // Skip if not active or not placed
    if (!this.active || !this.isPlaced) {
      return;
    }
    
    // Find target if we don't have one
    if (!this.target || !this.target.active) {
      this.target = this.findTarget();
    }
    
    // If we have a target, rotate and fire
    if (this.target) {
      // Check if target is still in range
      const transform = this.getComponent('transform');
      const targetTransform = this.target.getComponent('transform');
      
      if (transform && targetTransform) {
        const position = transform.getPosition();
        const targetPosition = targetTransform.getPosition();
        
        const distance = Phaser.Math.Distance.Between(
          position.x, position.y,
          targetPosition.x, targetPosition.y
        );
        
        if (distance > this.config.range) {
          // Target out of range, find a new one
          this.target = this.findTarget();
        } else {
          // Rotate to face target
          const facingTarget = this.rotateToTarget(this.target);
          
          // Fire if facing target
          if (facingTarget) {
            this.fire();
          }
        }
      }
    }
    
    // Update range indicator position
    if (this.rangeIndicator && this.rangeIndicator.visible) {
      const transform = this.getComponent('transform');
      if (transform) {
        const position = transform.getPosition();
        this.rangeIndicator.x = position.x;
        this.rangeIndicator.y = position.y;
      }
    }
  }
  
  /**
   * Clean up resources when destroyed
   */
  destroy() {
    // Hide range indicator
    this.hideRange();
    
    // Destroy range indicator
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
      this.rangeIndicator = null;
    }
    
    // Destroy sprite
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
      this.sprite = null;
    }
    
    // Clear target
    this.target = null;
    
    // Call parent destroy
    super.destroy();
  }
} 