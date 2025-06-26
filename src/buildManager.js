// Build Management System for Edge World Miners
export class BuildManager {
  constructor(scene, terrainManager, resourceManager) {
    this.scene = scene;
    this.terrainManager = terrainManager;
    this.resourceManager = resourceManager;
    
    // Building state tracking
    this.buildMode = false;
    this.selectedBuilding = null;
    this.previewSprite = null;
    this.rangeIndicator = null;
    
    // Store reference to other managers when they're available
    this.drillManager = this.scene.drillManager;
    this.turretManager = this.scene.turretManager;
    
    // Available building types
    this.availableBuildings = [
      {
        type: 'drill',
        getStats: () => this.drillManager?.DRILL_STATS || { COST: 10, NAME: 'Mining Drill' }
      },
      {
        type: 'turret',
        getStats: () => this.turretManager?.TURRET_STATS || { COST: 20, NAME: 'Macro Turret', RANGE: 500 }
      }
    ];
    
    // Optional: could notify UI about readiness (commented out to reduce debug noise)
    
    // Ignore unintended placement if the pointer is still held down from the
    // UI click that triggered build-mode. We wait for the next pointer *up*
    // event before we accept a placement click.
    this.waitingForPointerUp = false;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Place building on valid terrain
    this.scene.input.on('pointerdown', (pointer) => {
      // If we are still waiting for the initial pointer release that follows
      // the build-menu selection, do nothing.
      if (this.waitingForPointerUp) {
        return;
      }

      // Only handle left clicks when in build mode
      if (pointer.leftButtonDown() && this.buildMode && this.selectedBuilding) {
        this.attemptPlaceBuilding(pointer);
      }
    });

    // Cancel build mode with ESC
    this.scene.input.keyboard.on('keydown-ESC', () => {
      this.cancelBuildMode();
    });

    // Cancel build mode with right click
    this.scene.input.on('pointerup', (pointer) => {
      // If we were waiting for the pointer to be released, clear the flag now.
      if (this.waitingForPointerUp && pointer.button === 0) {
        this.waitingForPointerUp = false;
        return; // Don't treat this as a cancel action.
      }

      // Right-click cancels build mode.
      if (pointer.button === 2) {
        this.cancelBuildMode();
      }
    });

    // Update preview on mouse move
    this.scene.input.on('pointermove', (pointer) => {
      this.updateBuildingPreview(pointer);
    });
  }
  
  attemptPlaceBuilding(pointer) {
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
    const canPlace = this.terrainManager.canPlaceDrillAt(worldPoint.x, worldPoint.y);
    
    if (!canPlace) return;
    
    // Get the building stats
    const buildingConfig = this.availableBuildings.find(b => b.type === this.selectedBuilding);
    if (!buildingConfig) return;
    
    const stats = buildingConfig.getStats();
    if (!this.resourceManager.spend(stats.COST)) {
      // Not enough resources
      // Could show notification here
      return;
    }
    
    // Place the building based on type
    if (this.selectedBuilding === 'drill') {
      this.drillManager.tryPlaceDrill(worldPoint.x, worldPoint.y);
    } else if (this.selectedBuilding === 'turret') {
      this.turretManager.tryPlaceTurret(worldPoint.x, worldPoint.y);
    }
    
    // Remain in build mode so the player can continue placing buildings.
    // The player can exit build mode manually with ESC or right-click.
  }
  
  cancelBuildMode() {
    this.buildMode = false;
    this.selectedBuilding = null;
    this.clearPreview();
  }
  
  clearPreview() {
    // Remove preview sprite
    if (this.previewSprite) {
      this.previewSprite.destroy();
      this.previewSprite = null;
    }
    
    // Remove range indicator
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
      this.rangeIndicator = null;
    }
  }
  
  enterBuildMode(buildingType) {
    // entering build mode
    
    // Make sure we have the latest drillManager and turretManager references
    this.drillManager = this.scene.drillManager;
    this.turretManager = this.scene.turretManager;
    
    this.selectedBuilding = buildingType;
    this.buildMode = true;
    
    // The click that opened build mode is still held down. Ignore placement
    // until it is released.
    this.waitingForPointerUp = this.scene.input.activePointer.isDown;
    
    // Clear any previous preview
    this.clearPreview();
    
    try {
      // Create appropriate preview sprite
      if (buildingType === 'drill') {
        this.previewSprite = this.scene.add.rectangle(0, 0, 20, 40, 0xff0000).setAlpha(0.5);
        // console.log("[BuildManager] Created drill preview");
      } else if (buildingType === 'turret') {
        // Check if turretManager is available
        if (!this.turretManager) {
          // console.error("[BuildManager] Turret manager is not available!");
          this.scene.ui?.showNotification("Error: Turret manager not found", "danger");
          return;
        }
        
        // Create turret preview
        this.previewSprite = this.turretManager.createTurretPreview(0, 0);
        this.previewSprite.setAlpha(0.5);
        // console.log("[BuildManager] Created turret preview");
        
        // Add range indicator for turrets
        const turretStats = this.turretManager.TURRET_STATS;
        const range = turretStats.RANGE || 500;
        this.rangeIndicator = this.scene.add.circle(0, 0, range);
        this.rangeIndicator.setStrokeStyle(2, 0x00ffff, 0.4);
        this.rangeIndicator.setFillStyle(0x00ffff, 0.1);
        // console.log(`[BuildManager] Added range indicator with radius ${range}`);
      }
    } catch (error) {
      // console.error("[BuildManager] Error creating preview:", error);
      this.scene.ui?.showNotification("Error creating building preview", "danger");
      return;
    }
    
    // Notify if UI is available
    if (this.scene.ui && this.scene.ui.showNotification) {
      this.scene.ui.showNotification(`Ready to place: ${buildingType}`, "info");
    }
    
    // Update preview position immediately to mouse position
    const pointer = this.scene.input.activePointer;
    this.updateBuildingPreview(pointer);
  }
  
  updateBuildingPreview(pointer) {
    if (!this.buildMode || !this.previewSprite) return;
    
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
    
    // Update preview position
    this.previewSprite.x = worldPoint.x;
    this.previewSprite.y = worldPoint.y;
    
    // Update range indicator position if it exists
    if (this.rangeIndicator) {
      this.rangeIndicator.x = worldPoint.x;
      this.rangeIndicator.y = worldPoint.y;
    }
    
    // Check if placement is valid
    const canPlace = this.terrainManager.canPlaceDrillAt(worldPoint.x, worldPoint.y);
    
    // Update color based on validity
    if (this.selectedBuilding === 'drill') {
      this.previewSprite.setFillStyle(canPlace ? 0x00ff00 : 0xff0000);
    } else if (this.selectedBuilding === 'turret') {
      // For a container with multiple elements
      this.previewSprite.list.forEach(child => {
        if (child.type === 'Rectangle') {
          child.setFillStyle(canPlace ? 0x00ff00 : 0xff0000);
        }
      });
      
      // Also update the range indicator
      if (this.rangeIndicator) {
        this.rangeIndicator.setStrokeStyle(2, canPlace ? 0x00ffff : 0xff3300, 0.4);
        this.rangeIndicator.setFillStyle(canPlace ? 0x00ffff : 0xff3300, 0.1);
      }
    }
  }
  
  // Get available buildings for UI
  getAvailableBuildings() {
    return this.availableBuildings.map(building => {
      const stats = building.getStats();
      return {
        type: building.type,
        cost: stats.COST,
        label: stats.NAME || (building.type === 'drill' ? 'Mining Drill' : 'Macro Turret'),
        description: building.type === 'drill' ? 'Mines resources automatically' : 'AOE defense against enemies',
        hotkey: building.type === 'drill' ? '1' : '2'
      };
    });
  }
}

// Factory function to create and return the build manager
export function createBuildManager(scene, terrainManager, resourceManager) {
  const buildManager = new BuildManager(scene, terrainManager, resourceManager);
  
  // Store on scene for easy access
  scene.buildManager = buildManager;
  
  return buildManager;
} 