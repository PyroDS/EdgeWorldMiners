/**
 * ResourceManager - Handles resource collection, storage, and consumption
 * Refactored to use the Manager base class and integrate with the event system.
 */
import { Manager } from '../core/manager.js';

export class ResourceManager extends Manager {
  /**
   * Create a resource manager
   */
  constructor() {
    super('resourceManager');
    
    // Resource definitions
    this.resources = {
      metal: { 
        amount: 0, 
        capacity: 1000, 
        extractionRate: 1,
        displayName: 'Metal',
        color: '#888888',
        icon: '⚙️'
      },
      crystal: { 
        amount: 0, 
        capacity: 500, 
        extractionRate: 0.5,
        displayName: 'Crystal',
        color: '#44aaff',
        icon: '💎'
      },
      gas: { 
        amount: 0, 
        capacity: 300, 
        extractionRate: 0.3,
        displayName: 'Gas',
        color: '#55dd55',
        icon: '☁️'
      }
    };
    
    // Resource history for statistics
    this.collectionHistory = [];
    this.consumptionHistory = [];
    
    // Resource deposits found in the world
    this.discoveredDeposits = {
      metal: [],
      crystal: [],
      gas: []
    };
  }
  
  /**
   * Set up event listeners for resource operations
   */
  setupEventListeners() {
    // Listen for resource extraction events
    this.listenTo('resource:extract', ({ type, amount }) => {
      this.addResource(type, amount);
    });
    
    // Listen for resource consumption events
    this.listenTo('resource:consume', ({ type, amount }) => {
      this.removeResource(type, amount);
    });
    
    // Listen for capacity change events
    this.listenTo('resource:capacity_changed', ({ type, capacity }) => {
      if (this.resources[type]) {
        this.resources[type].capacity = capacity;
        this.setState(`resources.${type}_capacity`, capacity);
      }
    });
    
    // Listen for deposit discovery
    this.listenTo('resource:deposit_discovered', ({ type, position, size }) => {
      this.addDeposit(type, position, size);
    });
  }
  
  /**
   * Initialize the resource manager
   */
  onInit() {
    // Initialize state for all resources
    Object.entries(this.resources).forEach(([type, resource]) => {
      this.setState(`resources.${type}`, resource.amount);
      this.setState(`resources.${type}_capacity`, resource.capacity);
    });
    
    // Set initial extraction rates in state
    Object.entries(this.resources).forEach(([type, resource]) => {
      this.setState(`resources.${type}_rate`, resource.extractionRate);
    });
  }
  
  /**
   * Update resource state
   * @param {number} delta - Time in milliseconds since last update
   */
  onUpdate(delta) {
    // Future: Could implement passive resource generation here
  }
  
  /**
   * Add an amount of a resource
   * @param {string} type - Resource type
   * @param {number} amount - Amount to add
   * @returns {number} Amount actually added
   */
  addResource(type, amount) {
    if (!this.resources[type] || amount <= 0) return 0;
    
    const resource = this.resources[type];
    const newAmount = Math.min(resource.amount + amount, resource.capacity);
    const amountAdded = newAmount - resource.amount;
    
    // Update internal state
    resource.amount = newAmount;
    
    // Update game state
    this.setState(`resources.${type}`, resource.amount);
    
    // Track collection for history
    this.collectionHistory.push({
      type,
      amount: amountAdded,
      timestamp: Date.now()
    });
    
    // Emit resource updated event
    this.emit('resource:updated', {
      type,
      amount: resource.amount,
      capacity: resource.capacity,
      change: amountAdded
    });
    
    return amountAdded;
  }
  
  /**
   * Remove an amount of a resource
   * @param {string} type - Resource type
   * @param {number} amount - Amount to remove
   * @returns {boolean} Whether the resource was successfully removed
   */
  removeResource(type, amount) {
    if (!this.resources[type] || amount <= 0) return false;
    
    const resource = this.resources[type];
    if (resource.amount < amount) return false;
    
    // Update internal state
    resource.amount -= amount;
    
    // Update game state
    this.setState(`resources.${type}`, resource.amount);
    
    // Track consumption for history
    this.consumptionHistory.push({
      type,
      amount,
      timestamp: Date.now()
    });
    
    // Emit resource updated event
    this.emit('resource:updated', {
      type,
      amount: resource.amount,
      capacity: resource.capacity,
      change: -amount
    });
    
    return true;
  }
  
  /**
   * Check if player has enough resources
   * @param {Object} requirements - Object with resource types and amounts
   * @returns {boolean} Whether requirements are met
   */
  hasResources(requirements) {
    return Object.entries(requirements).every(
      ([type, amount]) => this.getResource(type) >= amount
    );
  }
  
  /**
   * Spend resources if player has enough
   * @param {Object|number} requirements - Object with resource types and amounts, or single cost (uses metal)
   * @param {string} [defaultType='metal'] - Default resource type for single value
   * @returns {boolean} Whether transaction was successful
   */
  spend(requirements, defaultType = 'metal') {
    // Handle simplified case (just a number for metal)
    if (typeof requirements === 'number') {
      return this.removeResource(defaultType, requirements);
    }
    
    // Check if we have all required resources
    if (!this.hasResources(requirements)) {
      return false;
    }
    
    // Spend all resources
    Object.entries(requirements).forEach(([type, amount]) => {
      this.removeResource(type, amount);
    });
    
    return true;
  }
  
  /**
   * Get the current amount of a resource
   * @param {string} type - Resource type
   * @returns {number} Current amount
   */
  getResource(type) {
    return this.resources[type]?.amount || 0;
  }
  
  /**
   * Get the maximum capacity of a resource
   * @param {string} type - Resource type
   * @returns {number} Capacity
   */
  getCapacity(type) {
    return this.resources[type]?.capacity || 0;
  }
  
  /**
   * Get all resources
   * @returns {Object} Object with all resources
   */
  getAllResources() {
    const result = {};
    Object.entries(this.resources).forEach(([type, resource]) => {
      result[type] = {
        amount: resource.amount,
        capacity: resource.capacity,
        displayName: resource.displayName,
        color: resource.color,
        icon: resource.icon,
        extractionRate: resource.extractionRate
      };
    });
    return result;
  }
  
  /**
   * Change resource capacity
   * @param {string} type - Resource type
   * @param {number} capacity - New capacity
   * @returns {boolean} Whether capacity was changed
   */
  setResourceCapacity(type, capacity) {
    if (!this.resources[type] || capacity < 0) return false;
    
    const oldCapacity = this.resources[type].capacity;
    this.resources[type].capacity = capacity;
    
    // Update game state
    this.setState(`resources.${type}_capacity`, capacity);
    
    // Emit capacity changed event
    this.emit('resource:capacity_changed', {
      type,
      capacity,
      oldCapacity
    });
    
    return true;
  }
  
  /**
   * Add a resource deposit to the discovered list
   * @param {string} type - Resource type
   * @param {Object} position - Position object with x,y
   * @param {number} size - Size of deposit
   */
  addDeposit(type, position, size = 1) {
    if (!this.discoveredDeposits[type]) {
      this.discoveredDeposits[type] = [];
    }
    
    this.discoveredDeposits[type].push({
      position,
      size,
      discovered: Date.now()
    });
    
    // Update state
    this.setState(`terrain.deposits.${type}`, [...this.discoveredDeposits[type]]);
    
    // Emit discovery event
    this.emit('resource:deposit_added', {
      type,
      position,
      size,
      totalDeposits: this.discoveredDeposits[type].length
    });
  }
  
  /**
   * Get discovered deposits
   * @param {string} [type] - Resource type, or all if omitted
   * @returns {Array|Object} Array of deposits or object with all types
   */
  getDiscoveredDeposits(type) {
    if (type) {
      return this.discoveredDeposits[type] || [];
    }
    
    return { ...this.discoveredDeposits };
  }
  
  /**
   * Reset resource state
   */
  onReset() {
    // Reset all resources to 0
    Object.keys(this.resources).forEach(type => {
      this.resources[type].amount = 0;
      this.setState(`resources.${type}`, 0);
    });
    
    // Clear history
    this.collectionHistory = [];
    this.consumptionHistory = [];
    
    // Reset deposits
    this.discoveredDeposits = {
      metal: [],
      crystal: [],
      gas: []
    };
  }
} 