/**
 * enemyManager.js
 * 
 * Manages enemy spawning, behavior, waves, and interactions with other game systems.
 * 
 * Dependencies:
 * - core/manager.js (for base Manager class)
 * - core/services.js (for service locator)
 * - core/entityRegistry.js (for entity management)
 * - entities/BaseEnemy.js (for enemy base class)
 * - entities/MeleeEnemy.js (for melee enemy type)
 * - entities/ShooterEnemy.js (for shooter enemy type)
 */
import { Manager } from '../core/manager.js';
import services from '../core/services.js';
import entityRegistry from '../core/entityRegistry.js';
import { BaseEnemy } from '../entities/BaseEnemy.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { ShooterEnemy } from '../entities/ShooterEnemy.js';

export class EnemyManager extends Manager {
  /**
   * Create a new enemy manager
   * @param {Object} options - Manager options
   */
  constructor(options = {}) {
    // Call parent constructor with 'enemyManager' name
    super('enemyManager', options);
    
    // Enemy tracking
    this.enemies = new Map();
    this.activeWaves = new Map();
    
    // Wave configuration
    this.waveConfig = {
      initialDelay: 60000, // ms before first wave
      waveCooldown: 30000, // ms between waves
      waveScaling: 1.2,    // difficulty multiplier per wave
      maxWaves: 10,        // maximum number of waves
      ...options.waveConfig
    };
    
    // Wave state
    this.currentWaveNumber = 0;
    this.waveActive = false;
    this.nextWaveTime = 0;
    
    // Enemy types and probabilities
    this.enemyTypes = [
      { type: 'melee', weight: 70, class: MeleeEnemy },
      { type: 'shooter', weight: 30, class: ShooterEnemy }
    ];
    
    // Services
    this.gameState = null;
    this.eventBus = null;
    this.scene = null;
  }
  
  /**
   * Initialize the manager
   * @param {Object} data - Initialization data
   * @returns {boolean} Success status
   */
  init(data = {}) {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Get services
      this.gameState = services.get('gameState');
      this.eventBus = services.get('eventBus');
      this.scene = data.scene;
      
      // Initialize entity registry if not already
      if (!entityRegistry.initialized) {
        entityRegistry.init();
      }
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Set initial wave timer
      this.nextWaveTime = Date.now() + this.waveConfig.initialDelay;
      
      // Set initialized flag
      this.initialized = true;
      console.log('[EnemyManager] Initialized');
      
      // Update game state
      this.gameState.set('enemies.waveNumber', 0);
      this.gameState.set('enemies.nextWaveTime', this.nextWaveTime);
      this.gameState.set('enemies.waveActive', false);
      this.gameState.set('enemies.count', 0);
      
      return true;
    } catch (error) {
      console.error('[EnemyManager] Initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for wave-related events
    this.eventBus.on('wave:start_requested', this.startWave.bind(this));
    this.eventBus.on('wave:enemy_killed', this._handleEnemyKilled.bind(this));
    
    // Listen for enemy events
    this.eventBus.on('enemy:killed', this._handleEnemyKilled.bind(this));
    
    // Listen for game state changes
    this.eventBus.on('game:paused', () => {
      this.active = false;
    });
    
    this.eventBus.on('game:resumed', () => {
      this.active = true;
    });
  }
  
  /**
   * Start a new enemy wave
   * @param {Object} options - Wave options
   */
  startWave(options = {}) {
    if (!this.initialized || !this.active || this.waveActive) {
      return;
    }
    
    // Increment wave number
    this.currentWaveNumber++;
    
    // Check if we've reached max waves
    if (this.currentWaveNumber > this.waveConfig.maxWaves) {
      this.eventBus.emit('wave:all_completed', {
        totalWaves: this.waveConfig.maxWaves
      });
      return;
    }
    
    // Create wave configuration
    const waveId = `wave_${this.currentWaveNumber}`;
    const waveSize = this._calculateWaveSize(this.currentWaveNumber);
    const waveDifficulty = this._calculateWaveDifficulty(this.currentWaveNumber);
    
    // Create wave object
    const wave = {
      id: waveId,
      number: this.currentWaveNumber,
      size: waveSize,
      difficulty: waveDifficulty,
      enemiesSpawned: 0,
      enemiesRemaining: waveSize,
      startTime: Date.now(),
      completed: false
    };
    
    // Add to active waves
    this.activeWaves.set(waveId, wave);
    
    // Set wave active flag
    this.waveActive = true;
    
    // Update game state
    this.gameState.set('enemies.waveNumber', this.currentWaveNumber);
    this.gameState.set('enemies.waveActive', true);
    this.gameState.set('enemies.waveSize', waveSize);
    this.gameState.set('enemies.waveProgress', 0);
    
    // Emit wave start event
    this.eventBus.emit('wave:started', {
      waveId,
      waveNumber: this.currentWaveNumber,
      waveSize,
      difficulty: waveDifficulty
    });
    
    // Start spawning enemies
    this._spawnWaveEnemies(wave);
  }
  
  /**
   * Spawn enemies for a wave
   * @param {Object} wave - Wave object
   * @private
   */
  _spawnWaveEnemies(wave) {
    if (!wave || wave.enemiesSpawned >= wave.size) {
      return;
    }
    
    // Get spawn points
    const spawnPoints = this._getSpawnPoints(wave.size - wave.enemiesSpawned);
    
    // Spawn enemies at each point
    for (const spawnPoint of spawnPoints) {
      // Select enemy type
      const enemyType = this._selectEnemyType(wave.difficulty);
      
      // Create enemy
      const enemy = this._createEnemy(
        enemyType,
        spawnPoint.x,
        spawnPoint.y,
        {
          health: Math.ceil(enemyType.baseHealth * wave.difficulty),
          damage: Math.ceil(enemyType.baseDamage * wave.difficulty),
          waveId: wave.id
        }
      );
      
      if (enemy) {
        // Increment counters
        wave.enemiesSpawned++;
        
        // Update game state
        const enemyCount = this.gameState.get('enemies.count') || 0;
        this.gameState.set('enemies.count', enemyCount + 1);
      }
      
      // Check if we've spawned all enemies
      if (wave.enemiesSpawned >= wave.size) {
        break;
      }
    }
    
    // If we still have enemies to spawn, schedule next batch
    if (wave.enemiesSpawned < wave.size) {
      const spawnDelay = 2000; // 2 seconds between spawn batches
      setTimeout(() => {
        if (this.active && !wave.completed) {
          this._spawnWaveEnemies(wave);
        }
      }, spawnDelay);
    }
  }
  
  /**
   * Handle enemy killed event
   * @param {Object} data - Event data
   * @private
   */
  _handleEnemyKilled(data) {
    // If this is a wave enemy, update wave
    if (data.waveId && this.activeWaves.has(data.waveId)) {
      const wave = this.activeWaves.get(data.waveId);
      
      // Decrement enemies remaining
      wave.enemiesRemaining--;
      
      // Update wave progress in game state
      const progress = Math.floor(((wave.size - wave.enemiesRemaining) / wave.size) * 100);
      this.gameState.set('enemies.waveProgress', progress);
      
      // Check if wave is complete
      if (wave.enemiesRemaining <= 0 && !wave.completed) {
        wave.completed = true;
        
        // Emit wave completed event
        this.eventBus.emit('wave:completed', {
          waveId: wave.id,
          waveNumber: wave.number,
          timeTaken: Date.now() - wave.startTime
        });
        
        // Remove from active waves
        this.activeWaves.delete(wave.id);
        
        // Check if all active waves are complete
        if (this.activeWaves.size === 0) {
          this.waveActive = false;
          this.gameState.set('enemies.waveActive', false);
          
          // Set next wave time
          this.nextWaveTime = Date.now() + this.waveConfig.waveCooldown;
          this.gameState.set('enemies.nextWaveTime', this.nextWaveTime);
          
          // Emit all waves completed event
          this.eventBus.emit('wave:all_active_completed', {
            nextWaveNumber: this.currentWaveNumber + 1,
            nextWaveTime: this.nextWaveTime
          });
        }
      }
    }
    
    // Remove enemy from tracking
    if (data.id && this.enemies.has(data.id)) {
      this.enemies.delete(data.id);
      
      // Update enemy count in game state
      const enemyCount = this.gameState.get('enemies.count') || 0;
      this.gameState.set('enemies.count', Math.max(0, enemyCount - 1));
    }
  }
  
  /**
   * Calculate the size of a wave based on wave number
   * @param {number} waveNumber - Wave number
   * @returns {number} Wave size
   * @private
   */
  _calculateWaveSize(waveNumber) {
    // Base size plus scaling
    const baseSize = 5;
    const scaling = 2;
    return baseSize + Math.floor(scaling * (waveNumber - 1));
  }
  
  /**
   * Calculate the difficulty of a wave based on wave number
   * @param {number} waveNumber - Wave number
   * @returns {number} Wave difficulty multiplier
   * @private
   */
  _calculateWaveDifficulty(waveNumber) {
    // Base difficulty with scaling
    return 1 + ((waveNumber - 1) * (this.waveConfig.waveScaling - 1));
  }
  
  /**
   * Get spawn points for enemies
   * @param {number} count - Number of spawn points needed
   * @returns {Array<Object>} Array of spawn points {x, y}
   * @private
   */
  _getSpawnPoints(count) {
    const spawnPoints = [];
    
    // Get world bounds from game state
    const worldBounds = this.gameState.get('world.bounds');
    if (!worldBounds) {
      console.error('[EnemyManager] No world bounds in game state');
      return spawnPoints;
    }
    
    // Get carrier position to avoid spawning too close
    const carrierPosition = this.gameState.get('carrier.position');
    const safeDistance = 300; // Minimum distance from carrier
    
    // Generate spawn points
    for (let i = 0; i < count; i++) {
      let validPoint = false;
      let point = null;
      let attempts = 0;
      
      // Try to find valid spawn point
      while (!validPoint && attempts < 10) {
        // Generate random point on edge of world
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        switch (edge) {
          case 0: // Top
            point = {
              x: worldBounds.x + Math.random() * worldBounds.width,
              y: worldBounds.y
            };
            break;
          case 1: // Right
            point = {
              x: worldBounds.x + worldBounds.width,
              y: worldBounds.y + Math.random() * worldBounds.height
            };
            break;
          case 2: // Bottom
            point = {
              x: worldBounds.x + Math.random() * worldBounds.width,
              y: worldBounds.y + worldBounds.height
            };
            break;
          case 3: // Left
            point = {
              x: worldBounds.x,
              y: worldBounds.y + Math.random() * worldBounds.height
            };
            break;
        }
        
        // Check if point is valid (far enough from carrier)
        if (carrierPosition) {
          const dx = point.x - carrierPosition.x;
          const dy = point.y - carrierPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance >= safeDistance) {
            validPoint = true;
          }
        } else {
          validPoint = true;
        }
        
        attempts++;
      }
      
      if (validPoint && point) {
        spawnPoints.push(point);
      }
    }
    
    return spawnPoints;
  }
  
  /**
   * Select an enemy type based on difficulty
   * @param {number} difficulty - Wave difficulty
   * @returns {Object} Enemy type configuration
   * @private
   */
  _selectEnemyType(difficulty) {
    // Calculate total weight
    const totalWeight = this.enemyTypes.reduce((sum, type) => sum + type.weight, 0);
    
    // Select random value based on weights
    let random = Math.random() * totalWeight;
    
    // Find selected type
    for (const enemyType of this.enemyTypes) {
      random -= enemyType.weight;
      if (random <= 0) {
        // Base stats for enemy types
        const baseStats = {
          melee: {
            baseHealth: 100,
            baseDamage: 20
          },
          shooter: {
            baseHealth: 60,
            baseDamage: 15
          }
        };
        
        return {
          ...enemyType,
          ...baseStats[enemyType.type]
        };
      }
    }
    
    // Fallback to first type
    return {
      ...this.enemyTypes[0],
      baseHealth: 100,
      baseDamage: 20
    };
  }
  
  /**
   * Create an enemy entity
   * @param {Object} enemyType - Enemy type configuration
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} config - Additional configuration
   * @returns {BaseEnemy} Created enemy
   * @private
   */
  _createEnemy(enemyType, x, y, config = {}) {
    if (!this.scene) {
      console.error('[EnemyManager] Cannot create enemy: No scene available');
      return null;
    }
    
    try {
      // Create enemy based on type
      const EnemyClass = enemyType.class || BaseEnemy;
      const enemy = new EnemyClass(this.scene, x, y, config);
      
      // Add to tracking
      this.enemies.set(enemy.id, enemy);
      
      // Emit enemy spawned event
      this.eventBus.emit('enemy:spawned', {
        id: enemy.id,
        type: enemyType.type,
        position: { x, y },
        waveId: config.waveId
      });
      
      return enemy;
    } catch (error) {
      console.error('[EnemyManager] Error creating enemy:', error);
      return null;
    }
  }
  
  /**
   * Update all enemies
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    if (!this.active) {
      return;
    }
    
    // Check if we should start a new wave
    if (!this.waveActive && this.currentWaveNumber < this.waveConfig.maxWaves) {
      const currentTime = Date.now();
      
      if (currentTime >= this.nextWaveTime) {
        this.startWave();
      } else {
        // Update countdown in game state
        const countdown = Math.ceil((this.nextWaveTime - currentTime) / 1000);
        this.gameState.set('enemies.waveCountdown', countdown);
      }
    }
    
    // Note: Individual enemy updates are handled by the entity system
  }
  
  /**
   * Spawn a specific enemy type at a location
   * @param {string} type - Enemy type ('melee' or 'shooter')
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} config - Additional configuration
   * @returns {BaseEnemy} Created enemy
   */
  spawnEnemy(type, x, y, config = {}) {
    // Find enemy type configuration
    const enemyType = this.enemyTypes.find(t => t.type === type);
    
    if (!enemyType) {
      console.error(`[EnemyManager] Unknown enemy type: ${type}`);
      return null;
    }
    
    // Create enemy
    return this._createEnemy(enemyType, x, y, config);
  }
  
  /**
   * Get all active enemies
   * @returns {Array<BaseEnemy>} Array of enemies
   */
  getEnemies() {
    return Array.from(this.enemies.values());
  }
  
  /**
   * Get current wave information
   * @returns {Object} Wave information
   */
  getWaveInfo() {
    return {
      currentWave: this.currentWaveNumber,
      waveActive: this.waveActive,
      nextWaveTime: this.nextWaveTime,
      enemyCount: this.enemies.size,
      activeWaves: Array.from(this.activeWaves.values())
    };
  }
  
  /**
   * Clear all enemies
   */
  clearEnemies() {
    // Destroy all enemies
    for (const enemy of this.enemies.values()) {
      if (enemy.destroy) {
        enemy.destroy();
      }
    }
    
    // Clear tracking
    this.enemies.clear();
    
    // Update game state
    this.gameState.set('enemies.count', 0);
  }
  
  /**
   * Reset wave system
   */
  resetWaves() {
    // Clear enemies
    this.clearEnemies();
    
    // Reset wave state
    this.currentWaveNumber = 0;
    this.waveActive = false;
    this.nextWaveTime = Date.now() + this.waveConfig.initialDelay;
    this.activeWaves.clear();
    
    // Update game state
    this.gameState.set('enemies.waveNumber', 0);
    this.gameState.set('enemies.waveActive', false);
    this.gameState.set('enemies.nextWaveTime', this.nextWaveTime);
    
    // Emit reset event
    this.eventBus.emit('wave:reset', {
      nextWaveTime: this.nextWaveTime
    });
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear all enemies
    this.clearEnemies();
    
    // Remove event listeners
    if (this.eventBus) {
      this.eventBus.off('wave:start_requested', this.startWave);
      this.eventBus.off('wave:enemy_killed', this._handleEnemyKilled);
      this.eventBus.off('enemy:killed', this._handleEnemyKilled);
    }
    
    // Call parent destroy
    super.destroy();
  }
}