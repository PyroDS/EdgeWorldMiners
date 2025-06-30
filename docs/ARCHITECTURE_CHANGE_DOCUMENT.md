# EdgeWorldMiners Architecture Change Document

This document outlines the key architectural changes necessary to transform the current EdgeWorldMiners prototype into a robust, modular system that can support the expanded feature set. The focus is on practical code changes rather than theoretical architecture.

## 1. Current Architecture Analysis

### 1.1 Core Systems

The current architecture is built around several core systems:

1. **Game Core (game.js)**: Central initialization and update loop
2. **Terrain System (terrainManager.js)**: Voxel-based terrain generation and modification
3. **Resource System (resourceManager.js)**: Resource collection and management
4. **Enemy System (enemyManager.js)**: Enemy spawning and behavior management
5. **Drill System (drillManager.js)**: Resource extraction mechanics
6. **Turret System (turretManager.js)**: Defense placement and targeting
7. **Carrier System (carrier.js)**: Player's main vehicle and interaction point
8. **Build System (buildManager.js)**: Construction and placement of structures
9. **UI System (ui.js)**: Interface management with DOM elements
10. **Galaxy Map System (galaxyMap.js)**: Planet selection implemented as an overlay
11. **Landing Scene System (landingScene.js)**: Entry point and game options

### 1.2 Technical Debt

The current implementation has several areas of technical debt:

1. **Manager Coupling**: Systems directly reference other systems instead of using events
2. **Monolithic Update Loops**: Core logic concentrated in large update methods
3. **Limited State Management**: No central state store, making cross-system updates complex
4. **DOM/Canvas Hybridization**: Mixed rendering approaches without clear separation
5. **Hardcoded References**: Direct object references instead of dependency injection
6. **Inconsistent Entity Patterns**: Various approaches to game entities
7. **Limited Scene Management**: Basic scene transitions with state loss

## 2. Proposed Architecture Changes

### 2.1 Core System Refactoring

#### 2.1.1 State Management System

Implement a central state management system that all components can use:

```javascript
// src/core/gameState.js
export class GameState {
  constructor() {
    this.state = {
      resources: { metal: 0, crystal: 0, gas: 0 },
      research: { points: 0, unlocked: [] },
      carrier: { health: 100, maxHealth: 100 },
      expedition: { currentPlanet: null, active: false },
      ui: { activeOverlay: null, activeScene: null }
    };
    this.listeners = {};
  }
  
  get(path) {
    // Retrieve nested state with dot notation
    const keys = path.split('.');
    return keys.reduce((obj, key) => obj && obj[key], this.state);
  }
  
  update(path, value) {
    // Update state and notify subscribers
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], this.state);
    target[lastKey] = value;
    
    // Notify relevant subscribers
    this.notify(path);
  }
  
  subscribe(path, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    this.listeners[path].push(callback);
    return () => this.unsubscribe(path, callback);
  }
  
  notify(path) {
    // Notify all subscribers of path and parent paths
    Object.keys(this.listeners).forEach(listenerPath => {
      if (path.startsWith(listenerPath)) {
        this.listeners[listenerPath].forEach(cb => cb(this.get(path), path));
      }
    });
  }
}
```

#### 2.1.2 Event System

Create a centralized event system for cross-component communication:

```javascript
// src/core/eventBus.js
export class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}
```

#### 2.1.3 Service Locator

Implement a service locator for component access:

```javascript
// src/core/services.js
export class ServiceLocator {
  constructor() {
    this.services = {};
  }
  
  register(name, service) {
    this.services[name] = service;
  }
  
  get(name) {
    if (!this.services[name]) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services[name];
  }
}

// Create a singleton instance
export const services = new ServiceLocator();
```

### 2.2 Manager Improvements

#### 2.2.1 Manager Base Class

Create a base class for all managers to standardize interfaces:

```javascript
// src/core/manager.js
import { services } from './services.js';

export class Manager {
  constructor(name) {
    this.name = name;
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    this.isInitialized = false;
  }
  
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Override in subclass
  }
  
  update(delta) {
    // Override in subclass
  }
  
  cleanup() {
    // Override in subclass
  }
}
```

#### 2.2.2 Resource Manager Refactoring

Example refactoring of the Resource Manager:

```javascript
// src/managers/resourceManager.js
import { Manager } from '../core/manager.js';

export class ResourceManager extends Manager {
  constructor() {
    super('resourceManager');
    this.resources = {
      metal: { amount: 0, capacity: 1000, extractionRate: 1 },
      crystal: { amount: 0, capacity: 500, extractionRate: 0.5 },
      gas: { amount: 0, capacity: 300, extractionRate: 0.3 }
    };
  }
  
  setupEventListeners() {
    this.eventBus.on('resource:extract', ({ type, amount }) => {
      this.addResource(type, amount);
    });
    
    this.eventBus.on('resource:consume', ({ type, amount }) => {
      this.removeResource(type, amount);
    });
  }
  
  addResource(type, amount) {
    if (!this.resources[type]) return false;
    
    const resource = this.resources[type];
    const newAmount = Math.min(resource.amount + amount, resource.capacity);
    const amountAdded = newAmount - resource.amount;
    
    resource.amount = newAmount;
    this.gameState.update(`resources.${type}`, resource.amount);
    
    return amountAdded;
  }
  
  removeResource(type, amount) {
    if (!this.resources[type]) return false;
    
    const resource = this.resources[type];
    if (resource.amount < amount) return false;
    
    resource.amount -= amount;
    this.gameState.update(`resources.${type}`, resource.amount);
    
    return true;
  }
  
  hasResources(requirements) {
    return Object.entries(requirements).every(
      ([type, amount]) => this.resources[type]?.amount >= amount
    );
  }
}
```

### 2.3 Entity System Refactoring

#### 2.3.1 Component-Based Entities

Implement a component-based system for game entities:

```javascript
// src/entities/entity.js
export class Entity {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.components = {};
    this.tags = new Set();
  }
  
  addComponent(name, component) {
    this.components[name] = component;
    component.entity = this;
    return this;
  }
  
  getComponent(name) {
    return this.components[name];
  }
  
  hasComponent(name) {
    return !!this.components[name];
  }
  
  addTag(tag) {
    this.tags.add(tag);
    return this;
  }
  
  hasTag(tag) {
    return this.tags.has(tag);
  }
  
  update(delta) {
    Object.values(this.components).forEach(component => {
      if (component.update) {
        component.update(delta);
      }
    });
  }
  
  cleanup() {
    Object.values(this.components).forEach(component => {
      if (component.cleanup) {
        component.cleanup();
      }
    });
  }
}
```

#### 2.3.2 Component Base Class

Create a base class for entity components:

```javascript
// src/components/component.js
export class Component {
  constructor(name) {
    this.name = name;
    this.entity = null;
  }
  
  // Get another component from the parent entity
  getComponent(name) {
    return this.entity?.getComponent(name);
  }
  
  // Virtual methods
  init() {}
  update(delta) {}
  cleanup() {}
}
```

#### 2.3.3 Example Components

Sample implementation of common components:

```javascript
// src/components/transformComponent.js
import { Component } from './component.js';

export class TransformComponent extends Component {
  constructor(x = 0, y = 0, z = 0, rotation = 0) {
    super('transform');
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotation = rotation;
  }
  
  move(dx, dy, dz = 0) {
    this.x += dx;
    this.y += dy;
    this.z += dz;
  }
  
  setPosition(x, y, z = this.z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  rotate(amount) {
    this.rotation += amount;
  }
}

// src/components/healthComponent.js
import { Component } from './component.js';
import { services } from '../core/services.js';

export class HealthComponent extends Component {
  constructor(maxHealth, currentHealth = null) {
    super('health');
    this.maxHealth = maxHealth;
    this.currentHealth = currentHealth ?? maxHealth;
    this.eventBus = services.get('eventBus');
  }
  
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.eventBus.emit('entity:damaged', { entity: this.entity, amount });
    
    if (this.currentHealth <= 0) {
      this.eventBus.emit('entity:destroyed', { entity: this.entity });
    }
    
    return this.currentHealth;
  }
  
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.eventBus.emit('entity:healed', { entity: this.entity, amount });
    return this.currentHealth;
  }
}
```

### 2.4 UI System Enhancement

#### 2.4.1 UI Component Base Classes

Create a component-based UI system that preserves the left navigation:

```javascript
// src/ui/uiComponent.js
export class UIComponent {
  constructor(elementId, type = 'div') {
    if (elementId) {
      this.element = document.getElementById(elementId);
      if (!this.element) {
        this.element = document.createElement(type);
        this.element.id = elementId;
      }
    } else {
      this.element = document.createElement(type);
    }
    
    this.children = [];
    this.visible = true;
  }
  
  addChild(child) {
    this.children.push(child);
    this.element.appendChild(child.element);
    return child;
  }
  
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      this.element.removeChild(child.element);
    }
  }
  
  show() {
    this.visible = true;
    this.element.style.display = '';
  }
  
  hide() {
    this.visible = false;
    this.element.style.display = 'none';
  }
  
  setPosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
  
  setContent(content) {
    this.element.innerHTML = content;
  }
  
  addClass(className) {
    this.element.classList.add(className);
  }
  
  removeClass(className) {
    this.element.classList.remove(className);
  }
}
```

#### 2.4.2 Left Navigation Component

Implement a persistent left navigation component:

```javascript
// src/ui/leftNavigationBar.js
import { UIComponent } from './uiComponent.js';
import { services } from '../core/services.js';

export class LeftNavigationBar extends UIComponent {
  constructor() {
    super('left-nav', 'div');
    this.addClass('left-navigation-bar');
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    this.navigationItems = [];
  }
  
  init() {
    // Create navigation items
    this.addNavigationItem('home', 'Home', () => {
      this.eventBus.emit('navigation:home');
    });
    
    this.addNavigationItem('map', 'Galaxy Map', () => {
      this.eventBus.emit('overlay:show', { overlay: 'galaxyMap' });
    });
    
    this.addNavigationItem('settings', 'Settings', () => {
      this.eventBus.emit('overlay:show', { overlay: 'settings' });
    });
    
    this.addNavigationItem('help', 'Help', () => {
      this.eventBus.emit('overlay:show', { overlay: 'help' });
    });
  }
  
  addNavigationItem(id, label, callback) {
    const item = new UIComponent(`nav-${id}`, 'div');
    item.addClass('nav-item');
    item.setContent(label);
    item.element.addEventListener('click', callback);
    
    this.navigationItems.push(item);
    this.addChild(item);
    
    return item;
  }
  
  setActiveItem(id) {
    this.navigationItems.forEach(item => {
      if (item.element.id === `nav-${id}`) {
        item.addClass('active');
      } else {
        item.removeClass('active');
      }
    });
  }
}
```

#### 2.4.3 Overlay System

Create a system to manage full-screen overlays like the Galaxy Map:

```javascript
// src/ui/overlaySystem.js
import { UIComponent } from './uiComponent.js';
import { services } from '../core/services.js';

export class OverlaySystem {
  constructor() {
    this.overlays = {};
    this.activeOverlay = null;
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    
    // Create overlay container
    this.container = new UIComponent('overlay-container');
    this.container.addClass('overlay-container');
    this.container.hide();
    document.body.appendChild(this.container.element);
  }
  
  init() {
    this.eventBus.on('overlay:show', ({ overlay }) => {
      this.showOverlay(overlay);
    });
    
    this.eventBus.on('overlay:hide', () => {
      this.hideActiveOverlay();
    });
  }
  
  registerOverlay(name, overlay) {
    this.overlays[name] = overlay;
    overlay.hide();
    this.container.addChild(overlay);
  }
  
  showOverlay(name) {
    if (!this.overlays[name]) {
      console.error(`Overlay ${name} not registered`);
      return;
    }
    
    // Hide current overlay if exists
    this.hideActiveOverlay();
    
    // Show container and new overlay
    this.container.show();
    this.overlays[name].show();
    this.activeOverlay = name;
    
    // Update state
    this.gameState.update('ui.activeOverlay', name);
  }
  
  hideActiveOverlay() {
    if (this.activeOverlay && this.overlays[this.activeOverlay]) {
      this.overlays[this.activeOverlay].hide();
    }
    
    this.container.hide();
    this.activeOverlay = null;
    
    // Update state
    this.gameState.update('ui.activeOverlay', null);
  }
}
```

#### 2.4.4 Galaxy Map Overlay

Implement the Galaxy Map as an overlay rather than a separate scene:

```javascript
// src/overlays/galaxyMapOverlay.js
import { UIComponent } from '../ui/uiComponent.js';
import { services } from '../core/services.js';

export class GalaxyMapOverlay extends UIComponent {
  constructor() {
    super('galaxy-map-overlay');
    this.addClass('full-screen-overlay');
    this.addClass('galaxy-map');
    
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    
    this.planets = [];
    this.selectedPlanet = null;
  }
  
  init() {
    // Create header
    this.header = new UIComponent('galaxy-map-header');
    this.header.addClass('overlay-header');
    this.header.setContent(`
      <h2>Galaxy Map: Alpha Sector</h2>
      <button id="galaxy-map-close">Close</button>
    `);
    this.addChild(this.header);
    
    // Close button functionality
    document.getElementById('galaxy-map-close').addEventListener('click', () => {
      this.eventBus.emit('overlay:hide');
    });
    
    // Create map container
    this.mapContainer = new UIComponent('galaxy-map-container');
    this.mapContainer.addClass('map-container');
    this.addChild(this.mapContainer);
    
    // Create planet details panel
    this.detailsPanel = new UIComponent('planet-details');
    this.detailsPanel.addClass('planet-details');
    this.detailsPanel.setContent('<h3>Select a planet</h3>');
    this.addChild(this.detailsPanel);
    
    // Generate planets
    this.generatePlanets();
  }
  
  generatePlanets() {
    // Simple planet generation
    const planets = [
      { id: 'alpha', name: 'Mineralis', type: 'Rich', resources: 'HIGH', danger: 'MEDIUM' },
      { id: 'beta', name: 'Crystallos', type: 'Crystal', resources: 'MEDIUM', danger: 'LOW' },
      { id: 'gamma', name: 'Gaseous', type: 'Gas', resources: 'MEDIUM', danger: 'HIGH' },
      { id: 'delta', name: 'Metallic', type: 'Metal', resources: 'HIGH', danger: 'HIGH' }
    ];
    
    planets.forEach(planet => {
      const planetElement = new UIComponent(`planet-${planet.id}`);
      planetElement.addClass('planet');
      planetElement.setContent(`<div class="planet-icon ${planet.type.toLowerCase()}"></div>`);
      
      // Random position within map
      const x = 50 + Math.random() * 300;
      const y = 50 + Math.random() * 200;
      planetElement.setPosition(x, y);
      
      // Select planet on click
      planetElement.element.addEventListener('click', () => {
        this.selectPlanet(planet);
      });
      
      this.planets.push({ element: planetElement, data: planet });
      this.mapContainer.addChild(planetElement);
    });
  }
  
  selectPlanet(planet) {
    // Update selected planet
    this.selectedPlanet = planet;
    
    // Update planet selection visuals
    this.planets.forEach(p => {
      if (p.data.id === planet.id) {
        p.element.addClass('selected');
      } else {
        p.element.removeClass('selected');
      }
    });
    
    // Update details panel
    this.detailsPanel.setContent(`
      <h3>Planet Details</h3>
      <div class="detail-row">
        <span class="label">Name:</span>
        <span class="value">${planet.name}</span>
      </div>
      <div class="detail-row">
        <span class="label">Type:</span>
        <span class="value">${planet.type}</span>
      </div>
      <div class="detail-row">
        <span class="label">Resources:</span>
        <span class="value">${planet.resources}</span>
      </div>
      <div class="detail-row">
        <span class="label">Danger:</span>
        <span class="value">${planet.danger}</span>
      </div>
      <p class="description">
        ${this.getPlanetDescription(planet)}
      </p>
      <div class="actions">
        <button id="launch-expedition">Launch Expedition</button>
        <button id="return-home">Return to Home</button>
      </div>
    `);
    
    // Set up action buttons
    document.getElementById('launch-expedition').addEventListener('click', () => {
      this.launchExpedition(planet);
    });
    
    document.getElementById('return-home').addEventListener('click', () => {
      this.returnToHome();
    });
  }
  
  getPlanetDescription(planet) {
    // Generate a description based on planet type
    const descriptions = {
      'Rich': 'A resource-rich world with valuable deposits of various materials. Watch for hostile fauna.',
      'Crystal': 'Beautiful crystalline formations cover the surface. Excellent source of high-grade crystals.',
      'Gas': 'A gas-rich planet with rare atmospheric elements. High winds make navigation challenging.',
      'Metal': 'Heavy metal content in the crust. Valuable but heavily defended by automated security systems.'
    };
    
    return descriptions[planet.type] || 'A mysterious planet awaiting exploration.';
  }
  
  launchExpedition(planet) {
    // Store selected planet in game state
    this.gameState.update('expedition.currentPlanet', planet.id);
    
    // Emit expedition launch event
    this.eventBus.emit('expedition:launch', { planet });
    
    // Hide the overlay
    this.eventBus.emit('overlay:hide');
  }
  
  returnToHome() {
    // Emit return to home event
    this.eventBus.emit('navigation:home');
    
    // Hide the overlay
    this.eventBus.emit('overlay:hide');
  }
}
```

### 2.5 Scene Management

Implement a proper scene management system:

```javascript
// src/core/sceneManager.js
import { services } from './services.js';

export class SceneManager {
  constructor() {
    this.scenes = {};
    this.currentScene = null;
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
  }
  
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }
  
  async switchToScene(name, data = {}) {
    if (!this.scenes[name]) {
      console.error(`Scene ${name} not found`);
      return;
    }
    
    // Clean up current scene
    if (this.currentScene) {
      await this.scenes[this.currentScene].exit();
    }
    
    // Update state
    this.currentScene = name;
    this.gameState.update('ui.activeScene', name);
    
    // Initialize and enter new scene
    await this.scenes[name].enter(data);
    
    // Emit event for UI updates
    this.eventBus.emit('scene:changed', { scene: name, data });
  }
  
  getCurrentScene() {
    return this.currentScene ? this.scenes[this.currentScene] : null;
  }
}
```

### 2.6 Performance Optimizations

#### 2.6.1 Terrain Chunk Management

Optimize terrain rendering with chunk-based loading:

```javascript
// src/terrain/chunkManager.js
import { services } from '../core/services.js';

export class ChunkManager {
  constructor(chunkSize = 16) {
    this.chunkSize = chunkSize;
    this.chunks = new Map();
    this.gameState = services.get('gameState');
    this.eventBus = services.get('eventBus');
  }
  
  getChunkKey(x, y, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    return `${chunkX}:${chunkY}:${chunkZ}`;
  }
  
  getChunkForPosition(x, y, z) {
    const key = this.getChunkKey(x, y, z);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, this.createChunk(key));
    }
    return this.chunks.get(key);
  }
  
  createChunk(key) {
    const [chunkX, chunkY, chunkZ] = key.split(':').map(Number);
    return {
      key,
      blocks: {},
      position: { x: chunkX, y: chunkY, z: chunkZ },
      dirty: true,
      loaded: false
    };
  }
  
  setBlock(x, y, z, blockType) {
    const chunk = this.getChunkForPosition(x, y, z);
    
    // Calculate local coordinates within the chunk
    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
    
    const blockKey = `${localX}:${localY}:${localZ}`;
    const oldBlock = chunk.blocks[blockKey];
    
    if (blockType) {
      chunk.blocks[blockKey] = blockType;
    } else {
      delete chunk.blocks[blockKey];
    }
    
    // Mark chunk as dirty
    chunk.dirty = true;
    
    // Emit block change event
    this.eventBus.emit('terrain:blockChanged', { 
      position: { x, y, z }, 
      oldBlock, 
      newBlock: blockType 
    });
    
    // Also mark adjacent chunks as dirty if this is a boundary block
    this.updateAdjacentChunks(x, y, z);
    
    return true;
  }
  
  getBlock(x, y, z) {
    const chunk = this.getChunkForPosition(x, y, z);
    
    // Calculate local coordinates within the chunk
    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
    
    const blockKey = `${localX}:${localY}:${localZ}`;
    return chunk.blocks[blockKey] || null;
  }
  
  updateAdjacentChunks(x, y, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    
    // Check if this is a boundary block
    const onBoundaryX = x % this.chunkSize === 0;
    const onBoundaryY = y % this.chunkSize === 0;
    const onBoundaryZ = z % this.chunkSize === 0;
    
    // Mark adjacent chunks as dirty if necessary
    if (onBoundaryX) {
      const adjacentKey = `${chunkX - 1}:${chunkY}:${chunkZ}`;
      if (this.chunks.has(adjacentKey)) {
        this.chunks.get(adjacentKey).dirty = true;
      }
    }
    
    if (onBoundaryY) {
      const adjacentKey = `${chunkX}:${chunkY - 1}:${chunkZ}`;
      if (this.chunks.has(adjacentKey)) {
        this.chunks.get(adjacentKey).dirty = true;
      }
    }
    
    if (onBoundaryZ) {
      const adjacentKey = `${chunkX}:${chunkY}:${chunkZ - 1}`;
      if (this.chunks.has(adjacentKey)) {
        this.chunks.get(adjacentKey).dirty = true;
      }
    }
  }
  
  loadChunksAroundPosition(x, y, z, radius) {
    const centerChunkX = Math.floor(x / this.chunkSize);
    const centerChunkY = Math.floor(y / this.chunkSize);
    const centerChunkZ = Math.floor(z / this.chunkSize);
    
    const chunkRadius = Math.ceil(radius / this.chunkSize);
    const chunksToLoad = new Set();
    
    // Determine chunks within radius
    for (let offsetX = -chunkRadius; offsetX <= chunkRadius; offsetX++) {
      for (let offsetY = -chunkRadius; offsetY <= chunkRadius; offsetY++) {
        for (let offsetZ = -chunkRadius; offsetZ <= chunkRadius; offsetZ++) {
          const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ);
          if (distance <= chunkRadius) {
            const chunkX = centerChunkX + offsetX;
            const chunkY = centerChunkY + offsetY;
            const chunkZ = centerChunkZ + offsetZ;
            chunksToLoad.add(`${chunkX}:${chunkY}:${chunkZ}`);
          }
        }
      }
    }
    
    // Load needed chunks, unload others
    for (const chunkKey of this.chunks.keys()) {
      if (chunksToLoad.has(chunkKey)) {
        // Ensure the chunk is loaded
        this.ensureChunkLoaded(chunkKey);
        chunksToLoad.delete(chunkKey);
      } else {
        // Unload chunks outside radius
        this.unloadChunk(chunkKey);
      }
    }
    
    // Create and load any new chunks needed
    for (const chunkKey of chunksToLoad) {
      this.ensureChunkLoaded(chunkKey);
    }
  }
  
  ensureChunkLoaded(chunkKey) {
    if (!this.chunks.has(chunkKey)) {
      this.chunks.set(chunkKey, this.createChunk(chunkKey));
    }
    
    const chunk = this.chunks.get(chunkKey);
    
    if (!chunk.loaded) {
      // Generate terrain for this chunk
      this.generateChunkTerrain(chunk);
      chunk.loaded = true;
      chunk.dirty = true;
    }
  }
  
  unloadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey);
    if (chunk) {
      // Emit chunk unload event
      this.eventBus.emit('terrain:chunkUnloaded', { chunkKey });
      
      // Remove from memory
      this.chunks.delete(chunkKey);
    }
  }
  
  generateChunkTerrain(chunk) {
    // This would call into the terrain generation system
    this.eventBus.emit('terrain:generateChunk', { chunk });
  }
}
```

## 3. Implementation Priorities

The changes should be implemented in the following order:

1. **Foundation Layer**
   - State Management System
   - Event System
   - Service Locator
   - Scene Manager

2. **Core Gameplay**
   - Entity Component System
   - Manager Base Classes
   - Resource Manager Refactoring
   - Chunk-based Terrain System

3. **UI Framework**
   - UI Component Base Classes
   - Left Navigation Bar Component
   - Overlay System
   - Galaxy Map Overlay Implementation

4. **New Features**
   - Home Base System
   - Research System
   - Expedition System
   - Construction System

## 4. Migration Path

To smoothly transition from the current architecture to the new one:

1. **Phase 1: Infrastructure**
   - Add core services without modifying existing code
   - Create EventBus and wire up existing systems incrementally
   - Implement state store for core gameplay state
   - Create component framework alongside existing classes

2. **Phase 2: Manager Conversion**
   - Convert one manager at a time to extend Manager base class
   - Start with less interconnected managers (e.g., ResourceManager)
   - Gradually replace direct references with event-based communication
   - Implement entity system in parallel with existing entities

3. **Phase 3: UI Infrastructure**
   - Build UI component system
   - Create Left Navigation Bar component to match existing functionality
   - Create overlay system and convert Galaxy Map to an overlay

4. **Phase 4: Scene Structure**
   - Create proper scene management system
   - Convert existing game screens to scenes
   - Implement state persistence between scenes
   - Maintain left navigation across scene transitions

5. **Phase 5: New Systems**
   - Add Home Base implementation
   - Integrate research and progression
   - Enhance resource management
   - Add expedition system

## 5. Challenges and Solutions

### 5.1 Performance Considerations

1. **Terrain Rendering**
   - Solution: Chunk-based loading and unloading
   - Implementation: ChunkManager with visibility culling

2. **Entity Management**
   - Solution: Spatial partitioning for collision detection
   - Implementation: QuadTree for 2D entities, Octree for 3D

3. **Memory Management**
   - Solution: Object pooling for frequently created entities
   - Implementation: EntityPool class with reuse patterns

### 5.2 Backward Compatibility

1. **Save Data**
   - Solution: Data migration system for saved games
   - Implementation: Version tagged save data with migration functions

2. **API Changes**
   - Solution: Facade pattern for legacy code interfaces
   - Implementation: Adapter classes to translate between old and new APIs

### 5.3 Testing Strategy

1. **Unit Testing**
   - Solution: Test individual components in isolation
   - Implementation: Jest tests for core logic components

2. **Integration Testing**
   - Solution: Test manager interactions and event flow
   - Implementation: Integration tests for key game systems

3. **UI Testing**
   - Solution: Test UI component rendering and interaction
   - Implementation: Simulated DOM tests for UI components 

## 6. Implementation Progress Update

### 6.1 Completed Core Components

The following core architectural components have been successfully implemented:

1. **State Management System** (src/core/gameState.js)
   - Full implementation of GameState class
   - Dot-notation path support for state access
   - Subscription-based state updates
   - Transaction support for batch updates

2. **Event System** (src/core/eventBus.js)
   - Event bus implementation with subscription model
   - Async event support for promises
   - Event history tracking
   - Debug mode for event logging

3. **Service Locator** (src/core/services.js)
   - Service registration and retrieval
   - Core service initialization
   - Service existence checks

4. **Manager Base Class** (src/core/manager.js)
   - Standardized manager lifecycle (init, update, cleanup)
   - Event handling with automatic cleanup
   - State subscription with automatic cleanup
   - Logging and error handling

5. **Entity Component System** (src/core/entity.js, src/core/component.js)
   - Component-based entity architecture
   - Component lifecycle management
   - Tag system for entity categorization

6. **Scene Management** (src/core/sceneManager.js)
   - Scene registration and switching
   - Overlay management
   - Scene history tracking
   - Async scene transitions

7. **UI Management** (src/core/uiManager.js)
   - Component registration and mounting
   - Modal and overlay system
   - Toast notification system
   - Tooltip management

### 6.2 Refactored Domain Managers

The following domain-specific managers have been refactored to use the new architecture:

1. **Resource Manager** (src/managers/resourceManager.js)
   - Event-based resource operations
   - State integration for resource tracking
   - Resource capacity and extraction rate management
   - Resource deposit tracking

2. **Enemy Manager** (src/managers/enemyManager.js)
   - Event-based enemy spawning and management
   - Wave system implementation
   - Entity-based enemy tracking

3. **Carrier Manager** (src/managers/carrierManager.js)
   - Carrier entity management
   - Hardpoint system for upgrades
   - Movement and control handling

4. **Turret Manager** (src/managers/turretManager.js)
   - Turret placement and management
   - Target acquisition and firing control
   - Upgrade handling

5. **Terrain Manager** (src/managers/terrainManager.js)
   - Terrain generation and modification
   - Resource deposit placement
   - World region management

### 6.3 Remaining Implementation Tasks

The following components still need to be implemented or refactored:

1. **UI Component Base Classes**
   - Implement reusable UI components for consistent interface
   - Create a component hierarchy for specialized UI elements
   - Standardize event handling in UI components

2. **Left Navigation Component**
   - Refactor to use new UI component system
   - Ensure persistence across scene transitions
   - Implement proper navigation state management

3. **Overlay System Refinement**
   - Convert Galaxy Map to a proper overlay
   - Implement standardized overlay transitions
   - Create reusable modal dialog system

4. **Entity Registry**
   - Implement centralized entity tracking
   - Add spatial partitioning for performance
   - Create entity query system

5. **Performance Optimizations**
   - Implement terrain chunk management
   - Add object pooling for frequently created entities
   - Optimize rendering with batching and culling

6. **Home Base System**
   - Create home base scene
   - Implement facility placement and upgrading
   - Add research and progression systems

7. **Expedition System**
   - Implement mission selection and preparation
   - Create resource transportation mechanics
   - Add mission results and rewards

### 6.4 Next Steps

The immediate next steps for continuing the refactoring should be:

1. **Complete UI Framework**
   - Finish implementation of UI component base classes
   - Create left navigation component using new framework
   - Refactor existing UI elements to use new components

2. **Galaxy Map Overlay**
   - Convert Galaxy Map to a proper overlay
   - Ensure proper integration with SceneManager
   - Implement smooth transitions

3. **Entity Registry**
   - Implement EntityRegistry for efficient entity management
   - Add spatial partitioning for collision detection
   - Create entity query system for gameplay systems

4. **Continue Manager Refactoring**
   - Refactor any remaining managers to use base class
   - Replace direct references with event-based communication
   - Update state management in all managers 