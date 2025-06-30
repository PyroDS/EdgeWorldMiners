/**
 * turretManager.js
 * 
 * Manages all turret-related functionality including placement, targeting,
 * firing mechanics, damage calculations, and turret health/destruction.
 * 
 * Dependencies:
 * - core/manager.js (for Manager base class)
 * - entities/BaseTurret.js
 * - entities/MacroTurret.js
 */
import { Manager } from '../core/manager.js';
import { BaseTurret } from '../entities/BaseTurret.js';
import { MacroTurret } from '../entities/MacroTurret.js';

export class TurretManager extends Manager {
  /**
   * Create a new TurretManager instance
   * @param {Object} scene - The Phaser scene
   */
  constructor(scene) {
    super('turretManager');
    this.scene = scene;
    this.turrets = [];
    this.selectedTurret = null;
    this.placementMode = false;
    this.turretTypes = {
      basic: {
        cost: { metal: 50 },
        class: BaseTurret,
        config: {
          type: 'basic',
          texture: 'turret',
          health: 100,
          damage: 10,
          range: 150,
          fireRate: 1000
        }
      },
      macro: {
        cost: { metal: 100, crystal: 50 },
        class: MacroTurret,
        config: {
          type: 'macro',
          texture: 'macroTurret',
          health: 150,
          damage: 40,
          range: 250,
          fireRate: 2000
        }
      }
    };
  }
  
  /**
   * Initialize the manager
   */
  init() {
    // Call parent init
    super.init();
    
    // Set up input handling for placement
    this._setupInputHandling();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for build events
    this.eventBus.on('build:turret', (data) => {
      this.startPlacement(data.type || 'basic');
    });
    
    // Listen for cancel placement
    this.eventBus.on('build:cancel', () => {
      this.cancelPlacement();
    });
    
    // Listen for game state changes
    this.eventBus.on('game:paused', () => {
      this.onGamePaused();
    });
    
    this.eventBus.on('game:resumed', () => {
      this.onGameResumed();
    });
    
    // Listen for entity registry events
    this.eventBus.on('entity:registered', (data) => {
      if (data.entity && data.entity.hasTag('turret')) {
        this.turrets.push(data.entity);
      }
    });
    
    this.eventBus.on('entity:unregistered', (data) => {
      if (data.entity && data.entity.hasTag('turret')) {
        const index = this.turrets.findIndex(t => t.id === data.entity.id);
        if (index !== -1) {
          this.turrets.splice(index, 1);
        }
      }
    });
  }
  
  /**
   * Set up input handling for turret placement
   * @private
   */
  _setupInputHandling() {
    // Set up pointer down event for placement
    this.scene.input.on('pointerdown', (pointer) => {
      if (this.placementMode && this.selectedTurret) {
        this.placeTurret(pointer.worldX, pointer.worldY);
      } else {
        this.checkTurretSelection(pointer.worldX, pointer.worldY);
      }
    });
    
    // Set up pointer move for placement preview
    this.scene.input.on('pointermove', (pointer) => {
      if (this.placementMode && this.selectedTurret) {
        this.updatePlacementPreview(pointer.worldX, pointer.worldY);
      }
    });
    
    // Set up keyboard events for canceling placement
    this.scene.input.keyboard.on('keydown-ESC', () => {
      if (this.placementMode) {
        this.cancelPlacement();
      }
    });
  }
  
  /**
   * Start turret placement mode
   * @param {string} turretType - Type of turret to place
   */
  startPlacement(turretType) {
    // Check if turret type exists
    if (!this.turretTypes[turretType]) {
      console.error(`Turret type ${turretType} not found`);
      return false;
    }
    
    // Check if we have enough resources
    const resourceManager = this.services.get('resourceManager');
    const cost = this.turretTypes[turretType].cost;
    
    if (!resourceManager.hasResources(cost)) {
      // Emit notification for insufficient resources
      this.eventBus.emit('notification:show', {
        type: 'error',
        message: 'Insufficient resources for turret placement',
        duration: 3000
      });
      return false;
    }
    
    // Cancel any existing placement
    this.cancelPlacement();
    
    // Create turret for placement
    const TurretClass = this.turretTypes[turretType].class;
    const config = this.turretTypes[turretType].config;
    
    // Create at off-screen position initially
    this.selectedTurret = new TurretClass(this.scene, -100, -100, config);
    this.selectedTurret.showRange();
    
    // Set placement mode
    this.placementMode = true;
    
    // Emit event for UI updates
    this.eventBus.emit('build:placementStarted', {
      type: turretType,
      cost: cost
    });
    
    return true;
  }
  
  /**
   * Update the placement preview position
   * @param {number} x - World X position
   * @param {number} y - World Y position
   */
  updatePlacementPreview(x, y) {
    if (!this.selectedTurret || !this.placementMode) return;
    
    // Update turret position
    this.selectedTurret.place(x, y);
    
    // Check if placement is valid
    const isValid = this.isValidPlacement(x, y);
    
    // Update visual feedback
    if (isValid) {
      this.selectedTurret.sprite.setAlpha(1);
      this.selectedTurret.rangeIndicator.setStrokeStyle(1, 0x00ff00);
    } else {
      this.selectedTurret.sprite.setAlpha(0.5);
      this.selectedTurret.rangeIndicator.setStrokeStyle(1, 0xff0000);
    }
  }
  
  /**
   * Check if placement is valid at the given position
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @returns {boolean} Whether placement is valid
   */
  isValidPlacement(x, y) {
    // Check terrain for valid placement
    const terrainManager = this.services.get('terrainManager');
    if (terrainManager && !terrainManager.canPlaceBuilding(x, y)) {
      return false;
    }
    
    // Check for overlap with other turrets
    for (const turret of this.turrets) {
      const transform = turret.getComponent('transform');
      if (!transform) continue;
      
      const position = transform.getPosition();
      const distance = Phaser.Math.Distance.Between(x, y, position.x, position.y);
      
      // Minimum distance between turrets
      if (distance < 40) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Place the turret at the specified position
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @returns {boolean} Whether placement was successful
   */
  placeTurret(x, y) {
    if (!this.selectedTurret || !this.placementMode) return false;
    
    // Check if placement is valid
    if (!this.isValidPlacement(x, y)) {
      // Emit notification for invalid placement
      this.eventBus.emit('notification:show', {
        type: 'warning',
        message: 'Invalid placement location',
        duration: 2000
      });
      return false;
    }
    
    // Get turret type and cost
    const turretType = this.selectedTurret.config.type;
    const cost = this.turretTypes[turretType].cost;
    
    // Consume resources
    const resourceManager = this.services.get('resourceManager');
    if (!resourceManager.removeResources(cost)) {
      // Should not happen since we checked earlier, but just in case
      this.eventBus.emit('notification:show', {
        type: 'error',
        message: 'Insufficient resources for turret placement',
        duration: 3000
      });
      return false;
    }
    
    // Place the turret
    this.selectedTurret.place(x, y);
    this.selectedTurret.hideRange();
    
    // Register the turret with the entity registry
    const entityRegistry = this.services.get('entityRegistry');
    if (entityRegistry) {
      entityRegistry.register(this.selectedTurret);
    } else {
      // If no entity registry, add to local array
      this.turrets.push(this.selectedTurret);
    }
    
    // Emit turret placed event
    this.eventBus.emit('turret:placed', {
      id: this.selectedTurret.id,
      type: turretType,
      position: { x, y }
    });
    
    // Create placement effect
    this._createPlacementEffect(x, y);
    
    // Reset placement mode
    this.selectedTurret = null;
    this.placementMode = false;
    
    // Start a new placement of the same type
    this.startPlacement(turretType);
    
    return true;
  }
  
  /**
   * Create visual effect for turret placement
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @private
   */
  _createPlacementEffect(x, y) {
    // Create a circle that expands and fades
    const circle = this.scene.add.circle(x, y, 10, 0x00ff00, 0.7);
    
    // Animate the circle
    this.scene.tweens.add({
      targets: circle,
      radius: 50,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        circle.destroy();
      }
    });
    
    // Add some particles
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 20, max: 50 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      quantity: 20
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
  
  /**
   * Cancel turret placement
   */
  cancelPlacement() {
    if (this.selectedTurret) {
      // Clean up the preview turret
      this.selectedTurret.destroy();
      this.selectedTurret = null;
    }
    
    this.placementMode = false;
    
    // Emit event for UI updates
    this.eventBus.emit('build:placementCancelled');
  }
  
  /**
   * Check if a turret was clicked for selection
   * @param {number} x - World X position
   * @param {number} y - World Y position
   */
  checkTurretSelection(x, y) {
    // Deselect current turret
    if (this.selectedTurret) {
      this.selectedTurret.hideRange();
      this.selectedTurret = null;
    }
    
    // Check each turret for selection
    for (const turret of this.turrets) {
      const transform = turret.getComponent('transform');
      if (!transform) continue;
      
      const position = transform.getPosition();
      const distance = Phaser.Math.Distance.Between(x, y, position.x, position.y);
      
      // Check if clicked within turret
      if (distance < 20) { // Adjust radius as needed
        this.selectTurret(turret);
        break;
      }
    }
  }
  
  /**
   * Select a turret
   * @param {Object} turret - The turret to select
   */
  selectTurret(turret) {
    // Deselect current turret
    if (this.selectedTurret) {
      this.selectedTurret.hideRange();
    }
    
    // Select new turret
    this.selectedTurret = turret;
    this.selectedTurret.showRange();
    
    // Emit turret selected event
    this.eventBus.emit('turret:selected', {
      id: turret.id,
      type: turret.config.type,
      health: turret.getComponent('health').health,
      maxHealth: turret.getComponent('health').maxHealth
    });
  }
  
  /**
   * Upgrade the selected turret
   * @returns {boolean} Whether upgrade was successful
   */
  upgradeSelectedTurret() {
    if (!this.selectedTurret) return false;
    
    // Define upgrade costs and stats
    const upgradeCost = {
      metal: 30,
      crystal: 15
    };
    
    // Check if we have enough resources
    const resourceManager = this.services.get('resourceManager');
    if (!resourceManager.hasResources(upgradeCost)) {
      this.eventBus.emit('notification:show', {
        type: 'error',
        message: 'Insufficient resources for turret upgrade',
        duration: 3000
      });
      return false;
    }
    
    // Consume resources
    resourceManager.removeResources(upgradeCost);
    
    // Apply upgrades
    const healthComponent = this.selectedTurret.getComponent('health');
    if (healthComponent) {
      healthComponent.maxHealth *= 1.2;
      healthComponent.health = healthComponent.maxHealth;
    }
    
    // Increase damage and range
    this.selectedTurret.config.damage *= 1.2;
    this.selectedTurret.config.range *= 1.1;
    
    // Update range indicator
    if (this.selectedTurret.rangeIndicator) {
      this.selectedTurret.rangeIndicator.setRadius(this.selectedTurret.config.range);
    }
    
    // Visual upgrade effect
    this._createUpgradeEffect(this.selectedTurret);
    
    // Emit upgrade event
    this.eventBus.emit('turret:upgraded', {
      id: this.selectedTurret.id,
      type: this.selectedTurret.config.type,
      health: healthComponent.health,
      maxHealth: healthComponent.maxHealth,
      damage: this.selectedTurret.config.damage,
      range: this.selectedTurret.config.range
    });
    
    return true;
  }
  
  /**
   * Create visual effect for turret upgrade
   * @param {Object} turret - The upgraded turret
   * @private
   */
  _createUpgradeEffect(turret) {
    const transform = turret.getComponent('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    
    // Create upgrade particles
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: position.x,
      y: position.y,
      speed: { min: 30, max: 70 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      tint: 0x00ffff,
      lifespan: 800,
      quantity: 30
    });
    
    // Stop emitter after a single burst
    this.scene.time.delayedCall(200, () => {
      emitter.stop();
    });
    
    // Destroy particles after they're done
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
    
    // Flash the turret
    turret.sprite.setTint(0x00ffff);
    this.scene.time.delayedCall(300, () => {
      turret.sprite.clearTint();
    });
    
    // Scale effect
    this.scene.tweens.add({
      targets: turret.sprite,
      scaleX: turret.sprite.scaleX * 1.2,
      scaleY: turret.sprite.scaleY * 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2'
    });
  }
  
  /**
   * Sell the selected turret
   * @returns {boolean} Whether sell was successful
   */
  sellSelectedTurret() {
    if (!this.selectedTurret) return false;
    
    // Get turret type and refund amount (50% of cost)
    const turretType = this.selectedTurret.config.type;
    const cost = this.turretTypes[turretType].cost;
    const refund = {};
    
    for (const [resource, amount] of Object.entries(cost)) {
      refund[resource] = Math.floor(amount * 0.5);
    }
    
    // Add resources
    const resourceManager = this.services.get('resourceManager');
    for (const [resource, amount] of Object.entries(refund)) {
      resourceManager.addResource(resource, amount);
    }
    
    // Get position for effect
    const transform = this.selectedTurret.getComponent('transform');
    const position = transform ? transform.getPosition() : { x: 0, y: 0 };
    
    // Create sell effect
    this._createSellEffect(position.x, position.y);
    
    // Emit sell event
    this.eventBus.emit('turret:sold', {
      id: this.selectedTurret.id,
      type: turretType,
      position: position,
      refund: refund
    });
    
    // Destroy the turret
    const entityRegistry = this.services.get('entityRegistry');
    if (entityRegistry) {
      entityRegistry.unregister(this.selectedTurret.id);
    } else {
      // If no entity registry, remove from local array
      const index = this.turrets.findIndex(t => t.id === this.selectedTurret.id);
      if (index !== -1) {
        this.turrets.splice(index, 1);
      }
      this.selectedTurret.destroy();
    }
    
    // Clear selection
    this.selectedTurret = null;
    
    return true;
  }
  
  /**
   * Create visual effect for selling a turret
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @private
   */
  _createSellEffect(x, y) {
    // Create particles
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      tint: 0xffff00,
      lifespan: 600,
      quantity: 40
    });
    
    // Stop emitter after a single burst
    this.scene.time.delayedCall(100, () => {
      emitter.stop();
    });
    
    // Destroy particles after they're done
    this.scene.time.delayedCall(700, () => {
      particles.destroy();
    });
    
    // Show refund text
    const refundText = this.scene.add.text(x, y - 20, '+$', {
      fontSize: '16px',
      fill: '#ffff00'
    }).setOrigin(0.5);
    
    // Animate refund text
    this.scene.tweens.add({
      targets: refundText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        refundText.destroy();
      }
    });
  }
  
  /**
   * Handle game paused event
   */
  onGamePaused() {
    // Cancel any active placement
    this.cancelPlacement();
  }
  
  /**
   * Handle game resumed event
   */
  onGameResumed() {
    // Nothing specific needed here
  }
  
  /**
   * Update all turrets
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Update all turrets
    for (const turret of this.turrets) {
      turret.update(delta);
    }
    
    // Update placement preview if active
    if (this.placementMode && this.selectedTurret) {
      const pointer = this.scene.input.activePointer;
      this.updatePlacementPreview(pointer.worldX, pointer.worldY);
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    // Clean up all turrets
    for (const turret of this.turrets) {
      turret.destroy();
    }
    this.turrets = [];
    
    // Clean up selected turret
    if (this.selectedTurret) {
      this.selectedTurret.destroy();
      this.selectedTurret = null;
    }
    
    // Reset placement mode
    this.placementMode = false;
    
    // Call parent cleanup
    super.cleanup();
  }
} 