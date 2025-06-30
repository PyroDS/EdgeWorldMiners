/**
 * GameStateIntegration - Bridge between the Event system and State management
 * Automatically updates game state in response to game events.
 */
import services from './services.js';

export class GameStateIntegration {
  constructor() {
    this.eventBus = null;
    this.gameState = null;
    this.initialized = false;
    this.eventHandlers = [];
  }
  
  /**
   * Initialize state integration with the event system
   * @returns {boolean} Success status
   */
  init() {
    if (this.initialized) {
      console.log('[GameStateIntegration] Already initialized');
      return false;
    }
    
    try {
      this.eventBus = services.get('eventBus');
      this.gameState = services.get('gameState');
      
      this.setupResourceEvents();
      this.setupEnemyEvents();
      this.setupCarrierEvents();
      this.setupBuildingEvents();
      this.setupUIEvents();
      this.setupWaveEvents();
      
      this.initialized = true;
      console.log('[GameStateIntegration] Initialized');
      return true;
    } catch (error) {
      console.error('[GameStateIntegration] Failed to initialize:', error);
      return false;
    }
  }
  
  /**
   * Clean up all event listeners
   */
  cleanup() {
    if (!this.initialized) return;
    
    this.eventHandlers.forEach(unsubscribe => unsubscribe());
    this.eventHandlers = [];
    
    this.initialized = false;
    console.log('[GameStateIntegration] Cleaned up');
  }
  
  /**
   * Listen for an event and update state
   * @param {string} event - Event to listen for
   * @param {Function} handler - Handler function
   */
  listenTo(event, handler) {
    if (!this.eventBus || !this.initialized) return;
    
    const unsubscribe = this.eventBus.on(event, handler);
    this.eventHandlers.push(unsubscribe);
    return unsubscribe;
  }
  
  /**
   * Set up resource-related event handlers
   */
  setupResourceEvents() {
    // Resource collection
    this.listenTo('resource:collected', ({ type, amount }) => {
      const current = this.gameState.get(`resources.${type}`) || 0;
      this.gameState.update(`resources.${type}`, current + amount);
    });
    
    // Resource consumption
    this.listenTo('resource:consumed', ({ type, amount }) => {
      const current = this.gameState.get(`resources.${type}`) || 0;
      // Don't allow negative resources
      this.gameState.update(`resources.${type}`, Math.max(0, current - amount));
    });
    
    // Resource capacity change
    this.listenTo('resource:capacity_changed', ({ type, capacity }) => {
      this.gameState.update(`resources.${type}_capacity`, capacity);
    });
    
    // Deposit discovered
    this.listenTo('resource:deposit_discovered', ({ type, position }) => {
      const deposits = this.gameState.get('terrain.deposits') || {};
      if (!deposits[type]) {
        deposits[type] = [];
      }
      
      deposits[type].push(position);
      this.gameState.update('terrain.deposits', deposits);
    });
  }
  
  /**
   * Set up enemy-related event handlers
   */
  setupEnemyEvents() {
    // Enemy spawned
    this.listenTo('enemy:spawned', ({ enemyType, id }) => {
      const spawned = this.gameState.get('enemies.spawned') || 0;
      this.gameState.update('enemies.spawned', spawned + 1);
      
      // Track by type
      const typeCount = this.gameState.get(`enemies.types.${enemyType}`) || 0;
      this.gameState.update(`enemies.types.${enemyType}`, typeCount + 1);
    });
    
    // Enemy killed
    this.listenTo('enemy:killed', ({ enemyType, id }) => {
      const killed = this.gameState.get('enemies.killed') || 0;
      this.gameState.update('enemies.killed', killed + 1);
      
      // Track by type
      const typeKilled = this.gameState.get(`enemies.types_killed.${enemyType}`) || 0;
      this.gameState.update(`enemies.types_killed.${enemyType}`, typeKilled + 1);
      
      // Update active count
      const typeCount = this.gameState.get(`enemies.types.${enemyType}`) || 0;
      if (typeCount > 0) {
        this.gameState.update(`enemies.types.${enemyType}`, typeCount - 1);
      }
    });
    
    // Enemy hits carrier
    this.listenTo('enemy:hit_carrier', ({ damage }) => {
      const currentHealth = this.gameState.get('carrier.health') || 0;
      const newHealth = Math.max(0, currentHealth - damage);
      this.gameState.update('carrier.health', newHealth);
      
      if (newHealth <= 0) {
        this.eventBus.emit('carrier:destroyed', {});
      }
    });
  }
  
  /**
   * Set up carrier-related event handlers
   */
  setupCarrierEvents() {
    // Carrier health changed
    this.listenTo('carrier:health_changed', ({ health }) => {
      this.gameState.update('carrier.health', health);
    });
    
    // Carrier repaired
    this.listenTo('carrier:repaired', ({ amount }) => {
      const current = this.gameState.get('carrier.health') || 0;
      const max = this.gameState.get('carrier.maxHealth') || 100;
      this.gameState.update('carrier.health', Math.min(current + amount, max));
    });
    
    // Carrier max health changed
    this.listenTo('carrier:max_health_changed', ({ maxHealth }) => {
      this.gameState.update('carrier.maxHealth', maxHealth);
    });
    
    // Carrier position changed
    this.listenTo('carrier:position_changed', ({ x, y }) => {
      this.gameState.transaction([
        { path: 'carrier.position.x', value: x },
        { path: 'carrier.position.y', value: y }
      ]);
    });
  }
  
  /**
   * Set up building-related event handlers
   */
  setupBuildingEvents() {
    // Drill placed
    this.listenTo('building:drill_placed', ({ id, position }) => {
      const count = this.gameState.get('drills.count') || 0;
      const active = this.gameState.get('drills.active') || 0;
      
      this.gameState.transaction([
        { path: 'drills.count', value: count + 1 },
        { path: 'drills.active', value: active + 1 }
      ]);
    });
    
    // Drill destroyed
    this.listenTo('building:drill_destroyed', ({ id }) => {
      const active = this.gameState.get('drills.active') || 0;
      if (active > 0) {
        this.gameState.update('drills.active', active - 1);
      }
    });
    
    // Turret placed
    this.listenTo('building:turret_placed', ({ id, position, type }) => {
      const count = this.gameState.get('turrets.count') || 0;
      const active = this.gameState.get('turrets.active') || 0;
      
      this.gameState.transaction([
        { path: 'turrets.count', value: count + 1 },
        { path: 'turrets.active', value: active + 1 }
      ]);
      
      // Track by type
      const typeCount = this.gameState.get(`turrets.types.${type}`) || 0;
      this.gameState.update(`turrets.types.${type}`, typeCount + 1);
    });
    
    // Turret destroyed
    this.listenTo('building:turret_destroyed', ({ id, type }) => {
      const active = this.gameState.get('turrets.active') || 0;
      if (active > 0) {
        this.gameState.update('turrets.active', active - 1);
      }
      
      // Track by type
      const typeCount = this.gameState.get(`turrets.types.${type}`) || 0;
      if (typeCount > 0) {
        this.gameState.update(`turrets.types.${type}`, typeCount - 1);
      }
    });
    
    // Building construction started
    this.listenTo('building:construction_started', ({ type, id, position }) => {
      const constructions = this.gameState.get('buildings.under_construction') || [];
      constructions.push({ type, id, position });
      this.gameState.update('buildings.under_construction', constructions);
    });
    
    // Building construction completed
    this.listenTo('building:construction_completed', ({ type, id }) => {
      const constructions = this.gameState.get('buildings.under_construction') || [];
      const updated = constructions.filter(b => b.id !== id);
      this.gameState.update('buildings.under_construction', updated);
    });
  }
  
  /**
   * Set up UI-related event handlers
   */
  setupUIEvents() {
    // Scene changed
    this.listenTo('ui:scene_changed', ({ scene }) => {
      this.gameState.update('ui.activeScene', scene);
    });
    
    // Overlay toggled
    this.listenTo('ui:overlay_toggled', ({ overlay, active }) => {
      if (active) {
        this.gameState.update('ui.activeOverlay', overlay);
      } else if (this.gameState.get('ui.activeOverlay') === overlay) {
        this.gameState.update('ui.activeOverlay', null);
      }
    });
    
    // Modal opened
    this.listenTo('ui:modal_opened', ({ id, data }) => {
      this.gameState.update('ui.activeModal', { id, data });
    });
    
    // Modal closed
    this.listenTo('ui:modal_closed', () => {
      this.gameState.update('ui.activeModal', null);
    });
  }
  
  /**
   * Set up wave-related event handlers
   */
  setupWaveEvents() {
    // Wave started
    this.listenTo('wave:started', ({ number, enemyCount }) => {
      this.gameState.transaction([
        { path: 'enemies.wave', value: number },
        { path: 'enemies.currentWaveSize', value: enemyCount },
        { path: 'enemies.currentWaveRemaining', value: enemyCount }
      ]);
    });
    
    // Wave enemy killed
    this.listenTo('wave:enemy_killed', () => {
      const remaining = this.gameState.get('enemies.currentWaveRemaining') || 0;
      if (remaining > 0) {
        this.gameState.update('enemies.currentWaveRemaining', remaining - 1);
      }
    });
    
    // Wave completed
    this.listenTo('wave:completed', ({ number }) => {
      this.gameState.update('enemies.currentWaveRemaining', 0);
    });
    
    // Wave countdown update
    this.listenTo('wave:countdown_update', ({ timeRemaining }) => {
      this.gameState.update('enemies.nextWaveTime', timeRemaining);
    });
  }
}

// Create a singleton instance
const gameStateIntegration = new GameStateIntegration();
export default gameStateIntegration; 