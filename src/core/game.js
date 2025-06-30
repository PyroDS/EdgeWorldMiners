/**
 * Game - Main game initialization and coordination
 * Sets up core services and manages the game loop.
 */
import services from './services.js';
import { GameState } from './gameState.js';
import { EventBus } from './eventBus.js';
import gameStateIntegration from './gameStateIntegration.js';
import { ResourceManager } from '../managers/resourceManager.js';

export class Game {
  /**
   * Create a new game instance
   * @param {Object} config - Game configuration
   */
  constructor(config = {}) {
    this.config = {
      debug: false,
      ...config
    };
    
    this.initialized = false;
    this.lastUpdateTime = 0;
    this.managers = new Map();
    this.updateCallbacks = [];
    this.fps = 0;
    this.frameCount = 0;
    this.frameTime = 0;
    
    // State for tracking frame rate
    this._lastFpsUpdate = 0;
  }
  
  /**
   * Initialize the game
   * @returns {Promise<boolean>} Initialization success
   */
  async init() {
    if (this.initialized) {
      console.warn('Game is already initialized');
      return true;
    }
    
    try {
      // Initialize core services
      console.log('Initializing core services...');
      this._initServices();
      
      // Set up state integration
      console.log('Setting up state integration...');
      gameStateIntegration.init();
      
      // Initialize managers
      console.log('Initializing managers...');
      await this._initManagers();
      
      // Set up the game loop
      this._setupGameLoop();
      
      this.initialized = true;
      services.get('eventBus').emit('game:initialized', {});
      
      console.log('Game initialization complete!');
      return true;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      return false;
    }
  }
  
  /**
   * Initialize core services
   * @private
   */
  _initServices() {
    // Create and register core services
    const eventBus = new EventBus();
    const gameState = new GameState();
    
    if (this.config.debug) {
      eventBus.setDebug(true);
      gameState.setDebug(true);
    }
    
    services.register('eventBus', eventBus);
    services.register('gameState', gameState);
    
    // Register the game instance
    services.register('game', this);
    
    return { eventBus, gameState };
  }
  
  /**
   * Initialize all game managers
   * @private
   * @returns {Promise<void>}
   */
  async _initManagers() {
    // Start with the resource manager
    const resourceManager = new ResourceManager();
    this.registerManager('resource', resourceManager);
    
    // Initialize all managers
    const initPromises = [];
    
    for (const manager of this.managers.values()) {
      try {
        const result = manager.init();
        if (result instanceof Promise) {
          initPromises.push(result);
        }
      } catch (error) {
        console.error(`Failed to initialize manager ${manager.name}:`, error);
      }
    }
    
    // Wait for any async initialization to complete
    if (initPromises.length > 0) {
      await Promise.all(initPromises);
    }
  }
  
  /**
   * Set up the game loop using requestAnimationFrame
   * @private
   */
  _setupGameLoop() {
    this.lastUpdateTime = performance.now();
    this._lastFpsUpdate = this.lastUpdateTime;
    
    const gameLoop = (timestamp) => {
      // Calculate delta time
      const delta = timestamp - this.lastUpdateTime;
      this.lastUpdateTime = timestamp;
      
      // Track frame rate
      this.frameCount++;
      this.frameTime += delta;
      
      if (timestamp - this._lastFpsUpdate > 1000) {
        this.fps = Math.round(this.frameCount * 1000 / (timestamp - this._lastFpsUpdate));
        this._lastFpsUpdate = timestamp;
        this.frameCount = 0;
        
        // Update FPS in state
        services.get('gameState').update('system.fps', this.fps);
      }
      
      // Update all managers
      this._update(delta);
      
      // Continue the loop
      requestAnimationFrame(gameLoop);
    };
    
    // Start the loop
    requestAnimationFrame(gameLoop);
  }
  
  /**
   * Update game state
   * @param {number} delta - Time since last update in ms
   * @private
   */
  _update(delta) {
    // Update all managers
    for (const manager of this.managers.values()) {
      if (manager.isInitialized && manager.isActive) {
        manager.update(delta);
      }
    }
    
    // Call any custom update callbacks
    for (const callback of this.updateCallbacks) {
      try {
        callback(delta);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    }
  }
  
  /**
   * Register a manager with the game
   * @param {string} id - Manager identifier
   * @param {Manager} manager - Manager instance
   * @returns {Manager} The registered manager
   */
  registerManager(id, manager) {
    if (this.managers.has(id)) {
      console.warn(`Overwriting existing manager with id '${id}'`);
    }
    
    this.managers.set(id, manager);
    
    // Also register as a service for easy access
    services.register(`${id}Manager`, manager);
    
    return manager;
  }
  
  /**
   * Get a registered manager
   * @param {string} id - Manager identifier
   * @returns {Manager|null} Manager instance or null
   */
  getManager(id) {
    return this.managers.get(id) || null;
  }
  
  /**
   * Add a callback to the update loop
   * @param {Function} callback - Update callback function
   * @returns {Function} Function to remove the callback
   */
  addUpdateCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Update callback must be a function');
    }
    
    this.updateCallbacks.push(callback);
    
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index !== -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Remove all update callbacks
   */
  clearUpdateCallbacks() {
    this.updateCallbacks = [];
  }
  
  /**
   * Start a new game
   * @param {Object} options - Game options
   */
  startNewGame(options = {}) {
    if (!this.initialized) {
      throw new Error('Game must be initialized before starting');
    }
    
    // Reset game state
    services.get('gameState').reset();
    
    // Reset all managers
    for (const manager of this.managers.values()) {
      if (typeof manager.reset === 'function') {
        manager.reset();
      }
    }
    
    // Emit game start event
    services.get('eventBus').emit('game:started', options);
  }
  
  /**
   * Pause the game
   */
  pause() {
    // Pause all managers
    for (const manager of this.managers.values()) {
      if (typeof manager.pause === 'function') {
        manager.pause();
      }
    }
    
    // Update game state
    services.get('gameState').update('system.paused', true);
    
    // Emit pause event
    services.get('eventBus').emit('game:paused', {});
  }
  
  /**
   * Resume the game
   */
  resume() {
    // Resume all managers
    for (const manager of this.managers.values()) {
      if (typeof manager.resume === 'function') {
        manager.resume();
      }
    }
    
    // Update game state
    services.get('gameState').update('system.paused', false);
    
    // Emit resume event
    services.get('eventBus').emit('game:resumed', {});
  }
} 