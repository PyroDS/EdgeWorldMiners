export class TerrainManager {
  constructor(scene, width, height, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize);
    this.rows = Math.floor(height / tileSize);
    this.tiles = [];

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-1);

    this.TILE_TYPES = {
      AIR: { solid: false, shiftable: false, color: 0x000000, name: "air" },
      DIRT: { solid: true, shiftable: true, color: 0x8B4513, name: "dirt" },
      ROCK: { solid: true, shiftable: false, color: 0x555555, name: "rock" },
      SAND: { solid: true, shiftable: true, color: 0xD2B48C, name: "sand" }
    };

    this.generateTerrain();
    this.render();
  }

  generateTerrain() {
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.cols; x++) {
        let type;
        
        // Create varied terrain height across the horizontal world
        const surfaceHeight = 30 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.005) * 10;
        const sandDepth = 10;
        const dirtDepth = 20;
        
        if (y < surfaceHeight) {
          type = this.TILE_TYPES.AIR;
        } else if (y < surfaceHeight + sandDepth) {
          type = this.TILE_TYPES.SAND;
        } else if (y < surfaceHeight + sandDepth + dirtDepth) {
          type = this.TILE_TYPES.DIRT;
        } else {
          type = this.TILE_TYPES.ROCK;
        }
        
        this.tiles[y][x] = { ...type };
      }
    }
  }

  render() {
    this.graphics.clear();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y][x];
        if (tile.name !== "air") {
          this.graphics.fillStyle(tile.color);
          this.graphics.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
  }

  destroyAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    if (this.tiles[row] && this.tiles[row][col]) {
      this.tiles[row][col] = { ...this.TILE_TYPES.AIR };
      this.simulateFalling(col, row - 1);
      this.render();
    }
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
        this.tiles[y][col] = { ...this.TILE_TYPES.AIR };
      }
    }
  }

  canPlaceDrillAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);

    if (!this.tiles[row] || !this.tiles[row][col]) return false;
    const tile = this.tiles[row][col];
    const below = this.tiles[row + 1]?.[col];

    return tile.name === "air" && below?.solid;
  }

  isSolid(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return this.tiles[row]?.[col]?.solid;
  }

  createExplosion(x, y, radius, strength) {
    const centerCol = Math.floor(x / this.tileSize);
    const centerRow = Math.floor(y / this.tileSize);
    
    const gridRadius = Math.ceil(radius / this.tileSize);
    
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
    
    for (let row = centerRow - gridRadius; row <= centerRow + gridRadius; row++) {
      for (let col = centerCol - gridRadius; col <= centerCol + gridRadius; col++) {
        if (!this.tiles[row] || !this.tiles[row][col]) continue;
        
        const dx = col - centerCol;
        const dy = row - centerRow;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= gridRadius) {
          const tile = this.tiles[row][col];
          
          const destroyChance = (1 - distance / gridRadius) * strength * 
                              (tile.name === "rock" ? 0.3 : 
                               tile.name === "dirt" ? 0.7 : 
                               tile.name === "sand" ? 0.9 : 0);
          
          if (tile.solid && Math.random() < destroyChance) {
            this.tiles[row][col] = { ...this.TILE_TYPES.AIR };
            
            const particleCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < particleCount; i++) {
              const px = col * this.tileSize + this.tileSize / 2;
              const py = row * this.tileSize + this.tileSize / 2;
              this.createDestructionParticle(px, py, tile.color);
            }
          }
        }
      }
    }
    
    for (let col = centerCol - gridRadius; col <= centerCol + gridRadius; col++) {
      for (let row = centerRow + gridRadius; row >= centerRow - gridRadius; row--) {
        if (this.tiles[row]?.[col]) {
          this.simulateFalling(col, row);
        }
      }
    }
    
    this.render();
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

  // Returns the pixel Y position (top edge) of the first solid tile beneath the given x coordinate.
  // If no solid tile is found it returns null.
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
}
