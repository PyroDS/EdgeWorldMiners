/**
 * ModalDialog - Generic modal dialog component
 * Provides a reusable dialog box for confirmations and information.
 */
import { UIComponent } from './UIComponent.js';
import services from '../core/services.js';

export class ModalDialog extends UIComponent {
  /**
   * Create a new modal dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Object} options - Configuration options
   */
  constructor(title, message, options = {}) {
    super(null, 'div');
    
    // Apply styling
    this.addClass('modal-dialog');
    
    // Store options
    this.title = title || 'Dialog';
    this.message = message || '';
    this.options = Object.assign({
      showCancel: true,
      confirmText: 'OK',
      cancelText: 'Cancel',
      confirmClass: 'primary-button',
      cancelClass: 'secondary-button',
      size: 'medium', // small, medium, large
      backdrop: true,  // show backdrop
      closeOnEscape: true, // close on ESC key
    }, options);
    
    // Store callbacks
    this.onConfirm = options.onConfirm || null;
    this.onCancel = options.onCancel || null;
    this.onClose = options.onClose || null;
    
    // Get services
    this.eventBus = services.get('eventBus');
    
    // Create dialog elements
    this.createDialogElements();
    
    // Hide by default
    this.hide();
  }
  
  /**
   * Create the dialog UI elements
   */
  createDialogElements() {
    // Create backdrop if enabled
    if (this.options.backdrop) {
      this.backdrop = new UIComponent(null, 'div');
      this.backdrop.addClass('modal-backdrop');
      this.addChild(this.backdrop);
    }
    
    // Create dialog container
    this.dialog = new UIComponent(null, 'div');
    this.dialog.addClass('modal-container');
    this.dialog.addClass(`size-${this.options.size}`);
    this.addChild(this.dialog);
    
    // Create header
    this.header = new UIComponent(null, 'div');
    this.header.addClass('modal-header');
    this.header.setContent(`
      <h3>${this.title}</h3>
      <button class="close-button">&times;</button>
    `);
    this.dialog.addChild(this.header);
    
    // Add close button handler
    const closeButton = this.header.element.querySelector('.close-button');
    closeButton.addEventListener('click', () => this.cancel());
    
    // Create content area
    this.content = new UIComponent(null, 'div');
    this.content.addClass('modal-content');
    this.content.setContent(`<p>${this.message}</p>`);
    this.dialog.addChild(this.content);
    
    // Create footer with buttons
    this.footer = new UIComponent(null, 'div');
    this.footer.addClass('modal-footer');
    
    let footerContent = '';
    if (this.options.showCancel) {
      footerContent += `<button class="cancel-btn ${this.options.cancelClass}">${this.options.cancelText}</button>`;
    }
    footerContent += `<button class="confirm-btn ${this.options.confirmClass}">${this.options.confirmText}</button>`;
    
    this.footer.setContent(footerContent);
    this.dialog.addChild(this.footer);
    
    // Add button event listeners
    const confirmButton = this.footer.element.querySelector('.confirm-btn');
    confirmButton.addEventListener('click', () => this.confirm());
    
    const cancelButton = this.footer.element.querySelector('.cancel-btn');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.cancel());
    }
    
    // Add ESC key handler if enabled
    if (this.options.closeOnEscape) {
      this.escHandler = (e) => {
        if (e.key === 'Escape') {
          this.cancel();
        }
      };
    }
  }
  
  /**
   * Show the dialog
   */
  show() {
    super.show();
    
    // Add ESC key handler if enabled
    if (this.options.closeOnEscape && this.escHandler) {
      document.addEventListener('keydown', this.escHandler);
    }
    
    // Emit dialog shown event
    this.eventBus.emit('ui:dialog:shown', { dialog: this });
    
    // Add class to animate in
    setTimeout(() => {
      this.addClass('visible');
    }, 10);
  }
  
  /**
   * Hide the dialog
   */
  hide() {
    // Remove ESC key handler
    if (this.options.closeOnEscape && this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
    }
    
    // Animate out then hide
    this.removeClass('visible');
    setTimeout(() => {
      super.hide();
      // Emit dialog hidden event
      this.eventBus.emit('ui:dialog:hidden', { dialog: this });
    }, 300); // Match CSS transition duration
  }
  
  /**
   * Confirm the dialog action
   */
  confirm() {
    if (this.onConfirm) {
      this.onConfirm();
    }
    
    this.hide();
  }
  
  /**
   * Cancel the dialog action
   */
  cancel() {
    if (this.onCancel) {
      this.onCancel();
    }
    
    this.hide();
    
    if (this.onClose) {
      this.onClose();
    }
  }
  
  /**
   * Update dialog content
   * @param {string} content - New HTML content
   */
  setContentHTML(content) {
    this.content.setContent(content);
  }
  
  /**
   * Static helper to create a confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirm - Confirmation callback
   * @param {Function} onCancel - Cancel callback
   * @returns {ModalDialog} Dialog instance
   */
  static confirm(title, message, onConfirm, onCancel) {
    return new ModalDialog(title, message, {
      onConfirm,
      onCancel,
      confirmText: 'Confirm',
      showCancel: true
    });
  }
  
  /**
   * Static helper to create an alert dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onClose - Close callback
   * @returns {ModalDialog} Dialog instance
   */
  static alert(title, message, onClose) {
    return new ModalDialog(title, message, {
      onConfirm: onClose,
      confirmText: 'OK',
      showCancel: false
    });
  }
} 