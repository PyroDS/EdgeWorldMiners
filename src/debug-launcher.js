/**
 * debug-launcher.js
 * 
 * A launcher script to initialize the game in debug mode.
 * This script should be imported only in development environments.
 */
import { Game } from './game.js';
import services from './core/services.js';
import { testUIComponents } from './ui/testUIComponents.js';

/**
 * Initialize the game in debug mode
 */
export function initDebugMode() {
  console.log('%c[DEBUG MODE ACTIVE]', 'color: red; font-size: 20px; font-weight: bold;');
  
  // Initialize the game with debug flag enabled
  const debugGame = new Game({
    debug: true,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  // Create global access for debugging in console
  window.debugGame = debugGame;
  window.gameServices = services;
  
  // Start the game
  debugGame.init();
  debugGame.start();
  
  // Add helpful debug controls to the window object
  window.debugControls = {
    // UI testing
    testUI: () => {
      console.log('Running UI tests...');
      import('./ui/initUI.js').then(({ initUI }) => {
        const ui = initUI();
        testUIComponents(ui);
      });
    },
    
    // Toggle FPS counter
    toggleFPS: () => {
      const stats = document.getElementById('debug-stats');
      if (stats) {
        stats.style.display = stats.style.display === 'none' ? 'block' : 'none';
      } else {
        console.log('FPS counter not found');
      }
    },
    
    // Restart the game
    restart: () => {
      console.log('Restarting game...');
      debugGame.destroy();
      setTimeout(() => {
        debugGame.init();
        debugGame.start();
      }, 500);
    },
    
    // Toggle slow motion for debugging animations
    slowMotion: (enable = true) => {
      const timeScale = enable ? 0.5 : 1;
      console.log(`Setting time scale to: ${timeScale}`);
      // Apply time scale if you have animation systems
    },
    
    // Print current game state
    printState: () => {
      const gameState = services.get('gameState');
      console.log('Current game state:', gameState ? gameState.getState() : 'Game state service not available');
    }
  };
  
  console.log('%cDebug controls available via window.debugControls', 'color: green; font-weight: bold;');
  console.log('Available commands:');
  console.log('- debugControls.testUI()');
  console.log('- debugControls.toggleFPS()');
  console.log('- debugControls.restart()');
  console.log('- debugControls.slowMotion(true/false)');
  console.log('- debugControls.printState()');
}

// Auto-init if script is loaded directly
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initDebugMode, 1);
} else {
  document.addEventListener('DOMContentLoaded', initDebugMode);
} 