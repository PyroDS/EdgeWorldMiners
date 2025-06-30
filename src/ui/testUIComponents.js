/**
 * testUIComponents.js - Test function for UI components
 * 
 * This file contains a function to test the UI component system.
 * It demonstrates all the components working together.
 */
import services from '../core/services.js';

/**
 * Run a demonstration of all UI components
 * @param {Object} ui - UI system from initUI
 */
export function testUIComponents(ui) {
  const eventBus = services.get('eventBus');
  
  console.log('Starting UI component test...');
  
  // Test step sequence with delays
  const steps = [
    // Welcome toast
    () => {
      ui.showToast('UI Component Test Started', { 
        duration: 3000,
        type: 'info'
      });
    },
    
    // Test left nav highlighting
    () => {
      console.log('Testing left navigation...');
      eventBus.emit('navigation:change', { page: 'map' });
      
      ui.showSuccessToast('Navigation highlight changed to "Galaxy Map"', {
        duration: 2000
      });
    },
    
    // Test opening galaxy map overlay
    () => {
      console.log('Testing galaxy map overlay...');
      eventBus.emit('overlay:show', { overlay: 'galaxyMap' });
      
      ui.showSuccessToast('Galaxy Map opened', {
        duration: 2000
      });
    },
    
    // Test closing galaxy map overlay after delay
    () => {
      setTimeout(() => {
        eventBus.emit('overlay:hide');
        ui.showSuccessToast('Galaxy Map closed', {
          duration: 2000
        });
      }, 2000);
    },
    
    // Test dialog
    () => {
      console.log('Testing modal dialog...');
      ui.showDialog('Test Dialog', 'This is a test dialog to verify component functionality.', {
        onConfirm: () => {
          ui.showSuccessToast('Dialog confirmed', {
            duration: 2000
          });
        }
      });
    },
    
    // Test different types of toasts
    () => {
      console.log('Testing toast notifications...');
      
      // Info toast
      ui.showToast('This is an info toast', {
        duration: 4000
      });
      
      // Success toast
      setTimeout(() => {
        ui.showSuccessToast('This is a success toast', {
          duration: 4000
        });
      }, 1000);
      
      // Warning toast
      setTimeout(() => {
        ui.showWarningToast('This is a warning toast', {
          duration: 4000
        });
      }, 2000);
      
      // Error toast
      setTimeout(() => {
        ui.showErrorToast('This is an error toast', {
          duration: 4000
        });
      }, 3000);
    },
    
    // Test confirmation dialog
    () => {
      console.log('Testing confirmation dialog...');
      ui.showConfirm('Confirm Test', 'Please confirm to complete the UI test.', 
        () => {
          // Success case
          ui.showSuccessToast('UI Component Test Completed Successfully!', {
            duration: 5000
          });
        },
        () => {
          // Cancel case
          ui.showErrorToast('Test cancelled by user', {
            duration: 3000
          });
        }
      );
    }
  ];
  
  // Run the steps with delays
  steps.forEach((step, index) => {
    setTimeout(step, index * 4000); // 4 second between each step
  });
}

/**
 * Attach a test button to the page
 */
export function addTestButton() {
  // Create test button
  const button = document.createElement('button');
  button.innerText = 'Test UI Components';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#4d88ff';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';
  
  // Add click handler
  button.addEventListener('click', () => {
    // Import dynamically to avoid circular dependencies
    import('./initUI.js').then(({ initUI }) => {
      const ui = initUI();
      testUIComponents(ui);
    });
  });
  
  // Add to document
  document.body.appendChild(button);
} 