/**
 * landingScene.js
 * 
 * Manages the landing page scene that is displayed when users first navigate to the application.
 * Provides access to the galaxy map for world selection before starting gameplay.
 * 
 * Dependencies:
 * - game.js (for scene transitions)
 * - ui.js (for UI components)
 * - galaxyMap.js (for world selection)
 */

import Phaser from 'phaser';
import { GalaxyMap } from './galaxyMap.js';
import { createUI } from './ui.js';

export class LandingScene extends Phaser.Scene {
  constructor() {
    super('LandingScene');
  }

  preload() {
    // Load sci-fi UI fonts and assets if not already loaded
    this.load.css('rajdhani', 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700&display=swap');
  }

  create() {
    // Handle audio context
    this.sound.pauseOnBlur = false;
    
    // Resume audio context on user interaction
    this.input.on('pointerdown', () => {
      if (this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
    });

    // Create a background with stars
    this.createBackground();
    
    // Create a minimal UI for the landing page
    this.setupUI();
    
    // Create a welcome panel in the center
    this.createWelcomePanel();
    
    // Listen for galaxy map events
    this.setupEventListeners();
  }
  
  /**
   * Creates a space background with stars
   */
  createBackground() {
    // Get the UI overlay container
    const uiOverlay = document.getElementById('ui-overlay');
    
    // Create background layer
    const backgroundLayer = document.createElement('div');
    backgroundLayer.className = 'background-layer';
    uiOverlay.appendChild(backgroundLayer);
    
    // Create star field
    const starField = document.createElement('div');
    starField.className = 'star-field';
    
    // Add stars
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      
      // Determine star size
      const sizeRand = Math.random();
      if (sizeRand > 0.95) {
        star.className = 'star star-large';
      } else if (sizeRand > 0.8) {
        star.className = 'star star-medium';
      } else {
        star.className = 'star star-small';
      }
      
      // Random position
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // Random animation delay for twinkling effect
      star.style.animationDelay = `${Math.random() * 4}s`;
      
      starField.appendChild(star);
    }
    
    uiOverlay.appendChild(starField);
    
    // Add these elements to cleanup list
    this.elementsToRemove = this.elementsToRemove || [];
    this.elementsToRemove.push(backgroundLayer, starField);
  }
  
  /**
   * Sets up the UI components for the landing page
   */
  setupUI() {
    // Create a minimal UI instance for navigation
    this.ui = createUI(this, () => {});
    
    // Clear any existing UI elements that might be related to gameplay
    const gameElements = document.querySelectorAll('#top-bar-hud, #build-menu');
    gameElements.forEach(element => {
      if (element) element.style.display = 'none';
    });
  }
  
  /**
   * Creates the welcome panel in the center of the screen
   */
  createWelcomePanel() {
    // Get the UI overlay container
    const uiOverlay = document.getElementById('ui-overlay');
    
    // Create welcome panel container
    this.welcomePanel = document.createElement('div');
    this.welcomePanel.id = 'welcome-panel';
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'EDGE WORLD MINERS';
    
    // Add welcome message
    const message = document.createElement('p');
    message.textContent = 'Welcome, select Galaxy Map to get started';
    
    // Add a decorative element
    const decoration = document.createElement('div');
    decoration.className = 'welcome-decoration';
    
    // Append elements to welcome panel
    this.welcomePanel.appendChild(title);
    this.welcomePanel.appendChild(message);
    this.welcomePanel.appendChild(decoration);
    
    // Append welcome panel to UI overlay
    uiOverlay.appendChild(this.welcomePanel);
    
    // Add a reference to clean up later
    this.elementsToRemove = this.elementsToRemove || [];
    this.elementsToRemove.push(this.welcomePanel);
  }
  
  /**
   * Sets up event listeners for galaxy map and planet selection
   */
  setupEventListeners() {
    // Store original launch method to ensure we don't lose it
    if (!this.originalLaunchMethod && this.ui.galaxyMap) {
      this.originalLaunchMethod = this.ui.galaxyMap.launchSelectedPlanet;
    }
    
    // Add event listener to galaxyMap toggle to ensure our override is always applied
    if (this.ui && this.ui.galaxyMap) {
      // Store reference to the original toggleGalaxyMap method
      const originalToggleMethod = this.ui.galaxyMap.toggleGalaxyMap;
      
      // Override toggle method to reapply our launch method override when galaxy map is opened
      this.ui.galaxyMap.toggleGalaxyMap = (...args) => {
        // Call original toggle method
        originalToggleMethod.apply(this.ui.galaxyMap, args);
        
        // If the galaxy map is being opened, ensure our launch override is applied
        if (this.ui.galaxyMap.isVisible) {
          this.overrideLaunchMethod();
        }
      };
      
      // Apply the override immediately
      this.overrideLaunchMethod();
    }
  }
  
  /**
   * Helper method to override the galaxy map launch method
   */
  overrideLaunchMethod() {
    if (!this.ui || !this.ui.galaxyMap) return;
    
    // Override the launch method to transition to the loading scene
    this.ui.galaxyMap.launchSelectedPlanet = () => {
      const planet = this.ui.galaxyMap.selectedPlanet;
      if (!planet) return;
      
      // Hide the galaxy map
      this.ui.galaxyMap.toggleGalaxyMap(false);
      
      // Clean up UI elements
      this.cleanupUI();
      
      // Store the selected planet parameters in the registry BEFORE starting the loading scene
      const planetParams = {
        planetId: planet.id,
        planetName: planet.name,
        width: this.getRandomInRange(planet.type.minWidth, planet.type.maxWidth),
        height: this.getRandomInRange(planet.type.minHeight, planet.type.maxHeight),
        seed: Math.random() * 1000,
        resourceMultiplier: planet.type.resourceMultiplier,
        enemyScaling: planet.type.enemyScaling
      };
      
      // Log to confirm planet parameters are set
      console.log('Launching planet with parameters:', planetParams);
      
      // Set the data in the registry
      this.registry.set('selectedPlanet', planetParams);
      
      // Start the loading scene with the selected planet
      this.scene.start('LoadingScene');
    };
  }
  
  /**
   * Removes UI elements when transitioning to another scene
   */
  cleanupUI() {
    if (this.elementsToRemove) {
      this.elementsToRemove.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
  }
  
  /**
   * Helper function to get a random number in a range
   * 
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} A random number between min and max
   */
  getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  update() {
    // This scene doesn't need an update loop
  }
} 