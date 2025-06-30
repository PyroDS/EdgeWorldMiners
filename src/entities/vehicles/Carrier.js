/**
 * Carrier.js
 * 
 * The player's main vehicle and interaction point.
 * Manages hardpoints, health, movement, and cargo.
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

export class Carrier extends Entity {
  /**
   * Create a new carrier entity
   * @param {Object} scene - Phaser scene
   * @param {Object} config - Carrier configuration
   */
  constructor(scene, config = {}) {
    // Create base entity with 'carrier' type and unique ID
    super('carrier', { id: 'player-carrier', tags: ['carrier', 'player'] });
    
    this.scene = scene;
    this.config = {
      x: 400,
      y: 300,
      texture: 'carrier',
      scale: 1,
      health: 100,
      maxHealth: 100,
      speed: 200,
      rotationSpeed: 0.05,
      ...config
    };
    
    // Create sprite
    this._createSprite();
    
    // Add components
    this._addComponents();
    
    // Set up hardpoints
    this.hardpoints = [];
    this._setupHardpoints();
    
    // Services
    this.gameState = services.get('gameState');
    this.eventBus = services.get('eventBus');
  }
  
  /**
   * Create the carrier sprite
   * @private
   */
  _createSprite() {
    // Create main sprite
    this.sprite = this.scene.add.sprite(
      this.config.x,
      this.config.y,
      this.config.texture
    );
    
    this.sprite.setScale(this.config.scale);
    
    // Store reference to this entity in the sprite
    this.sprite.entity = this;
    
    // Set as game object for the entity
    this.gameObject = this.sprite;
  }
  
  /**
   * Add components to the carrier
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
      destroyOnDeath: false,
      flashOnDamage: true,
      damageTypes: {
        enemy: 1,
        projectile: 0.8,
        explosion: 1.2,
        collision: 0.5
      }
    }));
    
    // Set up component event handlers
    this._setupComponentHandlers();
  }
  
  /**
   * Set up component event handlers
   * @private
   */
  _setupComponentHandlers() {
    // Get health component
    const healthComponent = this.getComponent('health');
    
    // Listen for health changes
    if (healthComponent) {
      healthComponent.onDamaged = (amount, source) => {
        this._onDamaged(amount, source);
      };
      
      healthComponent.onHealed = (amount, source) => {
        this._onHealed(amount, source);
      };
      
      healthComponent.onDeath = () => {
        this._onDeath();
      };
    }
    
    // Get transform component
    const transformComponent = this.getComponent('transform');
    
    // Listen for position changes
    if (transformComponent) {
      transformComponent.onMoved = (x, y) => {
        this._onMoved(x, y);
      };
      
      transformComponent.onRotated = (rotation) => {
        this._onRotated(rotation);
      };
    }
  }
  
  /**
   * Set up carrier hardpoints
   * @private
   */
  _setupHardpoints() {
    // Define hardpoint positions relative to carrier
    const hardpointPositions = [
      { x: 0, y: -30, type: 'turret', name: 'Top Turret' },
      { x: 0, y: 30, type: 'turret', name: 'Bottom Turret' },
      { x: -25, y: 0, type: 'drill', name: 'Left Drill' },
      { x: 25, y: 0, type: 'drill', name: 'Right Drill' },
      { x: 0, y: 0, type: 'shield', name: 'Shield Generator' },
      { x: 0, y: 15, type: 'thruster', name: 'Main Thruster' }
    ];
    
    // Create hardpoints
    hardpointPositions.forEach((position, index) => {
      this.hardpoints.push({
        id: `hardpoint-${index}`,
        type: position.type,
        name: position.name,
        x: position.x,
        y: position.y,
        level: 1,
        active: false,
        cooldown: 0,
        maxCooldown: 5000, // 5 seconds
        sprite: null
      });
    });
    
    // Create hardpoint sprites
    this._createHardpointSprites();
  }
  
  /**
   * Create visual representations of hardpoints
   * @private
   */
  _createHardpointSprites() {
    this.hardpoints.forEach(hardpoint => {
      // Create sprite based on hardpoint type
      const sprite = this.scene.add.sprite(
        this.sprite.x + hardpoint.x,
        this.sprite.y + hardpoint.y,
        `hardpoint-${hardpoint.type}`
      );
      
      // Set scale and alpha
      sprite.setScale(0.5);
      sprite.setAlpha(0.7);
      
      // Store reference to sprite
      hardpoint.sprite = sprite;
    });
  }
  
  /**
   * Handle damage event
   * @param {number} amount - Damage amount
   * @param {Object} source - Damage source
   * @private
   */
  _onDamaged(amount, source) {
    // Flash the carrier sprite
    if (this.sprite && this.sprite.scene) {
      this.sprite.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => {
        if (this.sprite && this.sprite.scene) {
          this.sprite.clearTint();
        }
      });
    }
    
    // Shake the camera
    this.scene.cameras.main.shake(100, 0.01);
    
    // Get health component
    const healthComponent = this.getComponent('health');
    
    // Emit carrier damaged event
    this.emit('carrier:damaged', {
      id: this.id,
      health: healthComponent.health,
      maxHealth: healthComponent.maxHealth,
      damage: amount,
      source: source
    });
  }
  
  /**
   * Handle heal event
   * @param {number} amount - Heal amount
   * @param {Object} source - Heal source
   * @private
   */
  _onHealed(amount, source) {
    // Visual effect for healing
    if (this.sprite && this.sprite.scene) {
      this.sprite.setTint(0x00ff00);
      this.scene.time.delayedCall(100, () => {
        if (this.sprite && this.sprite.scene) {
          this.sprite.clearTint();
        }
      });
    }
    
    // Get health component
    const healthComponent = this.getComponent('health');
    
    // Emit carrier healed event
    this.emit('carrier:healed', {
      id: this.id,
      health: healthComponent.health,
      maxHealth: healthComponent.maxHealth,
      healed: amount,
      source: source
    });
  }
  
  /**
   * Handle death event
   * @private
   */
  _onDeath() {
    // Play death animation
    if (this.sprite && this.sprite.scene) {
      // Explosion effect
      this.scene.cameras.main.shake(500, 0.05);
      
      // Create explosion sprite
      const explosion = this.scene.add.sprite(
        this.sprite.x,
        this.sprite.y,
        'explosion'
      );
      
      explosion.setScale(2);
      explosion.play('explosion');
      
      // Hide carrier sprite
      this.sprite.setAlpha(0);
      
      // Emit carrier destroyed event
      this.emit('carrier:destroyed', {
        id: this.id,
        position: this.getComponent('transform').getPosition()
      });
    }
  }
  
  /**
   * Handle movement event
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @private
   */
  _onMoved(x, y) {
    // Update sprite position
    if (this.sprite && this.sprite.scene) {
      this.sprite.x = x;
      this.sprite.y = y;
    }
    
    // Update hardpoint positions
    this._updateHardpointPositions();
    
    // Emit carrier moved event
    this.emit('carrier:moved', {
      id: this.id,
      position: { x, y }
    });
  }
  
  /**
   * Handle rotation event
   * @param {number} rotation - New rotation
   * @private
   */
  _onRotated(rotation) {
    // Update sprite rotation
    if (this.sprite && this.sprite.scene) {
      this.sprite.rotation = rotation;
    }
    
    // Update hardpoint positions
    this._updateHardpointPositions();
    
    // Emit carrier rotated event
    this.emit('carrier:rotated', {
      id: this.id,
      rotation: rotation
    });
  }
  
  /**
   * Update hardpoint positions based on carrier position and rotation
   * @private
   */
  _updateHardpointPositions() {
    const transform = this.getComponent('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    const rotation = transform.rotation;
    
    this.hardpoints.forEach(hardpoint => {
      if (hardpoint.sprite && hardpoint.sprite.scene) {
        // Calculate rotated position
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const x = hardpoint.x * cos - hardpoint.y * sin;
        const y = hardpoint.x * sin + hardpoint.y * cos;
        
        // Update sprite position
        hardpoint.sprite.x = position.x + x;
        hardpoint.sprite.y = position.y + y;
        
        // Update sprite rotation
        hardpoint.sprite.rotation = rotation;
      }
    });
  }
  
  /**
   * Activate a hardpoint
   * @param {number} index - Hardpoint index
   * @returns {boolean} Whether activation was successful
   */
  activateHardpoint(index) {
    if (index < 0 || index >= this.hardpoints.length) {
      return false;
    }
    
    const hardpoint = this.hardpoints[index];
    
    // Check if hardpoint is on cooldown
    if (hardpoint.cooldown > 0) {
      return false;
    }
    
    // Set hardpoint as active
    hardpoint.active = true;
    hardpoint.cooldown = hardpoint.maxCooldown;
    
    // Visual effect for activation
    if (hardpoint.sprite && hardpoint.sprite.scene) {
      hardpoint.sprite.setTint(0x00ffff);
      
      // Create activation particles
      const particles = this.scene.add.particles('particle');
      const emitter = particles.createEmitter({
        x: hardpoint.sprite.x,
        y: hardpoint.sprite.y,
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 500,
        quantity: 10
      });
      
      // Stop emitter after a single burst
      this.scene.time.delayedCall(100, () => {
        emitter.stop();
      });
      
      // Destroy particles after they're done
      this.scene.time.delayedCall(600, () => {
        particles.destroy();
      });
    }
    
    // Get transform component for position
    const transform = this.getComponent('transform');
    const position = transform ? transform.getPosition() : { x: 0, y: 0 };
    
    // Emit hardpoint activated event
    this.emit('carrier:hardpoint:activated', {
      id: hardpoint.id,
      type: hardpoint.type,
      name: hardpoint.name,
      level: hardpoint.level,
      position: {
        x: position.x + hardpoint.x,
        y: position.y + hardpoint.y
      }
    });
    
    // Emit hardpoint changed event
    this.emit('carrier:hardpointChanged', {
      hardpoints: this.getHardpoints()
    });
    
    return true;
  }
  
  /**
   * Upgrade a hardpoint
   * @param {number} index - Hardpoint index
   * @returns {boolean} Whether upgrade was successful
   */
  upgradeHardpoint(index) {
    if (index < 0 || index >= this.hardpoints.length) {
      return false;
    }
    
    const hardpoint = this.hardpoints[index];
    
    // Increase hardpoint level
    hardpoint.level += 1;
    
    // Visual effect for upgrade
    if (hardpoint.sprite && hardpoint.sprite.scene) {
      // Scale up and down
      this.scene.tweens.add({
        targets: hardpoint.sprite,
        scale: 0.7,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
      
      // Flash
      hardpoint.sprite.setTint(0xffff00);
      this.scene.time.delayedCall(300, () => {
        if (hardpoint.sprite && hardpoint.sprite.scene) {
          hardpoint.sprite.clearTint();
        }
      });
    }
    
    // Emit hardpoint upgraded event
    this.emit('carrier:hardpoint:upgraded', {
      id: hardpoint.id,
      type: hardpoint.type,
      name: hardpoint.name,
      level: hardpoint.level
    });
    
    // Emit hardpoint changed event
    this.emit('carrier:hardpointChanged', {
      hardpoints: this.getHardpoints()
    });
    
    return true;
  }
  
  /**
   * Get all hardpoints
   * @returns {Array} Array of hardpoint data
   */
  getHardpoints() {
    return this.hardpoints.map(hardpoint => ({
      id: hardpoint.id,
      type: hardpoint.type,
      name: hardpoint.name,
      level: hardpoint.level,
      active: hardpoint.active,
      cooldown: hardpoint.cooldown,
      maxCooldown: hardpoint.maxCooldown
    }));
  }
  
  /**
   * Update carrier behavior
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Call parent update (updates all components)
    super.update(delta);
    
    // Update hardpoint cooldowns
    this._updateHardpointCooldowns(delta);
  }
  
  /**
   * Update hardpoint cooldowns
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _updateHardpointCooldowns(delta) {
    let hardpointChanged = false;
    
    this.hardpoints.forEach(hardpoint => {
      if (hardpoint.cooldown > 0) {
        hardpoint.cooldown = Math.max(0, hardpoint.cooldown - delta);
        
        // Clear tint when cooldown is over
        if (hardpoint.cooldown === 0) {
          hardpoint.active = false;
          
          if (hardpoint.sprite && hardpoint.sprite.scene) {
            hardpoint.sprite.clearTint();
          }
          
          hardpointChanged = true;
        }
      }
    });
    
    // Emit event if any hardpoint changed
    if (hardpointChanged) {
      this.emit('carrier:hardpointChanged', {
        hardpoints: this.getHardpoints()
      });
    }
  }
  
  /**
   * Clean up resources when destroyed
   */
  destroy() {
    // Destroy hardpoint sprites
    this.hardpoints.forEach(hardpoint => {
      if (hardpoint.sprite && hardpoint.sprite.scene) {
        hardpoint.sprite.destroy();
        hardpoint.sprite = null;
      }
    });
    
    // Clear hardpoints
    this.hardpoints = [];
    
    // Destroy carrier sprite
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
      this.sprite = null;
    }
    
    // Call parent destroy
    super.destroy();
  }
}
