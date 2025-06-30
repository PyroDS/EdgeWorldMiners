/**
 * ToastNotification - Lightweight notification component
 * Provides a way to show temporary messages to the user.
 */
import { UIComponent } from './UIComponent.js';
import services from '../core/services.js';

export class ToastNotification extends UIComponent {
  /**
   * Create a new toast notification
   * @param {string} message - The notification message
   * @param {Object} options - Configuration options
   */
  constructor(message, options = {}) {
    super(null, 'div');
    
    // Apply styling
    this.addClass('toast-notification');
    
    // Apply type-specific styling
    if (options.type) {
      this.addClass(`toast-${options.type}`);
    } else {
      this.addClass('toast-info'); // Default type
    }
    
    // Store options
    this.message = message || '';
    this.options = Object.assign({
      duration: 3000, // Time in ms before auto-hiding
      type: 'info',   // info, success, warning, error
      showProgress: true, // Show progress bar
      closable: true  // Show close button
    }, options);
    
    // Store state
    this.timeoutId = null;
    this.startTime = 0;
    this.remainingTime = this.options.duration;
    this.visible = false;
    
    // Track animation frame for progress bar
    this.animationFrameId = null;
    
    // Get event bus
    this.eventBus = services.get('eventBus');
    
    // Create elements
    this.createElements();
  }
  
  /**
   * Create the toast elements
   */
  createElements() {
    // Create content
    let content = `<div class="toast-content">
      <div class="toast-message">${this.message}</div>`;
    
    if (this.options.closable) {
      content += `<button class="toast-close">&times;</button>`;
    }
    
    content += `</div>`;
    
    if (this.options.showProgress) {
      content += `<div class="toast-progress">
        <div class="toast-progress-bar"></div>
      </div>`;
    }
    
    this.setContent(content);
    
    // Add event listeners
    if (this.options.closable) {
      const closeButton = this.element.querySelector('.toast-close');
      closeButton.addEventListener('click', () => this.close());
    }
    
    // Store progress bar reference if enabled
    if (this.options.showProgress) {
      this.progressBar = this.element.querySelector('.toast-progress-bar');
    }
    
    // Add hover event listeners to pause timer
    this.element.addEventListener('mouseenter', () => this.pause());
    this.element.addEventListener('mouseleave', () => this.resume());
  }
  
  /**
   * Show the toast notification
   */
  show() {
    this.visible = true;
    this.startTime = Date.now();
    
    // Add visible class for animation
    this.addClass('visible');
    
    // Start the timer
    this.startTimer();
    
    // Start progress bar animation if enabled
    if (this.options.showProgress && this.progressBar) {
      this.updateProgressBar();
    }
    
    // Emit shown event
    this.eventBus.emit('ui:toast:shown', { toast: this });
  }
  
  /**
   * Start the auto-hide timer
   */
  startTimer() {
    this.clearTimer();
    
    if (this.options.duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.close();
      }, this.remainingTime);
    }
  }
  
  /**
   * Clear the auto-hide timer
   */
  clearTimer() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Update the progress bar width
   */
  updateProgressBar() {
    if (!this.options.showProgress || !this.progressBar || !this.visible) {
      return;
    }
    
    // Calculate elapsed percentage
    const elapsed = Date.now() - this.startTime;
    const percentage = Math.max(0, Math.min(100, 100 - (elapsed / this.options.duration * 100)));
    
    // Update progress bar width
    this.progressBar.style.width = `${percentage}%`;
    
    // Schedule next update if still visible
    if (percentage > 0 && this.visible) {
      this.animationFrameId = requestAnimationFrame(() => this.updateProgressBar());
    }
  }
  
  /**
   * Close the toast
   */
  close() {
    // Already closing
    if (!this.visible) {
      return;
    }
    
    this.visible = false;
    this.clearTimer();
    
    // Start hiding animation
    this.removeClass('visible');
    this.addClass('hiding');
    
    // Remove after animation
    setTimeout(() => {
      // Emit closed event
      this.eventBus.emit('ui:toast:closed', { toast: this });
      
      // Remove from parent if mounted
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300); // Match CSS animation duration
  }
  
  /**
   * Pause the timer (when hovering)
   */
  pause() {
    if (!this.visible || this.timeoutId === null) {
      return;
    }
    
    // Clear current timer
    this.clearTimer();
    
    // Calculate remaining time
    this.remainingTime = Math.max(0, this.options.duration - (Date.now() - this.startTime));
  }
  
  /**
   * Resume the timer (when no longer hovering)
   */
  resume() {
    if (!this.visible) {
      return;
    }
    
    // Update start time to now
    this.startTime = Date.now();
    
    // Restart the timer with remaining time
    this.startTimer();
    
    // Restart progress bar animation
    if (this.options.showProgress && this.progressBar) {
      this.updateProgressBar();
    }
  }
  
  /**
   * Static helper to create a success toast
   * @param {string} message - Toast message
   * @param {Object} options - Additional options
   * @returns {ToastNotification} Toast instance
   */
  static success(message, options = {}) {
    return new ToastNotification(message, {
      ...options,
      type: 'success'
    });
  }
  
  /**
   * Static helper to create an error toast
   * @param {string} message - Toast message
   * @param {Object} options - Additional options
   * @returns {ToastNotification} Toast instance
   */
  static error(message, options = {}) {
    return new ToastNotification(message, {
      ...options,
      type: 'error',
      duration: options.duration || 5000 // Longer duration for errors by default
    });
  }
  
  /**
   * Static helper to create a warning toast
   * @param {string} message - Toast message
   * @param {Object} options - Additional options
   * @returns {ToastNotification} Toast instance
   */
  static warning(message, options = {}) {
    return new ToastNotification(message, {
      ...options,
      type: 'warning'
    });
  }
  
  /**
   * Static helper to create an info toast
   * @param {string} message - Toast message
   * @param {Object} options - Additional options
   * @returns {ToastNotification} Toast instance
   */
  static info(message, options = {}) {
    return new ToastNotification(message, {
      ...options,
      type: 'info'
    });
  }
} 