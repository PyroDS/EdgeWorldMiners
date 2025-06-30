/**
 * UIManager - Manages UI components and interactions
 * Provides centralized registration and management of UI elements.
 */
import services from './services.js';

export class UIManager {
  /**
   * Create a UI manager
   */
  constructor() {
    this.components = new Map();
    this.containers = new Map();
    this.modals = new Map();
    this.toasts = [];
    this.tooltips = new Map();
    
    // Track active UI state
    this.activeModal = null;
    this.activeTooltip = null;
    
    // Service references
    this.eventBus = null;
    this.gameState = null;
    
    this.initialized = false;
    
    // Default container regions
    this.defaultContainers = [
      'top-left', 'top', 'top-right',
      'left', 'center', 'right',
      'bottom-left', 'bottom', 'bottom-right'
    ];
  }
  
  /**
   * Initialize the UI manager
   */
  init() {
    if (this.initialized) {
      return;
    }
    
    try {
      // Get services
      this.eventBus = services.get('eventBus');
      this.gameState = services.get('gameState');
      
      // Register with services
      services.register('uiManager', this);
      
      // Create UI containers
      this._createContainers();
      
      // Set up event listeners
      this._setupEventListeners();
      
      this.initialized = true;
      console.log('[UIManager] Initialized');
    } catch (error) {
      console.error('[UIManager] Initialization failed:', error);
    }
  }
  
  /**
   * Create the UI containers
   * @private
   */
  _createContainers() {
    // Create main UI container if it doesn't exist
    if (!document.getElementById('ui-container')) {
      const uiContainer = document.createElement('div');
      uiContainer.id = 'ui-container';
      document.body.appendChild(uiContainer);
    }
    
    // Create position containers
    this.defaultContainers.forEach(position => {
      const container = document.createElement('div');
      container.id = `ui-${position}`;
      container.className = `ui-container ui-position-${position}`;
      document.getElementById('ui-container').appendChild(container);
      this.containers.set(position, container);
    });
    
    // Create special containers
    const modalContainer = document.createElement('div');
    modalContainer.id = 'ui-modal-container';
    modalContainer.className = 'ui-modal-container';
    document.getElementById('ui-container').appendChild(modalContainer);
    this.containers.set('modal', modalContainer);
    
    const toastContainer = document.createElement('div');
    toastContainer.id = 'ui-toast-container';
    toastContainer.className = 'ui-toast-container';
    document.getElementById('ui-container').appendChild(toastContainer);
    this.containers.set('toast', toastContainer);
    
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'ui-tooltip-container';
    tooltipContainer.className = 'ui-tooltip-container';
    document.getElementById('ui-container').appendChild(tooltipContainer);
    this.containers.set('tooltip', tooltipContainer);
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for UI-related events
    this.eventBus.on('ui:show_modal', this.showModal.bind(this));
    this.eventBus.on('ui:hide_modal', this.hideModal.bind(this));
    this.eventBus.on('ui:show_toast', this.showToast.bind(this));
    this.eventBus.on('ui:show_tooltip', this.showTooltip.bind(this));
    this.eventBus.on('ui:hide_tooltip', this.hideTooltip.bind(this));
    
    // Listen for scene changes to reset UI
    this.eventBus.on('scene:changed', () => {
      this.hideModal();
      this.hideAllTooltips();
    });
    
    // Listen for game state changes
    this.gameState.subscribe('ui.activeModal', (modal) => {
      if (!modal && this.activeModal) {
        this.hideModal();
      }
    });
    
    // Add ESC key listener for modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.activeModal) {
        this.hideModal();
      }
    });
  }
  
  /**
   * Register a UI component
   * @param {string} id - Component identifier
   * @param {Object} component - Component instance
   * @param {string} [position='center'] - Container position
   * @returns {Object} The registered component
   */
  registerComponent(id, component, position = 'center') {
    if (this.components.has(id)) {
      console.warn(`[UIManager] Component '${id}' is already registered`);
      return this.components.get(id);
    }
    
    this.components.set(id, {
      id,
      component,
      position,
      element: null,
      visible: false
    });
    
    // If component has an element property, mount it
    if (component.element) {
      this.mountComponent(id);
    }
    
    return component;
  }
  
  /**
   * Mount a component to the DOM
   * @param {string} id - Component identifier
   * @returns {boolean} Success status
   */
  mountComponent(id) {
    const component = this.components.get(id);
    if (!component) {
      console.error(`[UIManager] Component '${id}' not found`);
      return false;
    }
    
    // If already mounted, do nothing
    if (component.element && component.element.parentNode) {
      return true;
    }
    
    // Get the container for this component
    const container = this.containers.get(component.position);
    if (!container) {
      console.error(`[UIManager] Container '${component.position}' not found`);
      return false;
    }
    
    // Create element if component provides one
    if (component.component.element) {
      component.element = component.component.element;
      container.appendChild(component.element);
      component.visible = true;
      return true;
    }
    
    // Call render method if available
    if (typeof component.component.render === 'function') {
      const element = component.component.render();
      if (element instanceof HTMLElement) {
        component.element = element;
        container.appendChild(element);
        component.visible = true;
        return true;
      }
    }
    
    console.error(`[UIManager] Component '${id}' has no element or render method`);
    return false;
  }
  
  /**
   * Unmount a component from the DOM
   * @param {string} id - Component identifier
   * @returns {boolean} Success status
   */
  unmountComponent(id) {
    const component = this.components.get(id);
    if (!component || !component.element) {
      return false;
    }
    
    // Call beforeUnmount if available
    if (typeof component.component.beforeUnmount === 'function') {
      component.component.beforeUnmount();
    }
    
    // Remove from DOM
    if (component.element.parentNode) {
      component.element.parentNode.removeChild(component.element);
    }
    
    component.visible = false;
    return true;
  }
  
  /**
   * Show a component
   * @param {string} id - Component identifier
   * @returns {boolean} Success status
   */
  showComponent(id) {
    const component = this.components.get(id);
    if (!component) {
      console.error(`[UIManager] Component '${id}' not found`);
      return false;
    }
    
    // Mount component if needed
    if (!component.element || !component.element.parentNode) {
      this.mountComponent(id);
    }
    
    // Set visibility
    if (component.element) {
      component.element.style.display = '';
      component.visible = true;
      
      // Call onShow if available
      if (typeof component.component.onShow === 'function') {
        component.component.onShow();
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Hide a component
   * @param {string} id - Component identifier
   * @returns {boolean} Success status
   */
  hideComponent(id) {
    const component = this.components.get(id);
    if (!component || !component.element) {
      return false;
    }
    
    // Hide element
    component.element.style.display = 'none';
    component.visible = false;
    
    // Call onHide if available
    if (typeof component.component.onHide === 'function') {
      component.component.onHide();
    }
    
    return true;
  }
  
  /**
   * Register a modal
   * @param {string} id - Modal identifier
   * @param {Object} options - Modal options
   * @returns {Object} Modal configuration
   */
  registerModal(id, options = {}) {
    const modal = {
      id,
      title: options.title || '',
      content: options.content || null,
      contentElement: null,
      buttons: options.buttons || [],
      closable: options.closable !== false,
      onShow: options.onShow || null,
      onHide: options.onHide || null,
      onClose: options.onClose || null,
      element: null,
      visible: false
    };
    
    this.modals.set(id, modal);
    return modal;
  }
  
  /**
   * Show a modal
   * @param {string|Object} modalData - Modal ID or config with ID and data
   * @returns {boolean} Success status
   */
  showModal(modalData) {
    // Handle both string ID and object with data
    const modalId = typeof modalData === 'string' ? modalData : modalData.id;
    const data = typeof modalData === 'object' ? modalData.data || {} : {};
    
    const modal = this.modals.get(modalId);
    if (!modal) {
      console.error(`[UIManager] Modal '${modalId}' not found`);
      return false;
    }
    
    // Hide any active modal
    if (this.activeModal) {
      this.hideModal();
    }
    
    // Create modal element if needed
    if (!modal.element) {
      // Create modal container
      const modalElement = document.createElement('div');
      modalElement.className = 'ui-modal';
      modalElement.dataset.modal = modalId;
      
      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-modal-backdrop';
      if (modal.closable) {
        backdrop.addEventListener('click', () => this.hideModal());
      }
      modalElement.appendChild(backdrop);
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'ui-modal-content';
      modalElement.appendChild(modalContent);
      
      // Create header
      const header = document.createElement('div');
      header.className = 'ui-modal-header';
      modalContent.appendChild(header);
      
      // Create title
      const title = document.createElement('h2');
      title.className = 'ui-modal-title';
      title.textContent = modal.title;
      header.appendChild(title);
      
      // Create close button if closable
      if (modal.closable) {
        const closeButton = document.createElement('button');
        closeButton.className = 'ui-modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.hideModal());
        header.appendChild(closeButton);
      }
      
      // Create body
      const body = document.createElement('div');
      body.className = 'ui-modal-body';
      modalContent.appendChild(body);
      
      // Add content
      if (typeof modal.content === 'function') {
        try {
          const content = modal.content(data);
          if (typeof content === 'string') {
            body.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            body.appendChild(content);
            modal.contentElement = content;
          }
        } catch (error) {
          console.error(`[UIManager] Error rendering modal '${modalId}' content:`, error);
          body.innerHTML = '<div class="ui-modal-error">Error rendering content</div>';
        }
      } else if (typeof modal.content === 'string') {
        body.innerHTML = modal.content;
      }
      
      // Create footer if there are buttons
      if (modal.buttons && modal.buttons.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'ui-modal-footer';
        modalContent.appendChild(footer);
        
        // Add buttons
        modal.buttons.forEach(buttonConfig => {
          const button = document.createElement('button');
          button.className = `ui-button ui-modal-button ${buttonConfig.class || ''}`;
          button.textContent = buttonConfig.text;
          
          button.addEventListener('click', () => {
            if (buttonConfig.action) {
              buttonConfig.action(data);
            }
            
            if (buttonConfig.close !== false) {
              this.hideModal();
            }
          });
          
          footer.appendChild(button);
        });
      }
      
      modal.element = modalElement;
    }
    
    // Add to DOM
    const modalContainer = this.containers.get('modal');
    modalContainer.appendChild(modal.element);
    
    // Trigger animation
    setTimeout(() => {
      modal.element.classList.add('ui-modal-active');
    }, 10);
    
    // Update state
    modal.visible = true;
    this.activeModal = modal;
    this.gameState.update('ui.activeModal', { id: modalId, data });
    
    // Call onShow callback
    if (modal.onShow) {
      modal.onShow(data);
    }
    
    // Emit event
    this.eventBus.emit('ui:modal_opened', { id: modalId, data });
    
    return true;
  }
  
  /**
   * Hide the active modal
   * @returns {boolean} Success status
   */
  hideModal() {
    if (!this.activeModal) {
      return false;
    }
    
    const modal = this.activeModal;
    
    // Remove active class for animation
    modal.element.classList.remove('ui-modal-active');
    
    // Wait for animation to complete
    setTimeout(() => {
      // Remove from DOM
      if (modal.element.parentNode) {
        modal.element.parentNode.removeChild(modal.element);
      }
      
      // Clear reference
      this.activeModal = null;
      
      // Update state
      modal.visible = false;
      this.gameState.update('ui.activeModal', null);
      
      // Call onHide callback
      if (modal.onHide) {
        modal.onHide();
      }
      
      // Emit event
      this.eventBus.emit('ui:modal_closed', { id: modal.id });
    }, 300);
    
    return true;
  }
  
  /**
   * Show a toast notification
   * @param {string|Object} toastData - Message string or toast config
   * @returns {Object} Toast information
   */
  showToast(toastData) {
    // Handle both string message and object with options
    const message = typeof toastData === 'string' ? toastData : toastData.message;
    const type = typeof toastData === 'object' ? toastData.type || 'info' : 'info';
    const duration = typeof toastData === 'object' ? toastData.duration || 3000 : 3000;
    
    // Create toast element
    const toast = {
      id: `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      message,
      type,
      duration,
      timestamp: Date.now(),
      element: null
    };
    
    // Create DOM element
    const toastElement = document.createElement('div');
    toastElement.className = `ui-toast ui-toast-${type}`;
    toastElement.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'ui-toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => this.removeToast(toast.id));
    toastElement.appendChild(closeButton);
    
    // Add to DOM
    const toastContainer = this.containers.get('toast');
    toastContainer.appendChild(toastElement);
    
    // Store element reference
    toast.element = toastElement;
    
    // Add to toasts array
    this.toasts.push(toast);
    
    // Start animation
    setTimeout(() => {
      toastElement.classList.add('ui-toast-active');
    }, 10);
    
    // Set timeout to remove
    if (duration > 0) {
      toast.timeout = setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
    
    // Emit event
    this.eventBus.emit('ui:toast_shown', {
      id: toast.id,
      message,
      type
    });
    
    return toast;
  }
  
  /**
   * Remove a toast notification
   * @param {string} id - Toast ID
   * @returns {boolean} Success status
   */
  removeToast(id) {
    const toastIndex = this.toasts.findIndex(t => t.id === id);
    if (toastIndex === -1) {
      return false;
    }
    
    const toast = this.toasts[toastIndex];
    
    // Remove animation
    toast.element.classList.remove('ui-toast-active');
    toast.element.classList.add('ui-toast-removing');
    
    // Clear timeout if exists
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      // Remove from DOM
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      
      // Remove from array
      this.toasts = this.toasts.filter(t => t.id !== id);
      
      // Emit event
      this.eventBus.emit('ui:toast_hidden', { id });
    }, 300);
    
    return true;
  }
  
  /**
   * Register a tooltip
   * @param {string} id - Tooltip identifier
   * @param {HTMLElement} targetElement - Element to show tooltip for
   * @param {string|Object} content - Tooltip content or config
   * @returns {Object} Tooltip configuration
   */
  registerTooltip(id, targetElement, content) {
    // Already registered
    if (this.tooltips.has(id)) {
      console.warn(`[UIManager] Tooltip '${id}' is already registered`);
      return this.tooltips.get(id);
    }
    
    // Create tooltip config
    const tooltip = {
      id,
      targetElement,
      content: typeof content === 'string' ? content : content.content,
      position: typeof content === 'object' ? content.position || 'top' : 'top',
      element: null,
      visible: false
    };
    
    this.tooltips.set(id, tooltip);
    
    // Add event listeners to target
    targetElement.addEventListener('mouseenter', () => this.showTooltip(id));
    targetElement.addEventListener('mouseleave', () => this.hideTooltip(id));
    targetElement.addEventListener('focus', () => this.showTooltip(id));
    targetElement.addEventListener('blur', () => this.hideTooltip(id));
    
    return tooltip;
  }
  
  /**
   * Show a tooltip
   * @param {string} id - Tooltip ID
   * @returns {boolean} Success status
   */
  showTooltip(id) {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) {
      console.error(`[UIManager] Tooltip '${id}' not found`);
      return false;
    }
    
    // Create element if needed
    if (!tooltip.element) {
      const tooltipElement = document.createElement('div');
      tooltipElement.className = `ui-tooltip ui-tooltip-${tooltip.position}`;
      tooltipElement.innerHTML = tooltip.content;
      tooltip.element = tooltipElement;
    }
    
    // Add to DOM
    const tooltipContainer = this.containers.get('tooltip');
    tooltipContainer.appendChild(tooltip.element);
    
    // Position the tooltip
    this._positionTooltip(tooltip);
    
    // Add active class for animation
    setTimeout(() => {
      tooltip.element.classList.add('ui-tooltip-active');
    }, 10);
    
    // Set as active
    tooltip.visible = true;
    this.activeTooltip = tooltip;
    
    return true;
  }
  
  /**
   * Hide a tooltip
   * @param {string} id - Tooltip ID
   * @returns {boolean} Success status
   */
  hideTooltip(id) {
    const tooltip = this.tooltips.get(id);
    if (!tooltip || !tooltip.visible) {
      return false;
    }
    
    // Remove active class for animation
    tooltip.element.classList.remove('ui-tooltip-active');
    
    // Wait for animation to complete
    setTimeout(() => {
      // Remove from DOM
      if (tooltip.element.parentNode) {
        tooltip.element.parentNode.removeChild(tooltip.element);
      }
      
      // Clear active reference if this is the current active tooltip
      if (this.activeTooltip === tooltip) {
        this.activeTooltip = null;
      }
      
      // Update state
      tooltip.visible = false;
    }, 200);
    
    return true;
  }
  
  /**
   * Hide all tooltips
   */
  hideAllTooltips() {
    for (const [id, tooltip] of this.tooltips.entries()) {
      if (tooltip.visible) {
        this.hideTooltip(id);
      }
    }
  }
  
  /**
   * Position a tooltip relative to its target element
   * @param {Object} tooltip - Tooltip configuration
   * @private
   */
  _positionTooltip(tooltip) {
    if (!tooltip.element || !tooltip.targetElement) {
      return;
    }
    
    const targetRect = tooltip.targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.element.getBoundingClientRect();
    
    let top, left;
    
    switch (tooltip.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 5;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + 5;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - 5;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + 5;
        break;
    }
    
    // Apply position
    tooltip.element.style.top = `${top}px`;
    tooltip.element.style.left = `${left}px`;
  }
  
  /**
   * Clean up all UI components
   */
  cleanup() {
    // Hide any active modal
    if (this.activeModal) {
      this.hideModal();
    }
    
    // Hide all tooltips
    this.hideAllTooltips();
    
    // Remove all toasts
    this.toasts.forEach(toast => this.removeToast(toast.id));
    
    // Unmount all components
    for (const [id] of this.components.entries()) {
      this.unmountComponent(id);
    }
  }
}

// Create a singleton instance
const uiManager = new UIManager();
export default uiManager; 