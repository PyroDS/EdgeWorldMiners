import { CargoManager } from './cargoManager.js';
// Manages drill placement, mining intervals, and cargo transport

export class DrillManager {
  constructor(scene, resourceManager, terrainManager, carrier, enemyManager) {
    this.scene = scene;
    this.resourceManager = resourceManager;
    this.terrainManager = terrainManager;
    this.carrier = carrier;
    this.enemyManager = enemyManager;
    this.drills = [];
    this.timer = 0;
    this.cargoManager = new CargoManager(scene, carrier.x, carrier.y, resourceManager);
    
    // Define drill stats
    this.DRILL_STATS = {
      NAME: "Drill",
      COST: 10,
      HEALTH: this.DRILL_MAX_HEALTH,
      MINING_RATE: 1, // Base mining rate
      MINING_EFFICIENCY: 1.0 // Multiplier for mining productivity
    };
    
    // Colors for drill states
    this.DRILL_COLORS = {
      NORMAL: 0x00ffff,   // Normal operation
      BOTTOM_REACHED: 0x7799aa,  // Reduced efficiency when at bottom
      DAMAGED: 0xff9900,   // Drill is damaged
      CRITICAL: 0xff0000   // Drill is critically damaged
    };
    
    // World bottom boundary - from game.js terrain height
    this.WORLD_BOTTOM = 2000;
    
    // Drill properties
    this.DRILL_MAX_HEALTH = 200;
    this.DRILL_EXPLOSION_RADIUS = 60;
    this.DRILL_EXPLOSION_DAMAGE = 25;
    
    // Update health in DRILL_STATS
    this.DRILL_STATS.HEALTH = this.DRILL_MAX_HEALTH;
    
    // Track drills that are currently exploding to prevent recursion
    this.explodingDrills = new Set();
  }

  // --- Helper to create a more complex sci-fi drill sprite ---
  createDrillSprite(x, y) {
    // Parent container so we can move/destroy everything together
    const container = this.scene.add.container(x, y);

    // Main drill body – we keep a reference to allow color changes on damage
    const body = this.scene.add.rectangle(0, 0, 20, 40, this.DRILL_COLORS.NORMAL);
    body.setOrigin(0.5, 0.5);

    // Metallic drill tip (triangle) that spins slowly
    const tipHeight = 14;
    const tip = this.scene.add.triangle(0, 20,  -10, 20,  10, 20,  0, 20 + tipHeight, 0xaaaaaa);
    tip.setOrigin(0.5, 0);

    // Side thruster / cooling fins
    const finLeft  = this.scene.add.rectangle(-14, -8, 4, 16, 0x5555ff, 1);
    const finRight = this.scene.add.rectangle( 14, -8, 4, 16, 0x5555ff, 1);

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

  tryPlaceDrill(x, y) {
    if (!this.terrainManager.canPlaceDrillAt(x, y)) return false;

    // Create the fancy sci-fi drill graphics
    const { container, body } = this.createDrillSprite(x, y);

    // Store drill info – we keep a reference to both container (for destroy) and body (for tinting)
    this.drills.push({
      sprite: container,      // used for positioning & destroy
      body: body,             // used for color/tint changes
      mined: 0,
      x,
      y,
      reachedBottom: false,
      health: this.DRILL_MAX_HEALTH,
      isAlive: true
    });
    return true;
  }

  update() {
    this.timer++;
    if (this.timer % 60 === 0) {
      // Filter out destroyed drills
      this.drills = this.drills.filter(drill => drill.isAlive);
      
      this.drills.forEach((drill) => {
        const dy = Math.floor(drill.mined / 2);
        const currentDepth = 400 + dy * 20;
        
        // Check if this drill has reached the bottom
        if (currentDepth >= this.WORLD_BOTTOM - 20) {
          if (!drill.reachedBottom) {
            drill.reachedBottom = true;
            drill.body.fillColor = this.DRILL_COLORS.BOTTOM_REACHED;
          }
        }
        
        // Only mine if not at bottom or at 1/4 rate if at bottom
        if (!drill.reachedBottom || this.timer % 240 === 0) {
          // Only attempt to destroy terrain if not at bottom
          if (!drill.reachedBottom) {
            this.terrainManager.destroyAt(drill.x, currentDepth);
          }
          drill.mined += 1;
          
          // Spawn cargo at full rate if not at bottom, or at 1/4 rate if at bottom
          if ((!drill.reachedBottom && drill.mined % 2 === 0) || 
              (drill.reachedBottom && drill.mined % 8 === 0)) {
            this.cargoManager.spawn(drill.x, drill.y, 1);
          }
        }
      });
    }
    this.cargoManager.update();
  }
  
  // Method to damage a drill
  damageDrill(drill, amount) {
    if (!drill.isAlive || this.explodingDrills.has(drill)) return;
    
    drill.health -= amount;
    
    // Update drill color based on health
    if (drill.health <= this.DRILL_MAX_HEALTH * 0.25) {
      drill.body.fillColor = this.DRILL_COLORS.CRITICAL;
    } else if (drill.health <= this.DRILL_MAX_HEALTH * 0.5) {
      drill.body.fillColor = this.DRILL_COLORS.DAMAGED;
    }
    
    // Check if drill is destroyed
    if (drill.health <= 0) {
      this.destroyDrill(drill);
    }
  }
  
  // Method to destroy a drill
  destroyDrill(drill) {
    if (!drill.isAlive || this.explodingDrills.has(drill)) return;
    
    // Add this drill to exploding set to prevent recursion
    this.explodingDrills.add(drill);
    
    // Create explosion effect
    this.createExplosion(drill.x, drill.y, drill);
    
    // Mark drill as not alive
    drill.isAlive = false;
    
    // Remove the drill sprite (container) and all child graphics
    drill.sprite.destroy();
    
    // Remove from exploding set after a small delay
    setTimeout(() => {
      this.explodingDrills.delete(drill);
    }, 100);
  }
  
  // Create explosion effect
  createExplosion(x, y, sourceDrill = null) {
    // Visual effect (circle that fades out)
    const explosion = this.scene.add.circle(x, y, this.DRILL_EXPLOSION_RADIUS, 0xff0000, 0.8);
    
    // Apply damage to nearby entities
    this.applyExplosionDamage(x, y, sourceDrill);
    
    // Animate explosion and remove it
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });
  }
  
  // Apply explosion damage to nearby entities
  applyExplosionDamage(x, y, sourceDrill = null) {
    // Damage to nearby drills
    this.drills.forEach(drill => {
      // Skip the source drill and non-alive drills to prevent recursion
      if (drill === sourceDrill || !drill.isAlive || this.explodingDrills.has(drill)) return;
      
      const distance = Math.sqrt(Math.pow(drill.x - x, 2) + Math.pow(drill.y - y, 2));
      if (distance < this.DRILL_EXPLOSION_RADIUS) {
        // Calculate damage based on distance (more damage closer to explosion)
        const damage = Math.floor(this.DRILL_EXPLOSION_DAMAGE * (1 - distance / this.DRILL_EXPLOSION_RADIUS));
        this.damageDrill(drill, damage);
      }
    });
    
    // Damage to nearby enemies
    if (this.enemyManager) {
      this.enemyManager.damageEnemiesInRange(x, y, this.DRILL_EXPLOSION_RADIUS, this.DRILL_EXPLOSION_DAMAGE);
    }
    
    // Destroy terrain in explosion radius
    this.destroyTerrainAround(x, y);
  }
  
  // Destroy terrain in a circular pattern around the explosion
  destroyTerrainAround(x, y) {
    // Create a crater-like pattern
    const tileSize = this.terrainManager.tileSize;
    const radius = this.DRILL_EXPLOSION_RADIUS * 1.2; // Slightly larger than damage radius
    
    // Get bounds in tile coordinates
    const centerTileX = Math.floor(x / tileSize);
    const centerTileY = Math.floor(y / tileSize);
    const radiusTiles = Math.ceil(radius / tileSize);
    
    // Create a circular destruction pattern
    for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
      for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only destroy within the radius (circular pattern)
        // Create a rougher crater edge by adding some randomness
        const effectiveRadius = radiusTiles - (Math.random() * 0.5);
        
        if (distance <= effectiveRadius) {
          const worldX = (centerTileX + dx) * tileSize + (tileSize / 2);
          const worldY = (centerTileY + dy) * tileSize + (tileSize / 2);
          
          this.terrainManager.destroyAt(worldX, worldY);
        }
      }
    }
  }
  
  // Get all alive drills for targeting by enemies
  getTargetableDrills() {
    return this.drills.filter(drill => drill.isAlive);
  }
  
  // Find closest drill to a point (for enemy targeting)
  findClosestDrill(x, y) {
    const aliveDrills = this.getTargetableDrills();
    if (aliveDrills.length === 0) return null;
    
    // Find the closest drill from the list of alive drills
    let closestDrill = null;
    let minDistance = Infinity;
    
    aliveDrills.forEach(drill => {
      const distance = Math.sqrt(Math.pow(drill.x - x, 2) + Math.pow(drill.y - y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestDrill = drill;
      }
    });
    
    return closestDrill;
  }
  
  getDrillCount() {
    return this.drills.filter(d => d.isAlive).length;
  }
  
  getLowestHealthRatio() {
    const aliveDrills = this.drills.filter(d => d.isAlive);
    if (aliveDrills.length === 0) {
      return 1; // Return 100% if no drills exist
    }
    
    let lowestRatio = 1;
    for (const drill of aliveDrills) {
      const ratio = drill.health / this.DRILL_MAX_HEALTH;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
      }
    }
    
    return lowestRatio;
  }
}
