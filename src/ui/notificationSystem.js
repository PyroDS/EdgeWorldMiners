/**
 * notificationSystem.js
 * 
 * A notification system for displaying messages to the player.
 * Uses the event system to show notifications triggered from anywhere in the game.
 */
import services from '../core/services.js';

export class NotificationSystem {
  /**
   * Create a new notification system
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      position: 'top-right',
      maxNotifications: 5,
      defaultDuration: 5000,
      container: null,
      animations: true,
      sounds: true,
      ...options
    };
    
    // Element references
    this.container = null;
    
    // Notification tracking
    this.notifications = [];
    this.notificationCount = 0;
    
    // Services
    this.eventBus = services.get('eventBus');
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the notification system
   */
  init() {
    // Create container
    this._createContainer();
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('[NotificationSystem] Initialized');
  }
  
  /**
   * Create the notification container
   * @private
   */
  _createContainer() {
    // Use provided container or create one
    if (this.options.container) {
      this.container = typeof this.options.container === 'string' 
        ? document.getElementById(this.options.container)
        : this.options.container;
    }
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for notification events
    this.eventBus.on('notification:show', this.show.bind(this));
    this.eventBus.on('notification:clear', this.clear.bind(this));
    
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
   * @param {Object} data - Notification data
   * @returns {string} Notification ID
   */
  show(data) {
    // Generate notification ID
    const id = `notification-${Date.now()}-${this.notificationCount++}`;
    
    // Create notification object
    const notification = {
      id,
      type: data.type || 'info',
      title: data.title || '',
      message: data.message || '',
      duration: data.duration !== undefined ? data.duration : this.options.defaultDuration,
      element: null,
      timer: null,
      startTime: Date.now(),
      remainingTime: null
    };
    
    // Create DOM element
    notification.element = this._createNotificationElement(notification);
    
    // Add to container
    this.container.appendChild(notification.element);
    
    // Add to tracking array
    this.notifications.push(notification);
    
    // Enforce max notifications
    this._enforceMaxNotifications();
    
    // Show the notification (triggers animation)
    setTimeout(() => {
      if (notification.element) {
        notification.element.classList.add('show');
      }
    }, 10);
    
    // Set up auto-remove timer if duration > 0
    if (notification.duration > 0) {
      this._setRemovalTimer(notification);
    }
    
    // Emit event
    this.eventBus.emit('notification:shown', {
      id: notification.id,
      type: notification.type
    });
    
    return id;
  }
  
  /**
   * Create the DOM element for a notification
   * @param {Object} notification - Notification object
   * @returns {HTMLElement} Notification element
   * @private
   */
  _createNotificationElement(notification) {
    // Create main element
    const element = document.createElement('div');
    element.className = `notification ${notification.type}`;
    element.id = notification.id;
    
    // Create icon
    const iconElement = document.createElement('div');
    iconElement.className = 'notification-icon';
    element.appendChild(iconElement);
    
    // Create content container
    const contentElement = document.createElement('div');
    contentElement.className = 'notification-content';
    
    // Add title if present
    if (notification.title) {
      const titleElement = document.createElement('div');
      titleElement.className = 'notification-title';
      titleElement.textContent = notification.title;
      contentElement.appendChild(titleElement);
    }
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.className = 'notification-message';
    messageElement.textContent = notification.message;
    contentElement.appendChild(messageElement);
    
    // Add content to notification
    element.appendChild(contentElement);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(notification.id);
    });
    element.appendChild(closeButton);
    
    // Add progress bar if timed
    if (notification.duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = 'notification-progress';
      progressBar.style.animation = `progress ${notification.duration / 1000}s linear forwards`;
      element.appendChild(progressBar);
    }
    
    // Add click handler to dismiss
    element.addEventListener('click', () => {
      this.remove(notification.id);
    });
    
    return element;
  }
  
  /**
   * Set a timer to automatically remove a notification
   * @param {Object} notification - Notification object
   * @private
   */
  _setRemovalTimer(notification) {
    notification.timer = setTimeout(() => {
      this.remove(notification.id);
    }, notification.duration);
  }
  
  /**
   * Enforce the maximum number of notifications
   * @private
   */
  _enforceMaxNotifications() {
    if (this.notifications.length > this.options.maxNotifications) {
      // Remove oldest notifications
      const toRemove = this.notifications.slice(
        0, 
        this.notifications.length - this.options.maxNotifications
      );
      
      for (const notification of toRemove) {
        this.remove(notification.id);
      }
    }
  }
  
  /**
   * Remove a notification
   * @param {string} id - Notification ID
   */
  remove(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      const notification = this.notifications[index];
      
      // Clear timer if exists
      if (notification.timer) {
        clearTimeout(notification.timer);
        notification.timer = null;
      }
      
      // Remove from DOM with animation
      if (notification.element) {
        notification.element.classList.remove('show');
        
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
          if (notification.element && notification.element.parentNode) {
            notification.element.parentNode.removeChild(notification.element);
          }
        }, 300);
      }
      
      // Remove from tracking array
      this.notifications.splice(index, 1);
      
      // Emit event
      this.eventBus.emit('notification:removed', {
        id
      });
    }
  }
  
  /**
   * Update an existing notification
   * @param {string} id - Notification ID
   * @param {Object} data - Updated notification data
   * @returns {boolean} Success status
   */
  update(id, data) {
    const notification = this.notifications.find(n => n.id === id);
    
    if (!notification) {
      return false;
    }
    
    // Update properties
    if (data.title !== undefined) {
      notification.title = data.title;
      const titleElement = notification.element.querySelector('.notification-title');
      if (titleElement) {
        titleElement.textContent = data.title;
      } else if (data.title) {
        // Create title element if it doesn't exist
        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title';
        titleElement.textContent = data.title;
        notification.element.querySelector('.notification-content').prepend(titleElement);
      }
    }
    
    if (data.message !== undefined) {
      notification.message = data.message;
      const messageElement = notification.element.querySelector('.notification-message');
      if (messageElement) {
        messageElement.textContent = data.message;
      }
    }
    
    if (data.type !== undefined && data.type !== notification.type) {
      // Update type
      notification.element.classList.remove(notification.type);
      notification.type = data.type;
      notification.element.classList.add(data.type);
    }
    
    if (data.duration !== undefined) {
      // Clear existing timer
      if (notification.timer) {
        clearTimeout(notification.timer);
        notification.timer = null;
      }
      
      // Update duration
      notification.duration = data.duration;
      
      // Update or remove progress bar
      let progressBar = notification.element.querySelector('.notification-progress');
      
      if (notification.duration > 0) {
        if (progressBar) {
          // Update existing progress bar
          progressBar.style.animation = `progress ${notification.duration / 1000}s linear forwards`;
        } else {
          // Create new progress bar
          progressBar = document.createElement('div');
          progressBar.className = 'notification-progress';
          progressBar.style.animation = `progress ${notification.duration / 1000}s linear forwards`;
          notification.element.appendChild(progressBar);
        }
        
        // Set new timer
        this._setRemovalTimer(notification);
      } else if (progressBar) {
        // Remove progress bar if duration is 0 or negative
        progressBar.parentNode.removeChild(progressBar);
      }
    }
    
    return true;
  }
  
  /**
   * Clear all notifications
   */
  clear() {
    // Make a copy of the array to avoid issues during iteration
    const notificationsCopy = [...this.notifications];
    
    // Remove each notification
    for (const notification of notificationsCopy) {
      this.remove(notification.id);
    }
    
    // Emit event
    this.eventBus.emit('notification:cleared');
  }
  
  /**
   * Pause all notification timers
   * @private
   */
  _pauseAllTimers() {
    for (const notification of this.notifications) {
      if (notification.timer) {
        // Clear the timer
        clearTimeout(notification.timer);
        notification.timer = null;
        
        // Calculate remaining time
        notification.remainingTime = notification.duration - (Date.now() - notification.startTime);
        
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
        notification.timer = setTimeout(() => {
          this.remove(notification.id);
        }, notification.remainingTime);
        
        // Update start time
        notification.startTime = Date.now();
        
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
  
  /**
   * Show an info notification
   * @param {string} message - Notification message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration in ms
   * @returns {string} Notification ID
   */
  info(message, title = '', duration) {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show a success notification
   * @param {string} message - Notification message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration in ms
   * @returns {string} Notification ID
   */
  success(message, title = '', duration) {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show a warning notification
   * @param {string} message - Notification message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration in ms
   * @returns {string} Notification ID
   */
  warning(message, title = '', duration) {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show an error notification
   * @param {string} message - Notification message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration in ms
   * @returns {string} Notification ID
   */
  error(message, title = '', duration) {
    return this.show({
      type: 'error',
      title,
      message,
      duration
    });
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear all notifications
    this.clear();
    
    // Remove event listeners
    if (this.eventBus) {
      this.eventBus.off('notification:show', this.show);
      this.eventBus.off('notification:clear', this.clear);
    }
    
    // Remove container if it was created by this component
    if (this.container && !this.options.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clear references
    this.container = null;
    this.notifications = [];
  }
}
