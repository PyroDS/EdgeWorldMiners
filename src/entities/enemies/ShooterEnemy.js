/**
 * ShooterEnemy.js
 * 
 * Ranged enemy entity that attacks from a distance with projectiles.
 * 
 * Dependencies:
 * - entities/BaseEnemy.js
 */
import { BaseEnemy } from './BaseEnemy.js';
import services from '../core/services.js';

export class ShooterEnemy extends BaseEnemy {
  /**
   * Create a new shooter enemy
   * @param {Object} scene - Phaser scene
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {Object} config - Enemy configuration
   */
  constructor(scene, x, y, config = {}) {
    // Set shooter-specific defaults
    const shooterConfig = {
      texture: 'shooterEnemy',
      health: 80,
      speed: 40,
      damage: 15,
      attackRange: 300,
      minAttackRange: 150,
      attackCooldown: 2000, // ms
      projectileSpeed: 200,
      projectileTexture: 'enemyProjectile',
      scoreValue: 20,
      ...config,
      enemyType: 'shooter'
    };
    
    super(scene, x, y, shooterConfig);
    
    // Shooter-specific properties
    this.target = null;
    this.lastAttackTime = 0;
    this.state = 'idle'; // idle, moving, attacking, retreating
    this.projectiles = [];
    
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
      this.state = 'moving';
      return;
    }
    
    // If no carrier position in state, try to get entity registry
    const entityRegistry = services.get('entityRegistry');
    if (entityRegistry) {
      // Look for carrier entity
      const carriers = entityRegistry.getEntitiesByTag('carrier');
      if (carriers.length > 0) {
        this.target = carriers[0];
        this.state = 'moving';
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
          this.state = 'moving';
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
        
      case 'moving':
        // Move toward target to get in range
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
            const transform = this.getComponent('transform');
            const position = transform.getPosition();
            
            const dx = targetPosition.x - position.x;
            const dy = targetPosition.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If in attack range, start attacking
            if (distance <= this.config.attackRange && distance >= this.config.minAttackRange) {
              this.state = 'attacking';
              // Stop moving
              transform.setVelocity(0, 0);
            } 
            // If too close, retreat
            else if (distance < this.config.minAttackRange) {
              this.state = 'retreating';
            }
            // Otherwise keep moving toward target
            else {
              this.moveToward(targetPosition);
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
        
        // If out of range, move again
        if (distance > this.config.attackRange) {
          this.state = 'moving';
          return;
        }
        
        // If too close, retreat
        if (distance < this.config.minAttackRange) {
          this.state = 'retreating';
          return;
        }
        
        // Rotate to face target
        if (this.sprite && this.sprite.scene) {
          this.sprite.rotation = Math.atan2(dy, dx);
        }
        
        // Attack if cooldown has passed
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime >= this.config.attackCooldown) {
          this._fireProjectile(targetPosition);
          this.lastAttackTime = currentTime;
        }
        break;
        
      case 'retreating':
        // Move away from target to maintain minimum distance
        if (!this.target) {
          this.state = 'idle';
          return;
        }
        
        let retreatFromPosition;
        if (this.target.position) {
          retreatFromPosition = this.target.position;
        } else if (this.target.getComponent) {
          const targetTransform = this.target.getComponent('transform');
          if (targetTransform) {
            retreatFromPosition = targetTransform.getPosition();
          }
        }
        
        if (!retreatFromPosition) {
          this.state = 'idle';
          return;
        }
        
        const myTransform = this.getComponent('transform');
        const myPosition = myTransform.getPosition();
        
        const dxRetreat = retreatFromPosition.x - myPosition.x;
        const dyRetreat = retreatFromPosition.y - myPosition.y;
        const distanceFromTarget = Math.sqrt(dxRetreat * dxRetreat + dyRetreat * dyRetreat);
        
        // If far enough away, go back to attacking
        if (distanceFromTarget >= this.config.minAttackRange) {
          this.state = 'attacking';
          return;
        }
        
        // Move away from target
        if (distanceFromTarget > 0) {
          // Normalize and apply speed in opposite direction
          const vx = -(dxRetreat / distanceFromTarget) * this.config.speed;
          const vy = -(dyRetreat / distanceFromTarget) * this.config.speed;
          
          myTransform.setVelocity(vx, vy);
          
          // Keep facing the target while retreating
          if (this.sprite && this.sprite.scene) {
            this.sprite.rotation = Math.atan2(dyRetreat, dxRetreat);
          }
        }
        break;
    }
  }
  
  /**
   * Fire a projectile at the target
   * @param {Object} targetPosition - Target position
   * @private
   */
  _fireProjectile(targetPosition) {
    const transform = this.getComponent('transform');
    const position = transform.getPosition();
    
    // Create projectile sprite
    const projectile = this.scene.add.sprite(position.x, position.y, this.config.projectileTexture);
    projectile.setScale(0.5);
    
    // Calculate direction
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    const angle = Math.atan2(dy, dx);
    
    // Set projectile rotation
    projectile.rotation = angle;
    
    // Calculate velocity
    const speed = this.config.projectileSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Add to projectiles array
    this.projectiles.push({
      sprite: projectile,
      velocity: { x: vx, y: vy },
      damage: this.config.damage,
      range: this.config.attackRange,
      distanceTraveled: 0,
      source: this.id
    });
    
    // Play fire animation
    if (this.sprite && this.sprite.scene) {
      if (this.sprite.anims.has('fire')) {
        this.sprite.play('fire');
      } else {
        // Simple fire animation
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.7,
          duration: 50,
          yoyo: true
        });
      }
    }
    
    // Emit event
    this.emit('enemy:fire', {
      id: this.id,
      position: position,
      targetPosition: targetPosition
    });
  }
  
  /**
   * Update projectiles
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _updateProjectiles(delta) {
    const secondsDelta = delta / 1000;
    const entityRegistry = services.get('entityRegistry');
    const projectilesToRemove = [];
    
    // Update each projectile
    for (let i = 0; i < this.projectiles.length; i++) {
      const projectile = this.projectiles[i];
      
      // Move projectile
      projectile.sprite.x += projectile.velocity.x * secondsDelta;
      projectile.sprite.y += projectile.velocity.y * secondsDelta;
      
      // Calculate distance traveled
      const distanceThisFrame = Math.sqrt(
        Math.pow(projectile.velocity.x * secondsDelta, 2) + 
        Math.pow(projectile.velocity.y * secondsDelta, 2)
      );
      
      projectile.distanceTraveled += distanceThisFrame;
      
      // Check if projectile has reached max range
      if (projectile.distanceTraveled >= projectile.range) {
        projectilesToRemove.push(i);
        continue;
      }
      
      // Check for collisions if we have entity registry
      if (entityRegistry) {
        const hitEntities = entityRegistry.getEntitiesInArea({
          x: projectile.sprite.x,
          y: projectile.sprite.y,
          radius: 10 // Collision radius
        });
        
        // Filter out enemies and check for hits
        const validTargets = hitEntities.filter(entity => 
          !entity.tags.has('enemy') && entity.hasComponent('health')
        );
        
        if (validTargets.length > 0) {
          // Hit first valid target
          const target = validTargets[0];
          const healthComponent = target.getComponent('health');
          
          if (healthComponent) {
            healthComponent.damage(projectile.damage, {
              type: 'projectile',
              source: projectile.source
            });
            
            // Create hit effect
            this.scene.add.sprite(projectile.sprite.x, projectile.sprite.y, 'hitEffect')
              .play('hit')
              .once('animationcomplete', function() {
                this.destroy();
              });
              
            // Mark projectile for removal
            projectilesToRemove.push(i);
          }
        }
      }
    }
    
    // Remove projectiles in reverse order
    for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
      const index = projectilesToRemove[i];
      const projectile = this.projectiles[index];
      
      // Destroy sprite
      if (projectile.sprite && projectile.sprite.scene) {
        projectile.sprite.destroy();
      }
      
      // Remove from array
      this.projectiles.splice(index, 1);
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
    
    // Update projectiles
    this._updateProjectiles(delta);
    
    // Update sprite position from transform component
    const transform = this.getComponent('transform');
    if (transform && this.sprite && this.sprite.scene) {
      const position = transform.getPosition();
      this.sprite.x = position.x;
      this.sprite.y = position.y;
    }
  }
  
  /**
   * Clean up resources when destroyed
   */
  destroy() {
    // Clean up projectiles
    for (const projectile of this.projectiles) {
      if (projectile.sprite && projectile.sprite.scene) {
        projectile.sprite.destroy();
      }
    }
    this.projectiles = [];
    
    // Call parent destroy
    super.destroy();
  }
}