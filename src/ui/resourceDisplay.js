/**
 * resourceDisplay.js
 * 
 * UI component that displays the player's resources.
 * Shows current amounts, capacity, and handles animations for changes.
 * 
 * Dependencies:
 * - core/services.js
 */
import services from '../core/services.js';

export class ResourceDisplay {
  /**
   * Create a new resource display
   * @param {string} containerId - ID of container element
   */
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`ResourceDisplay: Container element with ID "${containerId}" not found`);
      return;
    }
    
    this.resources = {
      metal: { amount: 0, capacity: 1000 },
      crystal: { amount: 0, capacity: 500 },
      gas: { amount: 0, capacity: 300 }
    };
    
    this.elements = {};
    this.animations = {};
    this.eventBus = null;
    this.gameState = null;
    
    // Initialize
    this._initialize();
  }
  
  /**
   * Initialize the resource display
   * @private
   */
  _initialize() {
    // Get services
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    
    // Create UI elements
    this._createElements();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Initial update
    this._updateFromGameState();
  }
  
  /**
   * Create UI elements for resources
   * @private
   */
  _createElements() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'resource-header';
    header.innerHTML = '<h3>Resources</h3>';
    this.container.appendChild(header);
    
    // Create resource elements
    for (const [type, resource] of Object.entries(this.resources)) {
      const resourceElement = document.createElement('div');
      resourceElement.className = `resource-item ${type}`;
      
      // Create icon
      const icon = document.createElement('div');
      icon.className = `resource-icon ${type}-icon`;
      resourceElement.appendChild(icon);
      
      // Create info container
      const info = document.createElement('div');
      info.className = 'resource-info';
      
      // Create label
      const label = document.createElement('div');
      label.className = 'resource-label';
      label.textContent = this._capitalizeFirstLetter(type);
      info.appendChild(label);
      
      // Create amount display
      const amountContainer = document.createElement('div');
      amountContainer.className = 'resource-amount-container';
      
      const amount = document.createElement('span');
      amount.className = 'resource-amount';
      amount.textContent = resource.amount;
      amountContainer.appendChild(amount);
      
      const capacity = document.createElement('span');
      capacity.className = 'resource-capacity';
      capacity.textContent = ` / ${resource.capacity}`;
      amountContainer.appendChild(capacity);
      
      info.appendChild(amountContainer);
      
      // Create progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'resource-progress-container';
      
      const progressBar = document.createElement('div');
      progressBar.className = `resource-progress ${type}-progress`;
      progressBar.style.width = `${(resource.amount / resource.capacity) * 100}%`;
      progressContainer.appendChild(progressBar);
      
      info.appendChild(progressContainer);
      
      // Add info to resource element
      resourceElement.appendChild(info);
      
      // Add resource element to container
      this.container.appendChild(resourceElement);
      
      // Store references to elements
      this.elements[type] = {
        container: resourceElement,
        icon: icon,
        label: label,
        amount: amount,
        capacity: capacity,
        progressBar: progressBar
      };
    }
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.eventBus) return;
    
    // Listen for resource changes
    this.eventBus.on('resource:updated', (data) => {
      this.updateResource(data.type, data.amount, data.capacity);
    });
    
    // Listen for all resources updated
    this.eventBus.on('resources:updated', (data) => {
      for (const [type, resource] of Object.entries(data.resources)) {
        this.updateResource(type, resource.amount, resource.capacity);
      }
    });
    
    // Listen for resource collected
    this.eventBus.on('resource:collected', (data) => {
      this._animateResourceChange(data.type, data.amount);
    });
    
    // Listen for resource consumed
    this.eventBus.on('resource:consumed', (data) => {
      this._animateResourceChange(data.type, -data.amount);
    });
    
    // Listen for game state changes
    this.eventBus.on('gameState:changed', (data) => {
      if (data.path.startsWith('resources.')) {
        this._updateFromGameState();
      }
    });
  }
  
  /**
   * Update display from game state
   * @private
   */
  _updateFromGameState() {
    if (!this.gameState) return;
    
    // Get resources from game state
    const stateResources = this.gameState.get('resources');
    if (!stateResources) return;
    
    // Update each resource
    for (const [type, resource] of Object.entries(this.resources)) {
      const stateAmount = stateResources[type]?.amount || 0;
      const stateCapacity = stateResources[type]?.capacity || resource.capacity;
      
      this.updateResource(type, stateAmount, stateCapacity);
    }
  }
  
  /**
   * Update a specific resource
   * @param {string} type - Resource type
   * @param {number} amount - Resource amount
   * @param {number} capacity - Resource capacity
   */
  updateResource(type, amount, capacity) {
    // Check if resource type exists
    if (!this.resources[type]) {
      console.warn(`ResourceDisplay: Unknown resource type "${type}"`);
      return;
    }
    
    // Update resource data
    const oldAmount = this.resources[type].amount;
    this.resources[type].amount = amount;
    this.resources[type].capacity = capacity;
    
    // Update UI elements
    const elements = this.elements[type];
    if (!elements) return;
    
    // Update amount text
    elements.amount.textContent = amount;
    
    // Update capacity text
    elements.capacity.textContent = ` / ${capacity}`;
    
    // Update progress bar
    const percentage = (amount / capacity) * 100;
    elements.progressBar.style.width = `${percentage}%`;
    
    // Update color based on fill level
    if (percentage > 90) {
      elements.progressBar.classList.add('full');
    } else {
      elements.progressBar.classList.remove('full');
    }
    
    // Animate change if different from old amount
    if (amount !== oldAmount) {
      const change = amount - oldAmount;
      this._animateResourceChange(type, change);
    }
  }
  
  /**
   * Animate a resource change
   * @param {string} type - Resource type
   * @param {number} change - Amount changed
   * @private
   */
  _animateResourceChange(type, change) {
    // Check if resource type exists
    if (!this.resources[type] || !this.elements[type]) {
      return;
    }
    
    // Skip if no change
    if (change === 0) {
      return;
    }
    
    // Get resource element
    const element = this.elements[type].container;
    
    // Create animation element
    const animation = document.createElement('div');
    animation.className = `resource-change ${change > 0 ? 'positive' : 'negative'}`;
    animation.textContent = `${change > 0 ? '+' : ''}${change}`;
    
    // Position animation
    animation.style.position = 'absolute';
    animation.style.top = '50%';
    animation.style.right = '10px';
    animation.style.transform = 'translateY(-50%)';
    
    // Add to element
    element.style.position = 'relative';
    element.appendChild(animation);
    
    // Highlight element
    element.classList.add('highlight');
    
    // Animate
    setTimeout(() => {
      animation.style.opacity = '0';
      animation.style.transform = 'translateY(-100%)';
    }, 50);
    
    // Remove animation element after animation
    setTimeout(() => {
      if (element.contains(animation)) {
        element.removeChild(animation);
      }
      element.classList.remove('highlight');
    }, 1000);
    
    // Cancel existing animation for this resource
    if (this.animations[type]) {
      clearTimeout(this.animations[type]);
    }
    
    // Store animation timeout
    this.animations[type] = setTimeout(() => {
      this.animations[type] = null;
    }, 1000);
  }
  
  /**
   * Capitalize the first letter of a string
   * @param {string} string - String to capitalize
   * @returns {string} Capitalized string
   * @private
   */
  _capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  /**
   * Show the resource display
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }
  
  /**
   * Hide the resource display
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear animations
    for (const timeout of Object.values(this.animations)) {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    this.animations = {};
    
    // Clear event listeners
    if (this.eventBus) {
      this.eventBus.off('resource:updated');
      this.eventBus.off('resources:updated');
      this.eventBus.off('resource:collected');
      this.eventBus.off('resource:consumed');
      this.eventBus.off('gameState:changed');
    }
    
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Clear references
    this.elements = {};
    this.resources = {};
    this.container = null;
  }
}
