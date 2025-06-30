/**
 * Manager - Base class for all game system managers
 * Provides common functionality and standardized access to core services.
 */
import services from './services.js';

export class Manager {
  /**
   * Create a new manager
   * @param {string} name - Identifier for this manager
   */
  constructor(name) {
    this.name = name;
    this.isInitialized = false;
    this.isActive = false;
    this.eventHandlers = [];
    this.stateSubscriptions = [];
    
    // Reference core services
    this.eventBus = null;
    this.gameState = null;
    
    // Logging prefix for this manager
    this.logPrefix = `[${name}]`;
  }
  
  /**
   * Initialize the manager
   * @returns {boolean} Success status
   */
  init() {
    if (this.isInitialized) {
      this.log('Already initialized.');
      return false;
    }
    
    try {
      // Get core services
      this.eventBus = services.get('eventBus');
      this.gameState = services.get('gameState');
      
      // Set up event handlers
      this.setupEventListeners();
      
      // Additional initialization
      this.onInit();
      
      this.isInitialized = true;
      this.isActive = true;
      
      // Notify other systems that this manager is ready
      this.eventBus.emit(`manager:initialized`, { 
        name: this.name,
        manager: this
      });
      
      this.log('Initialized.');
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Failed to initialize:`, error);
      return false;
    }
  }
  
  /**
   * Update manager state (called each frame)
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    if (!this.isInitialized || !this.isActive) {
      return;
    }
    
    this.onUpdate(delta);
  }
  
  /**
   * Clean up resources when manager is no longer needed
   */
  cleanup() {
    if (!this.isInitialized) {
      return;
    }
    
    // Remove all event listeners
    this.eventHandlers.forEach(handler => {
      this.eventBus.off(handler.event, handler.callback);
    });
    this.eventHandlers = [];
    
    // Remove all state subscriptions
    this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
    this.stateSubscriptions = [];
    
    // Custom cleanup
    this.onCleanup();
    
    this.isActive = false;
    
    this.log('Cleaned up.');
  }
  
  /**
   * Listen for an event
   * @param {string} event - Event to listen for
   * @param {Function} callback - Callback function
   */
  listenTo(event, callback) {
    if (!this.eventBus) {
      console.error(`${this.logPrefix} EventBus not available.`);
      return;
    }
    
    // Wrap the callback to provide context
    const wrappedCallback = (...args) => {
      try {
        return callback.apply(this, args);
      } catch (error) {
        console.error(`${this.logPrefix} Error handling event ${event}:`, error);
      }
    };
    
    // Store reference to the handler for cleanup
    const unsubscribe = this.eventBus.on(event, wrappedCallback);
    this.eventHandlers.push({
      event,
      callback: wrappedCallback,
      unsubscribe
    });
    
    return unsubscribe;
  }
  
  /**
   * Subscribe to a state change
   * @param {string} path - State path to subscribe to
   * @param {Function} callback - Callback function
   */
  watchState(path, callback) {
    if (!this.gameState) {
      console.error(`${this.logPrefix} GameState not available.`);
      return;
    }
    
    // Wrap the callback to provide context
    const wrappedCallback = (...args) => {
      try {
        return callback.apply(this, args);
      } catch (error) {
        console.error(`${this.logPrefix} Error handling state change ${path}:`, error);
      }
    };
    
    // Store reference to the subscription for cleanup
    const unsubscribe = this.gameState.subscribe(path, wrappedCallback);
    this.stateSubscriptions.push(unsubscribe);
    
    return unsubscribe;
  }
  
  /**
   * Emit an event through the event bus
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (!this.eventBus) {
      console.error(`${this.logPrefix} EventBus not available.`);
      return;
    }
    
    this.eventBus.emit(event, data);
  }
  
  /**
   * Update game state at path
   * @param {string} path - State path to update
   * @param {any} value - New value
   */
  setState(path, value) {
    if (!this.gameState) {
      console.error(`${this.logPrefix} GameState not available.`);
      return;
    }
    
    this.gameState.update(path, value);
  }
  
  /**
   * Get value from game state
   * @param {string} path - State path to get
   * @returns {any} State value
   */
  getState(path) {
    if (!this.gameState) {
      console.error(`${this.logPrefix} GameState not available.`);
      return null;
    }
    
    return this.gameState.get(path);
  }
  
  /**
   * Log message with manager prefix
   * @param {...any} args - Log arguments
   */
  log(...args) {
    console.log(this.logPrefix, ...args);
  }
  
  /**
   * Override to set up event listeners
   */
  setupEventListeners() {
    // Override in subclass
  }
  
  /**
   * Override for additional initialization
   */
  onInit() {
    // Override in subclass
  }
  
  /**
   * Override for per-frame updates
   * @param {number} delta - Time since last update in ms
   */
  onUpdate(delta) {
    // Override in subclass
  }
  
  /**
   * Override for additional cleanup
   */
  onCleanup() {
    // Override in subclass
  }
  
  /**
   * Pause the manager (stop updates)
   */
  pause() {
    if (this.isActive && this.isInitialized) {
      this.isActive = false;
      this.onPause();
      this.log('Paused.');
    }
  }
  
  /**
   * Resume the manager (continue updates)
   */
  resume() {
    if (!this.isActive && this.isInitialized) {
      this.isActive = true;
      this.onResume();
      this.log('Resumed.');
    }
  }
  
  /**
   * Override for pause behavior
   */
  onPause() {
    // Override in subclass
  }
  
  /**
   * Override for resume behavior
   */
  onResume() {
    // Override in subclass
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.onReset();
  }
  
  /**
   * Override for reset behavior
   */
  onReset() {
    // Override in subclass
  }
} 