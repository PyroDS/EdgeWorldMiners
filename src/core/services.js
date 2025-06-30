/**
 * ServiceLocator - Central registry for game services
 * Provides a single access point for core game services and components.
 */
export class ServiceLocator {
  constructor() {
    this.services = {};
    this.initialized = false;
  }
  
  /**
   * Register a service with the locator
   * @param {string} name - Service identifier
   * @param {Object} service - Service instance
   * @returns {Object} The registered service
   */
  register(name, service) {
    if (this.services[name]) {
      console.warn(`Service '${name}' is being overwritten.`);
    }
    
    this.services[name] = service;
    return service;
  }
  
  /**
   * Retrieve a service by name
   * @param {string} name - Service identifier
   * @returns {Object} The requested service
   * @throws {Error} If service not found
   */
  get(name) {
    if (!this.services[name]) {
      throw new Error(`Service '${name}' not registered.`);
    }
    return this.services[name];
  }
  
  /**
   * Check if a service is registered
   * @param {string} name - Service identifier
   * @returns {boolean} Whether service exists
   */
  has(name) {
    return !!this.services[name];
  }
  
  /**
   * Remove a service from the registry
   * @param {string} name - Service identifier
   * @returns {boolean} Whether service was removed
   */
  unregister(name) {
    if (!this.services[name]) {
      return false;
    }
    
    delete this.services[name];
    return true;
  }
  
  /**
   * Initializes core services
   * @param {Object} config - Configuration object
   */
  initCoreServices(config = {}) {
    if (this.initialized) {
      console.warn('Core services already initialized.');
      return;
    }
    
    // Import required services
    const { GameState } = require('./gameState.js');
    const { EventBus } = require('./eventBus.js');
    
    // Create instances
    const gameState = new GameState();
    const eventBus = new EventBus();
    
    // Configure debug mode
    if (config.debug) {
      gameState.setDebug(true);
      eventBus.setDebug(true);
    }
    
    // Register services
    this.register('gameState', gameState);
    this.register('eventBus', eventBus);
    
    this.initialized = true;
    
    // Emit initialization event
    if (eventBus) {
      eventBus.emit('services:initialized', {
        registeredServices: Object.keys(this.services)
      });
    }
  }
  
  /**
   * Get list of registered service names
   * @returns {string[]} List of service names
   */
  getRegisteredServices() {
    return Object.keys(this.services);
  }
}

// Create a singleton instance
const services = new ServiceLocator();
export default services; 