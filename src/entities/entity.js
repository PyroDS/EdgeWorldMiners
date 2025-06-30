/**
 * entity.js
 * 
 * Base class for all game entities using a component-based architecture.
 * Entities are containers for components that provide specific functionality.
 */

export class Entity {
  /**
   * Creates a new entity
   * 
   * @param {string} id - Unique identifier for this entity
   * @param {string} type - Entity type (e.g., 'enemy', 'turret')
   */
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.components = {};
    this.tags = new Set();
    this.active = true;
    this.markedForDestruction = false;
  }
  
  /**
   * Adds a component to this entity
   * 
   * @param {string} name - Component name
   * @param {Object} component - Component instance
   * @returns {Entity} This entity for chaining
   */
  addComponent(name, component) {
    this.components[name] = component;
    component.entity = this;
    
    // Initialize component if it has an init method
    if (component.init && typeof component.init === 'function') {
      component.init();
    }
    
    return this;
  }
  
  /**
   * Gets a component by name
   * 
   * @param {string} name - Component name
   * @returns {Object|null} The component or null if not found
   */
  getComponent(name) {
    return this.components[name];
  }
  
  /**
   * Checks if entity has a component
   * 
   * @param {string} name - Component name
   * @returns {boolean} Whether the entity has the component
   */
  hasComponent(name) {
    return !!this.components[name];
  }
  
  /**
   * Removes a component
   * 
   * @param {string} name - Component name
   * @returns {boolean} Whether the component was removed
   */
  removeComponent(name) {
    if (this.components[name]) {
      // Call cleanup if it exists
      if (this.components[name].cleanup && typeof this.components[name].cleanup === 'function') {
        this.components[name].cleanup();
      }
      
      // Remove reference to entity
      this.components[name].entity = null;
      
      // Remove component
      delete this.components[name];
      return true;
    }
    return false;
  }
  
  /**
   * Adds a tag to this entity
   * 
   * @param {string} tag - Tag to add
   * @returns {Entity} This entity for chaining
   */
  addTag(tag) {
    this.tags.add(tag);
    return this;
  }
  
  /**
   * Removes a tag from this entity
   * 
   * @param {string} tag - Tag to remove
   * @returns {boolean} Whether the tag was removed
   */
  removeTag(tag) {
    return this.tags.delete(tag);
  }
  
  /**
   * Checks if entity has a tag
   * 
   * @param {string} tag - Tag to check
   * @returns {boolean} Whether the entity has the tag
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }
  
  /**
   * Updates all components
   * 
   * @param {number} delta - Time since last update in milliseconds
   */
  update(delta) {
    // Skip update if entity is not active
    if (!this.active) return;
    
    // Update all components
    Object.values(this.components).forEach(component => {
      if (component.update && typeof component.update === 'function') {
        component.update(delta);
      }
    });
  }
  
  /**
   * Cleans up all components and prepares entity for destruction
   */
  cleanup() {
    // Clean up all components
    Object.values(this.components).forEach(component => {
      if (component.cleanup && typeof component.cleanup === 'function') {
        component.cleanup();
      }
    });
    
    // Clear components and tags
    this.components = {};
    this.tags.clear();
    
    // Mark as inactive
    this.active = false;
  }
  
  /**
   * Marks this entity for destruction
   */
  destroy() {
    this.markedForDestruction = true;
  }
} 