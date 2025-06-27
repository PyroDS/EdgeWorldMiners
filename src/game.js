import Phaser from 'phaser';
import { createUI } from './ui.js';
import { createCarrier } from './carrier.js';
import { DrillManager } from './drillManager.js';
import { ResourceManager } from './resourceManager.js';
import { TerrainManager } from './terrainManager.js';
import { TurretManager } from './turretManager.js';
import { EnemyManager } from './enemyManager.js';
import { createBuildManager } from './buildManager.js';

let drillManager, resourceManager, terrainManager, turretManager, enemyManager, buildManager;

// Loading screen scene
class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    // Load sci-fi UI fonts and assets
    this.load.css('rajdhani', 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700&display=swap');
    
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Generating World...', {
      font: '24px Rajdhani',
      fill: '#ffffff'
    }).setOrigin(0.5);
    
    // Progress bar background
    this.progressBarBg = this.add.rectangle(width / 2, height / 2, 400, 30, 0x666666);
    
    // Progress bar
    this.progressBar = this.add.rectangle(width / 2 - 200 + 5, height / 2, 10, 20, 0x3399ff);
    this.progressBar.setOrigin(0, 0.5);
    
    // Add click handler to resume audio context
    this.input.once('pointerdown', () => {
      if (this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
    });
  }

  create() {
    // Generate world parameters once here
    const minWidth = 1024;
    const maxWidth = 6048; // Further reduced for performance
    const randomWidthAddition = Math.floor(Math.random() * (maxWidth - minWidth));
    const worldWidth = minWidth + randomWidthAddition;
    
    const minHeight = 1800; // Ensure 800 px sky + 1000 px depth
    const maxHeight = 2400;
    const randomHeightAddition = Math.floor(Math.random() * (maxHeight - minHeight));
    const worldHeight = minHeight + randomHeightAddition;
    
    const worldSeed = Math.random() * 1000;
    
    // Store world parameters in registry to access in main scene
    this.registry.set('worldWidth', worldWidth);
    this.registry.set('worldHeight', worldHeight);
    this.registry.set('worldSeed', worldSeed);
    
    // Start the main game scene
    this.scene.launch('GameScene');
    
    // Ensure the loading scene (and therefore any Phaser-based graphics) stay on top of the
    // GameScene while the world is being generated.
    this.scene.bringToTop();

    // === DOM-based loading overlay (UI layer) ===
    const uiRoot = document.getElementById('ui-overlay');
    if (uiRoot) {
      this.loadingOverlay = document.createElement('div');
      this.loadingOverlay.id = 'loading-overlay';
      this.loadingOverlay.innerHTML = `
        <div class="loading-text">Generating World...</div>
        <div class="loading-bar"><div class="loading-fill"></div></div>
      `;
      uiRoot.appendChild(this.loadingOverlay);

      // Cache references for quick updates
      this.loadingTextDom = this.loadingOverlay.querySelector('.loading-text');
      this.loadingFillDom = this.loadingOverlay.querySelector('.loading-fill');
    }
    
    // Listen for progress updates from the game scene
    this.events.on('world-generation-progress', (progress) => {
      // Update Phaser-based bar (legacy)
      this.progressBar.width = progress * 390;

      // Update DOM-based bar
      if (this.loadingFillDom) {
        this.loadingFillDom.style.width = `${progress * 100}%`;
      }

      if (progress >= 1) {
        this.loadingText.setText('World Generation Complete!');
        if (this.loadingTextDom) {
          this.loadingTextDom.textContent = 'World Generation Complete!';
        }
        
        // Give a moment to see the completed bar before transitioning
        this.time.delayedCall(500, () => {
          this.scene.stop('LoadingScene');
          this.scene.setActive(true, 'GameScene');

          // Clean up the DOM overlay
          if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
          }
        });
      } else if (progress >= 0.8) {
        this.loadingText.setText('Finalizing World...');
        if (this.loadingTextDom) this.loadingTextDom.textContent = 'Finalizing World...';
      } else if (progress >= 0.6) {
        this.loadingText.setText('Generating Resources...');
        if (this.loadingTextDom) this.loadingTextDom.textContent = 'Generating Resources...';
      } else if (progress >= 0.3) {
        this.loadingText.setText('Creating Terrain...');
        if (this.loadingTextDom) this.loadingTextDom.textContent = 'Creating Terrain...';
      }
    });
    
    // Add click-to-start text if no progress after 2 seconds
    this.time.delayedCall(2000, () => {
      if (this.progressBar.width < 20) {
        const clickText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 50, 
          'Click anywhere to start generation', {
            font: '18px Rajdhani',
            fill: '#ffffff'
          }).setOrigin(0.5);
          
        // Add click handler to kick-start generation if it's stuck
        this.input.once('pointerdown', () => {
          clickText.destroy();
          // Force a small progress update to show something is happening
          this.progressBar.width = 20;
          // Re-emit events to ensure game scene is properly initialized
          this.events.emit('loading-clicked');
        });
      }
    });

    // Hide legacy Phaser loading visuals to avoid duplicate bars/texts
    if (this.loadingText) this.loadingText.setVisible(false);
    if (this.progressBar) this.progressBar.setVisible(false);
    if (this.progressBarBg) this.progressBarBg.setVisible(false);
  }
}

// Main game scene
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.initialChunksGenerated = false;
    this.totalInitialChunks = 0;
    this.generatedChunks = 0;
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
    
    // Get world parameters from registry
    const worldWidth = this.registry.get('worldWidth');
    const worldHeight = this.registry.get('worldHeight');
    const worldSeed = this.registry.get('worldSeed');
    
    resourceManager = new ResourceManager(this);
    
    // Create terrain manager with configuration
    terrainManager = new TerrainManager(this, {
      width: worldWidth,
      height: worldHeight,
      tileSize: 20,
      seed: worldSeed,
      cloudDensity: 0.01,
      cloudSpeed: 0.2
    });
    
    const carrier = createCarrier(this, terrainManager, worldWidth);
    
    // Create managers in the correct order to avoid circular dependencies
    drillManager = new DrillManager(this, resourceManager, terrainManager, carrier);
    turretManager = new TurretManager(this, resourceManager, terrainManager);
    enemyManager = new EnemyManager(this, terrainManager, drillManager, turretManager, carrier);
    
    // Wire back references now that enemyManager exists
    drillManager.setEnemyManager(enemyManager);
    turretManager.setEnemyManager(enemyManager);

    // Register carrier as a targetable object
    carrier.priorityTag = 'CARRIER';
    enemyManager.registerTarget(carrier);
    
    // Provide enemy references to other systems
    turretManager.enemies = enemyManager.getEnemies();
    carrier.setEnemyManager(enemyManager);
    
    // Initialize carrier hardpoints with turret manager
    // Import directly here to avoid circular dependencies
    import('./CarrierHardpoint.js').then(module => {
      const { CarrierHardpoint } = module;
      
      // Create hardpoints at the configured positions
      if (carrier.hardpointOffsets) {
        for (const offset of carrier.hardpointOffsets) {
          const hardpoint = new CarrierHardpoint(
            this, 
            turretManager, 
            carrier, 
            offset.x, 
            offset.y,
            'PointDefense'
          );
          
          // Add hardpoint to carrier
          carrier.hardpoints.push(hardpoint);
          
          // Register hardpoint as targetable by enemies
          hardpoint.priorityTag = 'CARRIER_HARDPOINT';
          enemyManager.registerTarget(hardpoint);
        }
      }
    });
    
    // Make managers accessible to the UI via scene
    this.terrainManager = terrainManager;
    this.drillManager = drillManager;
    this.turretManager = turretManager;
    this.enemyManager = enemyManager;
    this.carrier = carrier;
    
    // Create build manager
    buildManager = createBuildManager(this, terrainManager, resourceManager);
    
    // Create game UI with callback to buildManager
    this.ui = createUI(this, (building) => {
      console.log(`Building selected from UI: ${building}`);
      buildManager.enterBuildMode(building);
    });
    
    // Track whether gameplay is currently paused by the settings modal
    this.isGamePaused = false;
    
    // Handle camera resizing
    this.scale.on('resize', (gameSize) => {
      // The Scale Manager has already resized automatically based on our config.
      // We just need to update components that depend on the new size, like the camera.
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      
      // Ensure the camera scroll isn't out of bounds after resize.
      if (this.cameras.main.scrollX > this.cameras.main.getBounds().width - gameSize.width) {
          this.cameras.main.scrollX = this.cameras.main.getBounds().width - gameSize.width;
      }
      if (this.cameras.main.scrollY > this.cameras.main.getBounds().height - gameSize.height) {
          this.cameras.main.scrollY = this.cameras.main.getBounds().height - gameSize.height;
      }

      // Re-apply camera bounds to refresh internal calculations after resize
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    });

    // Set camera bounds to match the terrain dimensions
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    
    // Center the camera on the carrier at game start
    this.cameras.main.scrollX = carrier.x - this.cameras.main.width / 2;
    this.cursors = this.input.keyboard.createCursorKeys();

    // Mouse wheel scroll for vertical scrolling
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.cameras.main.scrollY += deltaY * 0.5;
    });
    
    // Mouse drag for horizontal scrolling
    this.isDragging = false;
    this.dragStartX = 0;
    
    // Add drag camera handler with separate name
    this.input.on('pointerdown', function dragHandler(pointer) {
      if (pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
      }
    }, this);
    
    this.input.on('pointermove', (pointer) => {
      if (this.isDragging) {
        const deltaX = this.dragStartX - pointer.x;
        this.cameras.main.scrollX += deltaX * 0.5;
        this.dragStartX = pointer.x;
      }
    });
    
    this.input.on('pointerup', (pointer) => {
      this.isDragging = false;
    });
    
    // Listen for loading-clicked event
    this.scene.get('LoadingScene').events.on('loading-clicked', () => {
      console.log('Loading screen clicked, ensuring world generation is running');
      // Make sure world generation is running
      if (this.generatedChunks === 0) {
        this.initializeWorldChunks(carrier.x, carrier.y);
      }
    });
    
    // Start generating initial chunks around the carrier
    this.initializeWorldChunks(carrier.x, carrier.y);
  }
  
  // Generate initial chunks around the carrier
  initializeWorldChunks(centerX, centerY) {
    // Calculate how many chunks we need for the initial view
    const initialRadius = 3; // Number of chunks to generate in each direction
    
    // Calculate total chunks to generate for progress tracking
    const chunkDiameter = initialRadius * 2 + 1;
    this.totalInitialChunks = chunkDiameter * chunkDiameter;
    this.generatedChunks = 0;
    
    // Listen for chunk generation events
    this.events.on('chunk-generated', () => {
      this.generatedChunks++;
      const progress = Math.min(this.generatedChunks / this.totalInitialChunks, 1);
      
      // Report progress to the loading scene
      this.scene.get('LoadingScene').events.emit('world-generation-progress', progress);
      
      // When all initial chunks are generated, start the game
      if (progress >= 1 && !this.initialChunksGenerated) {
        this.initialChunksGenerated = true;
        this.startGameplay();
      }
    });
    
    // Start generating terrain chunks around the carrier
    terrainManager.generateTerrainChunksAround(centerX, centerY, initialRadius);
    
    // Monitor chunk generation progress and ensure we don't get stuck
    this.chunkGenerationTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        // If no chunks are generated after 5 seconds, force completion
        if (this.generatedChunks === 0 && this.chunkGenerationTimer.getElapsed() > 5000) {
          console.log('Forcing world generation completion due to timeout');
          this.generatedChunks = this.totalInitialChunks;
          this.scene.get('LoadingScene').events.emit('world-generation-progress', 1);
          
          if (!this.initialChunksGenerated) {
            this.initialChunksGenerated = true;
            this.startGameplay();
          }
          this.chunkGenerationTimer.remove();
        }
        
        // Check if terrain manager is still generating
        if (!terrainManager.isGenerating && this.generatedChunks < this.totalInitialChunks) {
          // Force progress update if terrain manager finished but our count is off
          console.log('Terrain generation complete, finalizing progress');
          this.generatedChunks = this.totalInitialChunks;
          this.scene.get('LoadingScene').events.emit('world-generation-progress', 1);
          
          if (!this.initialChunksGenerated) {
            this.initialChunksGenerated = true;
            this.startGameplay();
          }
          this.chunkGenerationTimer.remove();
        }
      },
      callbackScope: this,
      loop: true
    });
  }
  
  // Start gameplay after initial world generation
  startGameplay() {
    // Enable the wave system after a short delay so the UI has time to appear
    // and the player sees the loading overlay fade out cleanly.
    this.time.delayedCall(1000, () => {
      enemyManager.enableWaveSystem();
      // Immediately start the first wave instead of waiting for the break timer
      enemyManager.startWave();
      // Subsequent waves will be handled automatically by EnemyManager.
    });
    
    // Set up periodic chunk generation as player moves
    this.chunkUpdateTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.carrier) {
          terrainManager.generateTerrainChunksAround(this.carrier.x, this.carrier.y, 2);
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  update() {
    if (!this.isGamePaused) {
      // Vertical scrolling with arrow keys
      if (this.cursors.up.isDown) {
        this.cameras.main.scrollY -= 10;
      } else if (this.cursors.down.isDown) {
        this.cameras.main.scrollY += 10;
      }

      // Horizontal scrolling with arrow keys
      if (this.cursors.left.isDown) {
        this.cameras.main.scrollX -= 10;
      } else if (this.cursors.right.isDown) {
        this.cameras.main.scrollX += 10;
      }

      // Update game managers only while not paused
      drillManager.update();
      turretManager.update();
      enemyManager.update();
      if (this.carrier && this.carrier.update) {
        this.carrier.update();
      }
      
      // Ensure visible chunks are generated as camera moves
      terrainManager.render();
    }
    
    // Update UI if we have a UI instance
    if (this.ui && this.ui.update) {
      this.ui.update();
    }
  }
}

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%'
  },
  backgroundColor: '#3399ff',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [LoadingScene, GameScene]
};

new Phaser.Game(config);
