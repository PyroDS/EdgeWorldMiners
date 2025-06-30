/**
 * GameState - Central state management system for EdgeWorldMiners
 * Provides a single source of truth for the game state with subscription-based updates.
 */
export class GameState {
  constructor() {
    this.state = {
      resources: { metal: 0, crystal: 0, gas: 0 },
      research: { points: 0, unlocked: [] },
      carrier: { health: 100, maxHealth: 100 },
      expedition: { currentPlanet: null, active: false },
      ui: { activeOverlay: null, activeScene: null },
      enemies: { wave: 0, spawned: 0, killed: 0, nextWaveTime: 0 },
      drills: { count: 0, active: 0 },
      turrets: { count: 0, active: 0 },
      terrain: { seed: null, explored: 0 }
    };
    this.listeners = {};
    this.debug = false;
  }
  
  /**
   * Retrieves a value from state using dot notation path
   * @param {string} path - Dot notation path (e.g. 'resources.metal')
   * @returns {any} Value at the specified path
   */
  get(path) {
    const keys = path.split('.');
    return keys.reduce((obj, key) => obj && obj[key] !== undefined ? obj[key] : null, this.state);
  }
  
  /**
   * Updates a value in state and notifies subscribers
   * @param {string} path - Dot notation path to update
   * @param {any} value - New value to set
   * @returns {boolean} Success status
   */
  update(path, value) {
    try {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((obj, key) => {
        if (!obj[key]) obj[key] = {};
        return obj[key];
      }, this.state);
      
      target[lastKey] = value;
      
      this.notify(path);
      return true;
    } catch (error) {
      console.error(`Failed to update state at path ${path}:`, error);
      return false;
    }
  }
  
  /**
   * Subscribe to state changes at a specific path
   * @param {string} path - Dot notation path to monitor
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    this.listeners[path].push(callback);
    
    // Return unsubscribe function
    return () => this.unsubscribe(path, callback);
  }
  
  /**
   * Unsubscribe from state changes
   * @param {string} path - Path that was being monitored
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(path, callback) {
    if (this.listeners[path]) {
      this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
      if (this.listeners[path].length === 0) {
        delete this.listeners[path];
      }
    }
  }
  
  /**
   * Notifies all relevant subscribers of a state change
   * @param {string} path - Path that changed
   */
  notify(path) {
    if (this.debug) {
      console.log(`State updated: ${path} =`, this.get(path));
    }
    
    // Notify exact path subscribers
    if (this.listeners[path]) {
      this.listeners[path].forEach(callback => {
        try {
          callback(this.get(path), path);
        } catch (error) {
          console.error(`Error in state subscriber for ${path}:`, error);
        }
      });
    }
    
    // Notify parent path subscribers (e.g. 'resources' for 'resources.metal')
    Object.keys(this.listeners).forEach(listenerPath => {
      // Check if the changed path starts with this listener path + '.'
      // or if the listener path starts with the changed path + '.'
      if (
        (path.startsWith(listenerPath + '.') && path !== listenerPath) ||
        (listenerPath.startsWith(path + '.') && path !== listenerPath)
      ) {
        this.listeners[listenerPath].forEach(callback => {
          try {
            callback(this.get(listenerPath), listenerPath);
          } catch (error) {
            console.error(`Error in state subscriber for ${listenerPath}:`, error);
          }
        });
      }
    });
  }
  
  /**
   * Execute multiple state updates as a single transaction
   * @param {Array<{path: string, value: any}>} updates - Array of updates
   * @returns {boolean} Success status
   */
  transaction(updates) {
    try {
      // Store paths that will be updated to notify only once per path
      const updatedPaths = new Set();
      
      // Apply all updates without notifications
      updates.forEach(({path, value}) => {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
          if (!obj[key]) obj[key] = {};
          return obj[key];
        }, this.state);
        
        target[lastKey] = value;
        
        // Add each unique path segment for notification
        const segments = [];
        keys.reduce((segment, key) => {
          segment = segment ? `${segment}.${key}` : key;
          segments.push(segment);
          return segment;
        }, '');
        
        // Add the full path
        updatedPaths.add(path);
        
        // Add parent paths that need to be notified
        segments.forEach(segment => updatedPaths.add(segment));
      });
      
      // Send notifications for all unique paths
      updatedPaths.forEach(path => this.notify(path));
      
      return true;
    } catch (error) {
      console.error("Failed to complete state transaction:", error);
      return false;
    }
  }
  
  /**
   * Enables debug mode to log state changes
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
    if (enabled) {
      console.log("State debug mode enabled");
    }
  }
  
  /**
   * Resets the state to initial values
   * @param {Object} initialState - Optional custom initial state
   */
  reset(initialState = null) {
    const defaultState = {
      resources: { metal: 0, crystal: 0, gas: 0 },
      research: { points: 0, unlocked: [] },
      carrier: { health: 100, maxHealth: 100 },
      expedition: { currentPlanet: null, active: false },
      ui: { activeOverlay: null, activeScene: null },
      enemies: { wave: 0, spawned: 0, killed: 0, nextWaveTime: 0 },
      drills: { count: 0, active: 0 },
      turrets: { count: 0, active: 0 },
      terrain: { seed: null, explored: 0 }
    };
    
    this.state = initialState || defaultState;
    
    // Notify all listeners of reset
    Object.keys(this.listeners).forEach(path => this.notify(path));
  }
} 