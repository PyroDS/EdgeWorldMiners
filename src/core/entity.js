/**
 * Entity - Base class for all game entities
 * Provides component-based architecture for game objects.
 */
import services from './services.js';

let nextEntityId = 1;

export class Entity {
  /**
   * Create a new entity
   * @param {string} type - Entity type identifier
   * @param {Object} options - Entity configuration
   */
  constructor(type, options = {}) {
    // Unique identifier for this entity
    this.id = options.id || `${type}_${nextEntityId++}`;
    this.type = type;
    
    // Component storage
    this.components = new Map();
    this.tags = new Set(options.tags || []);
    
    // Entity state
    this.active = true;
    this.visible = true;
    
    // Optional game object reference
    this.gameObject = options.gameObject || null;
    
    // Core services
    this.eventBus = services.has('eventBus') ? services.get('eventBus') : null;
    
    // Track event listeners for cleanup
    this.eventHandlers = [];
    
    // Emit entity created event
    if (this.eventBus) {
      this.eventBus.emit('entity:created', {
        id: this.id,
        type: this.type,
        entity: this
      });
    }
  }
  
  /**
   * Add a component to this entity
   * @param {Component} component - Component to add
   * @returns {Component} The added component
   */
  addComponent(component) {
    // Set parent reference
    component.entity = this;
    
    // Store by component type
    this.components.set(component.type, component);
    
    // Initialize if entity is already active
    if (this.active) {
      component.onAttach();
    }
    
    return component;
  }
  
  /**
   * Get a component by type
   * @param {string} type - Component type
   * @returns {Component|null} Component instance or null
   */
  getComponent(type) {
    return this.components.get(type) || null;
  }
  
  /**
   * Check if entity has a specific component
   * @param {string} type - Component type
   * @returns {boolean} Whether component exists
   */
  hasComponent(type) {
    return this.components.has(type);
  }
  
  /**
   * Remove a component
   * @param {string} type - Component type to remove
   * @returns {boolean} Whether component was removed
   */
  removeComponent(type) {
    const component = this.components.get(type);
    
    if (component) {
      // Clean up component
      component.onDetach();
      component.entity = null;
      
      // Remove from map
      this.components.delete(type);
      return true;
    }
    
    return false;
  }
  
  /**
   * Initialize the entity
   */
  init() {
    // Initialize all components
    for (const component of this.components.values()) {
      component.onAttach();
    }
  }
  
  /**
   * Update entity and all its components
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    if (!this.active) return;
    
    // Update all components
    for (const component of this.components.values()) {
      if (component.enabled) {
        component.update(delta);
      }
    }
  }
  
  /**
   * Clean up entity when removed
   */
  destroy() {
    // Emit entity destroyed event
    if (this.eventBus) {
      this.eventBus.emit('entity:destroyed', {
        id: this.id,
        type: this.type
      });
    }
    
    // Clean up all components
    for (const component of this.components.values()) {
      component.onDetach();
      component.entity = null;
    }
    
    // Clean up event handlers
    this.eventHandlers.forEach(unsubscribe => unsubscribe());
    this.eventHandlers = [];
    
    // Clear components
    this.components.clear();
    
    // Clean up game object if it exists
    if (this.gameObject) {
      if (typeof this.gameObject.destroy === 'function') {
        this.gameObject.destroy();
      }
      this.gameObject = null;
    }
    
    this.active = false;
  }
  
  /**
   * Deactivate entity (pause without destroying)
   */
  deactivate() {
    if (this.active) {
      this.active = false;
      
      // Notify components
      for (const component of this.components.values()) {
        component.onDeactivate();
      }
      
      // Hide game object if it exists
      if (this.gameObject && typeof this.gameObject.setVisible === 'function') {
        this.gameObject.setVisible(false);
      }
    }
  }
  
  /**
   * Reactivate a deactivated entity
   */
  activate() {
    if (!this.active) {
      this.active = true;
      
      // Notify components
      for (const component of this.components.values()) {
        component.onActivate();
      }
      
      // Show game object if it exists
      if (this.visible && this.gameObject && typeof this.gameObject.setVisible === 'function') {
        this.gameObject.setVisible(true);
      }
    }
  }
  
  /**
   * Set entity visibility
   * @param {boolean} visible - Whether entity should be visible
   */
  setVisible(visible) {
    this.visible = visible;
    
    // Update game object if it exists
    if (this.gameObject && typeof this.gameObject.setVisible === 'function') {
      this.gameObject.setVisible(visible);
    }
  }
  
  /**
   * Add a tag to this entity
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    this.tags.add(tag);
  }
  
  /**
   * Remove a tag from this entity
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    this.tags.delete(tag);
  }
  
  /**
   * Check if entity has a tag
   * @param {string} tag - Tag to check
   * @returns {boolean} Whether entity has tag
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  listenTo(event, callback) {
    if (this.eventBus) {
      const unsubscribe = this.eventBus.on(event, callback);
      this.eventHandlers.push(unsubscribe);
      return unsubscribe;
    }
    return null;
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, data);
    }
  }
} 