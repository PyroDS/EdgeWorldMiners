/**
 * entityRegistry.js
 * 
 * Provides centralized entity management with spatial partitioning
 * for efficient entity queries and collision detection.
 * 
 * Dependencies:
 * - core/services.js
 */
import services from './services.js';

export class EntityRegistry {
  /**
   * Create a new entity registry
   */
  constructor() {
    this.entities = new Map();
    this.taggedEntities = new Map();
    this.spatialGrid = new SpatialGrid(64); // 64px cell size
    this.eventBus = null;
    
    // Get event bus from services when available
    if (services.get('eventBus')) {
      this.eventBus = services.get('eventBus');
    }
  }
  
  /**
   * Initialize the registry
   */
  init() {
    if (!this.eventBus && services.get('eventBus')) {
      this.eventBus = services.get('eventBus');
    }
  }
  
  /**
   * Register an entity with the registry
   * @param {Object} entity - The entity to register
   * @returns {boolean} Whether registration was successful
   */
  register(entity) {
    if (!entity || !entity.id) {
      console.error('Cannot register entity without ID');
      return false;
    }
    
    // Check if entity already registered
    if (this.entities.has(entity.id)) {
      console.warn(`Entity with ID ${entity.id} already registered`);
      return false;
    }
    
    // Add to entities map
    this.entities.set(entity.id, entity);
    
    // Add to tagged entities maps
    if (entity.tags) {
      for (const tag of entity.tags) {
        if (!this.taggedEntities.has(tag)) {
          this.taggedEntities.set(tag, new Set());
        }
        this.taggedEntities.get(tag).add(entity);
      }
    }
    
    // Add to spatial grid if it has a transform component
    const transform = entity.getComponent?.('transform');
    if (transform) {
      const position = transform.getPosition();
      this.spatialGrid.insert(entity, position.x, position.y);
    }
    
    // Emit entity registered event
    if (this.eventBus) {
      this.eventBus.emit('entity:registered', { entity });
    }
    
    return true;
  }
  
  /**
   * Unregister an entity from the registry
   * @param {string|Object} entityOrId - The entity or entity ID to unregister
   * @returns {boolean} Whether unregistration was successful
   */
  unregister(entityOrId) {
    const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
    
    if (!id) {
      console.error('Cannot unregister entity without ID');
      return false;
    }
    
    // Get the entity
    const entity = this.entities.get(id);
    if (!entity) {
      console.warn(`Entity with ID ${id} not found in registry`);
      return false;
    }
    
    // Remove from entities map
    this.entities.delete(id);
    
    // Remove from tagged entities maps
    if (entity.tags) {
      for (const tag of entity.tags) {
        if (this.taggedEntities.has(tag)) {
          this.taggedEntities.get(tag).delete(entity);
          
          // Clean up empty tag sets
          if (this.taggedEntities.get(tag).size === 0) {
            this.taggedEntities.delete(tag);
          }
        }
      }
    }
    
    // Remove from spatial grid
    this.spatialGrid.remove(entity);
    
    // Emit entity unregistered event
    if (this.eventBus) {
      this.eventBus.emit('entity:unregistered', { entity });
    }
    
    return true;
  }
  
  /**
   * Get an entity by ID
   * @param {string} id - The entity ID
   * @returns {Object|null} The entity or null if not found
   */
  getEntity(id) {
    return this.entities.get(id) || null;
  }
  
  /**
   * Get all entities with a specific tag
   * @param {string} tag - The tag to filter by
   * @returns {Array} Array of entities with the tag
   */
  getEntitiesWithTag(tag) {
    const tagSet = this.taggedEntities.get(tag);
    return tagSet ? Array.from(tagSet) : [];
  }
  
  /**
   * Get entities within a radius of a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Search radius
   * @returns {Array} Entities within radius
   */
  getEntitiesInRadius(x, y, radius) {
    // Get candidates from spatial grid
    const candidates = this.spatialGrid.queryCircle(x, y, radius);
    
    // Filter by actual distance
    return candidates.filter(entity => {
      const transform = entity.getComponent?.('transform');
      if (!transform) return false;
      
      const position = transform.getPosition();
      const distSq = (position.x - x) ** 2 + (position.y - y) ** 2;
      return distSq <= radius * radius;
    });
  }
  
  /**
   * Get entities in a rectangular area
   * @param {number} x - X coordinate of top-left corner
   * @param {number} y - Y coordinate of top-left corner
   * @param {number} width - Width of rectangle
   * @param {number} height - Height of rectangle
   * @returns {Array} Entities in rectangle
   */
  getEntitiesInRect(x, y, width, height) {
    return this.spatialGrid.queryRect(x, y, width, height);
  }
  
  /**
   * Get all entities of a specific type
   * @param {string} type - Entity type
   * @returns {Array} Entities of the specified type
   */
  getEntitiesOfType(type) {
    return Array.from(this.entities.values()).filter(entity => entity.type === type);
  }
  
  /**
   * Get all entities with a specific component
   * @param {string} componentName - Component name
   * @returns {Array} Entities with the component
   */
  getEntitiesWithComponent(componentName) {
    return Array.from(this.entities.values()).filter(entity => 
      entity.getComponent && entity.getComponent(componentName)
    );
  }
  
  /**
   * Update entity position in spatial grid
   * @param {Object} entity - The entity to update
   */
  updateEntityPosition(entity) {
    if (!entity || !entity.id) return;
    
    const transform = entity.getComponent?.('transform');
    if (!transform) return;
    
    const position = transform.getPosition();
    this.spatialGrid.update(entity, position.x, position.y);
  }
  
  /**
   * Update all entity positions in spatial grid
   */
  updateAllPositions() {
    for (const entity of this.entities.values()) {
      this.updateEntityPosition(entity);
    }
  }
  
  /**
   * Clear the registry
   */
  clear() {
    // Emit unregistered events for all entities
    if (this.eventBus) {
      for (const entity of this.entities.values()) {
        this.eventBus.emit('entity:unregistered', { entity });
      }
    }
    
    // Clear all collections
    this.entities.clear();
    this.taggedEntities.clear();
    this.spatialGrid.clear();
  }
  
  /**
   * Get all entities
   * @returns {Array} All entities
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }
  
  /**
   * Update all entities
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Update all entities
    for (const entity of this.entities.values()) {
      if (entity.update) {
        entity.update(delta);
      }
      
      // Update position in spatial grid if entity has moved
      this.updateEntityPosition(entity);
    }
  }
}

/**
 * SpatialGrid class for efficient spatial queries
 * @private
 */
class SpatialGrid {
  /**
   * Create a new spatial grid
   * @param {number} cellSize - Size of each grid cell
   */
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.entityCells = new Map(); // Maps entity IDs to their occupied cells
  }
  
  /**
   * Get cell key for a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Cell key
   * @private
   */
  _getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  /**
   * Get or create a cell
   * @param {string} key - Cell key
   * @returns {Set} Cell entity set
   * @private
   */
  _getCell(key) {
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    return this.grid.get(key);
  }
  
  /**
   * Insert an entity into the grid
   * @param {Object} entity - The entity to insert
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  insert(entity, x, y) {
    if (!entity || !entity.id) return;
    
    const key = this._getCellKey(x, y);
    const cell = this._getCell(key);
    
    cell.add(entity);
    this.entityCells.set(entity.id, key);
  }
  
  /**
   * Remove an entity from the grid
   * @param {Object} entity - The entity to remove
   */
  remove(entity) {
    if (!entity || !entity.id) return;
    
    const key = this.entityCells.get(entity.id);
    if (!key) return;
    
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(entity);
      
      // Clean up empty cells
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
    
    this.entityCells.delete(entity.id);
  }
  
  /**
   * Update an entity's position in the grid
   * @param {Object} entity - The entity to update
   * @param {number} x - New X coordinate
   * @param {number} y - New Y coordinate
   */
  update(entity, x, y) {
    if (!entity || !entity.id) return;
    
    const newKey = this._getCellKey(x, y);
    const oldKey = this.entityCells.get(entity.id);
    
    // Skip if entity hasn't changed cells
    if (newKey === oldKey) return;
    
    // Remove from old cell
    if (oldKey) {
      const oldCell = this.grid.get(oldKey);
      if (oldCell) {
        oldCell.delete(entity);
        
        // Clean up empty cells
        if (oldCell.size === 0) {
          this.grid.delete(oldKey);
        }
      }
    }
    
    // Add to new cell
    const newCell = this._getCell(newKey);
    newCell.add(entity);
    this.entityCells.set(entity.id, newKey);
  }
  
  /**
   * Query entities in a rectangle
   * @param {number} x - X coordinate of top-left corner
   * @param {number} y - Y coordinate of top-left corner
   * @param {number} width - Width of rectangle
   * @param {number} height - Height of rectangle
   * @returns {Array} Entities in rectangle
   */
  queryRect(x, y, width, height) {
    const startCellX = Math.floor(x / this.cellSize);
    const startCellY = Math.floor(y / this.cellSize);
    const endCellX = Math.floor((x + width) / this.cellSize);
    const endCellY = Math.floor((y + height) / this.cellSize);
    
    const result = new Set();
    
    for (let cellX = startCellX; cellX <= endCellX; cellX++) {
      for (let cellY = startCellY; cellY <= endCellY; cellY++) {
        const key = `${cellX},${cellY}`;
        const cell = this.grid.get(key);
        
        if (cell) {
          for (const entity of cell) {
            result.add(entity);
          }
        }
      }
    }
    
    return Array.from(result);
  }
  
  /**
   * Query entities in a circle
   * @param {number} x - X coordinate of center
   * @param {number} y - Y coordinate of center
   * @param {number} radius - Circle radius
   * @returns {Array} Entities in circle
   */
  queryCircle(x, y, radius) {
    // Convert circle to bounding rectangle for cell query
    const startCellX = Math.floor((x - radius) / this.cellSize);
    const startCellY = Math.floor((y - radius) / this.cellSize);
    const endCellX = Math.floor((x + radius) / this.cellSize);
    const endCellY = Math.floor((y + radius) / this.cellSize);
    
    const result = new Set();
    
    for (let cellX = startCellX; cellX <= endCellX; cellX++) {
      for (let cellY = startCellY; cellY <= endCellY; cellY++) {
        const key = `${cellX},${cellY}`;
        const cell = this.grid.get(key);
        
        if (cell) {
          for (const entity of cell) {
            result.add(entity);
          }
        }
      }
    }
    
    return Array.from(result);
  }
  
  /**
   * Clear the grid
   */
  clear() {
    this.grid.clear();
    this.entityCells.clear();
  }
}

// Create a singleton instance
const entityRegistry = new EntityRegistry();
export default entityRegistry; 