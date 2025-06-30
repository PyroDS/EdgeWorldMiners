/**
 * EventBus - Centralized event system for cross-component communication
 * Allows components to communicate without direct dependencies through events.
 */
export class EventBus {
  constructor() {
    this.events = {};
    this.debug = false;
    this.history = [];
    this.historySize = 100; // Keep track of last 100 events by default
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return function to unsubscribe
    return () => this.off(event, callback);
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback to remove
   */
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
      if (this.events[event].length === 0) {
        delete this.events[event];
      }
    }
  }
  
  /**
   * Emit an event with optional data
   * @param {string} event - Event name to emit
   * @param {any} data - Data to pass to subscribers
   * @returns {boolean} Whether any handlers were called
   */
  emit(event, data) {
    // Add to history
    if (this.historySize > 0) {
      this.history.push({
        event,
        data,
        time: Date.now()
      });
      
      // Trim history if needed
      if (this.history.length > this.historySize) {
        this.history.shift();
      }
    }
    
    if (this.debug) {
      console.log(`[Event] ${event}`, data);
    }
    
    if (!this.events[event]) {
      return false;
    }
    
    try {
      this.events[event].forEach(callback => callback(data));
      return true;
    } catch (error) {
      console.error(`Error in event handler for ${event}:`, error);
      return false;
    }
  }
  
  /**
   * Emit event but wait for all subscribers to complete, including promises
   * @param {string} event - Event name to emit
   * @param {any} data - Data to pass to subscribers
   * @returns {Promise<Array>} Results from all handlers
   */
  async emitAsync(event, data) {
    // Add to history
    if (this.historySize > 0) {
      this.history.push({
        event,
        data,
        time: Date.now(),
        async: true
      });
      
      // Trim history if needed
      if (this.history.length > this.historySize) {
        this.history.shift();
      }
    }
    
    if (this.debug) {
      console.log(`[Event Async] ${event}`, data);
    }
    
    if (!this.events[event]) {
      return [];
    }
    
    try {
      const promises = this.events[event].map(callback => Promise.resolve().then(() => callback(data)));
      return await Promise.all(promises);
    } catch (error) {
      console.error(`Error in async event handler for ${event}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to an event once, then unsubscribe
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const onceWrapper = data => {
      this.off(event, onceWrapper);
      callback(data);
    };
    return this.on(event, onceWrapper);
  }
  
  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
    if (enabled) {
      console.log('EventBus debug mode enabled');
    }
  }
  
  /**
   * Get list of registered event types
   * @returns {string[]} Array of event names
   */
  getEventTypes() {
    return Object.keys(this.events);
  }
  
  /**
   * Get the number of subscribers for an event
   * @param {string} event - Event name
   * @returns {number} Number of subscribers
   */
  getSubscriberCount(event) {
    return this.events[event]?.length || 0;
  }
  
  /**
   * Clear all event subscriptions
   */
  clear() {
    this.events = {};
  }
  
  /**
   * Configure history settings
   * @param {number} size - Maximum history size (0 to disable)
   */
  configureHistory(size) {
    this.historySize = size;
    if (size === 0) {
      this.history = [];
    } else if (this.history.length > size) {
      this.history = this.history.slice(-size);
    }
  }
  
  /**
   * Get recent event history
   * @returns {Array<{event: string, data: any, time: number}>} Event history
   */
  getHistory() {
    return [...this.history];
  }
} 