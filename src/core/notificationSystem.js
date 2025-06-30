/**
 * NotificationSystem - Manages game notifications and alerts
 * Provides a centralized way to display messages to the player.
 */
import services from './services.js';

export class NotificationSystem {
  /**
   * Create a notification system
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxNotifications: 5,
      defaultDuration: 5000,
      container: null,
      position: 'top-right',
      animations: true,
      sounds: true,
      ...options
    };
    
    this.notifications = [];
    this.container = null;
    this.queue = [];
    this.eventBus = null;
    this.gameState = null;
    this.initialized = false;
    this.notificationCount = 0;
  }
  
  /**
   * Initialize the notification system
   * @returns {boolean} Success status
   */
  init() {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Get services
      this.eventBus = services.get('eventBus');
      this.gameState = services.get('gameState');
      
      // Register with services
      services.register('notificationSystem', this);
      
      // Create container
      this._createContainer();
      
      // Set up event listeners
      this._setupEventListeners();
      
      this.initialized = true;
      console.log('[NotificationSystem] Initialized');
      return true;
    } catch (error) {
      console.error('[NotificationSystem] Initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Create the notification container
   * @private
   */
  _createContainer() {
    // Use provided container if available
    if (this.options.container) {
      if (typeof this.options.container === 'string') {
        this.container = document.querySelector(this.options.container);
      } else {
        this.container = this.options.container;
      }
    }
    
    // Create a new container if not provided or not found
    if (!this.container) {
      const container = document.createElement('div');
      container.id = 'game-notifications';
      container.className = `notification-container notification-${this.options.position}`;
      document.body.appendChild(container);
      this.container = container;
    }
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for notification events
    this.eventBus.on('notification:show', this.show.bind(this));
    this.eventBus.on('notification:info', (data) => {
      this.show({ ...data, type: 'info' });
    });
    this.eventBus.on('notification:success', (data) => {
      this.show({ ...data, type: 'success' });
    });
    this.eventBus.on('notification:warning', (data) => {
      this.show({ ...data, type: 'warning' });
    });
    this.eventBus.on('notification:error', (data) => {
      this.show({ ...data, type: 'error' });
    });
    this.eventBus.on('notification:clear', this.clearAll.bind(this));
    
    // Listen for game state changes
    this.eventBus.on('game:paused', () => {
      // Pause all notification timers
      this._pauseAllTimers();
    });
    
    this.eventBus.on('game:resumed', () => {
      // Resume all notification timers
      this._resumeAllTimers();
    });
  }
  
  /**
   * Show a notification
   * @param {string|Object} options - Notification message or options
   * @returns {Object|null} Notification object or null
   */
  show(options) {
    // Handle string message
    if (typeof options === 'string') {
      options = { message: options };
    }
    
    // Create notification object
    const notification = {
      id: `notification-${Date.now()}-${this.notificationCount++}`,
      message: options.message,
      type: options.type || 'info',
      duration: options.duration || this.options.defaultDuration,
      timestamp: Date.now(),
      element: null,
      onClose: options.onClose || null,
      actionText: options.actionText || null,
      actionHandler: options.actionHandler || null
    };
    
    // Add to queue if at max
    if (this.notifications.length >= this.options.maxNotifications) {
      this.queue.push(notification);
      return notification;
    }
    
    this._createNotification(notification);
    return notification;
  }
  
  /**
   * Create and display a notification
   * @param {Object} notification - Notification configuration
   * @private
   */
  _createNotification(notification) {
    // Create notification element
    const element = document.createElement('div');
    element.className = `game-notification notification-${notification.type}`;
    element.dataset.id = notification.id;
    
    // Create message
    const message = document.createElement('div');
    message.className = 'notification-message';
    message.textContent = notification.message;
    element.appendChild(message);
    
    // Create action button if needed
    if (notification.actionText && notification.actionHandler) {
      const actionButton = document.createElement('button');
      actionButton.className = 'notification-action';
      actionButton.textContent = notification.actionText;
      actionButton.addEventListener('click', (event) => {
        event.stopPropagation();
        notification.actionHandler(notification);
      });
      element.appendChild(actionButton);
    }
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      this.remove(notification.id);
    });
    element.appendChild(closeButton);
    
    // Add click handler to dismiss
    element.addEventListener('click', () => {
      this.remove(notification.id);
    });
    
    // Add to DOM
    this.container.appendChild(element);
    notification.element = element;
    
    // Add to active notifications
    this.notifications.push(notification);
    
    // Start animation
    setTimeout(() => {
      element.classList.add('notification-active');
    }, 10);
    
    // Set timeout to auto-remove if duration > 0
    if (notification.duration > 0) {
      notification.timeout = setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }
    
    // Emit event
    this.eventBus.emit('notification:shown', {
      id: notification.id,
      message: notification.message,
      type: notification.type
    });
    
    // Update game state
    this.gameState.update('ui.notifications', this.notifications.length);
  }
  
  /**
   * Remove a notification
   * @param {string} id - Notification ID
   * @returns {boolean} Success status
   */
  remove(id) {
    const notificationIndex = this.notifications.findIndex(n => n.id === id);
    if (notificationIndex === -1) {
      return false;
    }
    
    const notification = this.notifications[notificationIndex];
    
    // Remove animation
    notification.element.classList.remove('notification-active');
    notification.element.classList.add('notification-removing');
    
    // Clear timeout if exists
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      // Remove from DOM
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      
      // Remove from array
      this.notifications = this.notifications.filter(n => n.id !== id);
      
      // Call onClose callback
      if (notification.onClose) {
        notification.onClose(notification);
      }
      
      // Emit event
      this.eventBus.emit('notification:hidden', { id });
      
      // Update game state
      this.gameState.update('ui.notifications', this.notifications.length);
      
      // Show next notification from queue if available
      if (this.queue.length > 0 && this.notifications.length < this.options.maxNotifications) {
        const next = this.queue.shift();
        this._createNotification(next);
      }
    }, 300);
    
    return true;
  }
  
  /**
   * Show an info notification (shorthand)
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification object
   */
  info(message, options = {}) {
    return this.show({
      message,
      type: 'info',
      ...options
    });
  }
  
  /**
   * Show a success notification (shorthand)
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification object
   */
  success(message, options = {}) {
    return this.show({
      message,
      type: 'success',
      ...options
    });
  }
  
  /**
   * Show a warning notification (shorthand)
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification object
   */
  warning(message, options = {}) {
    return this.show({
      message,
      type: 'warning',
      ...options
    });
  }
  
  /**
   * Show an error notification (shorthand)
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @returns {Object} Notification object
   */
  error(message, options = {}) {
    return this.show({
      message,
      type: 'error',
      ...options
    });
  }
  
  /**
   * Clear all active notifications
   */
  clearAll() {
    // Copy the array to avoid modification during iteration
    const notifications = [...this.notifications];
    notifications.forEach(notification => {
      this.remove(notification.id);
    });
    
    // Clear queue
    this.queue = [];
    
    // Update game state
    this.gameState.update('ui.notifications', 0);
  }
  
  /**
   * Pause all notification timers
   * @private
   */
  _pauseAllTimers() {
    for (const notification of this.notifications) {
      if (notification.timeout) {
        // Clear the timer
        clearTimeout(notification.timeout);
        notification.timeout = null;
        
        // Calculate remaining time
        notification.remainingTime = notification.duration - (Date.now() - notification.timestamp);
        
        // Pause the progress bar animation
        const progressBar = notification.element.querySelector('.notification-progress');
        if (progressBar) {
          const computedStyle = window.getComputedStyle(progressBar);
          progressBar.style.animationPlayState = 'paused';
        }
      }
    }
  }
  
  /**
   * Resume all notification timers
   * @private
   */
  _resumeAllTimers() {
    for (const notification of this.notifications) {
      if (notification.remainingTime !== null) {
        // Set new timer with remaining time
        notification.timeout = setTimeout(() => {
          this.remove(notification.id);
        }, notification.remainingTime);
        
        // Update timestamp
        notification.timestamp = Date.now();
        
        // Resume the progress bar animation
        const progressBar = notification.element.querySelector('.notification-progress');
        if (progressBar) {
          progressBar.style.animationPlayState = 'running';
        }
        
        // Clear remaining time
        notification.remainingTime = null;
      }
    }
  }
}

// Create a singleton instance
const notificationSystem = new NotificationSystem();
export default notificationSystem; 