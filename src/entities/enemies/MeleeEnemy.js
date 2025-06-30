/**
 * MeleeEnemy.js
 * 
 * Melee enemy entity that moves toward the carrier and attacks at close range.
 * 
 * Dependencies:
 * - entities/BaseEnemy.js
 */
import { BaseEnemy } from './BaseEnemy.js';
import services from '../core/services.js';

export class MeleeEnemy extends BaseEnemy {
  /**
   * Create a new melee enemy
   * @param {Object} scene - Phaser scene
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {Object} config - Enemy configuration
   */
  constructor(scene, x, y, config = {}) {
    // Set melee-specific defaults
    const meleeConfig = {
      texture: 'meleeEnemy',
      health: 150,
      speed: 75,
      damage: 25,
      attackRange: 60,
      attackCooldown: 1000, // ms
      scoreValue: 15,
      ...config,
      enemyType: 'melee'
    };
    
    super(scene, x, y, meleeConfig);
    
    // Melee-specific properties
    this.target = null;
    this.lastAttackTime = 0;
    this.state = 'idle'; // idle, chasing, attacking
    
    // Initialize AI behavior
    this._initAI();
  }
  
  /**
   * Initialize AI behavior
   * @private
   */
  _initAI() {
    // Get game state to find target
    this.gameState = services.get('gameState');
    
    // Set initial target to carrier
    this._findTarget();
  }
  
  /**
   * Find a suitable target
   * @private
   */
  _findTarget() {
    // Default to carrier
    const carrierPosition = this.gameState.get('carrier.position');
    if (carrierPosition) {
      this.target = {
        position: carrierPosition,
        id: 'carrier'
      };
      this.state = 'chasing';
      return;
    }
    
    // If no carrier position in state, try to get entity registry
    const entityRegistry = services.get('entityRegistry');
    if (entityRegistry) {
      // Look for carrier entity
      const carriers = entityRegistry.getEntitiesByTag('carrier');
      if (carriers.length > 0) {
        this.target = carriers[0];
        this.state = 'chasing';
        return;
      }
      
      // If no carrier, look for structures
      const structures = entityRegistry.getEntitiesByTag('structure');
      if (structures.length > 0) {
        // Find closest structure
        const transform = this.getComponent('transform');
        const position = transform.getPosition();
        
        let closestStructure = null;
        let closestDistance = Infinity;
        
        for (const structure of structures) {
          const structureTransform = structure.getComponent('transform');
          if (!structureTransform) continue;
          
          const structurePosition = structureTransform.getPosition();
          const dx = structurePosition.x - position.x;
          const dy = structurePosition.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestStructure = structure;
          }
        }
        
        if (closestStructure) {
          this.target = closestStructure;
          this.state = 'chasing';
          return;
        }
      }
    }
    
    // No target found
    this.target = null;
    this.state = 'idle';
  }
  
  /**
   * Handle behavior based on current state
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _handleState(delta) {
    switch (this.state) {
      case 'idle':
        // Try to find a target
        this._findTarget();
        break;
        
      case 'chasing':
        // Move toward target
        if (this.target) {
          let targetPosition;
          
          if (this.target.position) {
            // Direct position object
            targetPosition = this.target.position;
          } else if (this.target.getComponent) {
            // Entity with transform component
            const targetTransform = this.target.getComponent('transform');
            if (targetTransform) {
              targetPosition = targetTransform.getPosition();
            }
          }
          
          if (targetPosition) {
            // Move toward target
            this.moveToward(targetPosition);
            
            // Check if in attack range
            const transform = this.getComponent('transform');
            const position = transform.getPosition();
            
            const dx = targetPosition.x - position.x;
            const dy = targetPosition.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.config.attackRange) {
              this.state = 'attacking';
            }
          } else {
            // Lost target
            this.state = 'idle';
          }
        } else {
          // No target
          this.state = 'idle';
        }
        break;
        
      case 'attacking':
        // Check if target still exists
        if (!this.target) {
          this.state = 'idle';
          return;
        }
        
        // Check if still in range
        let targetPosition;
        if (this.target.position) {
          targetPosition = this.target.position;
        } else if (this.target.getComponent) {
          const targetTransform = this.target.getComponent('transform');
          if (targetTransform) {
            targetPosition = targetTransform.getPosition();
          }
        }
        
        if (!targetPosition) {
          this.state = 'idle';
          return;
        }
        
        const transform = this.getComponent('transform');
        const position = transform.getPosition();
        
        const dx = targetPosition.x - position.x;
        const dy = targetPosition.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If out of range, chase again
        if (distance > this.config.attackRange) {
          this.state = 'chasing';
          return;
        }
        
        // Attack if cooldown has passed
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime >= this.config.attackCooldown) {
          this._performAttack();
          this.lastAttackTime = currentTime;
        }
        break;
    }
  }
  
  /**
   * Perform attack action
   * @private
   */
  _performAttack() {
    // If target is an entity, use attack method
    if (this.target && this.target.getComponent) {
      this.attack(this.target);
      return;
    }
    
    // If target is carrier from game state, emit damage event
    if (this.target && this.target.id === 'carrier') {
      // Get carrier health from game state
      const carrierHealth = this.gameState.get('carrier.health');
      if (carrierHealth !== undefined) {
        // Emit event for carrier damage
        this.emit('carrier:damaged', {
          damage: this.config.damage,
          source: this.id
        });
      }
      
      // Play attack animation
      if (this.sprite && this.sprite.scene) {
        if (this.sprite.anims.has('attack')) {
          this.sprite.play('attack');
        } else {
          // Simple attack animation
          this.scene.tweens.add({
            targets: this.sprite,
            scaleX: this.sprite.scaleX * 1.2,
            scaleY: this.sprite.scaleY * 1.2,
            duration: 100,
            yoyo: true
          });
        }
      }
    }
  }
  
  /**
   * Update enemy behavior
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Call parent update (updates all components)
    super.update(delta);
    
    // Handle state-based behavior
    this._handleState(delta);
    
    // Update sprite position from transform component
    const transform = this.getComponent('transform');
    if (transform && this.sprite && this.sprite.scene) {
      const position = transform.getPosition();
      this.sprite.x = position.x;
      this.sprite.y = position.y;
    }
  }
} 