// src/terrainTooltip.js

// Stand-alone terrain hover tooltip component for Edge World Miners
// Keeps UI logic modular so future stats (temperature, rarity, etc.) can be displayed easily.

import Phaser from 'phaser';

export class TerrainTooltip {
  /**
   * @param {Phaser.Scene} scene – active game scene (for input & shutdown hooks)
   * @param {TerrainManager} terrainManager – the active terrain manager
   * @param {HTMLElement} overlay – DOM overlay container to attach tooltip element
   * @param {Object} [opts]
   * @param {number} [opts.delay=300] – hover delay before tooltip appears (ms)
   */
  constructor(scene, terrainManager, overlay, opts = {}) {
    this.scene = scene;
    this.terrainManager = terrainManager;
    this.overlay = overlay;
    this.delay = opts.delay ?? 300;

    // --- Build tooltip DOM element ---
    this.el = document.createElement('div');
    this.el.id = 'terrain-tooltip';
    this.el.style.opacity = '0'; // start hidden
    overlay.appendChild(this.el);

    this.lastTileKey = null;
    this.visible = false;
    this.hoverTimer = null;

    // Listen for pointer movement
    scene.input.on('pointermove', this.handlePointerMove, this);

    // Clean-up on scene shutdown
    scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointermove', this.handlePointerMove, this);
      clearTimeout(this.hoverTimer);
      this.el.remove();
    });
  }

  handlePointerMove(pointer) {
    // Ignore if pointer not active (e.g., outside window)
    if (!pointer.worldX || !pointer.worldY) return;

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // If pointer is outside world bounds hide tooltip instantly
    if (
      worldX < 0 ||
      worldY < 0 ||
      worldX >= this.terrainManager.width ||
      worldY >= this.terrainManager.height
    ) {
      this._reset();
      return;
    }

    const col = Math.floor(worldX / this.terrainManager.tileSize);
    const row = Math.floor(worldY / this.terrainManager.tileSize);
    const tileKey = `${col}_${row}`;

    if (tileKey === this.lastTileKey) {
      // Same tile – if tooltip visible, just update its screen position
      if (this.visible) this._positionTooltip(pointer);
      return;
    }

    // Pointer entered a new tile
    this.lastTileKey = tileKey;
    clearTimeout(this.hoverTimer);
    this._hide();

    const tile = this.terrainManager.tiles[row]?.[col];
    if (!tile || tile.name === 'air') return; // No tooltip for air

    // Schedule tooltip show after delay
    this.hoverTimer = setTimeout(() => {
      // If mouse moved away in the meantime, abort
      if (this.lastTileKey !== tileKey) return;
      this._show(tile, pointer);
    }, this.delay);
  }

  _show(tile, pointer) {
    this.el.innerHTML = `
      <div class="tt-name">${tile.name.replace(/_/g, ' ').toUpperCase()}</div>
      <div class="tt-hardness">HARDNESS: ${tile.hardness}</div>
    `;
    this._positionTooltip(pointer);
    this.el.style.opacity = '1';
    this.visible = true;
  }

  _hide() {
    if (!this.visible) return;
    this.el.style.opacity = '0';
    this.visible = false;
  }

  _reset() {
    this._hide();
    clearTimeout(this.hoverTimer);
    this.lastTileKey = null;
  }

  _positionTooltip(pointer) {
    const offset = 16; // px offset from cursor
    this.el.style.left = `${pointer.x + offset}px`;
    this.el.style.top = `${pointer.y + offset}px`;
  }
} 