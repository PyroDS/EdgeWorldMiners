/**
 * initUI.js - UI system initialization
 * 
 * Sets up the UI components using the new component-based architecture.
 */
import services from '../core/services.js';
import { LeftNavigationBar } from './LeftNavigationBar.js';
import { GalaxyMapOverlay } from './GalaxyMapOverlay.js';
import { ModalDialog } from './ModalDialog.js';
import { ToastNotification } from './ToastNotification.js';

/**
 * Initialize the UI system and register components
 */
export function initUI() {
  // Get core services
  const uiManager = services.get('uiManager');
  const sceneManager = services.get('sceneManager');
  const eventBus = services.get('eventBus');
  
  // Create and register the left navigation bar
  const leftNav = new LeftNavigationBar();
  uiManager.registerComponent('leftNav', leftNav, 'left');
  
  // Create and register overlays
  const galaxyMapOverlay = new GalaxyMapOverlay();
  sceneManager.registerOverlay('galaxyMap', galaxyMapOverlay);
  
  // Show the left navigation by default
  uiManager.showComponent('leftNav');
  
  // Add overlay styles
  addOverlayStyles();
  
  // Set up dialog handling
  setupDialogSystem(uiManager, eventBus);
  
  // Set up toast notification system
  setupToastSystem(eventBus);
  
  console.log('UI System initialized with component-based architecture');
  
  return {
    leftNav,
    galaxyMapOverlay,
    showDialog: (title, message, options) => {
      eventBus.emit('ui:dialog:show', { title, message, options });
    },
    showAlert: (title, message, onClose) => {
      eventBus.emit('ui:dialog:show', { 
        title, 
        message, 
        options: { 
          showCancel: false, 
          onConfirm: onClose 
        } 
      });
    },
    showConfirm: (title, message, onConfirm, onCancel) => {
      eventBus.emit('ui:dialog:show', { 
        title, 
        message, 
        options: { 
          showCancel: true, 
          confirmText: 'Confirm', 
          onConfirm, 
          onCancel 
        } 
      });
    },
    showToast: (message, options) => {
      eventBus.emit('ui:toast:show', { message, options });
    },
    showSuccessToast: (message, options) => {
      eventBus.emit('ui:toast:show', { message, options: { ...options, type: 'success' } });
    },
    showErrorToast: (message, options) => {
      eventBus.emit('ui:toast:show', { message, options: { ...options, type: 'error' } });
    },
    showWarningToast: (message, options) => {
      eventBus.emit('ui:toast:show', { message, options: { ...options, type: 'warning' } });
    }
  };
}

/**
 * Set up the dialog system for showing modal dialogs
 * @param {Object} uiManager - UI Manager instance
 * @param {Object} eventBus - Event bus instance
 */
function setupDialogSystem(uiManager, eventBus) {
  // Create dialog container
  const dialogContainer = document.createElement('div');
  dialogContainer.id = 'dialog-container';
  document.body.appendChild(dialogContainer);
  
  // Listen for dialog show events
  eventBus.on('ui:dialog:show', ({ title, message, options = {} }) => {
    // Create dialog
    const dialog = new ModalDialog(title, message, options);
    
    // Add to DOM
    dialogContainer.appendChild(dialog.element);
    
    // Show the dialog
    dialog.show();
    
    // Set up cleanup when dialog is hidden
    eventBus.once('ui:dialog:hidden', ({ dialog: hiddenDialog }) => {
      if (hiddenDialog === dialog) {
        setTimeout(() => {
          if (dialogContainer.contains(dialog.element)) {
            dialogContainer.removeChild(dialog.element);
          }
        }, 300); // Match hide animation duration
      }
    });
  });
}

/**
 * Set up toast notification system
 * @param {Object} eventBus - Event bus instance
 */
function setupToastSystem(eventBus) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Track active toasts
  const activeToasts = new Set();
  
  // Listen for toast show events
  eventBus.on('ui:toast:show', ({ message, options = {} }) => {
    // Create toast
    const toast = new ToastNotification(message, options);
    
    // Add to container
    toastContainer.appendChild(toast.element);
    
    // Add to active toasts
    activeToasts.add(toast);
    
    // Show the toast
    toast.show();
    
    // Set up cleanup when toast is closed
    eventBus.once('ui:toast:closed', ({ toast: closedToast }) => {
      if (closedToast === toast) {
        activeToasts.delete(toast);
      }
    });
    
    // Limit the number of active toasts
    if (activeToasts.size > 5) {
      const oldestToast = Array.from(activeToasts)[0];
      oldestToast.close();
    }
    
    return toast;
  });
  
  // Register helper methods on event bus
  eventBus.showToast = (message, options) => {
    eventBus.emit('ui:toast:show', { message, options });
  };
  
  eventBus.showSuccessToast = (message, options) => {
    eventBus.emit('ui:toast:show', { message, options: { ...options, type: 'success' } });
  };
  
  eventBus.showErrorToast = (message, options) => {
    eventBus.emit('ui:toast:show', { message, options: { ...options, type: 'error' } });
  };
}

// Add CSS class to style overlays
function addOverlayStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .full-screen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .overlay-header {
      position: relative;
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 1rem 0;
    }
    
    .overlay-header h2 {
      margin: 0;
      color: #fff;
    }
    
    .close-button {
      position: absolute;
      right: 2rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1.5rem;
      cursor: pointer;
    }
    
    .close-button:hover {
      color: #ff7f50;
    }
  `;
  document.head.appendChild(style);
} 