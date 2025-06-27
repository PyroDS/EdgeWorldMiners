# Galaxy Map Feature Implementation Plan

## 1. Overview
Add a "Galaxy Map" feature that allows players to select different planets to play on. Each planet will have unique characteristics that affect world generation parameters. The Galaxy Map will be accessible through the left navigation bar and via the "M" key.

## 2. Feature Requirements
- Galaxy Map accessible via left navigation and "M" key hotkey
- Overlay interface that can be closed via an X button or by clicking the Galaxy Map button again
- Voxel-style galaxy visualization with selectable planets
- Planet selection shows a modal with information and a "Launch" button
- Different planet types (small, huge, deep, rich, easy, hard) with varying world generation parameters
- Fixed map layout (not randomly generated) but with randomly generated worlds

## 3. Implementation Components

### 3.1. UI Components
1. **Galaxy Map Button**: Add to left navigation (already exists in nav items array, just needs functionality)
2. **Galaxy Map Overlay**: Full-screen overlay with voxel-style galaxy visualization
3. **Planet Objects**: Interactive 3D or sprite-based planets with visual indicators for type
4. **Planet Info Modal**: Displays planet characteristics and launch button
5. **Close Button**: X in corner to dismiss the overlay

### 3.2. Data Structure
```javascript
// Planet Type Definitions
const PLANET_TYPES = {
  SMALL: {
    name: "Small Planet",
    description: "A small mining outpost with limited resources.",
    minWidth: 1024,
    maxWidth: 2048,
    minHeight: 1800,
    maxHeight: 2000,
    resourceMultiplier: 0.8,
    enemyScaling: 0.7
  },
  LARGE: {
    name: "Large Planet",
    description: "A vast world with extensive mining opportunities.",
    minWidth: 4096,
    maxWidth: 6048,
    minHeight: 2200,
    maxHeight: 2400,
    resourceMultiplier: 1.2,
    enemyScaling: 1.1
  },
  RICH: {
    name: "Resource-Rich Planet",
    description: "A planet teeming with valuable minerals and crystals.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 2000,
    maxHeight: 2200,
    resourceMultiplier: 1.5,
    enemyScaling: 1.0
  },
  DEEP: {
    name: "Deep Core Planet",
    description: "A planet with extremely deep and valuable core resources.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 2400,
    maxHeight: 3000,
    resourceMultiplier: 1.3,
    enemyScaling: 1.2
  },
  EASY: {
    name: "Peaceful Planet",
    description: "A relatively safe world with minimal enemy activity.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 1800,
    maxHeight: 2200,
    resourceMultiplier: 0.9,
    enemyScaling: 0.5
  },
  HARD: {
    name: "Hostile Planet",
    description: "A dangerous world overrun with aggressive enemies.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 1800,
    maxHeight: 2200,
    resourceMultiplier: 1.1,
    enemyScaling: 1.5
  }
};

// Galaxy Map Data Structure
const GALAXY_MAP = {
  name: "Alpha Sector",
  planets: [
    {
      id: "alpha-1",
      name: "Mineralis Prime",
      type: PLANET_TYPES.RICH,
      position: { x: 100, y: 150 },
      description: "The first mining colony established in the sector. Rich in surface minerals.",
      color: "#7FDBFF"
    },
    {
      id: "alpha-2",
      name: "Deimos",
      type: PLANET_TYPES.SMALL,
      position: { x: 250, y: 100 },
      description: "A small asteroid converted to a mining outpost. Limited resources but easy to defend.",
      color: "#B10DC9"
    },
    // More planets will be added here
  ]
}
```

## 4. Code Modification Plan

### 4.1. Create New Files
1. **src/galaxyMap.js**: Manages the galaxy map interface and planet selection
   ```javascript
   /**
    * galaxyMap.js
    * 
    * Manages the galaxy map interface, planet selection, and world generation parameters.
    * 
    * Dependencies:
    * - game.js (for world regeneration)
    * - terrainManager.js (for terrain parameter adjustment)
    * - enemyManager.js (for difficulty scaling)
    */
   export class GalaxyMap {
     constructor(scene) {
       this.scene = scene;
       this.isVisible = false;
       
       // Create and initialize the galaxy map interface
       this.createGalaxyMapInterface();
       
       // Keep reference to the currently selected planet
       this.selectedPlanet = null;
     }
     
     // Initialize galaxy map UI
     createGalaxyMapInterface() {
       // Implementation details
     }
     
     // Toggle visibility of the galaxy map
     toggleGalaxyMap() {
       // Implementation details
     }
     
     // Handle planet selection
     selectPlanet(planetId) {
       // Implementation details
     }
     
     // Launch the selected planet
     launchSelectedPlanet() {
       // Implementation details
     }
   }
   
   // Planet type definitions
   export const PLANET_TYPES = {
     // As defined above
   };
   
   // Galaxy map data
   export const GALAXY_MAP = {
     // As defined above
   };
   ```

2. **src/styles/galaxyMap.css**: Styling for the galaxy map interface
   ```css
   /* Galaxy Map Overlay */
   #galaxy-map-overlay {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     background-color: rgba(0, 0, 0, 0.85);
     display: none;
     z-index: 1000;
     overflow: hidden;
   }
   
   #galaxy-map-overlay.visible {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
   }
   
   .galaxy-map-container {
     position: relative;
     width: 90%;
     height: 90%;
     overflow: hidden;
   }
   
   .galaxy-title {
     color: var(--text-primary);
     text-align: center;
     margin-bottom: 1rem;
     font-size: 1.8rem;
   }
   
   .close-button {
     position: absolute;
     top: 1rem;
     right: 1rem;
     color: var(--text-primary);
     background: none;
     border: none;
     font-size: 1.5rem;
     cursor: pointer;
     z-index: 1001;
   }
   
   /* Planet styling */
   .planet {
     position: absolute;
     width: 50px;
     height: 50px;
     border-radius: 50%;
     cursor: pointer;
     transition: transform 0.2s ease-in-out;
   }
   
   .planet:hover {
     transform: scale(1.1);
   }
   
   .planet.selected {
     box-shadow: 0 0 15px #fff, 0 0 25px var(--panel-border);
   }
   
   /* Planet info modal */
   .planet-info-modal {
     position: absolute;
     bottom: 2rem;
     left: 50%;
     transform: translateX(-50%);
     background-color: var(--panel-bg);
     border: 1px solid var(--panel-border);
     padding: 1rem;
     width: 60%;
     max-width: 600px;
     border-radius: 5px;
     display: none;
   }
   
   .planet-info-modal.visible {
     display: block;
   }
   
   .planet-info-header {
     display: flex;
     justify-content: space-between;
     margin-bottom: 0.5rem;
   }
   
   .planet-info-name {
     color: var(--text-secondary);
     font-size: 1.2rem;
     margin: 0;
   }
   
   .planet-info-type {
     color: var(--text-primary);
     font-size: 0.9rem;
     opacity: 0.8;
   }
   
   .planet-info-description {
     color: var(--text-primary);
     margin: 0.5rem 0 1rem 0;
   }
   
   .planet-info-stats {
     display: grid;
     grid-template-columns: 1fr 1fr;
     gap: 0.5rem;
     margin-bottom: 1rem;
   }
   
   .planet-info-stat {
     color: var(--text-primary);
     font-size: 0.8rem;
   }
   
   .launch-button {
     background-color: var(--button-bg);
     color: var(--text-primary);
     border: 1px solid var(--panel-border);
     padding: 0.5rem 1rem;
     border-radius: 3px;
     cursor: pointer;
     font-weight: bold;
     width: 100%;
     transition: background-color 0.2s;
   }
   
   .launch-button:hover {
     background-color: var(--button-hover);
   }
   ```

### 4.2. Update Existing Files

#### index.html
```html
<head>
  <!-- ... existing code ... -->
  <link rel="stylesheet" href="src/styles/ui.css">
  <link rel="stylesheet" href="src/styles/galaxyMap.css">
  <!-- ... existing code ... -->
</head>
```

#### src/ui.js
1. Update left navigation click handler to toggle Galaxy Map
```javascript
// Inside createLeftNavigation() method
navItems.forEach(item => {
  const listItem = document.createElement('li');
  listItem.className = 'nav-item';
  
  const link = document.createElement('a');
  link.href = '#';
  link.id = item.id;
  link.innerText = item.label;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Handle galaxy map navigation item
    if (item.id === 'galaxy-map') {
      this.toggleGalaxyMap();
    } else {
      // Placeholder for future functionality
      console.log(`Navigation to: ${item.label}`);
    }
  });
  
  listItem.appendChild(link);
  navList.appendChild(listItem);
});
```

2. Add galaxyMap import and initialization
```javascript
// Add to imports at the top
import { GalaxyMap } from './galaxyMap.js';

// Add to constructor
constructor(scene, onSelectBuilding) {
  // ... existing code ...
  
  // Initialize UI components
  this.createHUD();
  this.createBuildMenu();
  this.createNotificationSystem();
  this.createKeyBindings();
  this.createSettingsUI();
  this.createLeftNavigation();
  this.createHotKeysSection();

  // Initialize Galaxy Map
  this.galaxyMap = new GalaxyMap(scene);
  
  // ... existing code ...
}
```

3. Add toggle method for Galaxy Map
```javascript
// Add new method
toggleGalaxyMap() {
  if (this.galaxyMap) {
    this.galaxyMap.toggleGalaxyMap();
  }
}
```

4. Add "M" key binding for Galaxy Map
```javascript
// Inside createKeyBindings() method
// Open/close the Galaxy Map with 'M' key
this.scene.input.keyboard.addKey('M').on('down', () => {
  this.toggleGalaxyMap();
});
```

5. Add Galaxy Map to hotkeys section
```javascript
// Inside createHotKeysSection() method
// Define all hot keys and their functions
const hotkeys = [
  { key: 'B', description: 'Toggle Build Menu' },
  { key: 'F', description: 'Toggle Focus Mode' },
  { key: 'M', description: 'Galaxy Map' },
  { key: ' <--> ', description: 'Move Left or right' },
  // Add more hot keys as they are implemented in the game
];
```

#### src/game.js
1. Update LoadingScene to accept planet parameters
```javascript
// Inside LoadingScene class create() method
create() {
  // Check for planet parameters in registry
  let worldParams = this.registry.get('selectedPlanet');
  
  // If no planet is selected, generate world parameters
  if (!worldParams) {
    // Generate default world parameters once here
    const minWidth = 1024;
    const maxWidth = 6048; // Further reduced for performance
    const randomWidthAddition = Math.floor(Math.random() * (maxWidth - minWidth));
    const worldWidth = minWidth + randomWidthAddition;
    
    const minHeight = 1800; // Ensure 800 px sky + 1000 px depth
    const maxHeight = 2400;
    const randomHeightAddition = Math.floor(Math.random() * (maxHeight - minHeight));
    const worldHeight = minHeight + randomHeightAddition;
    
    const worldSeed = Math.random() * 1000;

    worldParams = {
      width: worldWidth,
      height: worldHeight,
      seed: worldSeed,
      resourceMultiplier: 1.0,
      enemyScaling: 1.0
    };
  }
  
  // Store world parameters in registry to access in main scene
  this.registry.set('worldWidth', worldParams.width);
  this.registry.set('worldHeight', worldParams.height);
  this.registry.set('worldSeed', worldParams.seed);
  this.registry.set('resourceMultiplier', worldParams.resourceMultiplier);
  this.registry.set('enemyScaling', worldParams.enemyScaling);
  
  // Start the main game scene
  this.scene.launch('GameScene');
  
  // ... rest of existing code ...
}
```

#### src/terrainManager.js
1. Update constructor to use additional planet parameters
```javascript
constructor(scene, config = {}) {
  this.scene = scene;
  
  // --- World dimension constraints ---
  const minSkyPixels = 1000;   // must have at least 1000 px of sky above sea-level
  const minDepthPixels = 1200; // must have at least 1200 px of world below sea-level

  const minWorldHeight = minSkyPixels + minDepthPixels; // 2200 px

  const minWidth = 1024;
  const requestedHeight = config.height || 1800;
  this.width = Math.max(config.width || 2048, minWidth);
  this.height = Math.max(requestedHeight, minWorldHeight);

  // Additional planet parameters
  this.resourceMultiplier = config.resourceMultiplier || 1.0;

  // ... rest of existing code ...
}
```

2. Update resource generation to use resourceMultiplier
```javascript
// Inside getResourceValueAt method
getResourceValueAt(x, y) {
  const tile = this.tiles[y]?.[x];
  if (!tile) return 0;
  
  // Apply resource multiplier from planet configuration
  return (tile.resourceValue || 0) * this.resourceMultiplier;
}
```

#### src/enemyManager.js
1. Update constructor to use enemy scaling parameter
```javascript
constructor(scene, terrainManager, drillManager, turretManager, carrier) {
  // ... existing code ...
  
  // Get enemy scaling from registry (set in planet selection)
  this.enemyScaling = scene.registry.get('enemyScaling') || 1.0;
  
  // ... rest of existing code ...
}
```

2. Apply enemy scaling to enemy stats
```javascript
// Inside spawnMeleeEnemy method
spawnMeleeEnemy(x, y) {
  // ... existing code ...
  
  // Apply enemy scaling to stats
  const enemyHealth = Math.floor(this.MELEE_ENEMY_HEALTH * this.enemyScaling);
  const enemyDamage = this.MELEE_ENEMY_DAMAGE * this.enemyScaling;
  
  // ... create enemy with adjusted stats ...
}

// Similar updates for other enemy spawning methods
```

## 5. Implementation Steps

### Step 1: Create the Galaxy Map Interface
1. Create `src/galaxyMap.js` with the GalaxyMap class
2. Create `src/styles/galaxyMap.css` for styling
3. Implement voxel-style galaxy visualization (using DOM or Canvas)
4. Create interactive planet elements
5. Implement the planet info modal

### Step 2: Integrate with Navigation
1. Update `index.html` to include galaxyMap.css
2. Modify `src/ui.js` to import GalaxyMap and initialize it
3. Add toggle method for Galaxy Map
4. Update left navigation click handler for Galaxy Map
5. Add "M" key binding to toggle Galaxy Map
6. Add Galaxy Map to hotkeys section

### Step 3: Update World Generation
1. Modify `src/game.js` to accept planet parameters for world generation
2. Update `src/terrainManager.js` to incorporate resource multiplier
3. Update `src/enemyManager.js` to use enemy scaling parameter

### Step 4: Connect Planet Selection to World Generation
1. Implement planet selection in GalaxyMap class
2. Add "Launch" button functionality
3. Set up world reset and regeneration when changing planets

## 6. Future Extensions (Phase 2)
1. Save player progress per planet
2. Add special event planets with unique characteristics
3. Implement planet discovery/unlocking system
4. Add achievements tied to specific planets

## 7. Files to Modify
1. `index.html` - Add link to new CSS file
2. `src/ui.js` - Add Galaxy Map button functionality, "M" key binding, and integration
3. `src/game.js` - Update world generation to use planet parameters
4. `src/terrainManager.js` - Incorporate planet parameters into terrain generation
5. `src/enemyManager.js` - Adjust enemy scaling based on planet difficulty

## 8. New Files to Create
1. `src/galaxyMap.js` - Main Galaxy Map functionality
2. `src/styles/galaxyMap.css` - Styling for Galaxy Map interface

This plan follows the AI Development Guidelines by:
1. Maintaining modularity with a dedicated file for Galaxy Map functionality
2. Not refactoring existing code but extending it
3. Thoroughly documenting the new code and implementation steps
4. Following the existing UI patterns and styles
5. Planning for future scalability through a structured data approach 