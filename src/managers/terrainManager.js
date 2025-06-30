/**
 * terrainManager.js
 * 
 * Manages terrain generation, rendering, and manipulation.
 * Refactored to use the new Manager base class and state management system.
 */

import { Manager } from '../core/manager.js';
import { createNoise2D } from 'simplex-noise';

export class TerrainManager extends Manager {
  /**
   * Creates a new terrain manager
   */
  constructor() {
    super('terrainManager');
  }
  
  /**
   * Sets up event listeners
   */
  setupEventListeners() {
    // Listen for terrain manipulation events
    this.eventBus.on('terrain:damage', ({ x, y, radius, strength }) => {
      this.damageCircle(x, y, radius, strength);
    });
    
    this.eventBus.on('terrain:explosion', ({ x, y, radius, strength }) => {
      this.createExplosion(x, y, radius, strength);
    });
    
    this.eventBus.on('terrain:checkCollision', ({ x, y }, callback) => {
      const result = this.checkCollision(x, y);
      if (typeof callback === 'function') {
        callback(result);
      }
    });
    
    this.eventBus.on('world:generateChunksAround', ({ x, y, radius }) => {
      this.generateTerrainChunksAround(x, y, radius);
    });
  }
  
  /**
   * Initializes the manager
   * 
   * @param {Object} scene - The Phaser scene
   * @param {Object} config - Configuration options
   */
  init(scene, config = {}) {
    super.init();
    
    this.scene = scene;
    
    // --- World dimension constraints ---
    const minSkyPixels = 1000;   // must have at least 1000 px of sky above sea-level
    const minDepthPixels = 1200; // must have at least 1200 px of world below sea-level

    const minWorldHeight = minSkyPixels + minDepthPixels; // 2200 px

    const minWidth = 1024;
    const requestedHeight = config.height || 1800;
    this.width = Math.max(config.width || 2048, minWidth);
    this.height = Math.max(requestedHeight, minWorldHeight);

    // Sea level row (tile index)
    this.tileSize = config.tileSize || 20;
    this.seaLevelRow = Math.floor(minSkyPixels / this.tileSize); // e.g. 800/20 = 40
    
    // Planet-specific resource multiplier
    this.resourceMultiplier = config.resourceMultiplier || 1.0;
    
    this.cols = Math.floor(this.width / this.tileSize);
    this.rows = Math.floor(this.height / this.tileSize);
    
    // Create tile map
    this.tiles = [];
    
    // Graphics context for rendering
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-3); // kept for destructive updates but not used every frame
    this.chunkGraphics = new Map();
    this.dirtyChunks = new Set();
    
    // Define sky properties
    this.skyConfig = {
      gradientTop: 0x1a2b4c,    // Deep blue
      gradientMiddle: 0x3366cc, // Medium blue
      gradientBottom: 0x66aaff, // Light blue
      cloudFrequency: config.cloudDensity || 0.01,
      cloudSpeed: config.cloudSpeed || 0.2
    };
    
    // Sky object (clouds disabled for performance)
    this.sky = scene.add.graphics();
    this.sky.setDepth(-5);
    // Clouds disabled
    this.clouds = null;
    
    // Define material properties
    this.defineMaterials();
    
    // Define biomes
    this.defineBiomes();
    
    // Generation parameters
    this.seed = config.seed || Math.random() * 10000;
    this.noiseGen = createNoise2D(() => this.seed / 10000);
    
    // Chunk-based generation
    this.chunkSize = 64; // Tiles per chunk
    this.generatedChunks = new Set();
    this.isGenerating = false;
    this.generationQueue = [];
    
    // Initialize empty world
    this.initializeEmptyWorld();
    
    // Create sky immediately for visual appeal
    this.createSky();

    this.minDepthTiles = Math.floor(minDepthPixels / this.tileSize);
    // Require a solid "crust" of at least 5 tiles beneath the surface with no caves
    this.minSolidSurfaceLayers = 5;
    
    // Setup state
    this.setupState();
  }
  
  /**
   * Sets up initial state
   */
  setupState() {
    // Set terrain dimensions
    this.setState('terrain.dimensions', {
      width: this.width,
      height: this.height,
      cols: this.cols,
      rows: this.rows,
      tileSize: this.tileSize,
      seaLevelRow: this.seaLevelRow
    });
    
    // Set generation status
    this.setState('terrain.generation', {
      isGenerating: this.isGenerating,
      generatedChunks: Array.from(this.generatedChunks),
      queueLength: this.generationQueue.length,
      seed: this.seed,
      resourceMultiplier: this.resourceMultiplier
    });
    
    // Set visible area
    if (this.scene && this.scene.cameras && this.scene.cameras.main) {
      const camera = this.scene.cameras.main;
      this.setState('terrain.visibleArea', {
        x: camera.scrollX,
        y: camera.scrollY,
        width: camera.width,
        height: camera.height
      });
    }
  }

  /**
   * Initialize an empty world with just air and bedrock
   */
  initializeEmptyWorld() {
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.cols; x++) {
        // Only add bedrock at the bottom, air everywhere else
        if (y === this.rows - 1) {
          this.tiles[y][x] = { ...this.MATERIALS.BEDROCK };
        } else {
          this.tiles[y][x] = { ...this.MATERIALS.AIR };
        }
      }
    }
    
    // Update state
    this.setState('terrain.initialized', true);
  }

  /**
   * Updates the terrain system
   */
  update(delta) {
    // Update terrain generation if needed
    if (this.isGenerating) {
      // Update generation status in state
      this.setState('terrain.generation', {
        isGenerating: this.isGenerating,
        generatedChunks: Array.from(this.generatedChunks),
        queueLength: this.generationQueue.length,
        seed: this.seed,
        resourceMultiplier: this.resourceMultiplier
      });
    }
    
    // Update visible area if camera moved
    if (this.scene && this.scene.cameras && this.scene.cameras.main) {
      const camera = this.scene.cameras.main;
      const visibleArea = this.getState('terrain.visibleArea');
      
      if (!visibleArea || 
          visibleArea.x !== camera.scrollX || 
          visibleArea.y !== camera.scrollY ||
          visibleArea.width !== camera.width ||
          visibleArea.height !== camera.height) {
        
        this.setState('terrain.visibleArea', {
          x: camera.scrollX,
          y: camera.scrollY,
          width: camera.width,
          height: camera.height
        });
        
        // Render new chunks if needed
        this.render();
      }
    }
    
    // Rebuild any chunks marked dirty this frame
    this.refreshDirtyChunks();
  }

  /**
   * Generate terrain in chunks around a given position
   * 
   * @param {number} centerX - The center X coordinate
   * @param {number} centerY - The center Y coordinate
   * @param {number} radius - The radius in chunks
   */
  generateTerrainChunksAround(centerX, centerY, radius = 3) {
    const centerChunkX = Math.floor(centerX / (this.chunkSize * this.tileSize));
    const centerChunkY = Math.floor(centerY / (this.chunkSize * this.tileSize));
    
    // Add chunks to generation queue
    for (let cy = centerChunkY - radius; cy <= centerChunkY + radius; cy++) {
      for (let cx = centerChunkX - radius; cx <= centerChunkX + radius; cx++) {
        // Skip negative chunk indices (outside world bounds)
        if (cx < 0 || cy < 0) continue;
        const chunkKey = `${cx},${cy}`;
        if (!this.generatedChunks.has(chunkKey)) {
          this.generationQueue.push({ x: cx, y: cy });
          this.generatedChunks.add(chunkKey);
          
          // Emit chunk queued event
          this.emit('terrain:chunkQueued', { x: cx, y: cy });
        }
      }
    }
    
    // Update state
    this.setState('terrain.generation.queueLength', this.generationQueue.length);
    
    // Start processing queue if not already running
    if (!this.isGenerating) {
      this.processNextChunk();
    }
  }
  
  /**
   * Process the next chunk in the queue
   */
  processNextChunk() {
    if (this.generationQueue.length === 0) {
      this.isGenerating = false;
      this.setState('terrain.generation.isGenerating', false);
      
      // Emit generation complete event
      this.emit('terrain:generationComplete');
      return;
    }
    
    this.isGenerating = true;
    this.setState('terrain.generation.isGenerating', true);
    
    const chunk = this.generationQueue.shift();
    
    // Guard against invalid chunk coordinates
    if (chunk.x < 0 || chunk.y < 0) {
      // Skip and process next
      this.processNextChunk();
      return;
    }
    
    // Generate this chunk
    this.generateChunk(chunk.x, chunk.y);
    
    // Update queue length in state
    this.setState('terrain.generation.queueLength', this.generationQueue.length);
    
    // Schedule the next chunk with a small delay to avoid freezing
    this.scene.time.delayedCall(10, () => {
      this.processNextChunk();
    });
  }
  
  /**
   * Generate a single terrain chunk
   * 
   * @param {number} chunkX - The chunk X coordinate
   * @param {number} chunkY - The chunk Y coordinate
   */
  generateChunk(chunkX, chunkY) {
    // Skip negative coordinates
    if (chunkX < 0 || chunkY < 0) return;
    
    // Calculate chunk boundaries
    const chunkStartX = chunkX * this.chunkSize;
    const chunkStartY = chunkY * this.chunkSize;
    const startX = Math.max(0, chunkStartX);
    const startY = Math.max(0, chunkStartY);
    const endX = Math.min(chunkStartX + this.chunkSize, this.cols);
    const endY = Math.min(chunkStartY + this.chunkSize, this.rows);
    
    // Skip invalid chunks (fully outside world bounds)
    if (startX >= endX || startY >= endY) return;
    
    // Generate biome map if needed
    if (!this.biomeMap) {
      this.biomeMap = this.generateBiomeMap(this.noiseGen);
    }
    
    // Generate height map for this chunk (use original chunkStartX for proper indexing)
    const heightMap = this.generateHeightMapForChunk(chunkStartX, chunkStartX + this.chunkSize);
    
    // Generate cave and ore maps for this chunk
    const caveMap = this.generateCaveMapForChunk(chunkStartX, chunkStartX + this.chunkSize, chunkStartY, chunkStartY + this.chunkSize);
    const oreMap = this.generateOreMapForChunk(chunkStartX, chunkStartX + this.chunkSize, chunkStartY, chunkStartY + this.chunkSize);
    
    // Setup generation layers if needed
    if (!this.generationLayers) {
      this.initializeGenerationLayers();
    }
    
    // Fill tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (y === this.rows - 1) continue; // Bedrock row already set
        const context = {
          surfaceHeight: heightMap[x - chunkStartX],
          caveMap: caveMap,
          oreMap: oreMap,
          biomeMap: this.biomeMap
        };
        let material = null;
        for (const layer of this.generationLayers) {
          material = layer.getMaterial(x, y, context);
          if (material) break;
        }
        if (!material) material = this.MATERIALS.ROCK;
        this.tiles[y][x] = { ...material };
      }
    }
    
    // Draw static graphics for this chunk
    this.drawChunkGraphics(chunkX, chunkY, startX, startY, endX, endY);
    
    // Emit chunk generated event
    this.emit('terrain:chunkGenerated', { x: chunkX, y: chunkY });
  }

  /**
   * Generate full terrain (for backward compatibility)
   */
  generateTerrain() {
    // Generate biome map
    this.biomeMap = this.generateBiomeMap(this.noiseGen);
    
    // Setup the material generation layers
    this.initializeGenerationLayers();
    
    // Queue all chunks for generation
    const chunksX = Math.ceil(this.cols / this.chunkSize);
    const chunksY = Math.ceil(this.rows / this.chunkSize);
    
    for (let cy = 0; cy < chunksY; cy++) {
      for (let cx = 0; cx < chunksX; cx++) {
        const chunkKey = `${cx},${cy}`;
        if (!this.generatedChunks.has(chunkKey)) {
          this.generationQueue.push({ x: cx, y: cy });
          this.generatedChunks.add(chunkKey);
        }
      }
    }
    
    // Update state
    this.setState('terrain.generation.queueLength', this.generationQueue.length);
    
    // Start processing queue
    if (!this.isGenerating) {
      this.processNextChunk();
    }
    
    // Emit terrain generation started event
    this.emit('terrain:generationStarted', {
      chunksX,
      chunksY,
      queueLength: this.generationQueue.length
    });
  }

  /**
   * Generate height map for a specific chunk
   * 
   * @param {number} startX - The start X coordinate
   * @param {number} endX - The end X coordinate
   * @returns {Array} - The height map
   */
  generateHeightMapForChunk(startX, endX) {
    const heightMap = [];
    
    // Ensure biome map exists
    if (!this.biomeMap) {
      this.biomeMap = this.generateBiomeMap(this.noiseGen);
    }
    
    // Base terrain height set to sea-level row so we guarantee skyPixels of free space.
    const baseHeight = this.seaLevelRow;
    
    // Mountain height variation
    const mountainHeight = this.rows * 0.25;
    
    // Valley depth variation
    const valleyDepth = this.rows * 0.1;
    
    for (let x = startX; x < endX; x++) {
      // Get the biome for this column
      const biome = this.biomeMap[x] || this.BIOMES.PLAINS; // Default to PLAINS if biome is undefined
      
      // Use multiple octaves of noise for natural-looking terrain
      const nx = x / this.cols;
      
      // Confine tall mountains to the left/right edges only.
      const edgeDistance = Math.min(x, this.cols - 1 - x);
      const edgeThreshold = this.cols * 0.25; // 25 % of world width from each edge
      const edgeFactor = Math.max(0, 1 - edgeDistance / edgeThreshold); // 1 near edges, 0 in centre

      const largeFeature = this.noiseGen(nx * 2, 0.5) * mountainHeight * biome.heightScale * edgeFactor;
      
      // Medium terrain features (hills)
      const mediumFeature = this.noiseGen(nx * 5, 0.7) * valleyDepth * biome.heightScale;
      
      // Small terrain features (details)
      const smallFeature = this.noiseGen(nx * 20, 0.9) * (this.rows * 0.05) * biome.heightScale;
      
      // Combine features with different weights
      const height = Math.floor(
        baseHeight + 
        largeFeature * 1.0 + 
        mediumFeature * 0.5 + 
        smallFeature * 0.2
      );
      
      // Clamp so we always keep at least 1000 px (50 tiles) of depth
      const minRow = 0; // peaks can be up into the sky
      const maxRow = this.rows - this.minDepthTiles;
      const clamped = Math.max(Math.min(height, maxRow), minRow);
      heightMap[x - startX] = clamped;
    }
    
    return heightMap;
  }

  /**
   * Generate cave map for a specific chunk
   * 
   * @param {number} startX - The start X coordinate
   * @param {number} endX - The end X coordinate
   * @param {number} startY - The start Y coordinate
   * @param {number} endY - The end Y coordinate
   * @returns {Array} - The cave map
   */
  generateCaveMapForChunk(startX, endX, startY, endY) {
    const caveMap = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
    
    // Ensure biome map exists
    if (!this.biomeMap) {
      this.biomeMap = this.generateBiomeMap(this.noiseGen);
    }
    
    for (let y = Math.max(20, startY); y < Math.min(endY, this.rows - 10); y++) {
      for (let x = startX; x < endX; x++) {
        // Get the biome for this column
        const biome = this.biomeMap[x] || this.BIOMES.PLAINS; // Default to PLAINS if biome is undefined
        
        // Cave frequency/size parameters adjusted by biome
        const caveFrequency = biome.caveFrequency;
        // Increase threshold so fewer cells qualify as caves (reduces total caves)
        const caveDensity = 0.7;
        
        // 3D Perlin noise for caves
        const nx = x * caveFrequency;
        const ny = y * caveFrequency;
        
        // Use noise value for cave determination
        const value = this.noiseGen(nx, ny + 500); // Offset to make different from heightmap
        
        // Determine if this cell should be hollow (cave). Higher caveDensity => fewer caves
        caveMap[y][x] = value > caveDensity;
      }
    }
    
    return caveMap;
  }

  /**
   * Generate ore map for a specific chunk
   * 
   * @param {number} startX - The start X coordinate
   * @param {number} endX - The end X coordinate
   * @param {number} startY - The start Y coordinate
   * @param {number} endY - The end Y coordinate
   * @returns {Array} - The ore map
   */
  generateOreMapForChunk(startX, endX, startY, endY) {
    const oreMap = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
    
    // Ensure biome map exists
    if (!this.biomeMap) {
      this.biomeMap = this.generateBiomeMap(this.noiseGen);
    }
    
    for (let y = Math.max(40, startY); y < Math.min(endY, this.rows - 5); y++) {
      for (let x = startX; x < endX; x++) {
        // Get the biome for this column
        const biome = this.biomeMap[x] || this.BIOMES.PLAINS; // Default to PLAINS if biome is undefined
        
        // Ore vein parameters
        const oreFrequency = 0.1;
        const oreDensity = biome.oreDensity; // Biome-specific ore density
        
        // Generate ore veins with different noise scale
        const nx = x * oreFrequency;
        const ny = y * oreFrequency;
        
        // More ore as depth increases
        const depthBonus = (y / this.rows) * 0.1;
        const value = this.noiseGen(nx, ny + 1000); // Offset to make different from caves
        
        // Adjust threshold based on depth and biome
        oreMap[y][x] = value > (oreDensity - depthBonus);
      }
    }
    
    return oreMap;
  }

  /**
   * render() now only responsible for queuing new chunks; drawing handled by chunkGraphics
   */
  render() {
    // Only ensure visible chunks are generated; drawing done once per chunk.
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

    // Calculate visible area
    const camera = this.scene.cameras.main;
    const visibleLeft = Math.floor(camera.scrollX / this.tileSize) - 1;
    const visibleRight = Math.ceil((camera.scrollX + camera.width) / this.tileSize) + 1;
    const visibleTop = Math.floor(camera.scrollY / this.tileSize) - 1;
    const visibleBottom = Math.ceil((camera.scrollY + camera.height) / this.tileSize) + 1;

    const startCol = Math.max(0, visibleLeft);
    const endCol = Math.min(this.cols - 1, visibleRight);
    const startRow = Math.max(0, visibleTop);
    const endRow = Math.min(this.rows - 1, visibleBottom);

    const startChunkX = Math.floor(startCol / this.chunkSize);
    const endChunkX = Math.ceil(endCol / this.chunkSize);
    const startChunkY = Math.floor(startRow / this.chunkSize);
    const endChunkY = Math.ceil(endRow / this.chunkSize);

    for (let cy = startChunkY; cy < endChunkY; cy++) {
      for (let cx = startChunkX; cx < endChunkX; cx++) {
        const chunkKey = `${cx},${cy}`;
        if (!this.generatedChunks.has(chunkKey)) {
          this.generationQueue.push({ x: cx, y: cy });
          this.generatedChunks.add(chunkKey);
        }
      }
    }

    if (!this.isGenerating && this.generationQueue.length > 0) {
      this.processNextChunk();
    }

    // Update state with visible area
    this.setState('terrain.visibleChunks', {
      startChunkX,
      endChunkX,
      startChunkY,
      endChunkY,
      visibleLeft,
      visibleRight,
      visibleTop,
      visibleBottom
    });
  }
  
  /**
   * Damages terrain in a circle
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Radius in pixels
   * @param {number} strength - Damage strength (1-10)
   */
  damageCircle(x, y, radius = 20, strength = 5) {
    // Create explosion effect
    this.createExplosion(x, y, radius, strength);
    
    // Emit terrain damaged event
    this.emit('terrain:damaged', {
      x,
      y,
      radius,
      strength
    });
  }
  
  /**
   * Creates an explosion effect that damages terrain
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Radius in pixels
   * @param {number} strength - Explosion strength (1-10)
   */
  createExplosion(x, y, radius, strength) {
    // Implementation details based on the original TerrainManager
    // ...
    
    // Emit explosion created event
    this.emit('effect:explosion', {
      x,
      y,
      radius,
      strength
    });
  }
  
  /**
   * Checks for collision at a specific coordinate
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} - Whether there's a collision
   */
  checkCollision(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    
    // Check bounds
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return true; // World boundary collision
    }
    
    return this.tiles[row][col].solid;
  }
  
  /**
   * Gets the resource value at a specific coordinate
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} - Resource value (0-10)
   */
  getResourceValueAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    
    // Check bounds
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return 0;
    }
    
    // Apply planet-specific resource multiplier
    return this.tiles[row][col].resourceValue * this.resourceMultiplier;
  }
  
  /**
   * Gets the biome at a specific coordinate
   * 
   * @param {number} x - X coordinate
   * @returns {object} - Biome object
   */
  getBiomeAt(x) {
    // Ensure biome map exists
    if (!this.biomeMap) return this.BIOMES.PLAINS;
    
    const col = Math.floor(x / this.tileSize);
    
    // Check bounds
    if (col < 0 || col >= this.cols) {
      return this.BIOMES.PLAINS;
    }
    
    return this.biomeMap[col] || this.BIOMES.PLAINS;
  }
  
  /**
   * Gets the tile at a specific coordinate
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {object} - Tile object
   */
  getTileAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    
    // Check bounds
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return { ...this.MATERIALS.AIR };
    }
    
    return this.tiles[row][col];
  }
  
  /**
   * Refreshes dirty chunks
   */
  refreshDirtyChunks() {
    if (this.dirtyChunks.size === 0) return;
    
    for (const chunkKey of this.dirtyChunks) {
      const [chunkX, chunkY] = chunkKey.split(',').map(Number);
      this.redrawChunkGraphics(chunkX, chunkY);
    }
    
    this.dirtyChunks.clear();
  }
  
  /**
   * Marks a chunk as dirty by tile coordinates
   * 
   * @param {number} col - Tile column
   * @param {number} row - Tile row
   */
  markChunkDirtyByTile(col, row) {
    const chunkX = Math.floor(col / this.chunkSize);
    const chunkY = Math.floor(row / this.chunkSize);
    const chunkKey = `${chunkX},${chunkY}`;
    
    this.dirtyChunks.add(chunkKey);
  }
  
  /**
   * Gets world width
   * 
   * @returns {number} - World width in pixels
   */
  getWorldWidth() {
    return this.width;
  }
  
  /**
   * Gets world height
   * 
   * @returns {number} - World height in pixels
   */
  getWorldHeight() {
    return this.height;
  }
  
  /**
   * Gets tile size
   * 
   * @returns {number} - Tile size in pixels
   */
  getTileSize() {
    return this.tileSize;
  }
} 