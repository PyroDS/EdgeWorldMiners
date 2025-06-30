/**
 * GalaxyMapOverlay - Galaxy map as a full-screen overlay
 * Allows players to select planets and launch expeditions.
 */
import { UIComponent } from './UIComponent.js';
import services from '../core/services.js';

// Planet type definitions
const PLANET_TYPES = {
  SMALL: {
    name: 'Small',
    cssClass: 'small',
    description: 'A small asteroid with limited resources but easier to defend.',
    worldParams: {
      width: { min: 50, max: 100 },
      height: { min: 50, max: 100 },
      depth: { min: 30, max: 50 },
      resourceMultiplier: 0.7,
      enemyScaling: 0.8
    }
  },
  LARGE: {
    name: 'Large',
    cssClass: 'large',
    description: 'A massive world with extensive terrain and resources.',
    worldParams: {
      width: { min: 150, max: 200 },
      height: { min: 150, max: 200 },
      depth: { min: 70, max: 120 },
      resourceMultiplier: 1.2,
      enemyScaling: 1.2
    }
  },
  RICH: {
    name: 'Resource-Rich',
    cssClass: 'rich',
    description: 'A world with abundant resources near the surface.',
    worldParams: {
      width: { min: 100, max: 150 },
      height: { min: 100, max: 150 },
      depth: { min: 50, max: 80 },
      resourceMultiplier: 1.5,
      enemyScaling: 1.0
    }
  },
  DEEP: {
    name: 'Deep Core',
    cssClass: 'deep',
    description: 'Exceptional resources are buried deep within this world.',
    worldParams: {
      width: { min: 100, max: 150 },
      height: { min: 100, max: 150 },
      depth: { min: 100, max: 150 },
      resourceMultiplier: 1.3,
      enemyScaling: 1.1,
      deepResourceBonus: 2.0
    }
  },
  EASY: {
    name: 'Peaceful',
    cssClass: 'easy',
    description: 'A relatively undisturbed world with minimal enemy presence.',
    worldParams: {
      width: { min: 100, max: 150 },
      height: { min: 100, max: 150 },
      depth: { min: 50, max: 80 },
      resourceMultiplier: 0.9,
      enemyScaling: 0.6
    }
  },
  HARD: {
    name: 'Hostile',
    cssClass: 'hard',
    description: 'A dangerous world overrun with aggressive enemies.',
    worldParams: {
      width: { min: 100, max: 150 },
      height: { min: 100, max: 150 },
      depth: { min: 60, max: 90 },
      resourceMultiplier: 1.1,
      enemyScaling: 1.5
    }
  }
};

// Galaxy map data
const GALAXY_MAP = {
  name: "Alpha Sector",
  planets: [
    {
      id: "alpha-1",
      name: "Mineralis Prime",
      type: PLANET_TYPES.RICH,
      position: { x: 25, y: 35 },
      description: "The first mining colony established in the sector. Rich in surface minerals."
    },
    {
      id: "alpha-2",
      name: "Deimos",
      type: PLANET_TYPES.SMALL,
      position: { x: 65, y: 20 },
      description: "A small asteroid converted to a mining outpost. Limited resources but easy to defend."
    },
    {
      id: "alpha-3",
      name: "Nova Gigantus",
      type: PLANET_TYPES.LARGE,
      position: { x: 80, y: 60 },
      description: "A massive planet with extensive mining potential and challenging terrain."
    },
    {
      id: "alpha-4",
      name: "Abyssal",
      type: PLANET_TYPES.DEEP,
      position: { x: 40, y: 70 },
      description: "Known for its extremely deep mineral deposits hidden beneath layers of dense rock."
    },
    {
      id: "alpha-5",
      name: "Haven",
      type: PLANET_TYPES.EASY,
      position: { x: 15, y: 50 },
      description: "A relatively peaceful mining colony with minimal enemy presence."
    },
    {
      id: "alpha-6",
      name: "Infernus",
      type: PLANET_TYPES.HARD,
      position: { x: 50, y: 30 },
      description: "A hostile world where enemy waves are frequent and extremely dangerous."
    }
  ]
};

export class GalaxyMapOverlay extends UIComponent {
  /**
   * Create a new galaxy map overlay
   */
  constructor() {
    super('galaxy-map-overlay');
    
    // Apply styling classes
    this.addClass('full-screen-overlay');
    this.addClass('galaxy-map');
    
    // Hide by default
    this.hide();
    
    // Get services
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    
    // Track state
    this.planets = [];
    this.selectedPlanet = null;
    
    // Create the map interface
    this.createGalaxyMapInterface();
  }
  
  /**
   * Create the galaxy map UI elements
   */
  createGalaxyMapInterface() {
    // Create header
    this.header = new UIComponent(null, 'header');
    this.header.addClass('overlay-header');
    this.header.setContent(`
      <h2>Galaxy Map: ${GALAXY_MAP.name}</h2>
      <button class="close-button">&times;</button>
    `);
    this.addChild(this.header);
    
    // Set up close button functionality
    const closeButton = this.header.element.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
      this.eventBus.emit('overlay:hide');
    });
    
    // Create map container
    this.mapContainer = new UIComponent(null, 'div');
    this.mapContainer.addClass('map-container');
    this.addChild(this.mapContainer);
    
    // Create voxel space background
    this.createVoxelBackground();
    
    // Create planets
    this.createPlanets();
    
    // Create planet details panel
    this.detailsPanel = new UIComponent('planet-details');
    this.detailsPanel.addClass('planet-details');
    this.detailsPanel.setContent('<h3>Select a planet</h3>');
    this.addChild(this.detailsPanel);
  }
  
  /**
   * Create background voxel effect for the galaxy
   */
  createVoxelBackground() {
    const voxelSpace = new UIComponent(null, 'div');
    voxelSpace.addClass('voxel-space');
    
    // Add stars/background elements
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = `${Math.random() * 3}px`;
      star.style.height = star.style.width;
      star.style.opacity = Math.random() * 0.8 + 0.2;
      voxelSpace.element.appendChild(star);
    }
    
    // Add nebulae
    for (let i = 0; i < 3; i++) {
      const nebula = document.createElement('div');
      nebula.className = 'nebula';
      nebula.style.left = `${Math.random() * 80}%`;
      nebula.style.top = `${Math.random() * 80}%`;
      nebula.style.width = `${Math.random() * 180 + 100}px`;
      nebula.style.height = `${Math.random() * 180 + 100}px`;
      nebula.style.borderRadius = `${Math.random() * 50 + 50}%`;
      nebula.style.background = `radial-gradient(circle at center, rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3), rgba(0, 0, 0, 0))`;
      nebula.style.filter = 'blur(15px)';
      voxelSpace.element.appendChild(nebula);
    }
    
    this.mapContainer.addChild(voxelSpace);
  }
  
  /**
   * Create planet elements from map data
   */
  createPlanets() {
    GALAXY_MAP.planets.forEach(planet => {
      // Create planet element
      const planetElement = new UIComponent(`planet-${planet.id}`);
      planetElement.addClass('planet');
      planetElement.addClass(planet.type.cssClass);
      planetElement.setPosition(
        `${planet.position.x}%`,
        `${planet.position.y}%`
      );
      
      // Add event listener for planet selection
      planetElement.addEventListener('click', () => {
        this.selectPlanet(planet.id);
      });
      
      // Store reference with data
      this.planets.push({
        element: planetElement,
        data: planet
      });
      
      // Add to map container
      this.mapContainer.addChild(planetElement);
    });
  }
  
  /**
   * Select a planet and display its information
   * @param {string} planetId - ID of planet to select
   */
  selectPlanet(planetId) {
    // Find planet in data
    const planetObj = this.planets.find(p => p.data.id === planetId);
    if (!planetObj) return;
    
    const planet = planetObj.data;
    
    // Update selected planet
    this.selectedPlanet = planet;
    
    // Update planet selection visuals
    this.planets.forEach(p => {
      if (p.data.id === planetId) {
        p.element.addClass('selected');
      } else {
        p.element.removeClass('selected');
      }
    });
    
    // Update details panel
    this.detailsPanel.setContent(`
      <h3>${planet.name}</h3>
      <div class="detail-row">
        <span class="label">Type:</span>
        <span class="value">${planet.type.name}</span>
      </div>
      <div class="detail-row">
        <span class="label">Resources:</span>
        <span class="value">${this.getResourceRating(planet.type.worldParams.resourceMultiplier)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Danger Level:</span>
        <span class="value">${this.getDangerRating(planet.type.worldParams.enemyScaling)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Size:</span>
        <span class="value">${this.getSizeDescription(planet.type.worldParams)}</span>
      </div>
      <p class="planet-description">
        ${planet.description}
      </p>
      <p class="type-description">
        ${planet.type.description}
      </p>
      <div class="actions">
        <button id="launch-expedition" class="primary-button">Launch Expedition</button>
        <button id="return-home" class="secondary-button">Return to Home</button>
      </div>
    `);
    
    // Set up action buttons
    const launchButton = document.getElementById('launch-expedition');
    if (launchButton) {
      launchButton.addEventListener('click', () => {
        this.launchExpedition(planet);
      });
    }
    
    const returnButton = document.getElementById('return-home');
    if (returnButton) {
      returnButton.addEventListener('click', () => {
        this.returnToHome();
      });
    }
  }
  
  /**
   * Get a text rating for resource level
   * @param {number} multiplier - Resource multiplier
   * @returns {string} Rating text
   */
  getResourceRating(multiplier) {
    if (multiplier >= 1.4) return 'VERY HIGH';
    if (multiplier >= 1.1) return 'HIGH';
    if (multiplier >= 0.9) return 'MEDIUM';
    if (multiplier >= 0.7) return 'LOW';
    return 'VERY LOW';
  }
  
  /**
   * Get a text rating for danger level
   * @param {number} scaling - Enemy scaling factor
   * @returns {string} Rating text
   */
  getDangerRating(scaling) {
    if (scaling >= 1.4) return 'EXTREME';
    if (scaling >= 1.1) return 'HIGH';
    if (scaling >= 0.9) return 'MEDIUM';
    if (scaling >= 0.7) return 'LOW';
    return 'MINIMAL';
  }
  
  /**
   * Get size description text
   * @param {Object} params - World parameters
   * @returns {string} Size description
   */
  getSizeDescription(params) {
    const avgWidth = (params.width.min + params.width.max) / 2;
    
    if (avgWidth >= 175) return 'HUGE';
    if (avgWidth >= 125) return 'LARGE';
    if (avgWidth >= 75) return 'MEDIUM';
    return 'SMALL';
  }
  
  /**
   * Launch an expedition to the selected planet
   * @param {Object} planet - Selected planet data
   */
  launchExpedition(planet) {
    // Store selected planet in game state
    this.gameState.update('expedition.currentPlanet', {
      id: planet.id,
      name: planet.name,
      type: planet.type.name,
      worldParams: planet.type.worldParams
    });
    
    // Set expedition as active
    this.gameState.update('expedition.active', true);
    
    // Emit expedition launch event
    this.eventBus.emit('expedition:launch', {
      planet: {
        id: planet.id,
        name: planet.name,
        type: planet.type.name,
        worldParams: planet.type.worldParams
      }
    });
    
    // Hide the overlay
    this.eventBus.emit('overlay:hide');
  }
  
  /**
   * Return to the home screen
   */
  returnToHome() {
    // Emit return to home event
    this.eventBus.emit('navigation:home');
    
    // Hide the overlay
    this.eventBus.emit('overlay:hide');
  }
  
  /**
   * Called when the overlay is shown
   */
  onShow() {
    // Clear any previous selection
    if (this.selectedPlanet) {
      this.planets.forEach(p => {
        p.element.removeClass('selected');
      });
      this.selectedPlanet = null;
      this.detailsPanel.setContent('<h3>Select a planet</h3>');
    }
  }
} 