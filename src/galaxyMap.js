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

// Planet Type Definitions
export const PLANET_TYPES = {
  SMALL: {
    name: "Small Planet",
    description: "A small mining outpost with limited resources.",
    minWidth: 1024,
    maxWidth: 2048,
    minHeight: 1800,
    maxHeight: 2000,
    resourceMultiplier: 0.8,
    enemyScaling: 0.7,
    cssClass: "small"
  },
  LARGE: {
    name: "Large Planet",
    description: "A vast world with extensive mining opportunities.",
    minWidth: 4096,
    maxWidth: 6048,
    minHeight: 2200,
    maxHeight: 2400,
    resourceMultiplier: 1.2,
    enemyScaling: 1.1,
    cssClass: "large"
  },
  RICH: {
    name: "Resource-Rich Planet",
    description: "A planet teeming with valuable minerals and crystals.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 2000,
    maxHeight: 2200,
    resourceMultiplier: 1.5,
    enemyScaling: 1.0,
    cssClass: "rich"
  },
  DEEP: {
    name: "Deep Core Planet",
    description: "A planet with extremely deep and valuable core resources.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 2400,
    maxHeight: 3000,
    resourceMultiplier: 1.3,
    enemyScaling: 1.2,
    cssClass: "deep"
  },
  EASY: {
    name: "Peaceful Planet",
    description: "A relatively safe world with minimal enemy activity.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 1800,
    maxHeight: 2200,
    resourceMultiplier: 0.9,
    enemyScaling: 0.5,
    cssClass: "easy"
  },
  HARD: {
    name: "Hostile Planet",
    description: "A dangerous world overrun with aggressive enemies.",
    minWidth: 2048,
    maxWidth: 4096,
    minHeight: 1800,
    maxHeight: 2200,
    resourceMultiplier: 1.1,
    enemyScaling: 1.5,
    cssClass: "hard"
  }
};

// Galaxy Map Data Structure
export const GALAXY_MAP = {
  name: "Alpha Sector",
  planets: [
    {
      id: "alpha-1",
      name: "Mineralis Prime",
      type: PLANET_TYPES.RICH,
      position: { x: 25, y: 35 },
      description: "The first mining colony established in the sector. Rich in surface minerals.",
      color: "#7FDBFF"
    },
    {
      id: "alpha-2",
      name: "Deimos",
      type: PLANET_TYPES.SMALL,
      position: { x: 65, y: 20 },
      description: "A small asteroid converted to a mining outpost. Limited resources but easy to defend.",
      color: "#B10DC9"
    },
    {
      id: "alpha-3",
      name: "Nova Gigantus",
      type: PLANET_TYPES.LARGE,
      position: { x: 80, y: 60 },
      description: "A massive planet with extensive mining potential and challenging terrain.",
      color: "#FFDC00"
    },
    {
      id: "alpha-4",
      name: "Abyssal",
      type: PLANET_TYPES.DEEP,
      position: { x: 40, y: 70 },
      description: "Known for its extremely deep mineral deposits hidden beneath layers of dense rock.",
      color: "#0074D9"
    },
    {
      id: "alpha-5",
      name: "Haven",
      type: PLANET_TYPES.EASY,
      position: { x: 15, y: 50 },
      description: "A relatively peaceful mining colony with minimal enemy presence.",
      color: "#2ECC40"
    },
    {
      id: "alpha-6",
      name: "Infernus",
      type: PLANET_TYPES.HARD,
      position: { x: 50, y: 30 },
      description: "A hostile world where enemy waves are frequent and extremely dangerous.",
      color: "#FF4136"
    }
  ]
};

export class GalaxyMap {
  /**
   * Creates a new Galaxy Map instance
   * 
   * @param {Phaser.Scene} scene - The current game scene
   */
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedPlanet = null;
    
    // Create and initialize the galaxy map interface
    this.createGalaxyMapInterface();
  }
  
  /**
   * Creates the Galaxy Map UI elements
   */
  createGalaxyMapInterface() {
    // Get the UI overlay container
    const uiOverlay = document.getElementById('ui-overlay');
    
    // Create the galaxy map overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'galaxy-map-overlay';
    
    // Create the container
    const container = document.createElement('div');
    container.className = 'galaxy-map-container';
    
    // Add title
    const title = document.createElement('h2');
    title.className = 'galaxy-title';
    title.textContent = GALAXY_MAP.name;
    container.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => this.toggleGalaxyMap());
    container.appendChild(closeButton);
    
    // Create galaxy view
    const galaxyView = document.createElement('div');
    galaxyView.className = 'galaxy-view';
    container.appendChild(galaxyView);
    
    // Create voxel space background
    const voxelSpace = document.createElement('div');
    voxelSpace.className = 'voxel-space';
    this.createVoxelBackground(voxelSpace);
    galaxyView.appendChild(voxelSpace);
    
    // Add planets
    GALAXY_MAP.planets.forEach(planet => {
      const planetElement = document.createElement('div');
      planetElement.className = `planet ${planet.type.cssClass}`;
      planetElement.id = planet.id;
      planetElement.style.left = `${planet.position.x}%`;
      planetElement.style.top = `${planet.position.y}%`;
      
      // Add event listener for planet selection
      planetElement.addEventListener('click', () => {
        this.selectPlanet(planet.id);
      });
      
      galaxyView.appendChild(planetElement);
    });
    
    // Create planet info modal
    const planetInfoModal = document.createElement('div');
    planetInfoModal.className = 'planet-info-modal';
    this.planetInfoModal = planetInfoModal;
    
    // Append elements to the overlay
    this.overlay.appendChild(container);
    this.overlay.appendChild(planetInfoModal);
    
    // Append overlay to UI
    uiOverlay.appendChild(this.overlay);
  }
  
  /**
   * Creates a voxel-style space background with stars and nebulae
   * 
   * @param {HTMLElement} container - The container element for the background
   */
  createVoxelBackground(container) {
    // Add stars
    for (let i = 0; i < 200; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // Vary star size slightly
      const size = 1 + Math.random() * 2;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      
      // Vary opacity
      star.style.opacity = 0.5 + Math.random() * 0.5;
      
      container.appendChild(star);
    }
    
    // Add nebulae
    for (let i = 0; i < 5; i++) {
      const nebula = document.createElement('div');
      nebula.className = 'nebula';
      nebula.style.left = `${Math.random() * 100}%`;
      nebula.style.top = `${Math.random() * 100}%`;
      
      // Vary nebula size
      const size = 100 + Math.random() * 200;
      nebula.style.width = `${size}px`;
      nebula.style.height = `${size}px`;
      
      // Random color
      const colors = ['#ff7675', '#74b9ff', '#55efc4', '#a29bfe', '#ffeaa7'];
      nebula.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}33 0%, rgba(255,255,255,0) 70%)`;
      
      container.appendChild(nebula);
    }
  }
  
  /**
   * Toggles the visibility of the Galaxy Map
   */
  toggleGalaxyMap() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.overlay.classList.add('visible');
    } else {
      this.overlay.classList.remove('visible');
      // Hide planet info when closing
      this.planetInfoModal.classList.remove('visible');
    }
  }
  
  /**
   * Selects a planet and displays its information
   * 
   * @param {string} planetId - The ID of the planet to select
   */
  selectPlanet(planetId) {
    // Find the planet in the data
    const planet = GALAXY_MAP.planets.find(p => p.id === planetId);
    if (!planet) return;
    
    // Store the selected planet
    this.selectedPlanet = planet;
    
    // Update visual selection
    document.querySelectorAll('.planet').forEach(p => {
      p.classList.remove('selected');
    });
    document.getElementById(planetId).classList.add('selected');
    
    // Update planet info modal
    this.updatePlanetInfoModal(planet);
    
    // Show the modal
    this.planetInfoModal.classList.add('visible');
  }
  
  /**
   * Updates the planet information modal with the selected planet's details
   * 
   * @param {Object} planet - The selected planet object
   */
  updatePlanetInfoModal(planet) {
    // Clear existing content
    this.planetInfoModal.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'planet-info-header';
    
    const planetName = document.createElement('h3');
    planetName.className = 'planet-info-name';
    planetName.textContent = planet.name;
    
    const planetType = document.createElement('div');
    planetType.className = 'planet-info-type';
    planetType.textContent = planet.type.name;
    
    header.appendChild(planetName);
    header.appendChild(planetType);
    this.planetInfoModal.appendChild(header);
    
    // Add description
    const description = document.createElement('div');
    description.className = 'planet-info-description';
    description.textContent = planet.description;
    this.planetInfoModal.appendChild(description);
    
    // Add stats
    const stats = document.createElement('div');
    stats.className = 'planet-info-stats';
    
    // World size
    const sizeStats = document.createElement('div');
    sizeStats.className = 'planet-info-stat';
    sizeStats.textContent = `World Size: ${this.formatWorldSize(planet.type)}`;
    stats.appendChild(sizeStats);
    
    // Resource richness
    const resourceStats = document.createElement('div');
    resourceStats.className = 'planet-info-stat';
    resourceStats.textContent = `Resources: ${this.formatMultiplier(planet.type.resourceMultiplier)}`;
    stats.appendChild(resourceStats);
    
    // Enemy difficulty
    const enemyStats = document.createElement('div');
    enemyStats.className = 'planet-info-stat';
    enemyStats.textContent = `Difficulty: ${this.formatMultiplier(planet.type.enemyScaling)}`;
    stats.appendChild(enemyStats);
    
    this.planetInfoModal.appendChild(stats);
    
    // Add launch button
    const launchButton = document.createElement('button');
    launchButton.className = 'launch-button';
    launchButton.textContent = 'LAUNCH EXPEDITION';
    launchButton.addEventListener('click', () => {
      this.launchSelectedPlanet();
    });
    this.planetInfoModal.appendChild(launchButton);
  }
  
  /**
   * Formats the world size for display
   * 
   * @param {Object} planetType - The planet type object
   * @returns {string} Formatted world size
   */
  formatWorldSize(planetType) {
    const avgWidth = Math.round((planetType.minWidth + planetType.maxWidth) / 2);
    if (avgWidth < 3000) return 'Small';
    if (avgWidth > 5000) return 'Large';
    return 'Medium';
  }
  
  /**
   * Formats a multiplier value for display
   * 
   * @param {number} value - The multiplier value
   * @returns {string} Formatted multiplier string
   */
  formatMultiplier(value) {
    if (value <= 0.7) return 'Low';
    if (value <= 0.9) return 'Below Average';
    if (value <= 1.1) return 'Average';
    if (value <= 1.3) return 'Above Average';
    return 'High';
  }
  
  /**
   * Launches the currently selected planet
   * Saves planet parameters to registry and resets the game
   */
  launchSelectedPlanet() {
    if (!this.selectedPlanet) return;
    
    // Get the planet type parameters
    const planetType = this.selectedPlanet.type;
    
    // Generate random width within the planet type's range
    const randomWidth = Math.floor(Math.random() * (planetType.maxWidth - planetType.minWidth)) + planetType.minWidth;
    
    // Generate random height within the planet type's range
    const randomHeight = Math.floor(Math.random() * (planetType.maxHeight - planetType.minHeight)) + planetType.minHeight;
    
    // Generate random seed
    const randomSeed = Math.random() * 1000;
    
    // Create world parameters object
    const worldParams = {
      width: randomWidth,
      height: randomHeight,
      seed: randomSeed,
      resourceMultiplier: planetType.resourceMultiplier,
      enemyScaling: planetType.enemyScaling,
      planetName: this.selectedPlanet.name,
      planetId: this.selectedPlanet.id
    };
    
    // Store planet parameters in registry
    this.scene.registry.set('selectedPlanet', worldParams);
    
    // Hide the galaxy map
    this.toggleGalaxyMap();
    
    // Update UI planet info if UI exists
    if (this.scene.ui && this.scene.ui.updatePlanetInfo) {
      this.scene.ui.updatePlanetInfo();
    }
    
    // Display loading notification
    if (this.scene.ui && this.scene.ui.showNotification) {
      this.scene.ui.showNotification(`Launching expedition to ${this.selectedPlanet.name}...`, 'info');
    }
    
    // Restart the game to generate a new world with these parameters.
    // First, stop the current GameScene so the previous world is fully torn down.
    // Then start (or restart) the LoadingScene which will in turn launch a fresh GameScene.
    setTimeout(() => {
      console.log(`[GALAXY MAP] Initiating transition to planet ${this.selectedPlanet.name}`);
      
      // Try to log the current wave system state if accessible
      if (this.scene.enemyManager) {
        const waveState = {
          waveEnabled: this.scene.enemyManager.waveSystemEnabled,
          currentWave: this.scene.enemyManager.currentWave,
          isActive: this.scene.enemyManager.isWaveActive
        };
        console.log(`[GALAXY MAP] Current wave system state before transition:`, waveState);
      }
      
      console.log(`[GALAXY MAP] Stopping current GameScene`);
      
      // Stop the active GameScene (this one) to prevent duplicate scenes and logic.
      this.scene.scene.stop('GameScene');

      // Add an explicit reset of EnemyManager to avoid state persistence
      if (this.scene.enemyManager) {
        console.log(`[GALAXY MAP] Explicitly disabling wave system before transition`);
        this.scene.enemyManager.disableWaveSystem();
      }

      console.log(`[GALAXY MAP] Starting LoadingScene for new planet`);
      // Start a fresh LoadingScene. If it is already running, this will restart it.
      this.scene.scene.start('LoadingScene');
    }, 1000);
  }
} 