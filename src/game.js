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

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 800,
  backgroundColor: '#3399ff',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

function preload() {
  // Load sci-fi UI fonts and assets
  this.load.css('rajdhani', 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700&display=swap');
}

function create() {
  const worldWidth = 3840; // 3x the screen width
  const worldHeight = 2000; // Keeping the same vertical height
  
  resourceManager = new ResourceManager(this);
  terrainManager = new TerrainManager(this, worldWidth, worldHeight, 20);
  const carrier = createCarrier(this, terrainManager, worldWidth);
  
  // Create managers in the correct order to avoid circular dependencies
  drillManager = new DrillManager(this, resourceManager, terrainManager, carrier);
  turretManager = new TurretManager(this, resourceManager, terrainManager);
  enemyManager = new EnemyManager(this, terrainManager, drillManager, turretManager, carrier);
  
  // Connect managers
  turretManager.enemies = enemyManager.getEnemies();
  carrier.setEnemyManager(enemyManager);
  
  // Make managers accessible to the UI via scene
  this.drillManager = drillManager;
  this.turretManager = turretManager;
  this.enemyManager = enemyManager;
  this.carrier = carrier;
  
  // Create build manager
  buildManager = createBuildManager(this, terrainManager, resourceManager);
  
  // Start the first wave after a delay
  this.time.delayedCall(3000, () => {
    enemyManager.startWave();
  });
  
  // Create game UI with callback to buildManager
  const ui = createUI(this, (building) => {
    console.log(`Building selected from UI: ${building}`);
    buildManager.enterBuildMode(building);
  });
  
  // Track whether gameplay is currently paused by the settings modal
  this.isGamePaused = false;
  
  // Add a tooltip showing the Macro Turret stats
  const turretInfo = this.add.text(16, 65, `${turretManager.TURRET_STATS.NAME}: AOE Range: ${turretManager.TURRET_STATS.AOE_RANGE}`, 
    { fontSize: '14px', fill: '#fff', stroke: '#000', strokeThickness: 3 }
  );
  turretInfo.setScrollFactor(0);
  turretInfo.setDepth(100);
  turretInfo.setVisible(false);
  this.turretInfo = turretInfo;
  
  // Add key to toggle turret info
  this.input.keyboard.addKey('T').on('down', () => {
    this.turretInfo.setVisible(!this.turretInfo.visible);
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
}

function update() {
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
  }
  
  // Update UI if we have a UI instance
  if (this.ui && this.ui.update) {
    this.ui.update();
  }
}
