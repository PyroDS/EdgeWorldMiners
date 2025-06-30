/**
 * Component - Base class for all entity components
 * Provides reusable behaviors that can be attached to entities.
 */
export class Component {
  /**
   * Create a new component
   * @param {string} type - Component type identifier
   * @param {Object} options - Component configuration
   */
  constructor(type, options = {}) {
    this.type = type;
    this.entity = null; // Set when attached to an entity
    this.enabled = options.enabled !== false;
    this.options = options;
    this.initialized = false;
  }
  
  /**
   * Called when component is attached to an entity
   */
  onAttach() {
    this.initialized = true;
  }
  
  /**
   * Called when component is detached from an entity
   */
  onDetach() {
    this.initialized = false;
  }
  
  /**
   * Update component state
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Override in subclass
  }
  
  /**
   * Get entity position (convenience method)
   * @returns {Object|null} Position object or null if not available
   */
  getPosition() {
    // Check for transform component (preferred)
    const transform = this.entity?.getComponent('transform');
    if (transform) {
      return { x: transform.x, y: transform.y };
    }
    
    // Fall back to gameObject if available
    if (this.entity?.gameObject) {
      return { 
        x: this.entity.gameObject.x, 
        y: this.entity.gameObject.y 
      };
    }
    
    return null;
  }
  
  /**
   * Set entity position (convenience method)
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  setPosition(x, y) {
    // Update transform component if available
    const transform = this.entity?.getComponent('transform');
    if (transform) {
      transform.setPosition(x, y);
      return;
    }
    
    // Fall back to gameObject if available
    if (this.entity?.gameObject) {
      this.entity.gameObject.x = x;
      this.entity.gameObject.y = y;
    }
  }
  
  /**
   * Enable this component
   */
  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this.onEnable();
    }
  }
  
  /**
   * Disable this component
   */
  disable() {
    if (this.enabled) {
      this.enabled = false;
      this.onDisable();
    }
  }
  
  /**
   * Called when component becomes enabled
   */
  onEnable() {
    // Override in subclass
  }
  
  /**
   * Called when component becomes disabled
   */
  onDisable() {
    // Override in subclass
  }
  
  /**
   * Called when entity is deactivated
   */
  onDeactivate() {
    // Override in subclass
  }
  
  /**
   * Called when entity is activated
   */
  onActivate() {
    // Override in subclass
  }
  
  /**
   * Send a message to another component on this entity
   * @param {string} targetType - Target component type
   * @param {string} message - Message name
   * @param {any} data - Message data
   * @returns {any} Response from target component
   */
  sendMessage(targetType, message, data) {
    const target = this.entity?.getComponent(targetType);
    if (!target || typeof target.receiveMessage !== 'function') {
      return null;
    }
    
    return target.receiveMessage(message, data, this);
  }
  
  /**
   * Receive a message from another component
   * @param {string} message - Message name
   * @param {any} data - Message data
   * @param {Component} sender - Sending component
   * @returns {any} Response to sender
   */
  receiveMessage(message, data, sender) {
    // Override in subclass
    return null;
  }
} 