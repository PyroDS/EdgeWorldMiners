// Sci-Fi UI System for Edge World Miners
import Phaser from 'phaser';
import { FocusMode } from './focusMode.js'

export class UI {
  constructor(scene, onSelectBuilding) {
    this.scene = scene;
    this.onSelectBuilding = onSelectBuilding;
    
    // Get the main UI overlay container from the DOM
    this.uiOverlay = document.getElementById('ui-overlay');

    // Store managers for easy access
    this.drillManager = this.scene.drillManager;
    this.turretManager = this.scene.turretManager;
    this.enemyManager = this.scene.enemyManager;
    this.buildManager = this.scene.buildManager;
    
    // Array to store all elements related to the build menu
    this.buildMenuElements = [];
    
    // UI Colors - these will be mostly handled by CSS now but can be kept for reference or dynamic styling
    this.COLORS = {
      PANEL_BG: 0x0a1a2a,
      PANEL_BORDER: 0x00aaff,
      TEXT_PRIMARY: '#ffffff',
      TEXT_SECONDARY: '#00ccff',
      TEXT_WARNING: '#ff9900',
      TEXT_DANGER: '#ff3300',
      BUTTON_BG: 0x003366,
      BUTTON_HOVER: 0x0055aa,
      BUTTON_DISABLED: 0x222233,
      RESOURCE: 0x33ffcc,
      HEALTH_OK: 0x22ff99,
      HEALTH_MED: 0xff9900,
      HEALTH_LOW: 0xff3300
    };
    
    // Initialize UI components
    this.createHUD();
    this.createBuildMenu();
    this.createNotificationSystem();
    this.createKeyBindings();
    // Settings button & modal
    this.createSettingsUI();

    // Focus mode (magnifier) controller
    this.focusMode = new FocusMode(scene, this.uiOverlay);
  }
  
  // Get building costs - prevents circular dependencies
  getDynamicBuildings() {
    if (this.buildManager) {
      return this.buildManager.getAvailableBuildings();
    }
    
    // Fallback if buildManager isn't available
    return [
      { 
        type: 'drill', 
        cost: this.getDrillCost(),
        label: 'MINING DRILL',
        description: 'Mines resources automatically',
        hotkey: '1'
      },
      { 
        type: 'turret', 
        cost: this.getTurretCost(),
        label: 'MACRO TURRET',
        description: 'AOE defense against enemies',
        hotkey: '2'
      }
    ];
  }
  
  // Legacy methods for backward compatibility
  getDrillCost() {
    const drillManager = this.scene.drillManager;
    return drillManager?.DRILL_STATS?.COST || 10;
  }
  
  getTurretCost() {
    const turretManager = this.scene.turretManager;
    return turretManager?.TURRET_STATS?.COST || 20;
  }
  
  createHUD() {
    // Create the top bar container element
    const topBar = document.createElement('div');
    topBar.id = 'top-bar-hud';
    
    // --- Left Section: Resources and Structure Status ---
    const leftSection = document.createElement('div');
    leftSection.className = 'hud-section left';

    // Resource Display
    const resourceDisplay = document.createElement('div');
    resourceDisplay.className = 'hud-resource-display';
    resourceDisplay.innerHTML = `
      <div class="hud-resource-icon"></div>
      <span id="resource-text">0</span>
    `;
    this.resourceText = resourceDisplay.querySelector('#resource-text');
    this.resourceIcon = resourceDisplay.querySelector('.hud-resource-icon');

    // Structure Status
    const structureStatus = document.createElement('div');
    structureStatus.className = 'hud-structure-status';
    structureStatus.innerHTML = `
      <span id="drills-text">DRILLS: 0</span>
      <span id="turrets-text">TURRETS: 0</span>
      <span id="health-text">ALERT: NONE</span>
    `;
    this.drillsText = structureStatus.querySelector('#drills-text');
    this.turretsText = structureStatus.querySelector('#turrets-text');
    this.healthText = structureStatus.querySelector('#health-text');

    leftSection.append(resourceDisplay, structureStatus);

    // --- Center Section: Wave Info ---
    const centerSection = document.createElement('div');
    centerSection.className = 'hud-section center';
    centerSection.innerHTML = `
      <div id="wave-text">WAVE 0</div>
      <div id="wave-status-text">BREAK</div>
      <div id="wave-progress-bar">
        <div id="wave-progress-fill"></div>
      </div>
    `;
    this.waveText = centerSection.querySelector('#wave-text');
    this.waveStatusText = centerSection.querySelector('#wave-status-text');
    this.waveProgressFill = centerSection.querySelector('#wave-progress-fill');

    // --- Right Section: Enemy Counters & Settings ---
    const rightSection = document.createElement('div');
    rightSection.className = 'hud-section right';

    // Enemy Counters
    const enemyCounters = document.createElement('div');
    enemyCounters.className = 'hud-enemy-counters';
    enemyCounters.innerHTML = `
      <div class="enemy-counter">
        <div class="enemy-icon red"></div>
        <span id="enemy-red-count">0</span>
      </div>
      <div class="enemy-counter">
        <div class="enemy-icon purple"></div>
        <span id="enemy-purple-count">0</span>
      </div>
    `;
    this.enemyRedCountText = enemyCounters.querySelector('#enemy-red-count');
    this.enemyPurpleCountText = enemyCounters.querySelector('#enemy-purple-count');
    
    rightSection.append(enemyCounters);

    // Append all sections to the top bar
    topBar.append(leftSection, centerSection, rightSection);
    
    // Append the top bar to the main UI overlay
    this.uiOverlay.appendChild(topBar);

    // Register for resource updates (store handler so we can clean up on shutdown)
    this._onResourcesChanged = (parent, value) => {
      if (!this.resourceText) return;
      this.resourceText.innerText = value.toString();

      // Flash effect on resource icon if resources are low
      if (value < 10) {
        this.resourceIcon.classList.add('flash');
        setTimeout(() => this.resourceIcon.classList.remove('flash'), 600);
      }
    };
    this.scene.registry.events.on('changedata-resources', this._onResourcesChanged);

    // Clean up listener when scene shuts down to avoid invalid callbacks on restart
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.registry.events.off('changedata-resources', this._onResourcesChanged);
    });
  }
  
  createWaveProgressBar() { /* Handled in createHUD */ }
  
  createStructureStatus() { /* Handled in createHUD */ }
  
  createBuildMenu() {
    // This function will now set up the main container and call the panel creation
    const buildings = this.getDynamicBuildings();
    this.createBuildMenuPanel(buildings);
  }

  createBuildMenuPanel(buildings) {
    const panel = document.createElement('div');
    panel.id = 'build-menu';
    
    const title = document.createElement('h3');
    title.innerText = 'BUILD MENU [B]';
    panel.appendChild(title);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'build-buttons-container';
    
    buildings.forEach(building => {
      const button = document.createElement('button');
      button.className = 'build-button';
      button.dataset.buildingType = building.type;
      
      button.innerHTML = `
        <div class="button-label">
          <span class="hotkey">${building.hotkey}</span>
          ${building.label}
        </div>
        <div class="button-cost">
          <div class="cost-icon"></div>
          ${building.cost}
        </div>
        <div class="button-desc">${building.description}</div>
      `;

      // Add click event listener
      button.addEventListener('click', () => {
        if (!button.classList.contains('disabled')) {
          this.onSelectBuilding(building.type);
          this.toggleBuildMenu(false); // Force close menu
        }
      });
      
      buttonsContainer.appendChild(button);
    });

    panel.appendChild(buttonsContainer);
    
    // Append the panel to the overlay
    this.uiOverlay.appendChild(panel);

    // Store reference to the panel element
    this.buildMenuPanel = panel;
    
    // Add all interactive elements to the array for state management
    this.buildMenuElements = Array.from(buttonsContainer.children);
  }

  createNotificationSystem() {
    // Container for notifications
    this.notificationContainer = this.scene.add.container(10, 80);
    this.notificationContainer.setScrollFactor(0);
    this.notificationContainer.setDepth(102); // Above everything
    
    this.activeNotifications = [];
    this.notificationQueue = [];
  }
  
  showNotification(message, type = 'info') {
    // Types: 'info', 'warning', 'danger', 'success'
    const colors = {
      info: this.COLORS.TEXT_SECONDARY,
      warning: this.COLORS.TEXT_WARNING, 
      danger: this.COLORS.TEXT_DANGER,
      success: this.COLORS.HEALTH_OK
    };
    
    // Create notification text
    const notification = this.scene.add.text(0, 0, message, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '16px',
      color: colors[type],
      stroke: '#000000',
      strokeThickness: 2,
      padding: { x: 10, y: 5 }
    });
    
    // Add to container with fade-in effect
    notification.alpha = 0;
    this.notificationContainer.add(notification);
    
    // Animation
    this.scene.tweens.add({
      targets: notification,
      alpha: 1,
      y: 30,
      duration: 500,
      hold: 2000,
      yoyo: true,
      onComplete: () => {
        this.notificationContainer.remove(notification);
        notification.destroy();
      }
    });
  }
  
  createKeyBindings() {
    // Open/close the build menu with 'B' key
    this.scene.input.keyboard.addKey('B').on('down', () => {
      this.toggleBuildMenu();
    });

    // Hotkeys for selecting buildings
    const buildings = this.getDynamicBuildings();
    buildings.forEach(building => {
      if (building.hotkey) {
        this.scene.input.keyboard.addKey(building.hotkey).on('down', () => {
          // Check if the build menu is open OR if build mode is already active
          if (this.buildMenuPanel.classList.contains('visible') || this.scene.buildManager.isInBuildMode()) {
            this.onSelectBuilding(building.type);
            this.toggleBuildMenu(false); // Force close on selection
          }
        });
      }
    });
  }
  
  toggleBuildMenu(forceState) {
    if (!this.buildMenuPanel) return;

    const shouldBeVisible = forceState !== undefined ? forceState : !this.buildMenuPanel.classList.contains('visible');

    if (shouldBeVisible) {
      this.buildMenuPanel.classList.add('visible');
      // Update button states whenever the menu is opened
      const resources = this.scene.registry.get('resources') || 0;
      const buildings = this.getDynamicBuildings();
      this.buildMenuElements.forEach(button => {
        const buildingType = button.dataset.buildingType;
        const building = buildings.find(b => b.type === buildingType);
        if (building && building.cost > resources) {
          button.classList.add('disabled');
        } else {
          button.classList.remove('disabled');
        }
      });
    } else {
      this.buildMenuPanel.classList.remove('visible');
    }
  }
  
  // =============================
  //        Settings / Pause
  // =============================
  
  createSettingsUI() {
    // Create the settings button in the top-right of the HUD
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.innerHTML = '&#9881;'; // Gear icon
    
    // Find the right section of the HUD to append to
    const hudRightSection = this.uiOverlay.querySelector('#top-bar-hud .hud-section.right');
    if (hudRightSection) {
      hudRightSection.appendChild(settingsButton);
    }

    settingsButton.addEventListener('click', () => this.openSettingsModal());

    // Create the modal structure, but keep it hidden
    this.createSettingsModal();
  }

  createSettingsModal() {
    this.settingsModal = document.createElement('div');
    this.settingsModal.id = 'settings-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
      <h2>Settings</h2>
      <p>Game is Paused</p>
      <div class="modal-actions">
        <button id="close-settings-button">Resume Game</button>
      </div>
    `;
    
    this.settingsModal.appendChild(modalContent);
    this.uiOverlay.appendChild(this.settingsModal);

    // Add event listener to the close button
    const closeButton = this.settingsModal.querySelector('#close-settings-button');
    closeButton.addEventListener('click', () => this.closeSettingsModal());
  }

  openSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.add('visible');
      this.pauseGame();
    }
  }

  closeSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.remove('visible');
      this.resumeGame();
    }
  }

  pauseGame() {
    this.scene.isGamePaused = true;
    
    // Pause enemy sprite animations and physics
    if (this.scene.enemyManager && this.scene.enemyManager.enemies) {
      this.scene.enemyManager.enemies.forEach(enemy => {
        if (enemy.sprite) {
          // Store velocity to restore later
          if (enemy.sprite.body) {
            enemy.prevVelocityX = enemy.sprite.body.velocity.x;
            enemy.prevVelocityY = enemy.sprite.body.velocity.y;
            enemy.sprite.body.setVelocity(0, 0);
          }
          
          // Pause animations if any
          if (enemy.sprite.anims) {
            enemy.sprite.anims.pause();
          }
        }
      });
    }
    
    // Pause enemy projectiles
    if (this.scene.enemyManager && this.scene.enemyManager.projectiles) {
      this.scene.enemyManager.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite && projectile.sprite.body) {
          // Store velocity to restore later
          projectile.prevVelocityX = projectile.sprite.body.velocity.x;
          projectile.prevVelocityY = projectile.sprite.body.velocity.y;
          // Stop the projectile movement
          projectile.sprite.body.setVelocity(0, 0);
        }
      });
    }
    
    // Pause turret projectiles
    if (this.scene.turretManager && this.scene.turretManager.projectiles) {
      this.scene.turretManager.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite && projectile.sprite.body) {
          // Store velocity to restore later
          projectile.prevVelocityX = projectile.sprite.body.velocity.x;
          projectile.prevVelocityY = projectile.sprite.body.velocity.y;
          // Stop the projectile movement
          projectile.sprite.body.setVelocity(0, 0);
        }
      });
    }
    
    // Pause carrier hardpoint projectiles
    if (this.scene.carrier && this.scene.carrier.hardpoints) {
      this.scene.carrier.hardpoints.forEach(hardpoint => {
        if (hardpoint && hardpoint.projectiles) {
          hardpoint.projectiles.forEach(projectile => {
            if (projectile && projectile.body) {
              // Store velocity to restore later
              projectile.prevVelocityX = projectile.body.velocity.x;
              projectile.prevVelocityY = projectile.body.velocity.y;
              // Stop the projectile movement
              projectile.body.setVelocity(0, 0);
            }
          });
        }
      });
    }
  }

  resumeGame() {
    this.scene.isGamePaused = false;
    
    // Resume enemy sprite animations and physics
    if (this.scene.enemyManager && this.scene.enemyManager.enemies) {
      this.scene.enemyManager.enemies.forEach(enemy => {
        if (enemy.sprite) {
          // Restore velocity
          if (enemy.sprite.body && enemy.prevVelocityX !== undefined) {
            enemy.sprite.body.setVelocity(
              enemy.prevVelocityX || 0,
              enemy.prevVelocityY || 0
            );
          }
          
          // Resume animations if any
          if (enemy.sprite.anims) {
            enemy.sprite.anims.resume();
          }
        }
      });
    }
    
    // Resume enemy projectiles
    if (this.scene.enemyManager && this.scene.enemyManager.projectiles) {
      this.scene.enemyManager.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite && projectile.sprite.body && projectile.prevVelocityX !== undefined) {
          // Restore velocity
          projectile.sprite.body.setVelocity(
            projectile.prevVelocityX || 0,
            projectile.prevVelocityY || 0
          );
        }
      });
    }
    
    // Resume turret projectiles
    if (this.scene.turretManager && this.scene.turretManager.projectiles) {
      this.scene.turretManager.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite && projectile.sprite.body && projectile.prevVelocityX !== undefined) {
          // Restore velocity
          projectile.sprite.body.setVelocity(
            projectile.prevVelocityX || 0,
            projectile.prevVelocityY || 0
          );
        }
      });
    }
    
    // Resume carrier hardpoint projectiles
    if (this.scene.carrier && this.scene.carrier.hardpoints) {
      this.scene.carrier.hardpoints.forEach(hardpoint => {
        if (hardpoint && hardpoint.projectiles) {
          hardpoint.projectiles.forEach(projectile => {
            if (projectile && projectile.body && projectile.prevVelocityX !== undefined) {
              // Restore velocity
              projectile.body.setVelocity(
                projectile.prevVelocityX || 0,
                projectile.prevVelocityY || 0
              );
            }
          });
        }
      });
    }
  }
  
  updateWaveStatus() {
    if (!this.scene.enemyManager || !this.waveText) return;

    const status = this.scene.enemyManager.getWaveStatus();
    this.waveText.innerText = `WAVE ${status.wave || 0}`;
    
    if (status.active) {
      this.waveStatusText.innerText = 'ACTIVE';
      this.waveStatusText.className = 'active';
    } else {
      this.waveStatusText.innerText = 'BREAK';
      this.waveStatusText.className = '';
    }

    // Update enemy counters
    const enemyCounts = this.scene.enemyManager.getEnemyTypeCounts();
    
    // Calculate total for red enemies (SMALL, MEDIUM, LARGE)
    const redCount = (enemyCounts.SMALL || 0) + (enemyCounts.MEDIUM || 0) + (enemyCounts.LARGE || 0);
    this.enemyRedCountText.innerText = redCount.toString();
    
    // Purple enemies are SHOOTER type
    this.enemyPurpleCountText.innerText = (enemyCounts.SHOOTER || 0).toString();
  }
  
  updateWaveProgress(progress, isActive) {
    if (!this.waveProgressFill) return;
    this.waveProgressFill.style.width = `${progress * 100}%`;
    if (isActive) {
      this.waveProgressFill.classList.add('active');
    } else {
      this.waveProgressFill.classList.remove('active');
    }
  }
  
  updateStructureStatus() {
    if (!this.drillManager || !this.turretManager || !this.drillsText) return;

    // Update counts
    this.drillsText.innerText = `DRILLS: ${this.drillManager.getDrillCount()}`;
    this.turretsText.innerText = `TURRETS: ${this.turretManager.getTurretCount()}`;

    // Update health alert status
    const lowestHealth = this.drillManager.getLowestHealthRatio();
    if (lowestHealth === 1) {
      this.healthText.innerText = "STATUS: NOMINAL";
      this.healthText.className = 'ok';
    } else if (lowestHealth > 0.4) {
      this.healthText.innerText = `WARNING: ${Math.round(lowestHealth * 100)}% INTEGRITY`;
      this.healthText.className = 'medium';
    } else {
      this.healthText.innerText = `CRITICAL: ${Math.round(lowestHealth * 100)}% INTEGRITY`;
      this.healthText.className = 'low';
    }
  }
  
  update() {
    // Update all UI components that need refreshing every frame
    this.updateWaveStatus();
    this.updateStructureStatus();
  }
}

// Creates the UI and returns the instance
export function createUI(scene, onSelectBuilding) {
  // Create UI instance without trying to access global variables
  const ui = new UI(scene, onSelectBuilding);
  
  // Store UI for updates
  scene.ui = ui;
  
  return ui;
}
