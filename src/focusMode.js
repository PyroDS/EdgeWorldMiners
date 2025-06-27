import Phaser from 'phaser';

/**
 * FocusMode – toggled with F and ESC.
 * Shows a magnifier cursor with cross-hair and an info box that describes
 * whatever the player is pointing at (terrain tile, building, etc.).
 *
 * Designed to be easily extended with more data sources – just add new
 * handlers in `collectData()` and update the markup in `updateInfo()`.
 */
export class FocusMode {
  constructor(scene, overlay) {
    this.scene = scene;
    this.overlay = overlay;

    this.active = false;
    this.debug = false; // Set to true for console debug

    // DOM elements (created lazily to avoid DOM pollution if player never uses focus)
    this.cursorEl = null;
    this.infoEl = null;

    // Bind keyboard shortcuts
    this.scene.input.keyboard.addKey('F').on('down', () => {
      if (this.active) {
        this.exit();
      } else {
        this.enter();
      }
    });

    this.scene.input.keyboard.on('keydown-ESC', () => {
      if (this.active) this.exit();
    });
  }

  enter() {
    if (this.active) return;
    this.active = true;

    // Ensure build mode is cancelled for mutual exclusivity
    if (this.scene.buildManager?.buildMode) {
      this.scene.buildManager.cancelBuildMode();
    }

    // Hide default cursor
    this.overlay.style.cursor = 'none';

    // --- Build cursor element ---
    if (!this.cursorEl) {
      this.cursorEl = document.createElement('div');
      this.cursorEl.id = 'focus-cursor';
      this.overlay.appendChild(this.cursorEl);
    }
    this.cursorEl.style.display = 'block';

    // --- Build info element ---
    if (!this.infoEl) {
      this.infoEl = document.createElement('div');
      this.infoEl.id = 'focus-info';
      this.overlay.appendChild(this.infoEl);
    }
    this.infoEl.style.display = 'block';

    // Listen for pointer movement
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.scene.input.on('pointermove', this.pointerMoveHandler);
  }

  exit() {
    if (!this.active) return;
    this.active = false;

    // Restore cursor
    this.overlay.style.cursor = 'auto';

    // Hide DOM elements (retain in DOM for quicker reuse)
    if (this.cursorEl) this.cursorEl.style.display = 'none';
    if (this.infoEl) this.infoEl.style.display = 'none';

    // Remove pointer listener
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }
  }

  handlePointerMove(pointer) {
    // Show elements on first move (if they were hidden)
    if (this.cursorEl && this.cursorEl.style.display === 'none') {
      this.cursorEl.style.display = 'block';
      this.infoEl.style.display = 'block';
    }

    // Position cursor element
    const offset = 0; // we center on pointer
    this.cursorEl.style.left = `${pointer.x - 20 + offset}px`;
    this.cursorEl.style.top = `${pointer.y - 20 + offset}px`;

    // Determine what is being pointed at and update info box
    const data = this.collectData(pointer);
    this.updateInfo(pointer, data);
  }

  collectData(pointer) {
    const result = { label: 'UNKNOWN', details: '' };

    // World coordinates
    const wx = pointer.worldX;
    const wy = pointer.worldY;

    if (wx === undefined || wy === undefined || Number.isNaN(wx) || Number.isNaN(wy)) {
      if (this.debug) console.log('Focus: Invalid world coordinates', wx, wy);
      return result;
    }
    
    if (this.debug) console.log(`Focus: Checking at world (${wx}, ${wy})`);

    // Get terrain manager - try both direct and scene reference
    const tm = this.scene.terrainManager || this.scene.scene?.terrainManager;

    // ---- 1) Buildings ----
    // Check drills
    const drills = this.scene.drillManager?.drills || [];
    for (const drill of drills) {
      if (!drill.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(wx, wy, drill.x, drill.y);
      if (dist < 25) {
        if (this.debug) console.log('Focus: Found drill', drill);
        result.label = 'MINING DRILL';
        result.details = `Health: ${drill.health}`;
        return result;
      }
    }
    // Check turrets
    const turrets = this.scene.turretManager?.turrets || [];
    for (const turret of turrets) {
      const sprite = turret.container ?? turret.sprite ?? turret;
      if (!sprite) continue;
      const dist = Phaser.Math.Distance.Between(wx, wy, sprite.x, sprite.y);
      if (dist < 30) {
        if (this.debug) console.log('Focus: Found turret', turret);
        result.label = 'TURRET';
        result.details = `Range: ${this.scene.turretManager.TURRET_STATS?.RANGE || ''}`;
        return result;
      }
    }

    // ---- 2) Terrain ----
    if (!tm) {
      if (this.debug) console.log('Focus: No terrain manager found');
      return result;
    }
    
    try {
      const colIdx = Math.floor(wx / tm.tileSize);
      const rowIdx = Math.floor(wy / tm.tileSize);
      
      if (this.debug) console.log(`Focus: Checking tile at [${colIdx}, ${rowIdx}]`);
      
      // Bounds check
      if (colIdx < 0 || colIdx >= tm.cols || rowIdx < 0 || rowIdx >= tm.rows) {
        if (this.debug) console.log('Focus: Out of terrain bounds');
        return result;
      }

      // Try current tile first
      let tileObj = null;
      
      // First try getTileAt helper
      if (typeof tm.getTileAt === 'function') {
        tileObj = tm.getTileAt(wx, wy);
        if (this.debug) console.log('Focus: getTileAt result:', tileObj?.name || 'null');
      }
      
      // If that failed, try direct array access
      if (!tileObj && tm.tiles && tm.tiles[rowIdx] && tm.tiles[rowIdx][colIdx]) {
        tileObj = tm.tiles[rowIdx][colIdx];
        if (this.debug) console.log('Focus: Direct tile access result:', tileObj?.name || 'null');
      }

      // Determine if the pointer is in an air cell; if so decide SKY vs UNDERGROUND
      const initialTile = tm.tiles[rowIdx]?.[colIdx];
      if (initialTile && initialTile.name === 'air') {
        if (rowIdx < tm.seaLevelRow) {
          result.label = 'SKY';
          result.details = '';
          return result;
        } else {
          // Air below the defined sea level row counts as an underground cave pocket
          result.label = 'UNDERGROUND';
          result.details = '';
          return result;
        }
      }

      if (tileObj) {
        if (this.debug) console.log('Focus: Reporting tile:', tileObj.name, 'hardness:', tileObj.hardness, 'resourceValue:', tileObj.resourceValue);
        result.label = tileObj.name.replace(/_/g, ' ').toUpperCase();
        
        // Build details string including hardness and resource value if available
        let details = '';
        if (tileObj.name !== 'air') {
          details = `Hardness: ${tileObj.hardness}`;
          // Add resource value if present
          if (tileObj.resourceValue !== undefined && tileObj.resourceValue > 0) {
            details += `\nResource Value: ${tileObj.resourceValue}`;
          }
        }
        result.details = details;
        return result;
      }
    } catch (err) {
      if (this.debug) console.error('Focus: Error in terrain detection:', err);
    }

    return result;
  }

  updateInfo(pointer, data) {
    this.infoEl.innerHTML = 
    `<div class="fi-label">${data.label}</div>
    <div class="fi-details">${data.details}</div>`;
    // Position to the right-bottom of cursor
    const infoOffset = 28;
    this.infoEl.style.left = `${pointer.x + infoOffset}px`;
    this.infoEl.style.top = `${pointer.y + infoOffset}px`;
  }
} 