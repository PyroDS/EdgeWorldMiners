/**
 * game.js
 * 
 * Main game entry point that initializes the game and sets up the core systems.
 * 
 * Dependencies:
 * - core/index.js (for core systems)
 * - managers/resourceManager.js
 * - managers/terrainManager.js
 * - managers/enemyManager.js
 * - managers/uiManager.js
 * - managers/carrierManager.js
 * - ui/resourceDisplay.js
 * - ui/notificationSystem.js
 * - ui/initUI.js (for component-based UI)
 */
import { initializeCore, gameState, eventBus, services } from './core/index.js';
import { ResourceManager } from './managers/resourceManager.js';
import { TerrainManager } from './managers/terrainManager.js';
import { EnemyManager } from './managers/enemyManager.js';
import { UIManager } from './managers/uiManager.js';
import { CarrierManager } from './managers/carrierManager.js';
import { ResourceDisplay } from './ui/resourceDisplay.js';
import { NotificationSystem } from './ui/notificationSystem.js';
import { initUI } from './ui/initUI.js';
import { addTestButton } from './ui/testUIComponents.js';

export class Game {
  /**
   * Create a new game instance
   * @param {Object} config - Game configuration
   */
  constructor(config = {}) {
    this.config = {
      width: 800,
      height: 600,
      parent: 'game-container',
      backgroundColor: '#000000',
      debug: false, // Debug mode flag
      ...config
    };
    
    // Phaser game instance
    this.phaserGame = null;
    
    // Game managers
    this.managers = new Map();
    
    // UI components
    this.uiComponents = new Map();
    
    // Game state
    this.initialized = false;
    this.active = false;
    
    // Add test button in debug mode
    if (this.config.debug || this._isDevEnvironment()) {
      addTestButton();
    }
  }
  
  /**
   * Initialize the game
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Initialize Phaser
      await this._initPhaser();
      
      // Initialize core systems
      const core = initializeCore({
        sceneConfig: {
          activeScene: 'GameScene'
        },
        uiConfig: {
          rootElement: document.getElementById('ui-container')
        },
        notificationConfig: {
          container: document.getElementById('notification-container'),
          defaultDuration: 3000
        }
      });
      
      // Initialize game state with default values
      this._initGameState();
      
      // Create and initialize managers
      await this._initManagers();
      
      // Create and initialize UI components
      this._initUIComponents();
      
      // Set up event listeners
      this._setupEventListeners();
      
      this.initialized = true;
      console.log('[Game] Initialized');
      
      return true;
    } catch (error) {
      console.error('[Game] Initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize Phaser game instance
   * @private
   * @returns {Promise<boolean>} Success status
   */
  async _initPhaser() {
    return new Promise((resolve, reject) => {
      try {
        // Create Phaser game instance
        this.phaserGame = new Phaser.Game({
          type: Phaser.AUTO,
          width: this.config.width,
          height: this.config.height,
          parent: this.config.parent,
          backgroundColor: this.config.backgroundColor,
          scene: {
            preload: this._preload.bind(this),
            create: this._create.bind(this),
            update: this._update.bind(this)
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0 },
              debug: false
            }
          }
        });
        
        // Wait for game to be ready
        this.phaserGame.events.once('ready', () => {
          resolve(true);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Initialize game state with default values
   * @private
   */
  _initGameState() {
    // World settings
    gameState.set('world.bounds', {
      x: 0,
      y: 0,
      width: 2000,
      height: 2000
    });
    
    // Player settings
    gameState.set('player.resources', {
      metal: 100,
      crystal: 50,
      gas: 25
    });
    gameState.set('player.score', 0);
    
    // Carrier settings
    gameState.set('carrier.position', {
      x: 1000,
      y: 1000
    });
    gameState.set('carrier.health', 1000);
    gameState.set('carrier.maxHealth', 1000);
    gameState.set('carrier.cargo', {
      capacity: 500,
      used: 0,
      resources: {
        metal: 0,
        crystal: 0,
        gas: 0
      }
    });
    
    // Enemy settings
    gameState.set('enemies.wave', 1);
    gameState.set('enemies.spawned', 0);
    gameState.set('enemies.killed', 0);
    
    // Game settings
    gameState.set('game.paused', false);
    gameState.set('game.speed', 1);
    gameState.set('game.difficulty', 1);
  }
  
  /**
   * Initialize game managers
   * @private
   * @returns {Promise<boolean>} Success status
   */
  async _initManagers() {
    // Create managers
    const resourceManager = new ResourceManager();
    const terrainManager = new TerrainManager();
    const enemyManager = new EnemyManager();
    const uiManager = new UIManager();
    const carrierManager = new CarrierManager();
    
    // Add to manager map
    this.managers.set('resourceManager', resourceManager);
    this.managers.set('terrainManager', terrainManager);
    this.managers.set('enemyManager', enemyManager);
    this.managers.set('uiManager', uiManager);
    this.managers.set('carrierManager', carrierManager);
    
    // Register with service locator
    services.register('resourceManager', resourceManager);
    services.register('terrainManager', terrainManager);
    services.register('enemyManager', enemyManager);
    services.register('uiManager', uiManager);
    services.register('carrierManager', carrierManager);
    
    // Initialize managers
    const scene = this.phaserGame.scene.scenes[0];
    
    // Initialize each manager
    for (const [name, manager] of this.managers.entries()) {
      const success = await manager.init({ scene });
      if (!success) {
        console.error(`[Game] Failed to initialize ${name}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Initialize UI components
   * @private
   */
  _initUIComponents() {
    // Create resource display
    const resourceDisplay = new ResourceDisplay();
    this.uiComponents.set('resourceDisplay', resourceDisplay);
    
    // Create notification system
    const notificationSystem = new NotificationSystem();
    this.uiComponents.set('notificationSystem', notificationSystem);
    
    // Initialize component-based UI system
    const componentUI = initUI();
    this.uiComponents.set('componentUI', componentUI);
    
    // Register all UI components with services
    services.register('resourceDisplay', resourceDisplay);
    services.register('notificationSystem', notificationSystem);
    
    // Initialize UI components
    resourceDisplay.init();
    notificationSystem.init();
    
    console.log('[Game] UI components initialized');
  }
  
  /**
   * Set up global event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for game state changes
    gameState.subscribe('game.paused', (paused) => {
      if (paused) {
        this.pause();
      } else {
        this.resume();
      }
    });
    
    // Listen for game speed changes
    gameState.subscribe('game.speed', (speed) => {
      this.setGameSpeed(speed);
    });
    
    // Listen for window events
    window.addEventListener('blur', () => {
      if (this.active && !gameState.get('game.paused')) {
        gameState.set('game.paused', true);
      }
    });
    
    // Listen for keyboard events
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const paused = gameState.get('game.paused');
        gameState.set('game.paused', !paused);
      }
    });
    
    // Listen for game events
    eventBus.on('game:started', () => {
      // Show welcome notification
      const notificationSystem = this.uiComponents.get('notificationSystem');
      if (notificationSystem) {
        notificationSystem.show({
          type: 'info',
          title: 'Game Started',
          message: 'Welcome to Edge World Miners! Use WASD to move your carrier.',
          duration: 8000
        });
      }
    });
    
    eventBus.on('resources:updated', (data) => {
      // Resource display is automatically updated through its own event listeners
    });
    
    eventBus.on('carrier:damaged', (data) => {
      const notificationSystem = this.uiComponents.get('notificationSystem');
      if (notificationSystem && data.damage > 50) {
        notificationSystem.show({
          type: 'warning',
          title: 'Carrier Damaged',
          message: `Your carrier took ${data.damage} damage!`,
          duration: 3000
        });
      }
    });
    
    eventBus.on('game:over', (data) => {
      const notificationSystem = this.uiComponents.get('notificationSystem');
      if (notificationSystem) {
        notificationSystem.show({
          type: 'error',
          title: 'Game Over',
          message: `Your carrier was destroyed! Final score: ${data.score}`,
          duration: 0 // No auto-dismiss
        });
      }
      
      this.pause();
    });
  }
  
  /**
   * Phaser preload function
   * @private
   */
  _preload() {
    const scene = this.phaserGame.scene.scenes[0];
    
    // Load assets
    scene.load.image('carrier', 'assets/carrier.png');
    scene.load.image('meleeEnemy', 'assets/melee_enemy.png');
    scene.load.image('shooterEnemy', 'assets/shooter_enemy.png');
    scene.load.image('enemyProjectile', 'assets/enemy_projectile.png');
    scene.load.image('hitEffect', 'assets/hit_effect.png');
    scene.load.image('terrain', 'assets/terrain.png');
    scene.load.image('metal', 'assets/resources/metal.png');
    scene.load.image('crystal', 'assets/resources/crystal.png');
    scene.load.image('gas', 'assets/resources/gas.png');
    
    // Create loading bar
    const width = this.phaserGame.config.width;
    const height = this.phaserGame.config.height;
    
    const progressBar = scene.add.graphics();
    const progressBox = scene.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = scene.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px Arial',
      fill: '#ffffff'
    });
    loadingText.setOrigin(0.5, 0.5);
    
    const percentText = scene.add.text(width / 2, height / 2, '0%', {
      font: '18px Arial',
      fill: '#ffffff'
    });
    percentText.setOrigin(0.5, 0.5);
    
    // Update loading bar
    scene.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    // Remove loading bar when complete
    scene.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }
  
  /**
   * Phaser create function
   * @private
   */
  _create() {
    const scene = this.phaserGame.scene.scenes[0];
    
    // Set up camera
    scene.cameras.main.setBounds(
      0, 0, 
      gameState.get('world.bounds.width'),
      gameState.get('world.bounds.height')
    );
    
    // The carrier is now created by the CarrierManager
    // Set up camera follow once the carrier is created
    eventBus.once('carrier:created', (data) => {
      if (data.carrier && data.carrier.gameObject) {
        scene.cameras.main.startFollow(data.carrier.gameObject);
      }
    });
    
    // Start game
    this.active = true;
    eventBus.emit('game:started');
  }
  
  /**
   * Phaser update function (called every frame)
   * @param {number} time - Current time
   * @param {number} delta - Time since last frame
   * @private
   */
  _update(time, delta) {
    if (!this.active) {
      return;
    }
    
    // Update all managers
    for (const manager of this.managers.values()) {
      if (manager.active) {
        manager.update(delta);
      }
    }
  }
  
  /**
   * Start the game
   */
  start() {
    if (!this.initialized) {
      console.error('[Game] Cannot start: Game not initialized');
      return;
    }
    
    this.active = true;
    gameState.set('game.paused', false);
    eventBus.emit('game:started');
    
    console.log('[Game] Started');
  }
  
  /**
   * Pause the game
   */
  pause() {
    if (this.active) {
      this.active = false;
      eventBus.emit('game:paused');
      console.log('[Game] Paused');
    }
  }
  
  /**
   * Resume the game
   */
  resume() {
    if (!this.active && this.initialized) {
      this.active = true;
      eventBus.emit('game:resumed');
      console.log('[Game] Resumed');
    }
  }
  
  /**
   * Set game speed
   * @param {number} speed - Game speed multiplier
   */
  setGameSpeed(speed) {
    if (speed <= 0) {
      console.error('[Game] Invalid game speed:', speed);
      return;
    }
    
    this.phaserGame.loop.setFPS(60 * speed);
    console.log(`[Game] Speed set to ${speed}x`);
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Destroy UI components
    for (const component of this.uiComponents.values()) {
      if (component.destroy) {
        component.destroy();
      }
    }
    
    // Clear UI components map
    this.uiComponents.clear();
    
    // Destroy managers
    for (const manager of this.managers.values()) {
      manager.destroy();
    }
    
    // Clear manager map
    this.managers.clear();
    
    // Destroy Phaser game
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = null;
    }
    
    this.initialized = false;
    this.active = false;
    
    console.log('[Game] Destroyed');
  }
  
  /**
   * Check if running in development environment
   * @private
   * @returns {boolean} True if in development
   */
  _isDevEnvironment() {
    // Check if we're in a development environment
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('.local');
  }
}