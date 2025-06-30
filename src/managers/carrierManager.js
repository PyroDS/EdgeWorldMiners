/**
 * carrierManager.js
 * 
 * Manages the player's carrier entity, including movement, hardpoints,
 * cargo management, and interaction with other game systems.
 * 
 * Dependencies:
 * - core/manager.js
 * - core/entity.js
 * - entities/Carrier.js
 */
import { Manager } from '../core/manager.js';
import { Carrier } from '../entities/Carrier.js';

export class CarrierManager extends Manager {
  /**
   * Create a new CarrierManager instance
   * @param {Object} scene - The Phaser scene
   */
  constructor(scene) {
    super('carrierManager');
    this.scene = scene;
    this.carrier = null;
    this.inputKeys = null;
    this.moveSpeed = 200;
    this.rotationSpeed = 0.05;
    this.isMoving = false;
    this.isRotating = false;
    this.targetPosition = null;
    this.targetRotation = null;
    this.autoMove = false;
    this.cargoCapacity = {
      metal: 1000,
      crystal: 500,
      gas: 300
    };
    this.cargo = {
      metal: 0,
      crystal: 0,
      gas: 0
    };
  }
  
  /**
   * Initialize the manager
   */
  init() {
    // Call parent init
    super.init();
    
    // Create carrier entity
    this._createCarrier();
    
    // Set up input handling
    this._setupInputHandling();
    
    // Register carrier with entity registry
    const entityRegistry = this.services.get('entityRegistry');
    if (entityRegistry) {
      entityRegistry.register(this.carrier);
    }
    
    // Initialize cargo from game state
    const resources = this.gameState.get('resources');
    if (resources) {
      this.cargo = { ...resources };
    }
    
    // Update game state with carrier info
    this._updateGameState();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for resource collection events
    this.eventBus.on('resource:collected', (data) => {
      this.addCargo(data.type, data.amount);
    });
    
    // Listen for resource deposit events
    this.eventBus.on('resource:deposit', () => {
      this.depositAllCargo();
    });
    
    // Listen for carrier damage events
    this.eventBus.on('carrier:damaged', (data) => {
      this._onCarrierDamaged(data);
    });
    
    // Listen for carrier death events
    this.eventBus.on('carrier:destroyed', () => {
      this._onCarrierDestroyed();
    });
    
    // Listen for hardpoint events
    this.eventBus.on('carrier:hardpoint:activated', (data) => {
      this._onHardpointActivated(data);
    });
    
    // Listen for movement commands
    this.eventBus.on('carrier:move', (data) => {
      this.moveToPosition(data.x, data.y);
    });
    
    // Listen for game state changes
    this.eventBus.on('game:paused', () => {
      this.onGamePaused();
    });
    
    this.eventBus.on('game:resumed', () => {
      this.onGameResumed();
    });
  }
  
  /**
   * Create the carrier entity
   * @private
   */
  _createCarrier() {
    // Get carrier configuration from game state
    const carrierConfig = this.gameState.get('carrier.config') || {};
    
    // Create carrier entity
    this.carrier = new Carrier(this.scene, {
      x: this.gameState.get('carrier.position.x') || 400,
      y: this.gameState.get('carrier.position.y') || 300,
      health: this.gameState.get('carrier.health') || 100,
      maxHealth: this.gameState.get('carrier.maxHealth') || 100,
      ...carrierConfig
    });
    
    // Initialize carrier
    this.carrier.init();
    
    // Set up carrier event listeners
    this.carrier.on('carrier:moved', (data) => {
      this._updateGameState();
    });
    
    this.carrier.on('carrier:damaged', (data) => {
      this._updateGameState();
    });
    
    this.carrier.on('carrier:hardpointChanged', (data) => {
      this._updateGameState();
    });
  }
  
  /**
   * Set up input handling for carrier movement
   * @private
   */
  _setupInputHandling() {
    // Set up keyboard input
    this.inputKeys = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      rotateLeft: Phaser.Input.Keyboard.KeyCodes.Q,
      rotateRight: Phaser.Input.Keyboard.KeyCodes.E,
      boost: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });
    
    // Set up mouse click for movement
    this.scene.input.on('pointerdown', (pointer) => {
      // Only handle left clicks
      if (pointer.button !== 0) return;
      
      // Check if UI was clicked
      const uiManager = this.services.get('uiManager');
      if (uiManager && uiManager.isPointerOverUI(pointer)) {
        return;
      }
      
      // Move carrier to clicked position
      this.moveToPosition(pointer.worldX, pointer.worldY);
    });
  }
  
  /**
   * Move carrier to a specific position
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   */
  moveToPosition(x, y) {
    this.targetPosition = { x, y };
    this.autoMove = true;
    
    // Calculate rotation to target
    const transform = this.carrier.getComponent('transform');
    if (transform) {
      const position = transform.getPosition();
      this.targetRotation = Phaser.Math.Angle.Between(
        position.x, position.y,
        x, y
      );
    }
    
    // Create movement indicator
    this._createMovementIndicator(x, y);
    
    // Emit carrier move event
    this.eventBus.emit('carrier:moveStarted', {
      target: { x, y }
    });
  }
  
  /**
   * Create a visual indicator for movement target
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   * @private
   */
  _createMovementIndicator(x, y) {
    // Create a circle at the target position
    const circle = this.scene.add.circle(x, y, 10, 0x00ff00, 0.5);
    
    // Add pulsing animation
    this.scene.tweens.add({
      targets: circle,
      scale: 1.5,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      repeat: -1
    });
    
    // Store reference to indicator
    if (this.moveIndicator) {
      this.moveIndicator.destroy();
    }
    this.moveIndicator = circle;
  }
  
  /**
   * Add cargo to the carrier
   * @param {string} type - Resource type
   * @param {number} amount - Amount to add
   * @returns {number} Amount actually added
   */
  addCargo(type, amount) {
    if (!this.cargoCapacity[type]) return 0;
    
    const maxAdd = this.cargoCapacity[type] - this.cargo[type];
    const amountToAdd = Math.min(amount, maxAdd);
    
    if (amountToAdd <= 0) {
      // Emit cargo full notification
      this.eventBus.emit('notification:show', {
        type: 'warning',
        message: `Cargo bay full: Cannot collect more ${type}`,
        duration: 3000
      });
      return 0;
    }
    
    // Add to cargo
    this.cargo[type] += amountToAdd;
    
    // Update game state
    this.gameState.update(`carrier.cargo.${type}`, this.cargo[type]);
    
    // Emit cargo updated event
    this.eventBus.emit('carrier:cargoUpdated', {
      type,
      amount: this.cargo[type],
      capacity: this.cargoCapacity[type],
      added: amountToAdd
    });
    
    return amountToAdd;
  }
  
  /**
   * Remove cargo from the carrier
   * @param {string} type - Resource type
   * @param {number} amount - Amount to remove
   * @returns {number} Amount actually removed
   */
  removeCargo(type, amount) {
    if (!this.cargo[type]) return 0;
    
    const amountToRemove = Math.min(amount, this.cargo[type]);
    
    if (amountToRemove <= 0) {
      return 0;
    }
    
    // Remove from cargo
    this.cargo[type] -= amountToRemove;
    
    // Update game state
    this.gameState.update(`carrier.cargo.${type}`, this.cargo[type]);
    
    // Emit cargo updated event
    this.eventBus.emit('carrier:cargoUpdated', {
      type,
      amount: this.cargo[type],
      capacity: this.cargoCapacity[type],
      removed: amountToRemove
    });
    
    return amountToRemove;
  }
  
  /**
   * Deposit all cargo to the resource manager
   * @returns {Object} Deposited resources
   */
  depositAllCargo() {
    const resourceManager = this.services.get('resourceManager');
    if (!resourceManager) return {};
    
    const deposited = {};
    
    // Deposit each resource type
    for (const [type, amount] of Object.entries(this.cargo)) {
      if (amount > 0) {
        resourceManager.addResource(type, amount);
        deposited[type] = amount;
        this.cargo[type] = 0;
        
        // Update game state
        this.gameState.update(`carrier.cargo.${type}`, 0);
      }
    }
    
    // Emit cargo deposited event
    this.eventBus.emit('carrier:cargoDeposited', {
      deposited
    });
    
    // Show notification
    if (Object.keys(deposited).length > 0) {
      this.eventBus.emit('notification:show', {
        type: 'success',
        message: 'Resources deposited to storage',
        duration: 3000
      });
    }
    
    return deposited;
  }
  
  /**
   * Handle carrier damaged event
   * @param {Object} data - Damage data
   * @private
   */
  _onCarrierDamaged(data) {
    // Update game state with new health
    this.gameState.update('carrier.health', data.health);
    
    // Check if health is low
    const healthPercent = data.health / data.maxHealth;
    if (healthPercent < 0.25) {
      // Show critical health notification
      this.eventBus.emit('notification:show', {
        type: 'danger',
        message: 'WARNING: Carrier critically damaged!',
        duration: 5000
      });
      
      // Play alarm sound
      this.scene.sound.play('alarm', { volume: 0.5 });
    } else if (healthPercent < 0.5) {
      // Show low health notification
      this.eventBus.emit('notification:show', {
        type: 'warning',
        message: 'Carrier damage warning',
        duration: 3000
      });
    }
  }
  
  /**
   * Handle carrier destroyed event
   * @private
   */
  _onCarrierDestroyed() {
    // Show game over notification
    this.eventBus.emit('notification:show', {
      type: 'danger',
      message: 'Carrier destroyed! Mission failed.',
      duration: 0 // Don't auto-hide
    });
    
    // Trigger game over event
    this.eventBus.emit('game:over', {
      reason: 'carrier_destroyed'
    });
  }
  
  /**
   * Handle hardpoint activated event
   * @param {Object} data - Hardpoint data
   * @private
   */
  _onHardpointActivated(data) {
    // Handle different hardpoint types
    switch (data.type) {
      case 'drill':
        this._activateDrill(data);
        break;
      case 'turret':
        this._activateTurret(data);
        break;
      case 'shield':
        this._activateShield(data);
        break;
      case 'thruster':
        this._activateThruster(data);
        break;
    }
  }
  
  /**
   * Activate drill hardpoint
   * @param {Object} data - Hardpoint data
   * @private
   */
  _activateDrill(data) {
    const drillManager = this.services.get('drillManager');
    if (drillManager) {
      drillManager.startDrilling(data.position, data.level);
    }
  }
  
  /**
   * Activate turret hardpoint
   * @param {Object} data - Hardpoint data
   * @private
   */
  _activateTurret(data) {
    // Emit event for turret manager to handle
    this.eventBus.emit('turret:activate', {
      position: data.position,
      level: data.level,
      parentId: this.carrier.id
    });
  }
  
  /**
   * Activate shield hardpoint
   * @param {Object} data - Hardpoint data
   * @private
   */
  _activateShield(data) {
    // Create shield effect
    const transform = this.carrier.getComponent('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    
    // Create shield sprite
    const shield = this.scene.add.sprite(
      position.x,
      position.y,
      'shield'
    );
    
    shield.setScale(2);
    shield.setAlpha(0.5);
    shield.setDepth(5);
    
    // Animate shield
    this.scene.tweens.add({
      targets: shield,
      alpha: 0.2,
      scale: 2.5,
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
    
    // Store shield reference
    this.carrier.shield = shield;
    
    // Apply shield effect to carrier
    const healthComponent = this.carrier.getComponent('health');
    if (healthComponent) {
      healthComponent.addShield(data.level * 50);
    }
    
    // Emit shield activated event
    this.eventBus.emit('carrier:shieldActivated', {
      level: data.level,
      duration: data.level * 10000 // 10 seconds per level
    });
    
    // Set timeout to remove shield
    this.scene.time.delayedCall(data.level * 10000, () => {
      this._deactivateShield();
    });
  }
  
  /**
   * Deactivate shield
   * @private
   */
  _deactivateShield() {
    // Remove shield sprite
    if (this.carrier.shield) {
      this.carrier.shield.destroy();
      this.carrier.shield = null;
    }
    
    // Remove shield effect
    const healthComponent = this.carrier.getComponent('health');
    if (healthComponent) {
      healthComponent.removeShield();
    }
    
    // Emit shield deactivated event
    this.eventBus.emit('carrier:shieldDeactivated');
  }
  
  /**
   * Activate thruster hardpoint
   * @param {Object} data - Hardpoint data
   * @private
   */
  _activateThruster(data) {
    // Apply speed boost
    this.moveSpeed += data.level * 50;
    
    // Create thruster effect
    const transform = this.carrier.getComponent('transform');
    if (!transform) return;
    
    // Create particle emitter for thruster
    const particles = this.scene.add.particles('particle');
    const emitter = particles.createEmitter({
      speed: 100,
      scale: { start: 0.2, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      tint: 0x00ffff
    });
    
    // Attach to carrier
    emitter.startFollow(this.carrier.sprite);
    
    // Store emitter reference
    this.carrier.thrusterEmitter = emitter;
    this.carrier.thrusterParticles = particles;
    
    // Emit thruster activated event
    this.eventBus.emit('carrier:thrusterActivated', {
      level: data.level,
      duration: data.level * 5000 // 5 seconds per level
    });
    
    // Set timeout to remove thruster
    this.scene.time.delayedCall(data.level * 5000, () => {
      this._deactivateThruster();
    });
  }
  
  /**
   * Deactivate thruster
   * @private
   */
  _deactivateThruster() {
    // Reset speed
    this.moveSpeed = 200;
    
    // Remove particle emitter
    if (this.carrier.thrusterParticles) {
      this.carrier.thrusterParticles.destroy();
      this.carrier.thrusterEmitter = null;
      this.carrier.thrusterParticles = null;
    }
    
    // Emit thruster deactivated event
    this.eventBus.emit('carrier:thrusterDeactivated');
  }
  
  /**
   * Update the game state with carrier information
   * @private
   */
  _updateGameState() {
    if (!this.carrier) return;
    
    const transform = this.carrier.getComponent('transform');
    if (transform) {
      const position = transform.getPosition();
      this.gameState.update('carrier.position', position);
    }
    
    const health = this.carrier.getComponent('health');
    if (health) {
      this.gameState.update('carrier.health', health.health);
      this.gameState.update('carrier.maxHealth', health.maxHealth);
    }
    
    // Update cargo
    for (const [type, amount] of Object.entries(this.cargo)) {
      this.gameState.update(`carrier.cargo.${type}`, amount);
    }
    
    // Update hardpoints
    const hardpoints = this.carrier.getHardpoints();
    this.gameState.update('carrier.hardpoints', hardpoints);
  }
  
  /**
   * Handle game paused event
   */
  onGamePaused() {
    // Stop auto-movement
    this.autoMove = false;
  }
  
  /**
   * Handle game resumed event
   */
  onGameResumed() {
    // Nothing specific needed here
  }
  
  /**
   * Get the carrier's current position
   * @returns {Object|null} Position object or null
   */
  getPosition() {
    if (!this.carrier) return null;
    
    const transform = this.carrier.getComponent('transform');
    return transform ? transform.getPosition() : null;
  }
  
  /**
   * Get the carrier entity
   * @returns {Object|null} Carrier entity or null
   */
  getCarrier() {
    return this.carrier;
  }
  
  /**
   * Update carrier movement and behavior
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    if (!this.carrier) return;
    
    // Handle keyboard input
    this._handleKeyboardInput(delta);
    
    // Handle auto-movement
    if (this.autoMove) {
      this._handleAutoMovement(delta);
    }
    
    // Update carrier entity
    this.carrier.update(delta);
    
    // Update movement indicator position if carrier is moving
    this._updateMovementIndicator();
  }
  
  /**
   * Handle keyboard input for carrier movement
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _handleKeyboardInput(delta) {
    if (!this.inputKeys) return;
    
    // Cancel auto-movement if manual keys pressed
    if (this.inputKeys.up.isDown || this.inputKeys.down.isDown || 
        this.inputKeys.left.isDown || this.inputKeys.right.isDown) {
      this.autoMove = false;
    }
    
    // Get carrier transform
    const transform = this.carrier.getComponent('transform');
    if (!transform) return;
    
    // Calculate movement vector
    let dx = 0;
    let dy = 0;
    
    if (this.inputKeys.up.isDown) {
      dy = -1;
    } else if (this.inputKeys.down.isDown) {
      dy = 1;
    }
    
    if (this.inputKeys.left.isDown) {
      dx = -1;
    } else if (this.inputKeys.right.isDown) {
      dx = 1;
    }
    
    // Apply movement if any direction pressed
    if (dx !== 0 || dy !== 0) {
      // Normalize vector
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        dx /= length;
        dy /= length;
      }
      
      // Apply speed
      let speed = this.moveSpeed;
      
      // Apply boost if shift is held
      if (this.inputKeys.boost.isDown) {
        speed *= 1.5;
      }
      
      // Convert to time-based movement
      const timeScale = delta / 1000;
      dx *= speed * timeScale;
      dy *= speed * timeScale;
      
      // Move carrier
      transform.move(dx, dy);
      
      // Update sprite position
      this.carrier.sprite.x = transform.x;
      this.carrier.sprite.y = transform.y;
      
      // Set carrier as moving
      this.isMoving = true;
    } else {
      this.isMoving = false;
    }
    
    // Handle rotation
    if (this.inputKeys.rotateLeft.isDown) {
      transform.rotate(-this.rotationSpeed);
      this.carrier.sprite.rotation = transform.rotation;
      this.isRotating = true;
    } else if (this.inputKeys.rotateRight.isDown) {
      transform.rotate(this.rotationSpeed);
      this.carrier.sprite.rotation = transform.rotation;
      this.isRotating = true;
    } else {
      this.isRotating = false;
    }
  }
  
  /**
   * Handle auto-movement to target position
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _handleAutoMovement(delta) {
    if (!this.targetPosition) return;
    
    // Get carrier transform
    const transform = this.carrier.getComponent('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    
    // Calculate distance to target
    const dx = this.targetPosition.x - position.x;
    const dy = this.targetPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if we've arrived
    if (distance < 5) {
      this.autoMove = false;
      this.isMoving = false;
      
      // Remove movement indicator
      if (this.moveIndicator) {
        this.moveIndicator.destroy();
        this.moveIndicator = null;
      }
      
      // Emit arrival event
      this.eventBus.emit('carrier:arrived', {
        position: { ...position }
      });
      
      return;
    }
    
    // Rotate towards target if needed
    if (this.targetRotation !== null) {
      const angleDiff = Phaser.Math.Angle.Wrap(this.targetRotation - transform.rotation);
      
      // Check if rotation is complete
      if (Math.abs(angleDiff) < 0.05) {
        transform.rotation = this.targetRotation;
        this.carrier.sprite.rotation = transform.rotation;
        this.targetRotation = null;
      } else {
        // Rotate towards target
        const rotAmount = Math.min(this.rotationSpeed, Math.abs(angleDiff)) * Math.sign(angleDiff);
        transform.rotate(rotAmount);
        this.carrier.sprite.rotation = transform.rotation;
        this.isRotating = true;
      }
    }
    
    // Move towards target
    const moveSpeed = this.moveSpeed * (delta / 1000);
    
    // Normalize direction
    const moveDistance = Math.min(distance, moveSpeed);
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // Apply movement
    transform.move(normalizedDx * moveDistance, normalizedDy * moveDistance);
    
    // Update sprite position
    this.carrier.sprite.x = transform.x;
    this.carrier.sprite.y = transform.y;
    
    // Set carrier as moving
    this.isMoving = true;
  }
  
  /**
   * Update the movement indicator position
   * @private
   */
  _updateMovementIndicator() {
    // Remove indicator if not moving or no target
    if (!this.isMoving || !this.targetPosition) {
      if (this.moveIndicator) {
        this.moveIndicator.destroy();
        this.moveIndicator = null;
      }
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    // Clean up carrier
    if (this.carrier) {
      this.carrier.destroy();
      this.carrier = null;
    }
    
    // Clean up movement indicator
    if (this.moveIndicator) {
      this.moveIndicator.destroy();
      this.moveIndicator = null;
    }
    
    // Clean up input keys
    if (this.inputKeys) {
      this.scene.input.keyboard.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.Q,
        Phaser.Input.Keyboard.KeyCodes.E,
        Phaser.Input.Keyboard.KeyCodes.SHIFT
      ]);
      this.inputKeys = null;
    }
    
    // Call parent cleanup
    super.cleanup();
  }
} 