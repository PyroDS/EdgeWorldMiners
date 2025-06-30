/**
 * TransformComponent - Handles position, rotation, and scale for entities
 * Provides a consistent way to manipulate entity position in the world.
 */
import { Component } from '../component.js';
import services from '../services.js';

export class TransformComponent extends Component {
  /**
   * Create a new transform component
   * @param {Object} options - Component configuration
   * @param {number} [options.x=0] - Initial X position
   * @param {number} [options.y=0] - Initial Y position
   * @param {number} [options.z=0] - Initial Z position (depth)
   * @param {number} [options.rotation=0] - Initial rotation in radians
   * @param {number} [options.scaleX=1] - Initial X scale
   * @param {number} [options.scaleY=1] - Initial Y scale
   */
  constructor(options = {}) {
    super('transform', options);
    
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;
    
    this.rotation = options.rotation || 0;
    this.scaleX = options.scaleX !== undefined ? options.scaleX : 1;
    this.scaleY = options.scaleY !== undefined ? options.scaleY : 1;
    
    this.velocity = { x: 0, y: 0, z: 0 };
    this.acceleration = { x: 0, y: 0, z: 0 };
    
    this.previousPosition = { x: this.x, y: this.y, z: this.z };
    
    this._eventBus = services.has('eventBus') ? services.get('eventBus') : null;
  }
  
  /**
   * Called when component is attached to an entity
   */
  onAttach() {
    super.onAttach();
    
    // Initialize the game object position if it exists
    if (this.entity && this.entity.gameObject) {
      const gameObject = this.entity.gameObject;
      
      // Apply transform to game object
      if (typeof gameObject.setPosition === 'function') {
        gameObject.setPosition(this.x, this.y);
      } else {
        gameObject.x = this.x;
        gameObject.y = this.y;
      }
      
      // Apply depth
      if ('depth' in gameObject) {
        gameObject.depth = this.z;
      }
      
      // Apply rotation
      if ('rotation' in gameObject) {
        gameObject.rotation = this.rotation;
      }
      
      // Apply scale
      if (typeof gameObject.setScale === 'function') {
        gameObject.setScale(this.scaleX, this.scaleY);
      } else {
        gameObject.scaleX = this.scaleX;
        gameObject.scaleY = this.scaleY;
      }
    }
  }
  
  /**
   * Update transform for physics movement
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    if (delta <= 0) return;
    
    const deltaSeconds = delta / 1000;
    
    // Store previous position
    this.previousPosition.x = this.x;
    this.previousPosition.y = this.y;
    this.previousPosition.z = this.z;
    
    // Apply acceleration to velocity
    if (this.acceleration.x || this.acceleration.y || this.acceleration.z) {
      this.velocity.x += this.acceleration.x * deltaSeconds;
      this.velocity.y += this.acceleration.y * deltaSeconds;
      this.velocity.z += this.acceleration.z * deltaSeconds;
    }
    
    // Apply velocity to position
    if (this.velocity.x || this.velocity.y || this.velocity.z) {
      this.x += this.velocity.x * deltaSeconds;
      this.y += this.velocity.y * deltaSeconds;
      this.z += this.velocity.z * deltaSeconds;
      
      // Update game object
      this._updateGameObject();
      
      // Emit position changed event
      if (this._eventBus && this.entity) {
        this._eventBus.emit('entity:position_changed', {
          entityId: this.entity.id,
          entityType: this.entity.type,
          position: { x: this.x, y: this.y, z: this.z },
          velocity: { ...this.velocity },
          delta: {
            x: this.x - this.previousPosition.x,
            y: this.y - this.previousPosition.y,
            z: this.z - this.previousPosition.z
          }
        });
      }
    }
  }
  
  /**
   * Update the associated game object with current transform values
   * @private
   */
  _updateGameObject() {
    if (this.entity && this.entity.gameObject) {
      const gameObject = this.entity.gameObject;
      
      // Update position
      if (typeof gameObject.setPosition === 'function') {
        gameObject.setPosition(this.x, this.y);
      } else {
        gameObject.x = this.x;
        gameObject.y = this.y;
      }
      
      // Update depth
      if ('depth' in gameObject) {
        gameObject.depth = this.z;
      }
      
      // Update rotation
      if ('rotation' in gameObject) {
        gameObject.rotation = this.rotation;
      }
      
      // Update scale
      if (typeof gameObject.setScale === 'function') {
        gameObject.setScale(this.scaleX, this.scaleY);
      } else {
        gameObject.scaleX = this.scaleX;
        gameObject.scaleY = this.scaleY;
      }
    }
  }
  
  /**
   * Set position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} [z] - Z position (depth)
   */
  setPosition(x, y, z) {
    this.previousPosition.x = this.x;
    this.previousPosition.y = this.y;
    this.previousPosition.z = this.z;
    
    this.x = x;
    this.y = y;
    if (z !== undefined) {
      this.z = z;
    }
    
    this._updateGameObject();
    
    // Emit position changed event
    if (this._eventBus && this.entity) {
      this._eventBus.emit('entity:position_changed', {
        entityId: this.entity.id,
        entityType: this.entity.type,
        position: { x: this.x, y: this.y, z: this.z },
        velocity: { ...this.velocity },
        delta: {
          x: this.x - this.previousPosition.x,
          y: this.y - this.previousPosition.y,
          z: this.z - this.previousPosition.z
        }
      });
    }
  }
  
  /**
   * Set rotation
   * @param {number} angle - Angle in radians
   */
  setRotation(angle) {
    this.rotation = angle;
    
    if (this.entity && this.entity.gameObject && 'rotation' in this.entity.gameObject) {
      this.entity.gameObject.rotation = angle;
    }
  }
  
  /**
   * Set scale
   * @param {number} x - X scale
   * @param {number} [y] - Y scale (defaults to x if not provided)
   */
  setScale(x, y) {
    this.scaleX = x;
    this.scaleY = y === undefined ? x : y;
    
    if (this.entity && this.entity.gameObject) {
      const gameObject = this.entity.gameObject;
      
      if (typeof gameObject.setScale === 'function') {
        gameObject.setScale(this.scaleX, this.scaleY);
      } else {
        gameObject.scaleX = this.scaleX;
        gameObject.scaleY = this.scaleY;
      }
    }
  }
  
  /**
   * Set velocity
   * @param {number} x - X velocity
   * @param {number} y - Y velocity
   * @param {number} [z] - Z velocity
   */
  setVelocity(x, y, z) {
    this.velocity.x = x;
    this.velocity.y = y;
    if (z !== undefined) {
      this.velocity.z = z;
    }
  }
  
  /**
   * Set acceleration
   * @param {number} x - X acceleration
   * @param {number} y - Y acceleration
   * @param {number} [z] - Z acceleration
   */
  setAcceleration(x, y, z) {
    this.acceleration.x = x;
    this.acceleration.y = y;
    if (z !== undefined) {
      this.acceleration.z = z;
    }
  }
  
  /**
   * Move by a relative amount
   * @param {number} dx - X distance to move
   * @param {number} dy - Y distance to move
   * @param {number} [dz] - Z distance to move
   */
  translate(dx, dy, dz) {
    this.setPosition(
      this.x + dx,
      this.y + dy,
      dz !== undefined ? this.z + dz : this.z
    );
  }
  
  /**
   * Calculate distance to another position or entity
   * @param {Object|Entity} target - Target position or entity
   * @returns {number} Distance
   */
  distanceTo(target) {
    let targetX, targetY;
    
    if (target.getComponent && target.getComponent('transform')) {
      // Target is an entity with transform
      const targetTransform = target.getComponent('transform');
      targetX = targetTransform.x;
      targetY = targetTransform.y;
    } else if (target.x !== undefined && target.y !== undefined) {
      // Target is a position object
      targetX = target.x;
      targetY = target.y;
    } else {
      return null;
    }
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Get the current position as an object
   * @returns {Object} Position object with x, y, z properties
   */
  getPosition() {
    return { x: this.x, y: this.y, z: this.z };
  }
  
  /**
   * Handle messages from other components
   * @param {string} message - Message name
   * @param {any} data - Message data
   * @param {Component} sender - Sending component
   * @returns {any} Response to the message
   */
  receiveMessage(message, data, sender) {
    switch (message) {
      case 'getPosition':
        return this.getPosition();
        
      case 'setPosition':
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          this.setPosition(data.x, data.y, data.z);
          return true;
        }
        return false;
        
      case 'getVelocity':
        return { ...this.velocity };
        
      case 'setVelocity':
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          this.setVelocity(data.x, data.y, data.z);
          return true;
        }
        return false;
        
      case 'translate':
        if (data && typeof data.dx === 'number' && typeof data.dy === 'number') {
          this.translate(data.dx, data.dy, data.dz);
          return true;
        }
        return false;
        
      default:
        return null;
    }
  }
} 