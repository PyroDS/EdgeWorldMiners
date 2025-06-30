/**
 * UIComponent - Base class for all UI components
 * Provides common functionality for UI elements across the application.
 */
export class UIComponent {
  /**
   * Create a new UI component
   * @param {string} elementId - ID for the element (optional, will create one if not provided)
   * @param {string} type - HTML element type to create (div by default)
   */
  constructor(elementId, type = 'div') {
    if (elementId) {
      // Try to find existing element
      this.element = document.getElementById(elementId);
      if (!this.element) {
        // Create element with specified ID
        this.element = document.createElement(type);
        this.element.id = elementId;
      }
    } else {
      // Create element without specific ID
      this.element = document.createElement(type);
      this.element.id = `ui-component-${Math.floor(Math.random() * 10000)}`;
    }
    
    // Store children components
    this.children = [];
    this.visible = true;
    this.mounted = false;
    this.eventListeners = [];
  }
  
  /**
   * Add a child component
   * @param {UIComponent} child - Child component to add
   * @returns {UIComponent} The added child
   */
  addChild(child) {
    this.children.push(child);
    this.element.appendChild(child.element);
    child.onMount();
    child.mounted = true;
    return child;
  }
  
  /**
   * Remove a child component
   * @param {UIComponent} child - Child to remove
   * @returns {boolean} Whether removal was successful
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.onBeforeUnmount();
      this.children.splice(index, 1);
      this.element.removeChild(child.element);
      child.mounted = false;
      return true;
    }
    return false;
  }
  
  /**
   * Show this component
   */
  show() {
    this.visible = true;
    this.element.style.display = '';
    this.onShow();
  }
  
  /**
   * Hide this component
   */
  hide() {
    this.visible = false;
    this.element.style.display = 'none';
    this.onHide();
  }
  
  /**
   * Set the position of this component
   * @param {number} x - X position in pixels
   * @param {number} y - Y position in pixels
   */
  setPosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
  
  /**
   * Set the content of this component
   * @param {string} content - HTML content
   */
  setContent(content) {
    this.element.innerHTML = content;
  }
  
  /**
   * Add a CSS class to this component
   * @param {string} className - CSS class to add
   */
  addClass(className) {
    this.element.classList.add(className);
  }
  
  /**
   * Remove a CSS class from this component
   * @param {string} className - CSS class to remove
   */
  removeClass(className) {
    this.element.classList.remove(className);
  }
  
  /**
   * Toggle a CSS class on this component
   * @param {string} className - CSS class to toggle
   * @param {boolean} force - Force add or remove
   */
  toggleClass(className, force) {
    this.element.classList.toggle(className, force);
  }
  
  /**
   * Add an event listener
   * @param {string} event - Event type to listen for
   * @param {Function} callback - Event handler
   */
  addEventListener(event, callback) {
    this.element.addEventListener(event, callback);
    this.eventListeners.push({ event, callback });
  }
  
  /**
   * Remove an event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event handler
   */
  removeEventListener(event, callback) {
    this.element.removeEventListener(event, callback);
    const index = this.eventListeners.findIndex(
      listener => listener.event === event && listener.callback === callback
    );
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Clean up all event listeners
   */
  removeAllEventListeners() {
    this.eventListeners.forEach(({ event, callback }) => {
      this.element.removeEventListener(event, callback);
    });
    this.eventListeners = [];
  }
  
  /**
   * Lifecycle hook called when component is mounted to DOM
   */
  onMount() {
    // Override in subclasses
  }
  
  /**
   * Lifecycle hook called before component is unmounted from DOM
   */
  onBeforeUnmount() {
    // Remove all event listeners
    this.removeAllEventListeners();
    // Override in subclasses for additional cleanup
  }
  
  /**
   * Lifecycle hook called when component is shown
   */
  onShow() {
    // Override in subclasses
  }
  
  /**
   * Lifecycle hook called when component is hidden
   */
  onHide() {
    // Override in subclasses
  }
  
  /**
   * Clean up component resources
   */
  destroy() {
    // Clean up event listeners
    this.removeAllEventListeners();
    
    // Remove children first
    [...this.children].forEach(child => this.removeChild(child));
    
    // Remove from parent if mounted
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
} 