/**
 * HealthComponent - Handles health, damage, and destruction for entities
 * Provides a consistent way to manage entity health and damage events.
 */
import { Component } from '../component.js';
import services from '../services.js';

export class HealthComponent extends Component {
  /**
   * Create a new health component
   * @param {Object} options - Component configuration
   * @param {number} [options.maxHealth=100] - Maximum health value
   * @param {number} [options.health] - Initial health (defaults to maxHealth)
   * @param {boolean} [options.invulnerable=false] - Whether entity is invulnerable
   * @param {boolean} [options.destroyOnDeath=true] - Whether entity should be destroyed at zero health
   * @param {number} [options.armor=0] - Damage reduction value
   * @param {Object} [options.damageTypes] - Custom damage modifiers for specific damage types
   */
  constructor(options = {}) {
    super('health', options);
    
    this.maxHealth = options.maxHealth || 100;
    this.health = options.health !== undefined ? options.health : this.maxHealth;
    this.invulnerable = options.invulnerable || false;
    this.destroyOnDeath = options.destroyOnDeath !== false;
    this.armor = options.armor || 0;
    this.damageTypes = options.damageTypes || {};
    this.isDead = false;
    
    // Recovery options
    this.recoveryEnabled = options.recoveryEnabled || false;
    this.recoveryRate = options.recoveryRate || 0;
    this.recoveryDelay = options.recoveryDelay || 5000;
    this.lastDamageTime = 0;
    
    // Flash effect on damage
    this.flashOnDamage = options.flashOnDamage !== false;
    this.flashDuration = options.flashDuration || 200;
    this.isFlashing = false;
    
    // Services
    this._eventBus = services.has('eventBus') ? services.get('eventBus') : null;
  }
  
  /**
   * Called when component is attached to an entity
   */
  onAttach() {
    super.onAttach();
    
    if (this.entity && this._eventBus) {
      // Emit health initialized event
      this._eventBus.emit('entity:health_initialized', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        health: this.health,
        maxHealth: this.maxHealth
      });
    }
  }
  
  /**
   * Update health component state
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Handle health recovery
    if (this.recoveryEnabled && !this.isDead && this.health < this.maxHealth) {
      if (Date.now() - this.lastDamageTime > this.recoveryDelay) {
        this.heal(this.recoveryRate * delta / 1000);
      }
    }
    
    // Handle damage flash effect
    if (this.isFlashing && Date.now() - this.lastDamageTime > this.flashDuration) {
      this.isFlashing = false;
      this._resetFlash();
    }
  }
  
  /**
   * Apply damage to the entity
   * @param {number} amount - Amount of damage
   * @param {Object} [options] - Damage options
   * @param {string} [options.type='default'] - Damage type
   * @param {Object} [options.source] - Source entity causing the damage
   * @param {boolean} [options.ignoreArmor] - Whether to ignore armor
   * @param {boolean} [options.ignoreInvulnerable] - Whether to ignore invulnerability
   * @returns {number} Actual damage dealt
   */
  damage(amount, options = {}) {
    // Check for invulnerability
    if (this.invulnerable && !options.ignoreInvulnerable) {
      return 0;
    }
    
    // No damage for non-positive values
    if (amount <= 0 || this.isDead) {
      return 0;
    }
    
    // Apply type-specific modifiers
    const damageType = options.type || 'default';
    let actualAmount = amount;
    
    // Apply type-specific modifier if available
    if (this.damageTypes[damageType]) {
      actualAmount *= this.damageTypes[damageType];
    }
    
    // Apply armor reduction unless ignored
    if (this.armor > 0 && !options.ignoreArmor) {
      actualAmount = Math.max(0, actualAmount - this.armor);
    }
    
    // Update health value
    const oldHealth = this.health;
    this.health = Math.max(0, this.health - actualAmount);
    
    // Update recovery timer
    this.lastDamageTime = Date.now();
    
    // Handle visual feedback if damage was taken
    if (this.flashOnDamage && actualAmount > 0) {
      this._applyDamageFlash();
    }
    
    // Emit damage event if we have an entity
    if (this.entity && this._eventBus) {
      this._eventBus.emit('entity:damaged', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        damage: actualAmount,
        damageType: damageType,
        newHealth: this.health,
        oldHealth: oldHealth,
        source: options.source
      });
    }
    
    // Check for death
    if (this.health <= 0 && !this.isDead) {
      this._handleDeath(options.source);
    }
    
    return actualAmount;
  }
  
  /**
   * Heal the entity
   * @param {number} amount - Amount to heal
   * @param {Object} [options] - Heal options
   * @param {string} [options.type='default'] - Heal type
   * @param {Object} [options.source] - Source entity causing the healing
   * @returns {number} Actual amount healed
   */
  heal(amount, options = {}) {
    // No healing for non-positive values or dead entities
    if (amount <= 0 || this.isDead) {
      return 0;
    }
    
    const oldHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    const actualHeal = this.health - oldHealth;
    
    // Emit heal event if healing occurred
    if (actualHeal > 0 && this.entity && this._eventBus) {
      this._eventBus.emit('entity:healed', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        amount: actualHeal,
        newHealth: this.health,
        oldHealth: oldHealth,
        source: options.source
      });
    }
    
    return actualHeal;
  }
  
  /**
   * Set current health value
   * @param {number} value - New health value
   */
  setHealth(value) {
    const oldHealth = this.health;
    this.health = Math.max(0, Math.min(this.maxHealth, value));
    
    // Check for death
    if (this.health <= 0 && !this.isDead) {
      this._handleDeath();
    }
    
    // Emit health changed event
    if (this.health !== oldHealth && this.entity && this._eventBus) {
      this._eventBus.emit('entity:health_changed', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        newHealth: this.health,
        oldHealth: oldHealth
      });
    }
  }
  
  /**
   * Set maximum health value
   * @param {number} value - New max health value
   * @param {boolean} [updateCurrent=false] - Whether to scale current health
   */
  setMaxHealth(value, updateCurrent = false) {
    if (value <= 0) {
      return;
    }
    
    const ratio = updateCurrent ? (this.health / this.maxHealth) : 1;
    const oldMax = this.maxHealth;
    
    this.maxHealth = value;
    
    if (updateCurrent) {
      this.health = Math.min(this.maxHealth, Math.round(this.maxHealth * ratio));
    } else {
      this.health = Math.min(this.health, this.maxHealth);
    }
    
    // Emit max health changed event
    if (this.entity && this._eventBus) {
      this._eventBus.emit('entity:max_health_changed', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        newMaxHealth: this.maxHealth,
        oldMaxHealth: oldMax,
        health: this.health
      });
    }
  }
  
  /**
   * Get health percentage
   * @returns {number} Health percentage (0-100)
   */
  getHealthPercent() {
    return (this.health / this.maxHealth) * 100;
  }
  
  /**
   * Handle entity death
   * @param {Object} [source] - Source entity that caused death
   * @private
   */
  _handleDeath(source) {
    if (this.isDead) {
      return;
    }
    
    this.health = 0;
    this.isDead = true;
    
    // Emit death event
    if (this.entity && this._eventBus) {
      this._eventBus.emit('entity:died', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        source: source
      });
    }
    
    // Destroy the entity if configured to do so
    if (this.destroyOnDeath && this.entity) {
      setTimeout(() => {
        if (this.entity) {
          this.entity.destroy();
        }
      }, 0);
    }
  }
  
  /**
   * Apply visual feedback for damage
   * @private
   */
  _applyDamageFlash() {
    this.isFlashing = true;
    
    if (this.entity && this.entity.gameObject) {
      const gameObject = this.entity.gameObject;
      
      // Store original tint if not already stored
      if (!gameObject._originalTint && gameObject.tint !== undefined) {
        gameObject._originalTint = gameObject.tint;
      }
      
      // Apply red tint
      if (gameObject.setTint) {
        gameObject.setTint(0xff0000);
      } else if (gameObject.tint !== undefined) {
        gameObject.tint = 0xff0000;
      }
      
      // Handle container case
      if (gameObject.list && Array.isArray(gameObject.list)) {
        gameObject.list.forEach(child => {
          if (!child._originalTint && child.tint !== undefined) {
            child._originalTint = child.tint;
          }
          if (child.setTint) {
            child.setTint(0xff0000);
          } else if (child.tint !== undefined) {
            child.tint = 0xff0000;
          }
        });
      }
    }
  }
  
  /**
   * Reset visual feedback after damage
   * @private
   */
  _resetFlash() {
    if (this.entity && this.entity.gameObject) {
      const gameObject = this.entity.gameObject;
      
      // Restore original tint
      if (gameObject._originalTint !== undefined) {
        if (gameObject.setTint) {
          gameObject.setTint(gameObject._originalTint);
        } else if (gameObject.tint !== undefined) {
          gameObject.tint = gameObject._originalTint;
        }
      } else if (gameObject.clearTint) {
        gameObject.clearTint();
      }
      
      // Handle container case
      if (gameObject.list && Array.isArray(gameObject.list)) {
        gameObject.list.forEach(child => {
          if (child._originalTint !== undefined) {
            if (child.setTint) {
              child.setTint(child._originalTint);
            } else if (child.tint !== undefined) {
              child.tint = child._originalTint;
            }
          } else if (child.clearTint) {
            child.clearTint();
          }
        });
      }
    }
  }
  
  /**
   * Handle messages from other components
   * @param {string} message - Message name
   * @param {any} data - Message data
   * @param {Component} sender - Sending component
   * @returns {any} Response to the message
   */
  receiveMessage(message, data, sender) {
    switch (message) {
      case 'damage':
        return this.damage(data.amount, data.options);
        
      case 'heal':
        return this.heal(data.amount, data.options);
        
      case 'getHealth':
        return { current: this.health, max: this.maxHealth, percent: this.getHealthPercent() };
        
      case 'setHealth':
        this.setHealth(data);
        return true;
        
      case 'setMaxHealth':
        this.setMaxHealth(data.value, data.updateCurrent);
        return true;
        
      case 'isDead':
        return this.isDead;
        
      default:
        return null;
    }
  }
} 