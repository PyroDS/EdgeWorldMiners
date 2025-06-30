/**
 * DrillManager - Handles drill placement, mining operations, and cargo transport
 * Refactored to use the Manager base class and integrate with the event system.
 */
import { Manager } from '../core/manager.js';
import { CargoManager } from '../cargoManager.js';
import services from '../core/services.js';

export class DrillManager extends Manager {
  /**
   * Create a new drill manager
   */
  constructor() {
    super('drillManager');
    
    // Define drill stats
    this.DRILL_MAX_HEALTH = 200;
    
    this.DRILL_STATS = {
      NAME: "Drill",
      COST: 10,
      HEALTH: this.DRILL_MAX_HEALTH,
      MINING_RATE: 0.2,
      MINING_EFFICIENCY: 1.0
    };
    
    // Colors for drill states
    this.DRILL_COLORS = {
      NORMAL: 0x00ffff,      // Normal operation
      BOTTOM_REACHED: 0x7799aa,  // Reduced efficiency when at bottom
      DAMAGED: 0xff9900,     // Drill is damaged
      CRITICAL: 0xff0000     // Drill is critically damaged
    };
    
    // Drill properties
    this.DRILL_EXPLOSION_RADIUS = 60;
    this.DRILL_EXPLOSION_DAMAGE = 25;
    
    // Track drills
    this.drills = [];
    this.explodingDrills = new Set();
    this.progressBars = new Map();
    this.timer = 0;
    
    // References to other systems
    this.scene = null;
    this.terrainManager = null;
    this.cargoManager = null;
    this.carrier = null;
    this.WORLD_BOTTOM = 2000; // Default, will be updated in init
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for drill placement request
    this.listenTo('drill:place', (data) => {
      this.tryPlaceDrill(data.x, data.y);
    });
    
    // Listen for enemy damage to drills
    this.listenTo('entity:damaged', (data) => {
      if (data.entityType === 'drill') {
        const drill = this.getDrillById(data.entityId);
        if (drill) {
          this.damageDrill(drill, data.damage);
        }
      }
    });
    
    // Listen for carrier movement to update cargo transport
    this.listenTo('carrier:moved', (data) => {
      if (this.cargoManager) {
        this.cargoManager.setTargetPosition(data.position.x, data.position.y);
      }
    });
    
    // Listen for terrain destruction events
    this.listenTo('terrain:destroyed', (data) => {
      // Check if any drills need to be destroyed due to terrain removal
      this.checkDrillSupport();
    });
    
    // Listen for game reset
    this.listenTo('game:reset', () => {
      this.reset();
    });
  }
  
  /**
   * Initialize the manager
   */
  onInit() {
    // Get references from service locator
    this.scene = services.get('scene');
    this.terrainManager = services.get('terrainManager');
    this.carrier = services.get('carrierManager').getCarrier();
    
    // Initialize cargo manager
    this.cargoManager = new CargoManager(
      this.scene, 
      this.carrier.x, 
      this.carrier.y, 
      services.get('resourceManager')
    );
    this.cargoManager.setCarrier(this.carrier);
    
    // Get world parameters
    this.WORLD_BOTTOM = this.terrainManager.getWorldHeight();
    
    this.log('Drill manager initialized');
  }
  
  /**
   * Create a drill sprite
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object} Container and body objects
   */
  createDrillSprite(x, y) {
    // Parent container so we can move/destroy everything together
    const container = this.scene.add.container(x, y);

    // Main drill body – we keep a reference to allow color changes on damage
    const body = this.scene.add.rectangle(0, 0, 20, 40, this.DRILL_COLORS.NORMAL);
    body.setOrigin(0.5, 0.5);

    // Metallic drill tip (triangle) that spins slowly
    const tipHeight = 14;
    const tip = this.scene.add.triangle(0, 20, -10, 20, 10, 20, 0, 20 + tipHeight, 0xaaaaaa);
    tip.setOrigin(0.5, 0);

    // Side thruster / cooling fins
    const finLeft = this.scene.add.rectangle(-14, -8, 4, 16, 0x5555ff, 1);
    const finRight = this.scene.add.rectangle(14, -8, 4, 16, 0x5555ff, 1);

    // Blink the fins to give a subtle energy effect
    this.scene.tweens.add({
      targets: [finLeft, finRight],
      alpha: { from: 0.4, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Rotate the drill tip continuously
    this.scene.tweens.add({
      targets: tip,
      angle: 360,
      duration: 2000,
      ease: 'Linear',
      repeat: -1
    });

    // Assemble container
    container.add([body, tip, finLeft, finRight]);

    return { container, body };
  }

  /**
   * Try to place a drill at the specified position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {boolean} Whether placement was successful
   */
  tryPlaceDrill(x, y) {
    if (!this.terrainManager.canPlaceDrillAt(x, y)) {
      this.emit('notification:show', {
        type: 'warning',
        message: 'Cannot place drill here',
        duration: 2000
      });
      return false;
    }

    // Check if we can afford it
    const resourceManager = services.get('resourceManager');
    if (!resourceManager.spend({ metal: this.DRILL_STATS.COST })) {
      this.emit('notification:show', {
        type: 'warning',
        message: 'Not enough resources',
        duration: 2000
      });
      return false;
    }

    // Create the fancy sci-fi drill graphics
    const { container, body } = this.createDrillSprite(x, y);
    
    // Calculate tile position directly below the drill
    const tileSize = this.terrainManager.tileSize;
    const tileX = Math.floor(x / tileSize) * tileSize + tileSize / 2; // Center of tile
    const tileY = Math.floor((y + tileSize) / tileSize) * tileSize + tileSize / 2; // Center of tile below
    
    // Create unique drill ID
    const drillId = `drill_${Date.now()}_${this.drills.length}`;

    // Store drill info
    const newDrill = {
      id: drillId,
      type: 'drill',
      sprite: container,
      body: body,
      mined: 0,
      x,
      y,
      reachedBottom: false,
      health: this.DRILL_MAX_HEALTH,
      isAlive: true,
      priorityTag: 'DRILL',
      miningTarget: {
        x: tileX,
        y: tileY,
        currentHardness: 0,
        originalHardness: 0,
        resourceValue: 0
      },
      // Method for enemy interaction
      takeDamage: (amt) => this.damageDrill(newDrill, amt)
    };
    
    this.drills.push(newDrill);

    // Register with entity registry
    this.emit('entity:register', {
      entity: newDrill,
      tags: ['drill', 'building', 'targetable']
    });
    
    // Update UI
    this.emit('drill:placed', {
      id: drillId,
      x, 
      y,
      health: this.DRILL_MAX_HEALTH
    });

    return true;
  }
  
  /**
   * Update or create mining progress bar for a drill
   * @param {Object} drill - Drill object
   */
  updateMiningProgressBar(drill) {
    const target = drill.miningTarget;
    if (!target || drill.reachedBottom) {
      // Remove any existing progress bar if we're mining bedrock
      if (this.progressBars.has(drill)) {
        const bar = this.progressBars.get(drill);
        bar.background.destroy();
        bar.fill.destroy();
        this.progressBars.delete(drill);
      }
      return;
    }
    
    // Calculate progress percentage
    let progress = 0;
    if (target.originalHardness > 0) {
      progress = 1 - (target.currentHardness / target.originalHardness);
    }
    
    // Ensure progress is between 0 and 1
    progress = Math.max(0, Math.min(1, progress));
    
    // Create or update progress bar
    if (!this.progressBars.has(drill)) {
      // Create new progress bar
      const barWidth = 30;
      const barHeight = 4;
      
      // Position above the target
      const barX = target.x;
      const barY = target.y - 15;
      
      // Background of the bar
      const background = this.scene.add.rectangle(
        barX, barY, 
        barWidth, barHeight, 
        0x000000, 0.7
      );
      
      // Fill part of the bar
      const fill = this.scene.add.rectangle(
        barX - barWidth/2 + (progress * barWidth/2), barY, 
        progress * barWidth, barHeight, 
        0x00ff00, 1
      );
      fill.setOrigin(0, 0.5);
      
      this.progressBars.set(drill, { background, fill, lastProgress: progress });
    } else {
      // Update existing progress bar
      const bar = this.progressBars.get(drill);
      
      // Only update if progress changed significantly
      if (Math.abs(bar.lastProgress - progress) > 0.01) {
        // Update fill width and position
        const barWidth = 30;
        bar.fill.width = progress * barWidth;
        bar.fill.x = target.x - barWidth/2;
        bar.lastProgress = progress;
        
        // Update color based on progress
        let color;
        if (progress < 0.33) {
          color = 0xff0000; // Red
        } else if (progress < 0.66) {
          color = 0xffaa00; // Orange
        } else {
          color = 0x00ff00; // Green
        }
        bar.fill.fillColor = color;
      }
    }
  }
  
  /**
   * Update all drills
   * @param {number} delta - Time since last update in ms
   */
  onUpdate(delta) {
    if (!this.isActive || this.drills.length === 0) return;
    
    // Update timer for mining intervals
    this.timer += delta;
    const mineralInterval = 1000; // Mine every second
    
    // Update each drill
    for (let i = this.drills.length - 1; i >= 0; i--) {
      const drill = this.drills[i];
      
      // Skip destroyed drills
      if (!drill.isAlive) continue;
      
      // Process mining
      if (this.timer >= mineralInterval) {
        this.processDrillMining(drill);
      }
      
      // Update visual indicators
      this.updateMiningProgressBar(drill);
    }
    
    // Reset timer if needed
    if (this.timer >= mineralInterval) {
      this.timer = 0;
    }
    
    // Update cargo manager
    if (this.cargoManager) {
      this.cargoManager.update(delta);
    }
  }
  
  /**
   * Process mining for a single drill
   * @param {Object} drill - Drill object
   */
  processDrillMining(drill) {
    const terrainManager = this.terrainManager;
    const tileSize = terrainManager.tileSize;
    const miningX = drill.miningTarget.x;
    const miningY = drill.miningTarget.y;
    
    // Check if we've reached the bottom of the world
    if (miningY >= this.WORLD_BOTTOM - tileSize) {
      drill.reachedBottom = true;
      drill.body.fillColor = this.DRILL_COLORS.BOTTOM_REACHED;
      return;
    }
    
    // Get tile properties (hardness and resource value)
    const tileInfo = terrainManager.getTileInfoAt(miningX, miningY);
    
    // Update mining target info if needed
    if (drill.miningTarget.originalHardness === 0) {
      drill.miningTarget.currentHardness = tileInfo.hardness;
      drill.miningTarget.originalHardness = tileInfo.hardness;
      drill.miningTarget.resourceValue = tileInfo.resourceValue;
    }
    
    // Mine the tile
    const miningRate = this.DRILL_STATS.MINING_RATE * drill.health / this.DRILL_MAX_HEALTH;
    drill.miningTarget.currentHardness -= miningRate;
    
    // If hardness reaches 0, destroy the tile and mine resources
    if (drill.miningTarget.currentHardness <= 0) {
      // Extract resources
      const resourceAmount = drill.miningTarget.resourceValue * this.DRILL_STATS.MINING_EFFICIENCY;
      
      // Send resources to cargo system
      if (resourceAmount > 0) {
        this.cargoManager.createCargo(
          drill.x, 
          drill.y, 
          resourceAmount, 
          tileInfo.resourceType || 'metal'
        );
      }
      
      // Destroy the tile
      terrainManager.destroyTileAt(miningX, miningY);
      
      // Update target to next tile below
      drill.miningTarget = {
        x: miningX,
        y: miningY + tileSize,
        currentHardness: 0,
        originalHardness: 0,
        resourceValue: 0
      };
      
      // Emit mining completion event
      this.emit('drill:mined', {
        drillId: drill.id,
        position: { x: miningX, y: miningY },
        resourceAmount,
        resourceType: tileInfo.resourceType || 'metal'
      });
    }
  }
  
  /**
   * Apply damage to a drill
   * @param {Object} drill - Drill object
   * @param {number} amount - Amount of damage
   */
  damageDrill(drill, amount) {
    if (!drill.isAlive) return;
    
    // Apply damage
    drill.health -= amount;
    
    // Update color based on health percentage
    const healthPercent = drill.health / this.DRILL_MAX_HEALTH;
    if (healthPercent < 0.33) {
      drill.body.fillColor = this.DRILL_COLORS.CRITICAL;
    } else if (healthPercent < 0.66) {
      drill.body.fillColor = this.DRILL_COLORS.DAMAGED;
    }
    
    // Check for destruction
    if (drill.health <= 0) {
      this.destroyDrill(drill);
    }
    
    // Emit damage event
    this.emit('drill:damaged', {
      drillId: drill.id,
      health: drill.health,
      maxHealth: this.DRILL_MAX_HEALTH
    });
  }
  
  /**
   * Destroy a drill
   * @param {Object} drill - Drill object
   */
  destroyDrill(drill) {
    if (!drill.isAlive) return;
    
    drill.isAlive = false;
    
    // Don't process if this drill is already exploding
    if (this.explodingDrills.has(drill)) return;
    this.explodingDrills.add(drill);
    
    // Create explosion effect
    this.createExplosion(drill.x, drill.y, drill);
    
    // Apply explosion damage
    this.applyExplosionDamage(drill.x, drill.y, drill);
    
    // Destroy terrain around the drill
    this.destroyTerrainAround(drill.x, drill.y);
    
    // Remove drilling progress bar
    if (this.progressBars.has(drill)) {
      const bar = this.progressBars.get(drill);
      bar.background.destroy();
      bar.fill.destroy();
      this.progressBars.delete(drill);
    }
    
    // Destroy sprite
    if (drill.sprite) {
      drill.sprite.destroy();
    }
    
    // Remove from entity registry
    this.emit('entity:unregister', { entityId: drill.id });
    
    // Remove from exploding drills set
    this.explodingDrills.delete(drill);
    
    // Emit destroyed event
    this.emit('drill:destroyed', { 
      drillId: drill.id,
      position: { x: drill.x, y: drill.y }
    });
  }
  
  /**
   * Create explosion effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} sourceDrill - Source drill causing explosion
   */
  createExplosion(x, y, sourceDrill = null) {
    // Create expanding circle for explosion
    const explosion = this.scene.add.circle(x, y, 10, 0xff7700, 0.8);
    
    // Create pulsating effect with scale and alpha
    this.scene.tweens.add({
      targets: explosion,
      scale: this.DRILL_EXPLOSION_RADIUS / 10,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Camera shake for feedback
    this.scene.cameras.main.shake(300, 0.005);
    
    // Add particle effect for more impact
    const particles = this.scene.add.particles(x, y, 'pixel', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      tint: [0xff7700, 0xff0000, 0xffaa00],
      lifespan: 500,
      gravityY: 200,
      quantity: 30,
      emitting: false
    });
    
    // Emit particles and then destroy
    particles.explode(30);
    setTimeout(() => particles.destroy(), 1000);
  }
  
  /**
   * Apply explosion damage to nearby entities
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} sourceDrill - Source drill to exclude
   */
  applyExplosionDamage(x, y, sourceDrill = null) {
    // Damage nearby drills
    for (const drill of this.drills) {
      // Skip the source drill and already destroyed drills
      if (drill === sourceDrill || !drill.isAlive) continue;
      
      const distance = Phaser.Math.Distance.Between(x, y, drill.x, drill.y);
      
      if (distance <= this.DRILL_EXPLOSION_RADIUS) {
        // Damage falls off with distance
        const damageMultiplier = 1 - (distance / this.DRILL_EXPLOSION_RADIUS);
        const damage = this.DRILL_EXPLOSION_DAMAGE * damageMultiplier;
        this.damageDrill(drill, damage);
      }
    }
    
    // Emit explosion event for other systems to handle
    this.emit('explosion', {
      position: { x, y },
      radius: this.DRILL_EXPLOSION_RADIUS,
      damage: this.DRILL_EXPLOSION_DAMAGE,
      sourceType: 'drill',
      sourceId: sourceDrill ? sourceDrill.id : null
    });
  }
  
  /**
   * Destroy terrain in an area around a position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  destroyTerrainAround(x, y) {
    const radius = this.DRILL_EXPLOSION_RADIUS / 2; // Smaller radius for terrain
    const tileSize = this.terrainManager.tileSize;
    
    // Calculate the range of tiles to check (in tile coordinates)
    const minTileX = Math.floor((x - radius) / tileSize);
    const maxTileX = Math.floor((x + radius) / tileSize);
    const minTileY = Math.floor((y - radius) / tileSize);
    const maxTileY = Math.floor((y + radius) / tileSize);
    
    // Destroy tiles in a circular pattern
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
        // Calculate center of tile
        const tileCenterX = tileX * tileSize + tileSize / 2;
        const tileCenterY = tileY * tileSize + tileSize / 2;
        
        // Calculate distance to explosion center
        const distance = Phaser.Math.Distance.Between(x, y, tileCenterX, tileCenterY);
        
        // If within radius, destroy the tile
        if (distance <= radius) {
          this.terrainManager.destroyTileAt(tileCenterX, tileCenterY);
        }
      }
    }
  }
  
  /**
   * Get drill by ID
   * @param {string} id - Drill ID
   * @returns {Object|null} Drill object or null
   */
  getDrillById(id) {
    return this.drills.find(drill => drill.id === id);
  }
  
  /**
   * Get all active drills
   * @returns {Array} Array of drill objects
   */
  getDrills() {
    return this.drills.filter(drill => drill.isAlive);
  }
  
  /**
   * Check if any drills need to be destroyed due to terrain removal
   */
  checkDrillSupport() {
    for (const drill of this.drills) {
      if (!drill.isAlive) continue;
      
      // Check if drill is still supported
      if (!this.terrainManager.canPlaceDrillAt(drill.x, drill.y, true)) {
        // Destroy the drill due to missing support terrain
        this.destroyDrill(drill);
      }
    }
  }
  
  /**
   * Get the count of active drills
   * @returns {number} Number of active drills
   */
  getDrillCount() {
    return this.drills.filter(drill => drill.isAlive).length;
  }
  
  /**
   * Find the closest drill to a position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object|null} Closest drill or null
   */
  findClosestDrill(x, y) {
    let closestDrill = null;
    let closestDistance = Infinity;
    
    for (const drill of this.drills) {
      if (!drill.isAlive) continue;
      
      const distance = Phaser.Math.Distance.Between(x, y, drill.x, drill.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestDrill = drill;
      }
    }
    
    return closestDrill;
  }
  
  /**
   * Get the lowest health ratio among all drills
   * @returns {number} Lowest health ratio (0-1), or 1 if no drills
   */
  getLowestHealthRatio() {
    if (this.drills.length === 0) return 1;
    
    let lowestRatio = 1;
    
    for (const drill of this.drills) {
      if (!drill.isAlive) continue;
      
      const ratio = drill.health / this.DRILL_MAX_HEALTH;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
      }
    }
    
    return lowestRatio;
  }
  
  /**
   * Reset the manager
   */
  onReset() {
    // Clean up all drills
    for (const drill of this.drills) {
      if (drill.sprite) {
        drill.sprite.destroy();
      }
    }
    
    // Clean up all progress bars
    for (const [drill, bar] of this.progressBars.entries()) {
      bar.background.destroy();
      bar.fill.destroy();
    }
    
    // Reset collections
    this.drills = [];
    this.explodingDrills.clear();
    this.progressBars.clear();
    this.timer = 0;
    
    // Reset cargo manager
    if (this.cargoManager) {
      this.cargoManager.reset();
    }
    
    this.log('Drill manager reset');
  }
} 