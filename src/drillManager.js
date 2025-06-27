import { CargoManager } from './cargoManager.js';
// Manages drill placement, mining intervals, and cargo transport

export class DrillManager {
  constructor(scene, resourceManager, terrainManager, carrier, enemyManager = null) {
    this.scene = scene;
    this.resourceManager = resourceManager;
    this.terrainManager = terrainManager;
    this.carrier = carrier;
    this.enemyManager = enemyManager;
    this.drills = [];
    this.timer = 0;
    this.cargoManager = new CargoManager(scene, carrier.x, carrier.y, resourceManager);
    this.cargoManager.setCarrier(carrier);  // Set the carrier object directly
    
    // Define drill stats
    this.DRILL_STATS = {
      NAME: "Drill",
      COST: 10,
      HEALTH: this.DRILL_MAX_HEALTH,
      MINING_RATE: 0.2, // Reduced from 1 to slow down mining
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
    
    // Store mining progress indicators
    this.progressBars = new Map();
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
    
    // Calculate tile position directly below the drill
    const tileSize = this.terrainManager.tileSize;
    const tileX = Math.floor(x / tileSize) * tileSize + tileSize / 2; // Center of tile
    const tileY = Math.floor((y + tileSize) / tileSize) * tileSize + tileSize / 2; // Center of tile below
    
    console.log(`Drill placed at ${x},${y}. Target tile center: ${tileX},${tileY}`);

    // Store drill info – we keep a reference to both container (for destroy) and body (for tinting)
    this.drills.push({
      sprite: container,      // used for positioning & destroy
      body: body,             // used for color/tint changes
      mined: 0,
      x,
      y,
      reachedBottom: false,
      health: this.DRILL_MAX_HEALTH,
      isAlive: true,
      priorityTag: 'DRILL',
      miningTarget: {
        x: tileX,
        y: tileY, // Target center of tile directly below the drill
        currentHardness: 0,                  // Will be populated on first update
        originalHardness: 0,                 // Will be populated on first update
        resourceValue: 0                     // Will be populated on first update
      }
    });

    // Register with EnemyManager for targeting
    if (this.enemyManager) {
      const drillRef = this.drills[this.drills.length - 1];
      // Ensure a generic takeDamage is present so enemies can call it directly
      if (!drillRef.takeDamage) {
        drillRef.takeDamage = (amt) => this.damageDrill(drillRef, amt);
      }
      this.enemyManager.registerTarget(drillRef);
    }
    return true;
  }

  // Create or update progress bar for a drill's mining target
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
        if (progress < 0.33) color = 0xff0000;
        else if (progress < 0.66) color = 0xffff00;
        else color = 0x00ff00;
        
        bar.fill.fillColor = color;
      }
      
      // Update position if target changed
      bar.background.x = target.x;
      bar.background.y = target.y - 15;
      bar.fill.y = target.y - 15;
    }
  }

  update() {
    this.timer++;
    if (this.timer % 60 === 0) {
      // Filter out destroyed drills
      this.drills = this.drills.filter(drill => drill.isAlive);
      
      this.drills.forEach((drill) => {
        // Initialize mining target if not initialized
        const target = drill.miningTarget;
        if (target.currentHardness === 0) {
          // Get material info at the current target position
          const tileAt = this.terrainManager.getTileAt(target.x, target.y);
          if (tileAt && tileAt.mineable) {
            target.currentHardness = tileAt.hardness;
            target.originalHardness = tileAt.hardness;
            target.resourceValue = tileAt.resourceValue || 0;
            console.log(`Drill at ${drill.x},${drill.y} mining: ${tileAt.name} with hardness ${tileAt.hardness}`);
          } else if (tileAt && tileAt.name === "bedrock") {
            // Bedrock - slow production but infinite
            drill.reachedBottom = true;
            drill.body.fillColor = this.DRILL_COLORS.BOTTOM_REACHED;
            target.currentHardness = 0; // Don't track hardness for bedrock
            target.originalHardness = 0;
            target.resourceValue = this.terrainManager.MATERIALS.BEDROCK.resourceValue || 0.25;
            console.log(`Drill at ${drill.x},${drill.y} reached bedrock`);
          } else {
            console.log(`Drill at ${drill.x},${drill.y} has invalid target:`, tileAt);
          }
        }
        
        // Process mining action
        const miningRate = this.DRILL_STATS.MINING_RATE * this.DRILL_STATS.MINING_EFFICIENCY;
        
        if (drill.reachedBottom) {
          // Bedrock mining - slower rate
          if (this.timer % 240 === 0) {
            drill.mined += 1;
            
            // Spawn cargo at reduced rate if on bedrock (1/4 the normal rate)
            if (drill.mined % 8 === 0) {
              this.cargoManager.spawn(drill.x, drill.y, target.resourceValue);
            }
          }
        } else {
          // Normal mining - reduce hardness of target
          target.currentHardness -= miningRate;
          
          // Check if target is depleted
          if (target.currentHardness <= 0) {
            // Generate resources based on tile value
            const resourceAmount = target.resourceValue;
            
            if (resourceAmount > 0) {
              this.cargoManager.spawn(drill.x, drill.y, resourceAmount);
              console.log(`Drill at ${drill.x},${drill.y} generated ${resourceAmount} resources`);
            }
            
            // Destroy the tile and move to the next one - pass a high mining power to ensure destruction
            const success = this.terrainManager.destroyAt(target.x, target.y, 1000);
            console.log(`Destroying tile at ${target.x},${target.y}: ${success ? 'success' : 'failed'}`);
            
            // Update mining target to the tile below
            target.y += this.terrainManager.tileSize;
            
            // Get new material info
            const newTile = this.terrainManager.getTileAt(target.x, target.y);
            
            if (newTile && newTile.mineable) {
              target.currentHardness = newTile.hardness;
              target.originalHardness = newTile.hardness;
              target.resourceValue = newTile.resourceValue || 0;
              console.log(`Drill at ${drill.x},${drill.y} now mining: ${newTile.name} at ${target.x},${target.y}`);
            } else if (newTile && newTile.name === "bedrock") {
              // Bedrock - slow production but infinite
              drill.reachedBottom = true;
              drill.body.fillColor = this.DRILL_COLORS.BOTTOM_REACHED;
              target.currentHardness = 0;
              target.originalHardness = 0;
              target.resourceValue = this.terrainManager.MATERIALS.BEDROCK.resourceValue || 0.25;
              console.log(`Drill at ${drill.x},${drill.y} reached bedrock`);
            } else {
              console.log(`Drill at ${drill.x},${drill.y} has invalid next target:`, newTile);
            }
            
            drill.mined += 1;
          }
          
          // Visual progress indicator (mining particles)
          if (this.timer % 15 === 0 && target.originalHardness > 0) {
            const progress = 1 - (target.currentHardness / target.originalHardness);
            const x = target.x;
            const y = target.y;
            
            if (progress > 0.5) {
              // Create small mining particles
              const particle = this.scene.add.circle(
                x + (Math.random() * 10 - 5), 
                y - 5, 
                2, 
                0xFFFFFF, 
                0.7
              );
              
              this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                y: y - 15,
                duration: 500,
                onComplete: () => particle.destroy()
              });
            }
          }
        }
        
        // Update mining progress bar for this drill
        this.updateMiningProgressBar(drill);
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
    
    // Clean up progress bar if it exists
    if (this.progressBars.has(drill)) {
      const bar = this.progressBars.get(drill);
      bar.background.destroy();
      bar.fill.destroy();
      this.progressBars.delete(drill);
    }
    
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

    // Unregister from EnemyManager
    if (this.enemyManager) {
      this.enemyManager.unregisterTarget(drill);
    }
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

  // Add a setter to inject EnemyManager after construction
  setEnemyManager(em) {
    this.enemyManager = em;
    // Register existing drills
    for (const drill of this.drills) {
      if (!drill.priorityTag) drill.priorityTag = 'DRILL';
      if (!drill.takeDamage) {
        drill.takeDamage = (amt) => this.damageDrill(drill, amt);
      }
      this.enemyManager.registerTarget(drill);
    }
  }
}
