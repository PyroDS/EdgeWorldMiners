/**
 * SceneManager - Manages game scenes and transitions
 * Provides a centralized way to register, switch, and overlay scenes.
 */
import services from './services.js';

export class SceneManager {
  /**
   * Create a scene manager
   */
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.previousScene = null;
    this.overlays = new Map();
    this.activeOverlays = new Set();
    this.transitionInProgress = false;
    
    // Scene history for navigation
    this.history = [];
    this.maxHistorySize = 10;
    
    // Core services
    this.eventBus = null;
    this.gameState = null;
    
    this.initialized = false;
  }
  
  /**
   * Initialize the scene manager
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
      services.register('sceneManager', this);
      
      // Register event listeners
      this._setupEventListeners();
      
      this.initialized = true;
      console.log('[SceneManager] Initialized');
    } catch (error) {
      console.error('[SceneManager] Initialization failed:', error);
    }
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.eventBus) return;
    
    // Listen for scene change requests
    this.eventBus.on('scene:change', (data) => {
      this.switchToScene(data.scene, data.data);
    });
    
    // Listen for overlay show/hide requests
    this.eventBus.on('overlay:show', (data) => {
      this.showOverlay(data.overlay, data.data);
    });
    
    this.eventBus.on('overlay:hide', (data) => {
      this.hideOverlay(data?.overlay);
    });
    
    // Listen for game state changes
    this.eventBus.on('game:reset', () => {
      this.reset();
    });
  }
  
  /**
   * Register a scene
   * @param {string} key - Scene identifier
   * @param {Object} sceneConfig - Scene configuration
   * @returns {boolean} Success status
   */
  registerScene(key, sceneConfig) {
    if (this.scenes.has(key)) {
      console.warn(`[SceneManager] Scene '${key}' is already registered`);
      return false;
    }
    
    const scene = {
      key,
      isOverlay: sceneConfig.isOverlay || false,
      element: null, // Will be created when scene is activated
      initialize: sceneConfig.initialize || null,
      preload: sceneConfig.preload || null,
      create: sceneConfig.create || null,
      update: sceneConfig.update || null,
      destroy: sceneConfig.destroy || null,
      config: sceneConfig.config || {}
    };
    
    this.scenes.set(key, scene);
    console.log(`[SceneManager] Registered scene '${key}'`);
    
    // Initialize scene if it has an init method
    if (scene.initialize && typeof scene.initialize === 'function') {
      scene.initialize();
    }
    
    // Emit scene registered event
    if (this.eventBus) {
      this.eventBus.emit('scene:registered', { name: key, scene });
    }
    
    return true;
  }
  
  /**
   * Register an overlay
   * @param {string} name - Overlay name
   * @param {Object} overlay - Overlay object
   */
  registerOverlay(name, overlay) {
    if (this.overlays.has(name)) {
      console.warn(`SceneManager: Overlay "${name}" already registered`);
      return;
    }
    
    this.overlays.set(name, overlay);
    
    // Initialize overlay if it has an init method
    if (overlay.init && typeof overlay.init === 'function') {
      overlay.init();
    }
    
    // Hide overlay by default
    if (overlay.hide && typeof overlay.hide === 'function') {
      overlay.hide();
    }
    
    // Emit overlay registered event
    if (this.eventBus) {
      this.eventBus.emit('overlay:registered', { name, overlay });
    }
  }
  
  /**
   * Switch to a different scene
   * @param {string} name - Scene name
   * @param {Object} data - Data to pass to the scene
   * @returns {Promise} Promise that resolves when the transition is complete
   */
  async switchToScene(name, data = {}) {
    // Check if scene exists
    if (!this.scenes.has(name)) {
      console.error(`SceneManager: Scene "${name}" not found`);
      return false;
    }
    
    // Prevent concurrent transitions
    if (this.transitionInProgress) {
      console.warn('SceneManager: Scene transition already in progress');
      return false;
    }
    
    this.transitionInProgress = true;
    
    try {
      // Get new scene
      const newScene = this.scenes.get(name);
      
      // Exit current scene if exists
      if (this.currentScene) {
        const currentSceneObj = this.scenes.get(this.currentScene);
        
        // Emit scene exiting event
        if (this.eventBus) {
          this.eventBus.emit('scene:exiting', { 
            from: this.currentScene,
            to: name,
            data
          });
        }
        
        // Call exit method if exists
        if (currentSceneObj.exit && typeof currentSceneObj.exit === 'function') {
          await currentSceneObj.exit();
        }
        
        // Store as previous scene
        this.previousScene = this.currentScene;
      }
      
      // Update current scene
      this.currentScene = name;
      
      // Update game state
      if (this.gameState) {
        this.gameState.update('ui.activeScene', name);
      }
      
      // Emit scene changing event
      if (this.eventBus) {
        this.eventBus.emit('scene:changing', { 
          from: this.previousScene,
          to: name,
          data
        });
      }
      
      // Enter new scene
      if (newScene.enter && typeof newScene.enter === 'function') {
        await newScene.enter(data);
      }
      
      // Emit scene changed event
      if (this.eventBus) {
        this.eventBus.emit('scene:changed', { 
          from: this.previousScene,
          to: name,
          data
        });
      }
      
      this.transitionInProgress = false;
      return true;
    } catch (error) {
      console.error('SceneManager: Error during scene transition', error);
      this.transitionInProgress = false;
      return false;
    }
  }
  
  /**
   * Show an overlay
   * @param {string} name - Overlay name
   * @param {Object} data - Data to pass to the overlay
   * @returns {boolean} Success status
   */
  showOverlay(name, data = {}) {
    // Check if overlay exists
    if (!this.overlays.has(name)) {
      console.error(`SceneManager: Overlay "${name}" not found`);
      return false;
    }
    
    // Get overlay
    const overlay = this.overlays.get(name);
    
    // Call show method if exists
    if (overlay.show && typeof overlay.show === 'function') {
      overlay.show(data);
    }
    
    // Add to active overlays
    this.activeOverlays.add(name);
    
    // Update game state
    if (this.gameState) {
      this.gameState.update('ui.activeOverlay', name);
    }
    
    // Emit overlay shown event
    if (this.eventBus) {
      this.eventBus.emit('overlay:shown', { name, data });
    }
    
    return true;
  }
  
  /**
   * Hide an overlay
   * @param {string} name - Overlay name (if null, hide all active overlays)
   * @returns {boolean} Success status
   */
  hideOverlay(name = null) {
    // If no name provided, hide all active overlays
    if (name === null) {
      if (this.activeOverlays.size === 0) {
        return false;
      }
      
      // Hide all active overlays
      for (const overlayName of this.activeOverlays) {
        this.hideOverlay(overlayName);
      }
      
      return true;
    }
    
    // Check if overlay exists and is active
    if (!this.overlays.has(name) || !this.activeOverlays.has(name)) {
      return false;
    }
    
    // Get overlay
    const overlay = this.overlays.get(name);
    
    // Call hide method if exists
    if (overlay.hide && typeof overlay.hide === 'function') {
      overlay.hide();
    }
    
    // Remove from active overlays
    this.activeOverlays.delete(name);
    
    // Update game state if this was the active overlay
    if (this.gameState && this.gameState.get('ui.activeOverlay') === name) {
      this.gameState.update('ui.activeOverlay', null);
    }
    
    // Emit overlay hidden event
    if (this.eventBus) {
      this.eventBus.emit('overlay:hidden', { name });
    }
    
    return true;
  }
  
  /**
   * Navigate back to the previous scene
   * @returns {Promise<boolean>} Success status
   */
  async goBack() {
    if (this.history.length === 0) {
      console.log('[SceneManager] No scene history available');
      return false;
    }
    
    // Get the previous scene key
    const previousSceneKey = this.history.pop();
    
    // Change to that scene
    return this.switchToScene(previousSceneKey);
  }
  
  /**
   * Create an element for a scene and initialize it
   * @param {Object} scene - Scene object
   * @param {Object} params - Scene parameters
   * @private
   */
  async createSceneElement(scene, params = {}) {
    // Create the scene container if it doesn't exist
    if (!document.getElementById('scene-container')) {
      const container = document.createElement('div');
      container.id = 'scene-container';
      document.body.appendChild(container);
    }
    
    // Create scene element
    const sceneElement = document.createElement('div');
    sceneElement.className = `scene ${scene.isOverlay ? 'scene-overlay' : 'scene-main'}`;
    sceneElement.id = `scene-${scene.key}`;
    sceneElement.dataset.scene = scene.key;
    
    // Add to DOM
    document.getElementById('scene-container').appendChild(sceneElement);
    
    // Store element reference
    scene.element = sceneElement;
    
    // Call initialization methods
    if (scene.initialize && typeof scene.initialize === 'function') {
      await Promise.resolve(scene.initialize(sceneElement, params));
    }
    
    // Show the element with transition
    sceneElement.style.opacity = '0';
    setTimeout(() => {
      sceneElement.style.opacity = '1';
    }, 50);
    
    // Preload assets if needed
    if (scene.preload && typeof scene.preload === 'function') {
      await Promise.resolve(scene.preload(params));
    }
    
    // Create scene content
    if (scene.create && typeof scene.create === 'function') {
      await Promise.resolve(scene.create(sceneElement, params));
    }
    
    // Set up update cycle if needed
    if (scene.update && typeof scene.update === 'function') {
      scene._updateCallback = (delta) => scene.update(delta, params);
      
      // Register with game update loop
      const game = services.has('game') ? services.get('game') : null;
      if (game && typeof game.addUpdateCallback === 'function') {
        scene._removeUpdate = game.addUpdateCallback(scene._updateCallback);
      }
    }
  }
  
  /**
   * Destroy a scene element and clean up
   * @param {Object} scene - Scene object
   * @private
   */
  async destroySceneElement(scene) {
    if (!scene.element) {
      return;
    }
    
    // Call scene's own destroy method
    if (scene.destroy && typeof scene.destroy === 'function') {
      await Promise.resolve(scene.destroy());
    }
    
    // Remove update callback
    if (scene._removeUpdate) {
      scene._removeUpdate();
      scene._removeUpdate = null;
    }
    
    // Remove from DOM with transition
    scene.element.style.opacity = '0';
    
    // Wait for transition to complete
    await new Promise(resolve => {
      setTimeout(() => {
        if (scene.element && scene.element.parentNode) {
          scene.element.parentNode.removeChild(scene.element);
        }
        scene.element = null;
        resolve();
      }, 300);
    });
  }
  
  /**
   * Hide the current scene
   * @private
   */
  async hideCurrentScene() {
    if (!this.currentScene) {
      return;
    }
    
    await this.destroySceneElement(this.scenes.get(this.currentScene));
  }
  
  /**
   * Add a scene key to history
   * @param {string} sceneKey - Scene identifier
   * @private
   */
  addToHistory(sceneKey) {
    // Don't add duplicate of the last item
    if (this.history.length > 0 && this.history[this.history.length - 1] === sceneKey) {
      return;
    }
    
    this.history.push(sceneKey);
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Get the current scene key
   * @returns {string|null} Scene key or null
   */
  getCurrentSceneKey() {
    return this.currentScene ? this.currentScene : null;
  }
  
  /**
   * Get the active overlay key
   * @returns {string|null} Overlay key or null
   */
  getActiveOverlayKey() {
    return this.activeOverlays.size > 0 ? Array.from(this.activeOverlays)[0] : null;
  }
  
  /**
   * Check if a scene exists
   * @param {string} key - Scene identifier
   * @returns {boolean} Whether scene exists
   */
  hasScene(key) {
    return this.scenes.has(key);
  }
  
  /**
   * Get scene history
   * @returns {string[]} Scene keys in history
   */
  getHistory() {
    return [...this.history];
  }
  
  /**
   * Reset the scene manager
   */
  reset() {
    // Hide all active overlays
    this.hideOverlay();
    
    // Clear scene state
    this.currentScene = null;
    this.previousScene = null;
    
    // Reset all scenes
    for (const [name, scene] of this.scenes.entries()) {
      if (scene.reset && typeof scene.reset === 'function') {
        scene.reset();
      }
    }
    
    // Reset all overlays
    for (const [name, overlay] of this.overlays.entries()) {
      if (overlay.reset && typeof overlay.reset === 'function') {
        overlay.reset();
      }
    }
    
    // Emit reset event
    if (this.eventBus) {
      this.eventBus.emit('sceneManager:reset');
    }
  }
  
  /**
   * Update all active scenes and overlays
   * @param {number} delta - Time since last update in ms
   */
  update(delta) {
    // Update current scene
    if (this.currentScene) {
      const scene = this.scenes.get(this.currentScene);
      if (scene && scene.update && typeof scene.update === 'function') {
        scene.update(delta);
      }
    }
    
    // Update active overlays
    for (const name of this.activeOverlays) {
      const overlay = this.overlays.get(name);
      if (overlay && overlay.update && typeof overlay.update === 'function') {
        overlay.update(delta);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clean up all scenes
    for (const [name, scene] of this.scenes.entries()) {
      if (scene.destroy && typeof scene.destroy === 'function') {
        scene.destroy();
      }
    }
    
    // Clean up all overlays
    for (const [name, overlay] of this.overlays.entries()) {
      if (overlay.destroy && typeof overlay.destroy === 'function') {
        overlay.destroy();
      }
    }
    
    // Clear collections
    this.scenes.clear();
    this.overlays.clear();
    this.activeOverlays.clear();
    
    // Reset state
    this.currentScene = null;
    this.previousScene = null;
    this.transitionInProgress = false;
    
    // Clear event listeners
    if (this.eventBus) {
      this.eventBus.off('scene:change');
      this.eventBus.off('overlay:show');
      this.eventBus.off('overlay:hide');
      this.eventBus.off('game:reset');
    }
    
    this.initialized = false;
  }
}

// Create a singleton instance
const sceneManager = new SceneManager();
export default sceneManager; 