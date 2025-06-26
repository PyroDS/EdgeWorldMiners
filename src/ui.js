// Sci-Fi UI System for Edge World Miners
import Phaser from 'phaser';

export class UI {
  constructor(scene, onSelectBuilding) {
    this.scene = scene;
    this.onSelectBuilding = onSelectBuilding;
    
    // Store managers for easy access
    this.drillManager = this.scene.drillManager;
    this.turretManager = this.scene.turretManager;
    this.enemyManager = this.scene.enemyManager;
    this.buildManager = this.scene.buildManager;
    
    // Array to store all elements related to the build menu that are NOT inside the container
    this.buildMenuElements = [];
    
    // UI Colors
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
    // Main HUD container
    this.hud = this.scene.add.container(0, 0);
    this.hud.setScrollFactor(0);
    this.hud.setDepth(100);
    
    // Top bar background panel
    const topBarWidth = this.scene.cameras.main.width;
    // Bump the height a bit to fit structure info as well
    this.topBarHeight = 80;
    const topBarHeight = this.topBarHeight;
    const topBar = this.scene.add.rectangle(0, 0, topBarWidth, topBarHeight, this.COLORS.PANEL_BG, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.COLORS.PANEL_BORDER);
    
    // Glowing accent line under the top bar
    const accentLine = this.scene.add.rectangle(0, topBarHeight, topBarWidth, 2, this.COLORS.PANEL_BORDER, 1)
      .setOrigin(0, 0);
    
    // Resource display
    this.resourceIcon = this.scene.add.polygon(30, 30, [
      0, -8, 7, 0, 0, 8, -7, 0 // Diamond shape
    ], this.COLORS.RESOURCE).setScale(1.2);
    
    // Resource count text with sci-fi style
    const resources = this.scene.registry.get('resources') || 0;
    this.resourceText = this.scene.add.text(50, 24, resources.toString(), {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '24px',
      color: this.COLORS.TEXT_SECONDARY,
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Wave information - positioned in the center of the top bar
    const waveStatus = this.scene.enemyManager ? this.scene.enemyManager.getWaveStatus() : { currentWave: 0, isActive: false };
    this.waveText = this.scene.add.text(topBarWidth / 2, 15, `WAVE ${waveStatus.currentWave || 0}`, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: this.COLORS.TEXT_SECONDARY,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0);
    
    const waveStatusText = waveStatus.isActive ? 'ACTIVE' : 'BREAK';
    this.waveStatusText = this.scene.add.text(topBarWidth / 2, 37, waveStatusText, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '18px',
      color: waveStatus.isActive ? this.COLORS.TEXT_DANGER : this.COLORS.TEXT_PRIMARY,
      align: 'center'
    }).setOrigin(0.5, 0);
    
    // --- Enemy counters (red + purple shooters) ---
    const yCounter = 24;
    const pairSpacing = 60; // space between the two counters

    // Purple (Shooter) on the far right
    this.enemyPurpleCountText = this.scene.add.text(topBarWidth - 20, yCounter, '0', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '24px',
      color: this.COLORS.TEXT_SECONDARY,
      align: 'right'
    }).setOrigin(1, 0);

    this.enemyPurpleIcon = this.scene.add.polygon(topBarWidth - 40, 30, [
      0, -7, 7, 7, -7, 7
    ], 0x9933ff).setScale(1.2);

    // Red enemies just to the left
    this.enemyRedCountText = this.scene.add.text(topBarWidth - 20 - pairSpacing, yCounter, '0', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '24px',
      color: this.COLORS.TEXT_SECONDARY,
      align: 'right'
    }).setOrigin(1, 0);

    this.enemyRedIcon = this.scene.add.polygon(topBarWidth - 40 - pairSpacing, 30, [
      0, -7, 7, 7, -7, 7
    ], 0xff3300).setScale(1.2);
    
    // Add all elements to the HUD container
    this.hud.add([topBar, accentLine, this.resourceIcon, this.resourceText, 
                  this.waveText, this.waveStatusText, this.enemyPurpleIcon, this.enemyPurpleCountText, this.enemyRedIcon, this.enemyRedCountText]);
    
    // Register for resource updates (store handler so we can clean up on shutdown)
    this._onResourcesChanged = (parent, value) => {
      if (!this.resourceText || this.resourceText.canvas === null) return; // If text already destroyed, skip
      this.resourceText.setText(value.toString());

      // Flash effect on resource icon if resources are low
      if (value < 10) {
        this.scene.tweens.add({
          targets: this.resourceIcon,
          alpha: 0.2,
          yoyo: true,
          repeat: 3,
          duration: 200
        });
      }
    };
    this.scene.registry.events.on('changedata-resources', this._onResourcesChanged);

    // Clean up listener when scene shuts down to avoid invalid callbacks on restart
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.registry.events.off('changedata-resources', this._onResourcesChanged);
    });
    
    // Create wave progress bar
    this.createWaveProgressBar();
    
    // Create structure status display (now integrated into the top bar)
    this.createStructureStatus();
  }
  
  createWaveProgressBar() {
    const progressBarY = (this.topBarHeight || 60) + 2; // 2px below the accent line
    const progressWidth = this.scene.cameras.main.width;
    const progressHeight = 4;
    
    // Background track
    this.waveProgressTrack = this.scene.add.rectangle(0, progressBarY, progressWidth, progressHeight, 0x000000, 0.3)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);
    
    // Progress fill
    this.waveProgressFill = this.scene.add.rectangle(0, progressBarY, 0, progressHeight, this.COLORS.PANEL_BORDER, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);
    
    this.hud.add([this.waveProgressTrack, this.waveProgressFill]);
  }
  
  createStructureStatus() {
    // --- New layout: inline texts inside the top bar ---
    // Position the first structure text a bit after the resources readout
    const startX = this.resourceText.x + this.resourceText.width + 40;
    const firstRowY = 24; // Align vertically with resource count
    const secondRowY = 48; // Slightly below the first row (within 80px bar)

    // Drill count
    this.drillsText = this.scene.add.text(startX, firstRowY, "DRILLS: 0", {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '18px',
      color: this.COLORS.TEXT_PRIMARY
    });

    // Turret count (place to the right of drill count dynamically)
    this.turretsText = this.scene.add.text(startX + 140, firstRowY, "TURRETS: 0", {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '18px',
      color: this.COLORS.TEXT_PRIMARY
    });

    // Health / alert indicator (single line below counts)
    this.healthText = this.scene.add.text(startX, secondRowY, "ALERT: NONE", {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '16px',
      color: this.COLORS.TEXT_PRIMARY
    });

    // Ensure all stay with camera and above game objects
    [this.drillsText, this.turretsText, this.healthText].forEach(t => {
      t.setScrollFactor(0);
      t.setDepth(101);
    });

    // Add to main hud container so they'll be cleaned up automatically
    this.hud.add([this.drillsText, this.turretsText, this.healthText]);
  }
  
  createBuildMenu() {
    // Main container for build menu
    this.buildMenuContainer = this.scene.add.container(0, 0);
    this.buildMenuContainer.setScrollFactor(0);
    this.buildMenuContainer.setDepth(101); // Above HUD
    this.buildMenuContainer.setVisible(false); // Hidden by default
    
    // Get building options dynamically
    this.buildings = this.getDynamicBuildings();
    
    // Create menu background
    this.createBuildMenuPanel();
  }
  
  createBuildMenuPanel() {
    const panelWidth = 600;
    const panelHeight = 160;
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;
    
    // Position in the center bottom of the screen
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = screenHeight - panelHeight - 20;
    
    // Panel background with sci-fi styling
    const panel = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, this.COLORS.PANEL_BG, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, this.COLORS.PANEL_BORDER);
    
    // Top accent line
    const topAccent = this.scene.add.rectangle(panelX, panelY, panelWidth, 2, this.COLORS.PANEL_BORDER, 1)
      .setOrigin(0, 0);
    
    // Panel header
    const headerText = this.scene.add.text(panelX + panelWidth/2, panelY + 10, "CONSTRUCTION MODULE", {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: this.COLORS.TEXT_SECONDARY
    }).setOrigin(0.5, 0);
    
    // Add elements to container
    this.buildMenuContainer.add([panel, topAccent, headerText]);
    
    // Create building option buttons
    this.createBuildingButtons(panelX, panelY, panelWidth, panelHeight);
  }
  
  createBuildingButtons(panelX, panelY, panelWidth, panelHeight) {
    const buttonWidth = 250;
    const buttonHeight = 90;
    const padding = 20;
    const startY = panelY + 40;
    
    // Calculate positions to evenly space the buttons
    const totalButtons = this.buildings.length;
    const totalButtonWidth = totalButtons * buttonWidth + (totalButtons - 1) * padding;
    let startX = panelX + (panelWidth - totalButtonWidth) / 2;
    
    // Create buttons for each building type
    this.buildingButtons = this.buildings.map((building, index) => {
      const buttonX = startX + index * (buttonWidth + padding);
      const buttonY = startY;
      
      // Helper to register UI elements that must stay fixed and on top
      const registerElement = (obj) => {
        if (!obj) return;
        obj.setScrollFactor(0);
        obj.setDepth(102);
        if (!this.buildMenuElements) this.buildMenuElements = [];
        this.buildMenuElements.push(obj);
        obj.setVisible(false); // start hidden like the container
      };
      
      // Button background - rely on default geometry for hit area
      const buttonBg = this.scene.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, this.COLORS.BUTTON_BG)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.COLORS.PANEL_BORDER)
        .setInteractive({ useHandCursor: true });
      registerElement(buttonBg);
      
      // Building name
      const nameText = this.scene.add.text(buttonX + 10, buttonY + 10, building.label, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: this.COLORS.TEXT_SECONDARY
      });
      registerElement(nameText);
      
      // Cost display
      const costText = this.scene.add.text(buttonX + 10, buttonY + 35, `COST: ${building.cost}`, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '14px',
        color: this.COLORS.TEXT_PRIMARY
      });
      registerElement(costText);
      
      // Description
      const descText = this.scene.add.text(buttonX + 10, buttonY + 55, building.description, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '12px',
        color: this.COLORS.TEXT_PRIMARY
      });
      registerElement(descText);
      
      // Hotkey display background
      const hotkeyBg = this.scene.add.rectangle(buttonX + buttonWidth - 30, buttonY + 15, 25, 25, 0x000000, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.COLORS.PANEL_BORDER);
      registerElement(hotkeyBg);
      
      const hotkeyText = this.scene.add.text(buttonX + buttonWidth - 17.5, buttonY + 27.5, building.hotkey, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: this.COLORS.TEXT_SECONDARY
      }).setOrigin(0.5, 0.5);
      registerElement(hotkeyText);
      
      // Add icon for building type
      let icon;
      if (building.type === 'drill') {
        icon = this.scene.add.rectangle(buttonX + buttonWidth - 50, buttonY + 60, 10, 20, this.COLORS.TEXT_SECONDARY);
        registerElement(icon);
      } else if (building.type === 'turret') {
        const iconGroup = this.scene.add.container(buttonX + buttonWidth - 50, buttonY + 60);
        iconGroup.setScrollFactor(0);
        iconGroup.setDepth(102);
        const base = this.scene.add.rectangle(0, 0, 15, 15, this.COLORS.TEXT_SECONDARY);
        const barrel = this.scene.add.rectangle(0, -10, 5, 10, this.COLORS.TEXT_SECONDARY);
        base.setScrollFactor(0); base.setDepth(102);
        barrel.setScrollFactor(0); barrel.setDepth(102);
        iconGroup.add([base, barrel]);
        icon = iconGroup;
        registerElement(iconGroup);
      }
      
      // We intentionally keep the interactive elements OUTSIDE the buildMenuContainer.
      // This avoids input issues caused by nesting interactive objects inside a container.
      // We will still manage their visibility via this.buildMenuElements array.
      const elementsToAdd = [buttonBg, nameText, costText, descText, hotkeyBg, hotkeyText];
      if (icon) elementsToAdd.push(icon);
      
      // Track all build-menu related display objects for easy show / hide
      if (!this.buildMenuElements) {
        this.buildMenuElements = [];
      }
      this.buildMenuElements.push(...elementsToAdd);
      
      // Hover effects
      buttonBg.on('pointerover', () => {
        buttonBg.fillColor = this.COLORS.BUTTON_HOVER;
      });
      
      buttonBg.on('pointerout', () => {
        buttonBg.fillColor = this.COLORS.BUTTON_BG;
      });
      
      // Use pointerdown handler with event stopPropagation to avoid BuildManager
      // receiving the same pointer event and auto-placing the building.
      buttonBg.on('pointerdown', (pointer, localX, localY, event) => {
        // Prevent the event from bubbling to the global 'pointerdown' listener
        // that BuildManager uses for actual placement. Without this, the click
        // that selects a building would also trigger an immediate placement at
        // the cursor position, which feels like an unintended double-click.
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }

        // Call callback directly with the building type
        if (this.onSelectBuilding) {
          this.onSelectBuilding(building.type);

          // Hide the build menu UI now that we are in build mode
          this.buildMenuContainer.setVisible(false);
          if (this.buildMenuElements) {
            this.buildMenuElements.forEach(el => el.setVisible(false));
          }

          // Show notification
          this.showNotification(`Selected: ${building.label}`, 'info');
        }
      });
      
      // Return the button group for reference
      return { bg: buttonBg, nameText, costText, descText, hotkeyBg, hotkeyText, icon };
    });
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
    // Remove any existing key bindings to prevent duplicates
    if (this.buildKey) {
      this.buildKey.removeAllListeners();
    }
    
    if (this.numberKeys) {
      this.numberKeys.forEach(key => key.removeAllListeners());
    }
    
    // Toggle build menu with B key
    this.buildKey = this.scene.input.keyboard.addKey('B');
    this.buildKey.on('down', () => {
      this.toggleBuildMenu();
    });
    
    // Store references to keys
    this.numberKeys = [];
    
    // Building hotkeys (1, 2, etc.)
    this.buildings.forEach(building => {
      const key = this.scene.input.keyboard.addKey(building.hotkey);
      this.numberKeys.push(key);
      
      key.on('down', () => {
        // Always call the callback regardless of menu visibility
        if (this.onSelectBuilding) {
          this.onSelectBuilding(building.type);
          
          // Hide the menu if it's visible
          if (this.buildMenuContainer.visible) {
            this.buildMenuContainer.setVisible(false);
            if (this.buildMenuElements) {
              this.buildMenuElements.forEach(el => el.setVisible(false));
            }
          }
          
          // Show notification
          this.showNotification(`Selected: ${building.label}`, 'info');
        }
      });
    });
  }
  
  toggleBuildMenu() {
    // Update building costs whenever the menu is toggled
    this.buildings = this.getDynamicBuildings();
    
    // Update UI elements with latest costs
    if (this.buildingButtons) {
      this.buildingButtons.forEach((button, index) => {
        const building = this.buildings[index];
        if (building && button.costText) {
          button.costText.setText(`COST: ${building.cost}`);
        }
      });
    }
    
    // Determine new visibility state
    const newVisible = !this.buildMenuContainer.visible;
    // Toggle panel/background visibility
    this.buildMenuContainer.setVisible(newVisible);
    // Toggle external element visibility
    if (this.buildMenuElements) {
      this.buildMenuElements.forEach(el => el.setVisible(newVisible));
    }
  }
  
  // =============================
  //        Settings / Pause
  // =============================
  
  /*
   * ---------------------------------------------------------------------------
   *  ✨  Phaser-3 Modal Pattern (Read Before Adding New Modals)  ✨
   * ---------------------------------------------------------------------------
   * 1.  BACKDROP & TITLE CONTAINER (non-interactive)
   *     - Keep a single `Container` (`settingsModal` here) that only contains
   *       visual, NON-interactive children (background rectangle, title, etc.).
   *     - Because it is inside a Container, it will NOT break pointer events for
   *       elements we place on top of it.
   *
   * 2.  INTERACTIVE ELEMENTS (buttons, sliders, etc.)
   *     - Create each interactive GameObject (Rectangle/Text, etc.) **outside**
   *       the container and push them into a tracking array (`settingsElements`).
   *       This mirrors the pattern used by the Build menu (`buildMenuElements`).
   *     - Always call `setScrollFactor(0)` so they stay fixed to the camera, and
   *       set a depth value ABOVE the backdrop (‣ 202 here) so pointer events hit
   *       them before the overlay.
   *
   * 3.  VISIBILITY TOGGLING
   *     - `openSettingsModal()` / `closeSettingsModal()` simply iterate over the
   *       tracking array and toggle `.setVisible(true|false)` — no need to add
   *       them to / remove them from a parent container.
   *
   * 4.  OVERLAY CLICK-TO-CLOSE
   *     - A full-screen `Rectangle` (`settingsOverlay`) captures clicks.
   *     - It inspects the pointer position; if it is **outside** the modal
   *       bounds, call `closeSettingsModal()`.
   *
   * 5.  RESTART / CLEANUP SAFETY
   *     - Any event listeners or tweens created by the modal must be cleaned up
   *       in `closeSettingsModal()` or via `scene.events.once(… SHUTDOWN …)`.
   *
   *  ⚠  Do NOT nest interactive objects inside a Container that you intend to
   *     be interactive itself; this causes Phaser's hit-test to short-circuit
   *     and makes clicks unreachable (the original source of our bugs).
   * ---------------------------------------------------------------------------
   */

  createSettingsUI() {
    // Simple text button positioned near the left side of the top bar
    const buttonX = 1000;
    const button = this.scene.add.text(buttonX, 24, 'SETTINGS', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '18px',
      color: this.COLORS.TEXT_SECONDARY,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(101);

    button.on('pointerover', () => button.setColor(this.COLORS.TEXT_PRIMARY));
    button.on('pointerout', () => button.setColor(this.COLORS.TEXT_SECONDARY));
    button.on('pointerdown', () => {
      this.openSettingsModal();
    });

    // Add to the existing HUD container so it moves/behaves together
    if (this.hud) {
      this.hud.add(button);
    }

    this.settingsButton = button;

    // Prepare modal/overlay objects (hidden by default)
    this.createSettingsModal();
  }

  createSettingsModal() {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Full-screen semi-transparent overlay that also catches clicks outside the modal
    this.settingsOverlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();
    this.settingsOverlay.setVisible(false);

    const modalWidth = 320;
    const modalHeight = 220;

    // Container for non-interactive modal background + title
    this.settingsModal = this.scene.add.container(
      width / 2 - modalWidth / 2,
      height / 2 - modalHeight / 2
    );
    this.settingsModal.setScrollFactor(0);
    this.settingsModal.setDepth(201);
    this.settingsModal.setVisible(false);

    const bg = this.scene.add.rectangle(0, 0, modalWidth, modalHeight, this.COLORS.PANEL_BG, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, this.COLORS.PANEL_BORDER);

    const title = this.scene.add.text(modalWidth / 2, 15, 'PAUSED', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '22px',
      color: this.COLORS.TEXT_SECONDARY
    }).setOrigin(0.5, 0);

    this.settingsModal.add([bg, title]);

    // Array to track interactive parts so we can toggle visibility like build menu
    this.settingsElements = [];

    // Helper to register interactive elements (similar to build menu approach)
    const registerSettingElement = (obj) => {
      if (!obj) return;
      obj.setScrollFactor(0);
      obj.setDepth(202); // above overlay & modal background
      obj.setVisible(false);
      this.settingsElements.push(obj);
    };

    // Button definitions
    const labels = ['Settings', 'Main menu', 'Restart'];
    labels.forEach((label, idx) => {
      const yPos = (height / 2 - modalHeight / 2) + 60 + idx * 50; // world Y coordinate
      const xCenter = width / 2; // world X coordinate

      const btnBg = this.scene.add.rectangle(xCenter, yPos, 180, 36, this.COLORS.BUTTON_BG)
        .setOrigin(0.5)
        .setStrokeStyle(1, this.COLORS.PANEL_BORDER)
        .setInteractive({ useHandCursor: true });

      const btnText = this.scene.add.text(xCenter, yPos, label.toUpperCase(), {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '18px',
        color: this.COLORS.TEXT_SECONDARY
      }).setOrigin(0.5);

      registerSettingElement(btnBg);
      registerSettingElement(btnText);

      // Hover effects
      btnBg.on('pointerover', () => btnBg.setFillStyle(this.COLORS.BUTTON_HOVER));
      btnBg.on('pointerout', () => btnBg.setFillStyle(this.COLORS.BUTTON_BG));

      btnBg.on('pointerdown', () => {
        switch (label) {
          case 'Settings':
            this.showNotification('Settings clicked (placeholder)', 'info');
            break;
          case 'Main menu':
            this.showNotification('Main menu clicked (placeholder)', 'info');
            break;
          case 'Restart':
            // Ensure game is unpaused before restarting
            this.resumeGame();
            this.scene.scene.restart();
            return; // early exit, no need to close modal
        }
        this.closeSettingsModal();
      });
    });

    // Close when clicking outside the modal (overlay area not covered by modal bg)
    this.settingsOverlay.on('pointerdown', (pointer) => {
      const bounds = this.settingsModal.getBounds();
      // Modal is non-interactive; just check co-ords relative to modal container position+size
      if (!Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
        this.closeSettingsModal();
      }
    });

    // Close via ESC key
    this.scene.input.keyboard.on('keydown-ESC', () => {
      if (this.settingsModal.visible) {
        this.closeSettingsModal();
      }
    });
  }

  openSettingsModal() {
    if (this.settingsModal.visible) return;

    // Cancel build mode if player opens settings while building
    if (this.scene.buildManager?.buildMode) {
      this.scene.buildManager.cancelBuildMode();
    }

    this.pauseGame();
    this.settingsOverlay.setVisible(true);
    this.settingsModal.setVisible(true);
    if (this.settingsElements) {
      this.settingsElements.forEach(el => el.setVisible(true));
    }
  }

  closeSettingsModal() {
    this.resumeGame();
    this.settingsOverlay.setVisible(false);
    this.settingsModal.setVisible(false);
    if (this.settingsElements) {
      this.settingsElements.forEach(el => el.setVisible(false));
    }
  }

  pauseGame() {
    if (this.scene.physics?.world) this.scene.physics.world.pause();
    this.scene.time.paused = true;
    this.scene.isGamePaused = true;
  }

  resumeGame() {
    if (this.scene.physics?.world) this.scene.physics.world.resume();
    this.scene.time.paused = false;
    this.scene.isGamePaused = false;
  }
  
  updateWaveStatus() {
    if (!this.scene.enemyManager) return;
    
    const waveStatus = this.scene.enemyManager.getWaveStatus();
    const currentWave = waveStatus.currentWave || 0;
    const isActive = waveStatus.isActive || false;
    
    // Update wave text
    this.waveText.setText(`WAVE ${currentWave}`);
    
    // Update status text with appropriate color
    this.waveStatusText.setText(isActive ? 'ACTIVE' : 'BREAK');
    this.waveStatusText.setColor(isActive ? this.COLORS.TEXT_DANGER : this.COLORS.TEXT_PRIMARY);
    
    // Update progress bar
    if (isActive) {
      // Calculate progress based on enemies left
      const totalEnemies = waveStatus.enemiesLeftToSpawn + this.scene.enemyManager.enemies.length;
      const originalTotal = this.scene.enemyManager.WAVE_SETTINGS.INITIAL_ENEMIES + 
                          (currentWave - 1) * this.scene.enemyManager.WAVE_SETTINGS.ENEMIES_INCREMENT;
      const progress = Math.max(0, Math.min(1, 1 - (totalEnemies / originalTotal)));
      this.updateWaveProgress(progress, true);
    } else {
      // Show break progress
      const breakProgress = Math.min(1, this.scene.enemyManager.waveBreakTimer / this.scene.enemyManager.WAVE_SETTINGS.BREAK_DURATION);
      this.updateWaveProgress(breakProgress, false);
    }
    
    // Update enemy counts separately for red and purple types
    const enemies = this.scene.enemyManager.enemies;
    const purpleCount = enemies.filter(e => e.tier === 'SHOOTER').length;
    const redCount    = enemies.length - purpleCount; // all others considered red

    this.enemyPurpleCountText.setText(purpleCount.toString());
    this.enemyRedCountText.setText(redCount.toString());
  }
  
  updateWaveProgress(progress, isActive) {
    const width = Math.max(0, this.scene.cameras.main.width * progress);
    this.waveProgressFill.width = width;
    this.waveProgressFill.fillColor = isActive ? this.COLORS.TEXT_DANGER : this.COLORS.PANEL_BORDER;
  }
  
  updateStructureStatus() {
    // Get drill and turret managers
    const drillManager = this.scene.drillManager;
    const turretManager = this.scene.turretManager;
    
    if (drillManager) {
      const drills = drillManager.drills.filter(drill => drill.isAlive);
      this.drillsText.setText(`DRILLS: ${drills.length}`);
      
      // Check for damaged drills
      const damagedDrills = drills.filter(drill => drill.health < drillManager.DRILL_MAX_HEALTH * 0.5);
      if (damagedDrills.length > 0) {
        this.healthText.setText(`ALERT: ${damagedDrills.length} DAMAGED DRILL${damagedDrills.length > 1 ? 'S' : ''}`);
        this.healthText.setColor(this.COLORS.TEXT_WARNING);
      }
    }
    
    if (turretManager) {
      const turrets = turretManager.turrets.filter(turret => turret.active);
      this.turretsText.setText(`TURRETS: ${turrets.length}`);
      
      // Check for damaged turrets
      const damagedTurrets = turrets.filter(turret => turret.health < turretManager.TURRET_STATS.HEALTH * 0.5);
      if (damagedTurrets.length > 0) {
        this.healthText.setText(`ALERT: ${damagedTurrets.length} DAMAGED TURRET${damagedTurrets.length > 1 ? 'S' : ''}`);
        this.healthText.setColor(this.COLORS.TEXT_WARNING);
      }
    }
    
    // Reset if no alerts
    if ((!drillManager || drillManager.drills.every(drill => drill.health >= drillManager.DRILL_MAX_HEALTH * 0.5)) && 
        (!turretManager || turretManager.turrets.every(turret => turret.health >= turretManager.TURRET_STATS.HEALTH * 0.5))) {
      this.healthText.setText("ALERT: NONE");
      this.healthText.setColor(this.COLORS.TEXT_PRIMARY);
    }
  }
  
  update() {
    // Update wave status
    this.updateWaveStatus();
    
    // Update structure status
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
