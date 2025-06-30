/**
 * component.js
 * 
 * Base class for all entity components. Components provide specific
 * functionality to entities and can be composed together.
 */

export class Component {
  /**
   * Creates a new component
   * 
   * @param {string} name - The name of this component
   */
  constructor(name) {
    this.name = name;
    this.entity = null;
  }
  
  /**
   * Gets another component from the parent entity
   * 
   * @param {string} name - Component name to retrieve
   * @returns {Object|null} The component or null if not found
   */
  getComponent(name) {
    return this.entity?.getComponent(name);
  }
  
  /**
   * Checks if the parent entity has a component
   * 
   * @param {string} name - Component name to check
   * @returns {boolean} Whether the entity has the component
   */
  hasComponent(name) {
    return this.entity?.hasComponent(name) || false;
  }
  
  /**
   * Gets a value from the entity's transform component
   * 
   * @param {string} property - The property to get (x, y, z, rotation)
   * @returns {number|undefined} The property value or undefined
   */
  getTransform(property) {
    const transform = this.getComponent('transform');
    return transform ? transform[property] : undefined;
  }
  
  /**
   * Sets a value on the entity's transform component
   * 
   * @param {string} property - The property to set (x, y, z, rotation)
   * @param {number} value - The value to set
   * @returns {boolean} Whether the property was set
   */
  setTransform(property, value) {
    const transform = this.getComponent('transform');
    if (transform) {
      transform[property] = value;
      return true;
    }
    return false;
  }
  
  /**
   * Initializes the component
   * Called when component is added to an entity
   */
  init() {
    // Virtual method to be overridden
  }
  
  /**
   * Updates the component
   * Called each frame if entity is active
   * 
   * @param {number} delta - Time since last update in milliseconds
   */
  update(delta) {
    // Virtual method to be overridden
  }
  
  /**
   * Cleans up the component
   * Called when component is removed or entity is destroyed
   */
  cleanup() {
    // Virtual method to be overridden
  }
  
  /**
   * Gets the position of the entity if it has a transform component
   * 
   * @returns {Object|null} Position object with x, y properties or null
   */
  getPosition() {
    const transform = this.getComponent('transform');
    if (transform) {
      return {
        x: transform.x,
        y: transform.y,
        z: transform.z
      };
    }
    return null;
  }
} 