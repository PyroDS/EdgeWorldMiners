import { createNoise2D } from 'simplex-noise';

export class TerrainManager {
  constructor(scene, config = {}) {
    this.scene = scene;
    
    // --- World dimension constraints ---
    const minSkyPixels = 800;   // must have at least 800 px of sky above sea-level
    const minDepthPixels = 1000; // must have at least 1000 px of world below sea-level

    const minWorldHeight = minSkyPixels + minDepthPixels; // 1800 px

    const minWidth = 1024;
    const requestedHeight = config.height || 1800;
    this.width = Math.max(config.width || 2048, minWidth);
    this.height = Math.max(requestedHeight, minWorldHeight);

    // Sea level row (tile index)
    this.tileSize = config.tileSize || 20;
    this.seaLevelRow = Math.floor(minSkyPixels / this.tileSize); // e.g. 800/20 = 40
    
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
  }

  // Initialize an empty world with just air and bedrock
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
  }

  // Generate terrain in chunks around a given position
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
        }
      }
    }
    
    // Start processing queue if not already running
    if (!this.isGenerating) {
      this.processNextChunk();
    }
  }
  
  // Process the next chunk in the queue
  processNextChunk() {
    if (this.generationQueue.length === 0) {
      this.isGenerating = false;
      return;
    }
    
    this.isGenerating = true;
    const chunk = this.generationQueue.shift();
    
    // Guard against invalid chunk coordinates
    if (chunk.x < 0 || chunk.y < 0) {
      // Skip and process next
      this.processNextChunk();
      return;
    }
    
    // Generate this chunk
    this.generateChunk(chunk.x, chunk.y);
    
    // Schedule the next chunk with a small delay to avoid freezing
    this.scene.time.delayedCall(10, () => {
      this.processNextChunk();
    });
  }
  
  // Generate a single terrain chunk
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
    this.scene.events.emit('chunk-generated', { x: chunkX, y: chunkY });
  }

  // Generate full terrain (for backward compatibility)
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
    
    // Start processing queue
    if (!this.isGenerating) {
      this.processNextChunk();
    }
  }

  // Generate height map for a specific chunk
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

  // Generate cave map for a specific chunk
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

  // Generate ore map for a specific chunk
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

  // Render a specific chunk
  renderChunk(chunkX, chunkY) {}

  // render() now only responsible for queuing new chunks; drawing handled by chunkGraphics
  render() {
    // Only ensure visible chunks are generated; drawing done once per chunk.

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

    // Rebuild any chunks marked dirty this frame
    this.refreshDirtyChunks();
  }

  defineMaterials() {
    this.MATERIALS = {
      AIR: { 
        solid: false, 
        shiftable: false, 
        mineable: false,
        hardness: 0, 
        color: 0x000000, 
        name: "air",
        damageResistance: 0,
        resourceValue: 0
      },
      SAND: { 
        solid: true, 
        shiftable: true, 
        mineable: true, 
        hardness: 1, 
        color: 0xD2B48C, 
        name: "sand",
        damageResistance: 0.1,
        resourceValue: 1
      },
      DIRT: { 
        solid: true, 
        shiftable: true, 
        mineable: true, 
        hardness: 2, 
        color: 0x8B4513, 
        name: "dirt",
        damageResistance: 0.3,
        resourceValue: 2
      },
      ROCK: { 
        solid: true, 
        shiftable: false, 
        mineable: true, 
        hardness: 5, 
        color: 0x555555, 
        name: "rock",
        damageResistance: 0.6,
        resourceValue: 3
      },
      HARD_ROCK: { 
        solid: true, 
        shiftable: false, 
        mineable: true, 
        hardness: 8, 
        color: 0x333333, 
        name: "hard_rock",
        damageResistance: 0.8,
        resourceValue: 4
      },
      METAL_ORE: { 
        solid: true, 
        shiftable: false, 
        mineable: true, 
        hardness: 10, 
        color: 0x7a7a8c, 
        name: "metal_ore",
        damageResistance: 0.7,
        resourceValue: 6
      },
      BEDROCK: { 
        solid: true, 
        shiftable: false, 
        mineable: false, 
        hardness: 100, 
        color: 0x111111, 
        name: "bedrock",
        damageResistance: 0.95,
        resourceValue: 0.25
      },
      // New material types for biomes
      RED_SAND: {
        solid: true,
        shiftable: true,
        mineable: true,
        hardness: 1,
        color: 0xC35B34, // Reddish sand color
        name: "red_sand",
        damageResistance: 0.1,
        resourceValue: 1
      },
      CLAY: {
        solid: true,
        shiftable: true,
        mineable: true,
        hardness: 3,
        color: 0x9C5A3C, // Clay color
        name: "clay",
        damageResistance: 0.4,
        resourceValue: 2
      },
      GRAVEL: {
        solid: true,
        shiftable: true,
        mineable: true,
        hardness: 2,
        color: 0x777777, // Gravel color
        name: "gravel",
        damageResistance: 0.2,
        resourceValue: 1.5
      },
      CRYSTAL: {
        solid: true,
        shiftable: false,
        mineable: true,
        hardness: 15,
        color: 0x88CCFF, // Crystal blue color
        name: "crystal",
        damageResistance: 0.8,
        resourceValue: 8
      }
    };
  }

  defineBiomes() {
    this.BIOMES = {
      PLAINS: {
        name: "plains",
        surfaceMaterial: this.MATERIALS.DIRT,
        subSurfaceMaterial: this.MATERIALS.ROCK,
        deepMaterial: this.MATERIALS.HARD_ROCK,
        oreMaterial: this.MATERIALS.METAL_ORE,
        surfaceDepth: 5,
        subSurfaceDepth: 30,
        heightScale: 1.0,
        caveFrequency: 0.05,
        oreDensity: 0.78
      },
      DESERT: {
        name: "desert",
        surfaceMaterial: this.MATERIALS.SAND,
        subSurfaceMaterial: this.MATERIALS.ROCK,
        deepMaterial: this.MATERIALS.HARD_ROCK,
        oreMaterial: this.MATERIALS.METAL_ORE,
        surfaceDepth: 10,
        subSurfaceDepth: 20,
        heightScale: 0.7, // Flatter terrain
        caveFrequency: 0.03, // Fewer caves
        oreDensity: 0.82 // Less ore
      },
      MOUNTAINS: {
        name: "mountains",
        surfaceMaterial: this.MATERIALS.ROCK,
        subSurfaceMaterial: this.MATERIALS.HARD_ROCK,
        deepMaterial: this.MATERIALS.HARD_ROCK,
        oreMaterial: this.MATERIALS.METAL_ORE,
        surfaceDepth: 3,
        subSurfaceDepth: 40,
        heightScale: 1.5, // Taller terrain
        caveFrequency: 0.07, // More caves
        oreDensity: 0.75 // More ore
      },
      BADLANDS: {
        name: "badlands",
        surfaceMaterial: this.MATERIALS.RED_SAND,
        subSurfaceMaterial: this.MATERIALS.CLAY,
        deepMaterial: this.MATERIALS.HARD_ROCK,
        oreMaterial: this.MATERIALS.METAL_ORE,
        surfaceDepth: 8,
        subSurfaceDepth: 25,
        heightScale: 1.2,
        caveFrequency: 0.04,
        oreDensity: 0.76
      },
      CRYSTAL_CAVES: {
        name: "crystal_caves",
        surfaceMaterial: this.MATERIALS.GRAVEL,
        subSurfaceMaterial: this.MATERIALS.ROCK,
        deepMaterial: this.MATERIALS.HARD_ROCK,
        oreMaterial: this.MATERIALS.CRYSTAL,
        surfaceDepth: 4,
        subSurfaceDepth: 35,
        heightScale: 0.9,
        caveFrequency: 0.09, // Many caves
        oreDensity: 0.72 // Lots of crystal ore
      }
    };
  }

  initializeGenerationLayers() {
    this.generationLayers = [
      // Each "layer" is an object with a `getMaterial` method.
      // They are processed in order. The first one to return a material "wins".
      
      // Layer 1: Sky (anything above ground)
      {
        getMaterial: (x, y, context) => {
          if (y < context.surfaceHeight - 2) {
            return this.MATERIALS.AIR;
          }
          return null;
        }
      },
      
      // Layer 2: Bedrock (bottom of the world)
      {
        getMaterial: (x, y, context) => {
          if (y === this.rows - 1) {
            return this.MATERIALS.BEDROCK;
          }
          return null;
        }
      },
      
      // Layer 3: Caves
      {
        getMaterial: (x, y, context) => {
          if (context.caveMap[y]?.[x] && y > context.surfaceHeight + this.minSolidSurfaceLayers) {
            return this.MATERIALS.AIR;
          }
          return null;
        }
      },
      
      // Layer 4: Surface (biome-specific)
      {
        getMaterial: (x, y, context) => {
          const biome = context.biomeMap[x];
          const surfaceHeight = context.surfaceHeight;
          
          if (y < surfaceHeight + biome.surfaceDepth) {
            return biome.surfaceMaterial;
          }
          return null;
        }
      },
      
      // Layer 5: Sub-surface (biome-specific)
      {
        getMaterial: (x, y, context) => {
          const biome = context.biomeMap[x];
          const surfaceHeight = context.surfaceHeight;
          
          if (y < surfaceHeight + biome.surfaceDepth + biome.subSurfaceDepth) {
            return biome.subSurfaceMaterial;
          }
          return null;
        }
      },
      
      // Layer 6: Ore Veins (biome-specific)
      {
        getMaterial: (x, y, context) => {
          if (context.oreMap[y]?.[x]) {
            const biome = context.biomeMap[x];
            return biome.oreMaterial;
          }
          return null;
        }
      },
      
      // Layer 7: Deep Material (biome-specific)
      {
        getMaterial: (x, y, context) => {
          const biome = context.biomeMap[x];
          return biome.deepMaterial;
        }
      }
    ];
  }

  generateBiomeMap(noiseGen) {
    const biomeMap = [];
    
    // Biome noise scale
    const biomeScale = 0.001;
    
    // List of available biomes
    const biomeTypes = Object.values(this.BIOMES);
    
    for (let x = 0; x < this.cols; x++) {
      // Use noise to determine biome
      const nx = x * biomeScale;
      const biomeNoise = noiseGen(nx, 0.5);
      
      // Map noise value (-1 to 1) to biome index
      const normalizedNoise = (biomeNoise + 1) / 2; // 0 to 1
      const biomeIndex = Math.floor(normalizedNoise * biomeTypes.length);
      const clampedIndex = Math.min(biomeIndex, biomeTypes.length - 1);
      
      // Store the biome object
      biomeMap[x] = biomeTypes[clampedIndex];
    }
    
    // Smooth biome transitions
    this.smoothBiomeMap(biomeMap);
    
    return biomeMap;
  }

  smoothBiomeMap(biomeMap) {
    // Simple smoothing to avoid single-column biomes
    const minBiomeWidth = 20; // Minimum width for a biome in tiles
    
    let currentBiome = biomeMap[0];
    let currentWidth = 1;
    
    for (let x = 1; x < this.cols; x++) {
      if (biomeMap[x] !== currentBiome) {
        // Potential biome change
        if (currentWidth < minBiomeWidth) {
          // Too narrow, keep the previous biome
          biomeMap[x] = currentBiome;
          currentWidth++;
        } else {
          // Wide enough, accept the new biome
          currentBiome = biomeMap[x];
          currentWidth = 1;
        }
      } else {
        currentWidth++;
      }
    }
  }

  createSky() {
    // Create the sky background with gradient
    const { width, height } = this.scene.sys.game.config;
    
    // First, draw underground background (below sea-level)
    const worldWidth = this.width;
    const worldHeight = this.height;
    const seaLevelY = this.seaLevelRow * this.tileSize;

    // Fill underground area with dark color
    this.sky.fillStyle(0x0b1d30, 1); // deep underground blue/green tint
    this.sky.fillRect(0, seaLevelY, worldWidth, worldHeight - seaLevelY);

    // Now draw sky gradient above sea-level
    const gradientHeight = seaLevelY; // gradient spans exactly to sea level
    
    for (let y = 0; y < gradientHeight; y += 2) {
      const ratio = y / gradientHeight;
      
      // Interpolate between colors
      let color;
      if (ratio < 0.5) {
        // Top half: blend from top to middle color
        const blend = ratio * 2; // 0 to 1 within this range
        color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(this.skyConfig.gradientTop),
          Phaser.Display.Color.ValueToColor(this.skyConfig.gradientMiddle),
          100,
          Math.floor(blend * 100)
        );
      } else {
        // Bottom half: blend from middle to bottom color
        const blend = (ratio - 0.5) * 2; // 0 to 1 within this range
        color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(this.skyConfig.gradientMiddle),
          Phaser.Display.Color.ValueToColor(this.skyConfig.gradientBottom),
          100,
          Math.floor(blend * 100)
        );
      }
      
      // Draw a horizontal line of this color
      this.sky.lineStyle(2, color.color, 1);
      this.sky.beginPath();
      this.sky.moveTo(0, y);
      this.sky.lineTo(worldWidth, y);
      this.sky.strokePath();
    }
  }

  // Disabled cloud generator for performance
  createClouds() {}

  updateClouds() {
    // no-op (clouds disabled)
  }

  drawChunkGraphics(chunkX, chunkY, startX, startY, endX, endY) {
    const g = this.scene.add.graphics({
      x: startX * this.tileSize,
      y: startY * this.tileSize
    });
    g.setDepth(-2);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tiles[y][x];
        if (!tile || tile.name === "air") continue;
        const localX = (x - startX) * this.tileSize;
        const localY = (y - startY) * this.tileSize;
        g.fillStyle(tile.color, 1);
        g.fillRect(localX, localY, this.tileSize, this.tileSize);
      }
    }

    const key = this.getChunkKey(chunkX, chunkY);
    const prev = this.chunkGraphics.get(key);
    if (prev) {
      prev.destroy();
      this.chunkGraphics.delete(key);
    }

    this.chunkGraphics.set(key, g);
  }

  renderTileEdges(x, y, px, py) {
    // Add subtle shading on edges for 3D effect
    const tileAbove = this.tiles[y-1]?.[x]?.name === "air";
    const tileLeft = this.tiles[y]?.[x-1]?.name === "air";
    const tileBelow = this.tiles[y+1]?.[x]?.name === "air";
    const tileRight = this.tiles[y]?.[x+1]?.name === "air";
    
    if (tileAbove) {
      // Top edge highlight
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillRect(px, py, this.tileSize, 2);
    }
    
    if (tileLeft) {
      // Left edge highlight
      this.graphics.fillStyle(0xffffff, 0.1);
      this.graphics.fillRect(px, py, 2, this.tileSize);
    }
    
    if (tileBelow) {
      // Bottom edge shadow
      this.graphics.fillStyle(0x000000, 0.3);
      this.graphics.fillRect(px, py + this.tileSize - 2, this.tileSize, 2);
    }
    
    if (tileRight) {
      // Right edge shadow
      this.graphics.fillStyle(0x000000, 0.2);
      this.graphics.fillRect(px + this.tileSize - 2, py, 2, this.tileSize);
    }
  }

  renderSandTexture(px, py) {
    // Draw small dots for sand texture
    this.graphics.fillStyle(0xc0a080, 0.1);
    for (let i = 0; i < 4; i++) {
      const dotX = px + 2 + Math.random() * (this.tileSize - 4);
      const dotY = py + 2 + Math.random() * (this.tileSize - 4);
      const dotSize = 1 + Math.random();
      this.graphics.fillCircle(dotX, dotY, dotSize);
    }
  }

  renderDirtTexture(px, py) {
    // Draw tiny marks for dirt texture
    this.graphics.fillStyle(0x593d29, 0.2);
    for (let i = 0; i < 3; i++) {
      const lineX = px + 3 + Math.random() * (this.tileSize - 6);
      const lineY = py + 3 + Math.random() * (this.tileSize - 6);
      const lineLength = 2 + Math.random() * 3;
      this.graphics.fillRect(lineX, lineY, lineLength, 1);
    }
  }

  renderRockTexture(px, py, isHardRock) {
    // Draw lines for rock cracks
    const opacity = isHardRock ? 0.3 : 0.2;
    this.graphics.lineStyle(1, 0x000000, opacity);
    
    const lines = isHardRock ? 2 : 1;
    for (let i = 0; i < lines; i++) {
      const startX = px + 3 + Math.random() * (this.tileSize - 6);
      const startY = py + 3 + Math.random() * (this.tileSize - 6);
      const endX = startX + (-3 + Math.random() * 6);
      const endY = startY + (-3 + Math.random() * 6);
      
      this.graphics.beginPath();
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(endX, endY);
      this.graphics.strokePath();
    }
  }

  renderMetalTexture(px, py) {
    // Draw metallic flecks
    for (let i = 0; i < 3; i++) {
      const fleckX = px + 3 + Math.random() * (this.tileSize - 6);
      const fleckY = py + 3 + Math.random() * (this.tileSize - 6);
      const size = 1 + Math.random() * 2;
      
      // Shiny metal flecks
      this.graphics.fillStyle(0xc0c0d0, 0.5);
      this.graphics.fillRect(fleckX, fleckY, size, size);
    }
  }

  renderBedrockTexture(px, py) {
    // Draw darker spots for bedrock texture
    this.graphics.fillStyle(0x000000, 0.3);
    for (let i = 0; i < 4; i++) {
      const spotX = px + Math.random() * this.tileSize;
      const spotY = py + Math.random() * this.tileSize;
      const spotSize = 1 + Math.random() * 3;
      this.graphics.fillCircle(spotX, spotY, spotSize);
    }
  }

  renderClayTexture(px, py) {
    // Draw smooth clay texture with subtle cracks
    this.graphics.fillStyle(0x8B4513, 0.1);
    for (let i = 0; i < 2; i++) {
      const startX = px + 3 + Math.random() * (this.tileSize - 6);
      const startY = py + 3 + Math.random() * (this.tileSize - 6);
      const endX = startX + (-2 + Math.random() * 4);
      const endY = startY + (-2 + Math.random() * 4);
      
      this.graphics.beginPath();
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(endX, endY);
      this.graphics.strokePath();
    }
  }
  
  renderGravelTexture(px, py) {
    // Draw small stones for gravel
    this.graphics.fillStyle(0x666666, 0.3);
    for (let i = 0; i < 5; i++) {
      const stoneX = px + 2 + Math.random() * (this.tileSize - 4);
      const stoneY = py + 2 + Math.random() * (this.tileSize - 4);
      const stoneSize = 1 + Math.random() * 2;
      this.graphics.fillCircle(stoneX, stoneY, stoneSize);
    }
  }
  
  renderCrystalTexture(px, py) {
    // Draw crystal facets
    const centerX = px + this.tileSize / 2;
    const centerY = py + this.tileSize / 2;
    
    // Draw crystal highlights
    this.graphics.fillStyle(0xFFFFFF, 0.4);
    
    // Draw a few random highlights
    for (let i = 0; i < 2; i++) {
      const highlightX = centerX + (-3 + Math.random() * 6);
      const highlightY = centerY + (-3 + Math.random() * 6);
      const size = 1 + Math.random();
      this.graphics.fillCircle(highlightX, highlightY, size);
    }
    
    // Draw crystal edges
    this.graphics.lineStyle(1, 0xFFFFFF, 0.3);
    const points = [];
    for (let i = 0; i < 3; i++) {
      points.push({
        x: centerX + (-5 + Math.random() * 10),
        y: centerY + (-5 + Math.random() * 10)
      });
    }
    
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.lineTo(points[0].x, points[0].y);
    this.graphics.strokePath();
  }

  destroyAt(x, y, miningPower = 1) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    
    if (!this.tiles[row] || !this.tiles[row][col]) return false;
    
    const tile = this.tiles[row][col];
    if (tile.name === "air") return false;
    
    // Skip if tile is not mineable
    if (!tile.mineable) return false;
    
    // Apply damage to hardness based on mining power
    tile.hardness -= miningPower;
    
    // If hardness drops to 0 or below, destroy the tile
    if (tile.hardness <= 0) {
      // Create destruction particles
      this.createDestructionEffect(col, row, tile);
      
      // Replace with air
      this.tiles[row][col] = { ...this.MATERIALS.AIR };
      this.markChunkDirtyByTile(col, row);
      
      // Simulate physics for blocks above
      this.simulateFalling(col, row - 1);
      
      return true;
    }
    
    // Block was damaged but not destroyed
    this.render();
    return false;
  }

  createDestructionEffect(col, row, tile) {
    const x = col * this.tileSize + this.tileSize / 2;
    const y = row * this.tileSize + this.tileSize / 2;
    
    // Number of particles based on material type
    const particleCount = Math.min(
      3 + Math.floor(Math.random() * 4), 
      tile.hardness * 1.5
    );
    
    for (let i = 0; i < particleCount; i++) {
      this.createDestructionParticle(x, y, tile.color);
    }
    
    // Add light flash effect
    const flash = this.scene.add.circle(x, y, this.tileSize * 1.2, 0xffffff, 0.4);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.5,
      duration: 150,
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  createDestructionParticle(x, y, color) {
    const particle = this.scene.add.circle(x, y, 3, color);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    this.scene.tweens.add({
      targets: particle,
      x: x + vx * 20,
      y: y + vy * 20,
      alpha: 0,
      duration: 300 + Math.random() * 200,
      onComplete: () => {
        particle.destroy();
      }
    });
  }

  createExplosion(x, y, radius, strength) {
    const centerCol = Math.floor(x / this.tileSize);
    const centerRow = Math.floor(y / this.tileSize);
    
    const gridRadius = Math.ceil(radius / this.tileSize);
    
    // Visual explosion effect
    const explosion = this.scene.add.circle(x, y, radius, 0xffaa00, 0.7);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Damage blocks based on distance from center
    for (let row = centerRow - gridRadius; row <= centerRow + gridRadius; row++) {
      for (let col = centerCol - gridRadius; col <= centerCol + gridRadius; col++) {
        if (!this.tiles[row] || !this.tiles[row][col]) continue;
        
        const dx = col - centerCol;
        const dy = row - centerRow;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= gridRadius) {
          const tile = this.tiles[row][col];
          if (!tile.solid) continue;
          
          // Calculate destruction probability based on:
          // 1. Distance from explosion center
          // 2. Explosion strength
          // 3. Material's damage resistance
          const distanceFactor = 1 - (distance / gridRadius);
          const destroyChance = distanceFactor * strength * (1 - tile.damageResistance);
          
          if (Math.random() < destroyChance) {
            // Create particles
            const particleCount = Math.floor(Math.random() * 3) + 2;
            const px = col * this.tileSize + this.tileSize / 2;
            const py = row * this.tileSize + this.tileSize / 2;
            
            for (let i = 0; i < particleCount; i++) {
              this.createDestructionParticle(px, py, tile.color);
            }
            
            // Replace with air
            this.tiles[row][col] = { ...this.MATERIALS.AIR };
            this.markChunkDirtyByTile(col, row);
          }
        }
      }
    }
    
    // Simulate falling blocks
    for (let col = centerCol - gridRadius; col <= centerCol + gridRadius; col++) {
      for (let row = centerRow + gridRadius; row >= centerRow - gridRadius; row--) {
        if (this.tiles[row]?.[col]) {
          this.simulateFalling(col, row);
        }
      }
    }
    
    this.render();
  }

  simulateFalling(col, row) {
    for (let y = row; y >= 0; y--) {
      const tile = this.tiles[y]?.[col];
      if (!tile || !tile.shiftable) continue;

      let fallTo = y;
      while (fallTo + 1 < this.rows && this.tiles[fallTo + 1][col].name === "air") {
        fallTo++;
      }

      if (fallTo !== y) {
        this.tiles[fallTo][col] = tile;
        this.tiles[y][col] = { ...this.MATERIALS.AIR };
        this.markChunkDirtyByTile(col, y);
        this.markChunkDirtyByTile(col, fallTo);
      }
    }
  }

  // --- Helper methods for gameplay and mineral extraction ---

  isSolid(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return this.tiles[row]?.[col]?.solid;
  }

  canPlaceDrillAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);

    if (!this.tiles[row] || !this.tiles[row][col]) return false;
    const tile = this.tiles[row][col];
    const below = this.tiles[row + 1]?.[col];

    return tile.name === "air" && below?.solid;
  }
  
  getResourceValueAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    
    if (!this.tiles[row] || !this.tiles[row][col]) return 0;
    return this.tiles[row]?.[col]?.resourceValue || 0;
  }

  getSurfaceY(x) {
    const col = Math.floor(x / this.tileSize);
    if (col < 0 || col >= this.cols) return null;

    for (let row = 0; row < this.rows; row++) {
      const tile = this.tiles[row][col];
      if (tile && tile.solid) {
        return row * this.tileSize; // pixel position of the solid tile's top
      }
    }

    return null; // no solid tile in this column
  }

  damageCircle(x, y, radius = 20, strength = 5) {
    this.createExplosion(x, y, radius, strength);
  }

  checkCollision(x, y) {
    return this.isSolid(x, y);
  }
  
  // Get the biome at a specific world coordinate
  getBiomeAt(x) {
    if (!this.biomeMap) return null;
    const col = Math.floor(x / this.tileSize);
    if (col < 0 || col >= this.biomeMap.length) return null;
    return this.biomeMap[col];
  }

  // Get the material properties of a specific tile
  getTileAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }
  
  // Get the material hardness at a specific position
  getHardnessAt(x, y) {
    const tile = this.getTileAt(x, y);
    return tile ? tile.hardness : 0;
  }
  
  // Get the material damage resistance at a specific position
  getDamageResistanceAt(x, y) {
    const tile = this.getTileAt(x, y);
    return tile ? tile.damageResistance : 0;
  }
  
  // Check if a tile is mineable
  isMineableAt(x, y) {
    const tile = this.getTileAt(x, y);
    return tile ? tile.mineable : false;
  }

  // --- Chunk refresh helpers ---
  getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }

  markChunkDirtyByTile(col, row) {
    const chunkX = Math.floor(col / this.chunkSize);
    const chunkY = Math.floor(row / this.chunkSize);
    if (chunkX < 0 || chunkY < 0) return;
    this.dirtyChunks.add(this.getChunkKey(chunkX, chunkY));
  }

  refreshDirtyChunks() {
    if (this.dirtyChunks.size === 0) return;
    for (const key of this.dirtyChunks) {
      const [chunkXStr, chunkYStr] = key.split(',');
      const chunkX = parseInt(chunkXStr, 10);
      const chunkY = parseInt(chunkYStr, 10);
      this.redrawChunkGraphics(chunkX, chunkY);
    }
    this.dirtyChunks.clear();
  }

  redrawChunkGraphics(chunkX, chunkY) {
    const key = this.getChunkKey(chunkX, chunkY);
    const existing = this.chunkGraphics.get(key);
    if (existing) {
      existing.destroy();
      this.chunkGraphics.delete(key);
    }

    const startX = chunkX * this.chunkSize;
    const startY = chunkY * this.chunkSize;
    const endX = Math.min(startX + this.chunkSize, this.cols);
    const endY = Math.min(startY + this.chunkSize, this.rows);

    this.drawChunkGraphics(chunkX, chunkY, startX, startY, endX, endY);
  }
}
