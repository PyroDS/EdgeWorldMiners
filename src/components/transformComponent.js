/**
 * transformComponent.js
 * 
 * Component that handles position and rotation of an entity.
 * This is a fundamental component used by most entities.
 */

import { Component } from './component.js';
import { services } from '../core/services.js';

export class TransformComponent extends Component {
  /**
   * Creates a transform component
   * 
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {number} z - Initial z position
   * @param {number} rotation - Initial rotation in radians
   */
  constructor(x = 0, y = 0, z = 0, rotation = 0) {
    super('transform');
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotation = rotation;
    this.scale = 1;
    
    // Track velocity for physics integration
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotationVelocity = 0;
    
    // Reference to event bus for position updates
    this.eventBus = services.get('eventBus');
    
    // Previous position for change detection
    this.previousPosition = { x, y, z };
  }
  
  /**
   * Initializes the component when added to entity
   */
  init() {
    // Emit initial position
    this.emitPositionUpdate();
  }
  
  /**
   * Updates position based on velocity
   * 
   * @param {number} delta - Time since last update in milliseconds
   */
  update(delta) {
    // Skip physics update if no velocity
    if (this.velocity.x === 0 && this.velocity.y === 0 && 
        this.velocity.z === 0 && this.rotationVelocity === 0) {
      return;
    }
    
    // Convert delta to seconds
    const deltaSeconds = delta / 1000;
    
    // Update position based on velocity
    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;
    this.z += this.velocity.z * deltaSeconds;
    
    // Update rotation based on rotation velocity
    this.rotation += this.rotationVelocity * deltaSeconds;
    
    // Normalize rotation to [0, 2π)
    this.rotation = this.rotation % (Math.PI * 2);
    if (this.rotation < 0) {
      this.rotation += Math.PI * 2;
    }
    
    // Check if position has changed significantly
    if (this.hasPositionChanged()) {
      this.emitPositionUpdate();
      this.previousPosition = { x: this.x, y: this.y, z: this.z };
    }
  }
  
  /**
   * Moves the entity by the specified amounts
   * 
   * @param {number} dx - X movement amount
   * @param {number} dy - Y movement amount
   * @param {number} dz - Z movement amount
   * @returns {TransformComponent} This component for chaining
   */
  move(dx, dy, dz = 0) {
    this.x += dx;
    this.y += dy;
    this.z += dz;
    
    this.emitPositionUpdate();
    return this;
  }
  
  /**
   * Sets the position of the entity
   * 
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @param {number} z - New Z position
   * @returns {TransformComponent} This component for chaining
   */
  setPosition(x, y, z = this.z) {
    this.x = x;
    this.y = y;
    this.z = z;
    
    this.emitPositionUpdate();
    return this;
  }
  
  /**
   * Rotates the entity by the specified amount
   * 
   * @param {number} amount - Rotation amount in radians
   * @returns {TransformComponent} This component for chaining
   */
  rotate(amount) {
    this.rotation += amount;
    
    // Normalize rotation to [0, 2π)
    this.rotation = this.rotation % (Math.PI * 2);
    if (this.rotation < 0) {
      this.rotation += Math.PI * 2;
    }
    
    return this;
  }
  
  /**
   * Sets the rotation of the entity
   * 
   * @param {number} rotation - New rotation in radians
   * @returns {TransformComponent} This component for chaining
   */
  setRotation(rotation) {
    this.rotation = rotation;
    
    // Normalize rotation to [0, 2π)
    this.rotation = this.rotation % (Math.PI * 2);
    if (this.rotation < 0) {
      this.rotation += Math.PI * 2;
    }
    
    return this;
  }
  
  /**
   * Sets the velocity of the entity
   * 
   * @param {number} x - X velocity
   * @param {number} y - Y velocity
   * @param {number} z - Z velocity
   * @returns {TransformComponent} This component for chaining
   */
  setVelocity(x, y, z = 0) {
    this.velocity = { x, y, z };
    return this;
  }
  
  /**
   * Sets the rotation velocity of the entity
   * 
   * @param {number} velocity - Rotation velocity in radians per second
   * @returns {TransformComponent} This component for chaining
   */
  setRotationVelocity(velocity) {
    this.rotationVelocity = velocity;
    return this;
  }
  
  /**
   * Sets the scale of the entity
   * 
   * @param {number} scale - New scale
   * @returns {TransformComponent} This component for chaining
   */
  setScale(scale) {
    this.scale = scale;
    return this;
  }
  
  /**
   * Gets the distance to another entity or position
   * 
   * @param {Object|Entity} target - Entity or position {x, y, z} to measure distance to
   * @returns {number} The distance
   */
  getDistanceTo(target) {
    // If target is an entity with a transform, use its position
    if (target.getComponent) {
      const targetTransform = target.getComponent('transform');
      if (targetTransform) {
        target = { x: targetTransform.x, y: targetTransform.y, z: targetTransform.z };
      }
    }
    
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const dz = (target.z !== undefined) ? (this.z - target.z) : 0;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Checks if the position has changed enough to emit an update
   * 
   * @returns {boolean} Whether position has changed significantly
   */
  hasPositionChanged() {
    const dx = this.x - this.previousPosition.x;
    const dy = this.y - this.previousPosition.y;
    const dz = this.z - this.previousPosition.z;
    
    // Only emit if position changed by at least 0.1 units
    const minChange = 0.1;
    return Math.abs(dx) >= minChange || Math.abs(dy) >= minChange || Math.abs(dz) >= minChange;
  }
  
  /**
   * Emits a position update event
   */
  emitPositionUpdate() {
    this.eventBus.emit('entity:moved', {
      entityId: this.entity.id,
      entityType: this.entity.type,
      position: { x: this.x, y: this.y, z: this.z },
      rotation: this.rotation
    });
  }
} 