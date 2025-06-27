/**
 * enemyManager.js
 * ----------------------------------------------------------------------------
 * Manages the creation, updating, and destruction of all enemies in the game.
 * 
 * This manager is responsible for:
 * 1. Spawning enemies based on wave progression
 * 2. Managing the wave system (timing, difficulty scaling)
 * 3. Updating all active enemies
 * 4. Handling projectiles fired by shooter enemies
 * 5. Providing helper methods for targeting and damage
 * 
 * After the enemy overhaul, this manager delegates most behavior to the
 * individual enemy classes, making it easier to add new enemy types.
 * 
 * ADDING A NEW ENEMY TYPE:
 * 1. Create a new class in src/enemies/ that extends BaseEnemy
 * 2. Add spawning logic in this manager (similar to spawnMeleeEnemy/spawnShooterEnemy)
 * 3. Update the wave spawn logic in spawnEnemy() to include the new type
 * 
 * RELATIONSHIP WITH OTHER COMPONENTS:
 * - Uses enemy classes from src/enemies/
 * - Interacts with DrillManager, TurretManager, and TerrainManager
 * - Provides enemy data to UI components
 * 
 * @author EdgeWorldMiners Team
 */

import { MeleeEnemy } from './enemies/MeleeEnemy.js';
import { ShooterEnemy } from './enemies/ShooterEnemy.js';

export class EnemyManager {
  /**
   * Creates a new enemy manager
   * 
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {TerrainManager} terrainManager - Reference to the terrain manager
   * @param {DrillManager} drillManager - Reference to the drill manager (can be null)
   * @param {TurretManager} turretManager - Reference to the turret manager (can be null)
   * @param {Carrier} carrier - Reference to the carrier (can be null)
   */
  constructor(scene, terrainManager, drillManager = null, turretManager = null, carrier = null) {
    this.scene = scene;
    this.terrainManager = terrainManager;
    this.drillManager = drillManager;
    this.turretManager = turretManager;
    this.carrier = carrier;
    
    // Array of all active enemy instances
    this.enemies = [];
    
    // --- NEW: master list of targetable player objects ---
    this.targetables = [];
    
    // Store projectiles fired by shooter-type enemies
    this.projectiles = [];
    
    // General-purpose timer for periodic actions
    this.timer = 0;
    
    // Wave system settings
    this.WAVE_SETTINGS = {
      INITIAL_ENEMIES: 5,
      ENEMIES_INCREMENT: 3,
      BREAK_DURATION: 1000, // frames between waves
      SPAWN_INTERVAL: 600, // frames between enemy spawns in a wave
    };
    
    // Wave state
    this.currentWave = 0;
    this.enemiesLeftToSpawn = 0;
    this.spawnTimer = 0;
    this.waveBreakTimer = 0;
    this.isWaveActive = false;

    // NEW: Flag to control when the wave system starts. Waves are disabled until the
    //      main scene signals that the world has finished generating.
    this.waveSystemEnabled = false;
  }
  
  // Method to set drillManager after initialization (to avoid circular dependencies)
  setDrillManager(drillManager) {
    this.drillManager = drillManager;
  }
  
  // Method to set turretManager
  setTurretManager(turretManager) {
    this.turretManager = turretManager;
  }
  
  // Method to set carrier reference after initialization
  setCarrier(carrier) {
    this.carrier = carrier;
  }
  
  /**
   * Starts a new wave of enemies
   */
  startWave() {
    this.currentWave++;
    this.enemiesLeftToSpawn = this.WAVE_SETTINGS.INITIAL_ENEMIES + 
                             (this.currentWave - 1) * this.WAVE_SETTINGS.ENEMIES_INCREMENT;
    this.isWaveActive = true;
    console.log(`Wave ${this.currentWave} started! Enemies: ${this.enemiesLeftToSpawn}`);
  }
  
  /**
   * Spawns an enemy based on wave progression and random chance
   */
  spawnEnemy() {
    if (this.enemiesLeftToSpawn <= 0) return;
    
    // Chance to spawn the shooter enemy
    const shooterChance = Math.min(0.15 + (this.currentWave * 0.02), 0.4);
    if (Math.random() < shooterChance) {
      this.spawnShooterEnemy();
      this.enemiesLeftToSpawn--;
      return;
    }
    
    // Spawn a melee enemy
    this.spawnMeleeEnemy();
    this.enemiesLeftToSpawn--;
  }
  
  /**
   * Spawns a melee enemy (SMALL, MEDIUM, or LARGE tier)
   */
  spawnMeleeEnemy() {
    // Determine enemy tier based on wave and random chance
    let tierChance = Math.random();
    let tierType;
    
    // As waves progress, chance for larger enemies increases
    const largeChance = Math.min(0.2 + (this.currentWave * 0.03), 0.5);
    const mediumChance = Math.min(0.3 + (this.currentWave * 0.04), 0.7);
    
    if (tierChance < largeChance) {
      tierType = 'LARGE';
    } else if (tierChance < mediumChance) {
      tierType = 'MEDIUM';
    } else {
      tierType = 'SMALL';
    }
    
    // Spawn at random position along the top of the world
    const worldWidth = this.scene.cameras.main.getBounds().right;
    const x = 100 + Math.random() * (worldWidth - 200);
    const y = -30; // Start just above the visible area
    
    // Create the enemy instance
    const enemy = new MeleeEnemy(this.scene, this, x, y, tierType);
    
    // Add to enemies array
    this.enemies.push(enemy);
  }
  
  /**
   * Spawns a shooter enemy that enters from the left or right side
   */
  spawnShooterEnemy() {
    // Determine which side to spawn from
    const side = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
    const hDir = side === 'LEFT' ? 1 : -1; // horizontal movement direction

    // Calculate spawn position
    const worldBounds = this.scene.cameras.main.getBounds();
    const x = side === 'LEFT' ? worldBounds.x - 30 : worldBounds.right + 30;
    const y = 50 + Math.random() * 100; // near the top of the world

    // Create the enemy instance
    const enemy = new ShooterEnemy(this.scene, this, x, y, hDir);
    
    // Add to enemies array
    this.enemies.push(enemy);
  }
  
  /**
   * Updates all enemies, projectiles, and the wave system
   */
  update() {
    // Increment timer
    this.timer++;
    
    // Update wave system
    this.updateWaveSystem();
    
    // Update enemies
    this.updateEnemies();
    
    // Update projectiles
    this.updateProjectiles();
    
    // Periodically clean up invalid targetables
    if (this.timer % 60 === 0) {
      this.cleanupTargetables();
    }
  }
  
  /**
   * Updates the wave system (spawning, breaks between waves)
   */
  updateWaveSystem() {
    // --- EARLY OUT if waves are not enabled yet ---
    if (!this.waveSystemEnabled) {
      return;
    }

    // If wave is active and we have enemies to spawn
    if (this.isWaveActive && this.enemiesLeftToSpawn > 0) {
      this.spawnTimer++;
      
      // Spawn enemy when timer reaches interval
      if (this.spawnTimer >= this.WAVE_SETTINGS.SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }
    
    // Check if wave is complete
    if (this.isWaveActive && this.enemiesLeftToSpawn <= 0 && this.enemies.length === 0) {
      console.log(`Wave ${this.currentWave} complete!`);
      this.isWaveActive = false;
      this.waveBreakTimer = this.WAVE_SETTINGS.BREAK_DURATION;
    }
    
    // Start next wave after break
    if (!this.isWaveActive && this.waveBreakTimer > 0) {
      this.waveBreakTimer--;
      
      if (this.waveBreakTimer <= 0) {
        this.startWave();
      }
    }
  }
  
  /**
   * Updates all active enemies
   */
  updateEnemies() {
    // Update each enemy and remove destroyed ones
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Skip inactive enemies
      if (!enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }
      
      // Update the enemy
      enemy.update();
      
      // Check if enemy is off-screen and should be removed
      if (this.isEnemyOffScreen(enemy)) {
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }
  
  /**
   * Updates all projectiles
   */
  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const sprite = projectile.sprite;
      
      // Remove projectiles that have gone off world bounds
      if (this.isProjectileOffScreen(sprite)) {
        sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check for collision with targets (drills, turrets, carrier)
      this.checkProjectileCollisions(projectile, i);
    }
  }
  
  /**
   * Checks if an enemy is off-screen and should be removed
   * 
   * @param {BaseEnemy} enemy - The enemy to check
   * @returns {boolean} - True if the enemy is off-screen
   */
  isEnemyOffScreen(enemy) {
    const bounds = this.scene.cameras.main.getBounds();
    const buffer = 100; // Extra buffer to allow enemies to move off-screen a bit
    
    return (
      enemy.x < bounds.x - buffer ||
      enemy.x > bounds.right + buffer ||
      enemy.y > bounds.bottom + buffer
    );
  }
  
  /**
   * Checks if a projectile is off-screen and should be removed
   * 
   * @param {Phaser.GameObjects.GameObject} sprite - The projectile sprite
   * @returns {boolean} - True if the projectile is off-screen
   */
  isProjectileOffScreen(sprite) {
    const bounds = this.scene.cameras.main.getBounds();
    
    return (
      sprite.x < bounds.x ||
      sprite.x > bounds.right ||
      sprite.y < bounds.y ||
      sprite.y > bounds.bottom
    );
  }
  
  /**
   * Checks for collisions between a projectile and potential targets
   * 
   * @param {object} projectile - The projectile object
   * @param {number} projectileIndex - Index of the projectile in the array
   */
  checkProjectileCollisions(projectile, projectileIndex) {
    const sprite = projectile.sprite;
    
    let drills = [];
    if (this.drillManager) {
      if (typeof this.drillManager.getTargetableDrills === 'function') {
        drills = this.drillManager.getTargetableDrills();
      } else if (typeof this.drillManager.getDrills === 'function') {
        drills = this.drillManager.getDrills();
      }
    }
    
    // Check collision with drills
    for (const drill of drills) {
      const distance = this.getDistance(sprite, drill);
      
      // Simple collision detection
      if (distance < 20) {
        // Apply direct hit damage
        if (this.drillManager && typeof this.drillManager.damageDrill === 'function') {
          this.drillManager.damageDrill(drill, projectile.damage);
        }
        
        // Create explosion effect and apply AOE damage
        this.createExplosionEffect(sprite.x, sprite.y, projectile.aoeRange);
        this.damageTerrainAtProjectile(sprite.x, sprite.y, projectile);
        
        // Remove projectile
        sprite.destroy();
        this.projectiles.splice(projectileIndex, 1);
        return;
      }
    }
    
    // Get all turrets
    const turrets = this.turretManager ? this.turretManager.getTurrets() : [];
    
    // Check collision with turrets
    for (const turret of turrets) {
      const distance = this.getDistance(sprite, turret);
      
      // Simple collision detection
      if (distance < 20) {
        // Apply direct hit damage
        turret.takeDamage(projectile.damage);
        
        // Create explosion effect and apply AOE damage
        this.createExplosionEffect(sprite.x, sprite.y, projectile.aoeRange);
        this.damageTerrainAtProjectile(sprite.x, sprite.y, projectile);
        
        // Remove projectile
        sprite.destroy();
        this.projectiles.splice(projectileIndex, 1);
        return;
      }
    }
    
    // Check collision with carrier
    if (this.carrier && this.carrier.isLanded) {
      const distance = this.getDistance(sprite, this.carrier);
      
      // Simple collision detection
      if (distance < 30) {
        // Apply direct hit damage
        this.carrier.takeDamage(projectile.damage);
        
        // Create explosion effect and apply AOE damage
        this.createExplosionEffect(sprite.x, sprite.y, projectile.aoeRange);
        this.damageTerrainAtProjectile(sprite.x, sprite.y, projectile);
        
        // Remove projectile
        sprite.destroy();
        this.projectiles.splice(projectileIndex, 1);
        return;
      }
    }
    
    // Check collision with terrain
    if (this.terrainManager.checkCollision(sprite.x, sprite.y)) {
      // Create explosion effect and damage terrain
      this.createExplosionEffect(sprite.x, sprite.y, projectile.aoeRange);
      this.damageTerrainAtProjectile(sprite.x, sprite.y, projectile);
      
      // Remove projectile
      sprite.destroy();
      this.projectiles.splice(projectileIndex, 1);
    }
  }
  
  /**
   * Creates a visual explosion effect at the specified coordinates
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Radius of the explosion
   */
  createExplosionEffect(x, y, radius) {
    // Create expanding circle for explosion
    const explosion = this.scene.add.circle(x, y, 10, 0xff6600, 0.8);
    
    // Create pulsating effect with scale and alpha
    this.scene.tweens.add({
      targets: explosion,
      scale: radius / 10, // Scale to match AOE radius
      alpha: 0,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Create particle effect for more visual impact
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.8;
      
      const particle = this.scene.add.circle(
        x, 
        y, 
        3, 
        0xff9900
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 250 + Math.random() * 200,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }
  
  /**
   * Damages terrain at the projectile's impact location
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {object} projectile - The projectile object
   */
  damageTerrainAtProjectile(x, y, projectile) {
    if (!this.terrainManager) return;
    
    // Apply terrain damage
    const terrainDamage = projectile.terrainDamage || 5;
    this.terrainManager.damageCircle(x, y, projectile.aoeRange || 10, terrainDamage);
  }
  
  /**
   * Calculates distance between two objects with x,y properties
   * 
   * @param {object} objA - First object with x,y properties
   * @param {object} objB - Second object with x,y properties
   * @returns {number} - Distance between the objects
   */
  getDistance(objA, objB) {
    return Phaser.Math.Distance.Between(
      objA.x, objA.y,
      objB.x, objB.y
    );
  }
  
  /**
   * Finds the closest target from an array of potential targets
   * 
   * @param {number} x - Origin X coordinate
   * @param {number} y - Origin Y coordinate
   * @param {Array} targets - Array of potential targets with x,y properties
   * @returns {object|null} - The closest target or null if none found
   */
  findClosestTarget(x, y, targets) {
    if (!targets || targets.length === 0) return null;
    
    let closestTarget = null;
    let closestDistance = Infinity;
    
    for (const target of targets) {
      const distance = Phaser.Math.Distance.Between(
        x, y,
        target.x, target.y
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = target;
      }
    }
    
    return closestTarget;
  }
  
  /**
   * Damages all enemies within a radius
   * 
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} radius - Radius of effect
   * @param {number} damage - Amount of damage to apply
   */
  damageEnemiesInRange(x, y, radius, damage) {
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      
      if (distance <= radius) {
        // Apply damage with falloff based on distance from center
        const damageMultiplier = 1 - (distance / radius * 0.5); // 50% damage at the edge of radius
        const actualDamage = Math.round(damage * damageMultiplier);
        
        if (actualDamage > 0) {
          enemy.takeDamage(actualDamage);
          this.showDamageIndicator(enemy.x, enemy.y, actualDamage);
        }
      }
    }
  }
  
  /**
   * Shows a damage number indicator at the specified coordinates
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} amount - Amount of damage to display
   */
  showDamageIndicator(x, y, amount) {
    // Create text object for damage
    const damageText = this.scene.add.text(
      x, 
      y, 
      amount.toString(), 
      { 
        fontFamily: 'Arial', 
        fontSize: '16px', 
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    damageText.setOrigin(0.5);
    
    // Animate the damage text
    this.scene.tweens.add({
      targets: damageText,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        damageText.destroy();
      }
    });
  }
  
  /**
   * Damages a specific enemy by index
   * 
   * @param {number} index - Index of the enemy in the enemies array
   * @param {number} amount - Amount of damage to apply
   */
  damageEnemy(index, amount) {
    if (index < 0 || index >= this.enemies.length) return;
    
    const enemy = this.enemies[index];
    
    // Apply damage and show indicator
    enemy.takeDamage(amount);
    this.showDamageIndicator(enemy.x, enemy.y, amount);
  }
  
  /**
   * Returns the array of active enemies
   * 
   * @returns {Array} - Array of enemy objects
   */
  getEnemies() {
    return this.enemies;
  }
  
  /**
   * Returns the current wave number
   * 
   * @returns {number} - Current wave number
   */
  getCurrentWave() {
    return this.currentWave;
  }
  
  /**
   * Returns the current wave status
   * 
   * @returns {object} - Wave status object
   */
  getWaveStatus() {
    return {
      wave: this.currentWave,
      active: this.isWaveActive,
      enemiesLeft: this.enemiesLeftToSpawn,
      breakTimer: this.waveBreakTimer
    };
  }
  
  /**
   * Returns counts of each enemy type
   * 
   * @returns {object} - Object with counts for each enemy type
   */
  getEnemyTypeCounts() {
    const counts = {
      SMALL: 0,
      MEDIUM: 0,
      LARGE: 0,
      SHOOTER: 0
    };
    
    // Count enemies by tier
    for (const enemy of this.enemies) {
      if (counts.hasOwnProperty(enemy.tier)) {
        counts[enemy.tier]++;
      }
    }
    
    return counts;
  }
  
  /**
   * === Unified Targetable System helpers ===
   */
  registerTarget(obj) {
    if (!obj || this.targetables.includes(obj)) return;
    this.targetables.push(obj);
  }

  unregisterTarget(obj) {
    const idx = this.targetables.indexOf(obj);
    if (idx !== -1) {
      this.targetables.splice(idx, 1);
    }
  }

  getTargetables() {
    // Enhanced filtering to catch more edge cases of invalid targets
    return this.targetables.filter(t => {
      // Basic existence check
      if (!t) return false;
      
      // Check various "destroyed" flags
      if (t.active === false) return false;
      if (t.isAlive === false) return false;
      if (typeof t.isDestroyed === 'function' && t.isDestroyed()) return false;
      
      // Verify the target has valid coordinates
      if (typeof t.x !== 'number' || typeof t.y !== 'number') return false;
      if (isNaN(t.x) || isNaN(t.y)) return false;
      
      // Check if sprite exists and is active (for objects with sprites)
      if (t.sprite && !t.sprite.active) return false;
      
      return true;
    });
  }
  
  /**
   * Periodically removes invalid entries from the targetables array
   * This helps prevent "phantom target" issues where enemies attack
   * locations where objects used to be
   */
  cleanupTargetables() {
    const validTargets = this.getTargetables();
    
    // If the filtered list is shorter than the original, we have invalid entries
    if (validTargets.length < this.targetables.length) {
      // Replace the array with only valid targets
      const removedCount = this.targetables.length - validTargets.length;
      this.targetables = validTargets;
      console.log(`Cleaned up targetables: removed ${removedCount} invalid targets`);
    }
  }

  /**
   * Enables the wave system. Call this once the world has fully loaded so that
   * waves (and their counters) do not start prematurely.
   */
  enableWaveSystem() {
    this.waveSystemEnabled = true;
  }

  /**
   * Disables the wave system. Provided for future flexibility (e.g., pausing gameplay).
   */
  disableWaveSystem() {
    this.waveSystemEnabled = false;
  }
} 