/**
 * index.js
 * 
 * Entry point for the core module.
 * Exports all core components and systems.
 */

// Core systems
import { default as gameState } from './gameState.js';
import { default as eventBus } from './eventBus.js';
import { default as services } from './services.js';
import { default as entityRegistry } from './entityRegistry.js';
import { default as sceneManager } from './sceneManager.js';
import { default as uiManager } from './uiManager.js';
import { default as notificationSystem } from './notificationSystem.js';

// Base classes
import { Manager } from './manager.js';
import { Entity } from './entity.js';
import { Component } from './component.js';

// Components
import { TransformComponent } from './components/transformComponent.js';
import { HealthComponent } from './components/healthComponent.js';

// Integration helpers
import { initializeGameState } from './gameStateIntegration.js';

/**
 * Initialize all core systems
 * @param {Object} config - Configuration options
 * @returns {Object} Initialized services
 */
export function initializeCore(config = {}) {
  // Register core services
  services.register('gameState', gameState);
  services.register('eventBus', eventBus);
  services.register('entityRegistry', entityRegistry);
  services.register('sceneManager', sceneManager);
  services.register('uiManager', uiManager);
  services.register('notificationSystem', notificationSystem);
  
  // Initialize services
  entityRegistry.init();
  sceneManager.init(config.sceneConfig);
  uiManager.init(config.uiConfig);
  notificationSystem.init(config.notificationConfig);
  
  // Set up game state integration
  initializeGameState(gameState, eventBus);
  
  // Return services for convenience
  return {
    gameState,
    eventBus,
    services,
    entityRegistry,
    sceneManager,
    uiManager,
    notificationSystem
  };
}

// Export all core components
export {
  // Core systems
  gameState,
  eventBus,
  services,
  entityRegistry,
  sceneManager,
  uiManager,
  notificationSystem,
  
  // Base classes
  Manager,
  Entity,
  Component,
  
  // Components
  TransformComponent,
  HealthComponent,
  
  // Integration helpers
  initializeGameState
};

/**
 * Creates and initializes the game
 * 
 * @param {Object} config - Game configuration
 * @param {Object} phaserGame - Phaser game instance
 * @returns {Game} Game instance
 */
export function createGame(config, phaserGame = null) {
  const game = new Game(config);
  
  if (phaserGame) {
    game.initManagers(phaserGame);
  }
  
  return game;
}

/**
 * Example usage:
 * 
 * import { createGame } from './core/index.js';
 * 
 * // In your Phaser game's create function:
 * create() {
 *   this.game = createGame({ debug: true }, this.game);
 *   this.game.start();
 * }
 * 
 * // In your update function:
 * update(time, delta) {
 *   this.game.update(time, delta);
 * }
 */

/**
 * Integration example for existing code:
 * 
 * 1. Import services in your existing managers:
 * import { services } from './core/services.js';
 * 
 * 2. Get gameState and eventBus:
 * const gameState = services.get('gameState');
 * const eventBus = services.get('eventBus');
 * 
 * 3. Update state:
 * gameState.update('resources.metal', 500);
 * 
 * 4. Listen for state changes:
 * const unsubscribe = gameState.subscribe('resources.metal', (value) => {
 *   console.log('Metal changed:', value);
 * });
 * 
 * 5. Emit events:
 * eventBus.emit('resource:extract', { type: 'metal', amount: 50 });
 * 
 * 6. Listen for events:
 * eventBus.on('resource:extract', (data) => {
 *   console.log('Resource extracted:', data);
 * });
 */ 