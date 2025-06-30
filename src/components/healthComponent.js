/**
 * healthComponent.js
 * 
 * Component that handles entity health, damage, healing, and destruction.
 */

import { Component } from './component.js';
import { services } from '../core/services.js';

export class HealthComponent extends Component {
  /**
   * Creates a health component
   * 
   * @param {number} maxHealth - Maximum health value
   * @param {number|null} currentHealth - Starting health (defaults to maxHealth)
   */
  constructor(maxHealth, currentHealth = null) {
    super('health');
    this.maxHealth = maxHealth;
    this.currentHealth = currentHealth !== null ? currentHealth : maxHealth;
    this.invulnerable = false;
    this.destroyed = false;
    
    // Get reference to services
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
  }
  
  /**
   * Initializes the component when added to an entity
   */
  init() {
    // Emit initial health values
    this.emitHealthUpdate();
  }
  
  /**
   * Applies damage to the entity
   * 
   * @param {number} amount - Damage amount
   * @param {Object} source - Source of the damage
   * @returns {number} Remaining health
   */
  takeDamage(amount, source = null) {
    // Skip damage if invulnerable
    if (this.invulnerable || this.destroyed) {
      return this.currentHealth;
    }
    
    // Apply damage
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    
    // Emit damage event
    this.eventBus.emit('entity:damaged', { 
      entity: this.entity, 
      amount,
      source,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth
    });
    
    // Update health state
    this.emitHealthUpdate();
    
    // Check for destruction
    if (this.currentHealth <= 0 && !this.destroyed) {
      this.destroyed = true;
      this.destroy();
    }
    
    return this.currentHealth;
  }
  
  /**
   * Heals the entity
   * 
   * @param {number} amount - Healing amount
   * @param {Object} source - Source of the healing
   * @returns {number} New health value
   */
  heal(amount, source = null) {
    // Skip healing if already destroyed
    if (this.destroyed) {
      return this.currentHealth;
    }
    
    // Apply healing
    const oldHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    const actualHeal = this.currentHealth - oldHealth;
    
    // Only emit event if healing actually occurred
    if (actualHeal > 0) {
      this.eventBus.emit('entity:healed', { 
        entity: this.entity, 
        amount: actualHeal,
        source,
        currentHealth: this.currentHealth,
        maxHealth: this.maxHealth
      });
      
      // Update health state
      this.emitHealthUpdate();
    }
    
    return this.currentHealth;
  }
  
  /**
   * Sets the current health
   * 
   * @param {number} health - New health value
   * @param {boolean} preventEvents - Whether to prevent events from firing
   * @returns {number} New health value
   */
  setHealth(health, preventEvents = false) {
    const oldHealth = this.currentHealth;
    this.currentHealth = Math.max(0, Math.min(this.maxHealth, health));
    
    if (!preventEvents && this.currentHealth !== oldHealth) {
      this.emitHealthUpdate();
      
      // Check for destruction
      if (this.currentHealth <= 0 && !this.destroyed) {
        this.destroyed = true;
        this.destroy();
      }
    }
    
    return this.currentHealth;
  }
  
  /**
   * Sets the maximum health
   * 
   * @param {number} maxHealth - New maximum health
   * @param {boolean} adjustCurrent - Whether to scale current health
   * @returns {number} New maximum health
   */
  setMaxHealth(maxHealth, adjustCurrent = false) {
    const oldMax = this.maxHealth;
    this.maxHealth = Math.max(1, maxHealth);
    
    // Scale current health proportionally if requested
    if (adjustCurrent && oldMax !== this.maxHealth) {
      const ratio = this.maxHealth / oldMax;
      this.currentHealth = Math.min(this.maxHealth, Math.round(this.currentHealth * ratio));
    }
    
    // Ensure current health doesn't exceed new max
    this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    
    // Update health state
    this.emitHealthUpdate();
    
    return this.maxHealth;
  }
  
  /**
   * Sets invulnerability status
   * 
   * @param {boolean} invulnerable - Whether entity is invulnerable
   */
  setInvulnerable(invulnerable) {
    this.invulnerable = invulnerable;
  }
  
  /**
   * Gets health as a percentage (0-100)
   * 
   * @returns {number} Health percentage
   */
  getHealthPercentage() {
    return (this.currentHealth / this.maxHealth) * 100;
  }
  
  /**
   * Handles entity destruction when health reaches 0
   */
  destroy() {
    // Emit destroyed event
    this.eventBus.emit('entity:destroyed', { 
      entity: this.entity,
      entityId: this.entity.id,
      entityType: this.entity.type
    });
    
    // Mark entity for destruction
    this.entity.destroy();
  }
  
  /**
   * Emits a health update event and updates state
   */
  emitHealthUpdate() {
    // Get entity details
    const entityType = this.entity.type;
    const entityId = this.entity.id;
    
    // Update game state if this is the carrier
    if (entityType === 'carrier') {
      this.gameState.update('carrier.health', this.currentHealth);
      this.gameState.update('carrier.maxHealth', this.maxHealth);
    }
    
    // Emit health update event
    this.eventBus.emit('entity:healthChanged', {
      entityId,
      entityType, 
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      percentage: this.getHealthPercentage()
    });
  }
} 