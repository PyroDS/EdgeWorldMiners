export class EnemyManager {
  constructor(scene, terrainManager, drillManager = null, turretManager = null, carrier = null) {
    this.scene = scene;
    this.terrainManager = terrainManager;
    this.drillManager = drillManager;
    this.turretManager = turretManager;
    this.carrier = carrier;
    this.enemies = [];
    
    // Store projectiles fired by shooter-type enemies
    this.projectiles = [];
    
    // Enemy size tiers
    this.ENEMY_TIERS = {
      SMALL: {
        HEALTH: 30,
        SPEED: 70,
        SIZE: 15,
        DAMAGE: 3,
        COLOR: 0xff0000,
      },
      MEDIUM: {
        HEALTH: 60,
        SPEED: 50,
        SIZE: 25,
        DAMAGE: 5,
        COLOR: 0xff3300,
      },
      LARGE: {
        HEALTH: 120,
        SPEED: 35,
        SIZE: 40,
        DAMAGE: 10,
        COLOR: 0xff6600,
      },
      // --- New ranged shooter enemy ---
      SHOOTER: {
        HEALTH: 80,
        SPEED: 60,
        SIZE: 20,
        DAMAGE: 6,
        COLOR: 0x9933ff // purple
      }
    };
    
    // Wave system settings
    this.WAVE_SETTINGS = {
      INITIAL_ENEMIES: 5,
      ENEMIES_INCREMENT: 3,
      BREAK_DURATION: 600, // frames between waves
      SPAWN_INTERVAL: 60, // frames between enemy spawns in a wave
      TERRAIN_DAMAGE_RADIUS: 20,
      TERRAIN_DAMAGE_STRENGTH: 5,
      ATTACK_RANGE: 100,
      ATTACK_COOLDOWN: 60,
      PATROL_DURATION: 180, // frames before changing patrol direction
      PATROL_SPEED_FACTOR: 0.8 // How much of normal speed is used for patrol movement
    };
    
    // Config for shooter enemy projectiles
    this.SHOOTER_CONFIG = {
      PROJECTILE_SPEED: 120,
      PROJECTILE_DAMAGE: 8,
      PROJECTILE_AOE: 5,
      // Shooter accuracy (0-1). Lower accuracy => wider spread
      ACCURACY: 0.75,
      TERRAIN_DAMAGE_STRENGTH: 4,
      ATTACK_RANGE: 500,
      ATTACK_COOLDOWN: 120
    };
    
    this.currentWave = 0;
    this.enemiesLeftToSpawn = 0;
    this.spawnTimer = 0;
    this.waveBreakTimer = 0;
    this.isWaveActive = false;
  }
  
  // Method to set drillManager after initialization (to avoid circular dependencies)
  setDrillManager(drillManager) {
    this.drillManager = drillManager;
  }
  
  // Method to set turretManager
  setTurretManager(turretManager) {
    this.turretManager = turretManager;
  }
  
  // Method to set carrier reference after initialization
  setCarrier(carrier) {
    this.carrier = carrier;
  }
  
  startWave() {
    this.currentWave++;
    this.enemiesLeftToSpawn = this.WAVE_SETTINGS.INITIAL_ENEMIES + 
                             (this.currentWave - 1) * this.WAVE_SETTINGS.ENEMIES_INCREMENT;
    this.isWaveActive = true;
    console.log(`Wave ${this.currentWave} started! Enemies: ${this.enemiesLeftToSpawn}`);
  }
  
  spawnEnemy() {
    if (this.enemiesLeftToSpawn <= 0) return;
    
    // Chance to spawn the new purple shooter enemy
    const shooterChance = Math.min(0.15 + (this.currentWave * 0.02), 0.4);
    if (Math.random() < shooterChance) {
      this.spawnShooterEnemy();
      this.enemiesLeftToSpawn--;
      return;
    }
    
    // Determine enemy tier based on wave and random chance
    let tierChance = Math.random();
    let tierType;
    
    // As waves progress, chance for larger enemies increases
    const largeChance = Math.min(0.2 + (this.currentWave * 0.03), 0.5);
    const mediumChance = Math.min(0.3 + (this.currentWave * 0.04), 0.7);
    
    if (tierChance < largeChance) {
      tierType = 'LARGE';
    } else if (tierChance < mediumChance) {
      tierType = 'MEDIUM';
    } else {
      tierType = 'SMALL';
    }
    
    const tierStats = this.ENEMY_TIERS[tierType];
    
    // Spawn at random position along the top of the world
    const worldWidth = this.scene.cameras.main.getBounds().right;
    const x = 100 + Math.random() * (worldWidth - 200);
    const y = -tierStats.SIZE; // Start just above the visible area
    
    // Create triangle graphics
    const enemyGraphic = this.scene.add.graphics();
    enemyGraphic.fillStyle(tierStats.COLOR, 1);
    
    // Draw triangle pointing downward
    enemyGraphic.beginPath();
    enemyGraphic.moveTo(-tierStats.SIZE/2, -tierStats.SIZE/2);
    enemyGraphic.lineTo(tierStats.SIZE/2, -tierStats.SIZE/2);
    enemyGraphic.lineTo(0, tierStats.SIZE/2);
    enemyGraphic.closePath();
    enemyGraphic.fillPath();
    
    // Convert to sprite
    const texture = `enemy_${tierType}_${Date.now()}`;
    enemyGraphic.generateTexture(texture, tierStats.SIZE, tierStats.SIZE);
    enemyGraphic.destroy();
    
    const sprite = this.scene.add.sprite(x, y, texture);
    this.scene.physics.add.existing(sprite);
    
    // Add to enemies array
    const enemy = {
      sprite: sprite,
      x: x,
      y: y,
      health: tierStats.HEALTH,
      maxHealth: tierStats.HEALTH,
      speed: tierStats.SPEED,
      size: tierStats.SIZE,
      damage: tierStats.DAMAGE,
      tier: tierType,
      target: null,
      targetType: null, // 'drill' or 'turret'
      attackCooldown: 0,
      patrolDirection: Math.random() > 0.5 ? 1 : -1, // Random initial patrol direction
      patrolTimer: Math.floor(Math.random() * this.WAVE_SETTINGS.PATROL_DURATION) // Randomize initial patrol timer
    };
    
    this.enemies.push(enemy);
    this.enemiesLeftToSpawn--;
  }
  
  // Spawn a purple shooter that enters from the left side and flies horizontally
  spawnShooterEnemy() {
    const tierStats = this.ENEMY_TIERS.SHOOTER;

    const side = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
    const hDir = side === 'LEFT' ? 1 : -1; // horizontal movement direction

    const worldBounds = this.scene.cameras.main.getBounds();
    const x = side === 'LEFT' ? worldBounds.x - tierStats.SIZE : worldBounds.right + tierStats.SIZE;
    const y = 50 + Math.random() * 100; // near the top of the world

    // Create simple diamond sprite for shooter
    const g = this.scene.add.graphics();
    g.fillStyle(tierStats.COLOR, 1);
    g.beginPath();
    g.moveTo(0, -tierStats.SIZE / 2);
    g.lineTo(tierStats.SIZE / 2, 0);
    g.lineTo(0, tierStats.SIZE / 2);
    g.lineTo(-tierStats.SIZE / 2, 0);
    g.closePath();
    g.fillPath();
    const textureKey = `enemy_SHOOTER_${Date.now()}`;
    g.generateTexture(textureKey, tierStats.SIZE, tierStats.SIZE);
    g.destroy();

    const sprite = this.scene.add.sprite(x, y, textureKey);
    this.scene.physics.add.existing(sprite);

    const enemy = {
      sprite,
      x,
      y,
      health: tierStats.HEALTH,
      maxHealth: tierStats.HEALTH,
      speed: tierStats.SPEED,
      size: tierStats.SIZE,
      damage: tierStats.DAMAGE,
      tier: 'SHOOTER',
      isShooter: true,
      hDir,
      target: null,
      targetType: null,
      attackCooldown: 0
    };

    this.enemies.push(enemy);
  }
  
  // Fire a slow terrain-destroying projectile from shooter enemy toward target
  spawnShooterProjectile(enemy, targetX, targetY) {
    // Calculate base angle toward target
    const baseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);

    // Compute spread based on shooter accuracy
    const inaccuracy = 1 - (this.SHOOTER_CONFIG.ACCURACY ?? 1);
    const maxSpread = Math.PI / 4; // 45 degrees max spread for shooter
    const spreadRange = inaccuracy * maxSpread;
    const randomOffset = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
    const finalAngle = baseAngle + randomOffset;

    const projectile = this.scene.add.circle(enemy.x, enemy.y, 4, this.ENEMY_TIERS.SHOOTER.COLOR);
    this.scene.physics.add.existing(projectile);
    projectile.body.setVelocity(
      Math.cos(finalAngle) * this.SHOOTER_CONFIG.PROJECTILE_SPEED,
      Math.sin(finalAngle) * this.SHOOTER_CONFIG.PROJECTILE_SPEED
    );
    projectile.body.setGravity(0, 0);

    this.projectiles.push({
      sprite: projectile,
      damage: this.SHOOTER_CONFIG.PROJECTILE_DAMAGE,
      aoeRange: this.SHOOTER_CONFIG.PROJECTILE_AOE
    });
  }
  
  update() {
    // Handle wave system
    if (!this.isWaveActive) {
      this.waveBreakTimer++;
      // Start a new wave after break duration
      if (this.waveBreakTimer >= this.WAVE_SETTINGS.BREAK_DURATION) {
        this.waveBreakTimer = 0;
        this.startWave();
      }
    } else {
      // Spawn enemies at intervals during active wave
      this.spawnTimer++;
      if (this.spawnTimer >= this.WAVE_SETTINGS.SPAWN_INTERVAL && this.enemiesLeftToSpawn > 0) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
      
      // Check if wave is complete
      if (this.enemiesLeftToSpawn <= 0 && this.enemies.length === 0) {
        this.isWaveActive = false;
        console.log(`Wave ${this.currentWave} complete! Break time...`);
      }
    }
    
    // Get targetable drills and turrets
    const drills = this.drillManager ? this.drillManager.getTargetableDrills() : [];
    const turrets = this.turretManager ? this.turretManager.getTurrets() : [];
    
    // Update enemy positions
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // --- Shooter-specific behaviour ---
      if (enemy.isShooter) {
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;

        // Acquire target with priority: Drill > Turret > Carrier
        if (!enemy.target || (
            (enemy.targetType === 'drill' && !enemy.target.isAlive) ||
            (enemy.targetType === 'turret' && !enemy.target.active) ||
            (enemy.targetType === 'carrier' && (!this.carrier || !this.carrier.active)))) {
          const closestDrill = drills.length ? this.findClosestTarget(enemy.x, enemy.y, drills) : null;
          const closestTurret = turrets.length ? this.findClosestTarget(enemy.x, enemy.y, turrets) : null;

          if (closestDrill) {
            enemy.target = closestDrill;
            enemy.targetType = 'drill';
          } else if (closestTurret) {
            enemy.target = closestTurret;
            enemy.targetType = 'turret';
          } else if (this.carrier && this.carrier.active) {
            enemy.target = this.carrier;
            enemy.targetType = 'carrier';
          } else {
            enemy.target = null;
            enemy.targetType = null;
          }
        }

        // Basic horizontal flight based on direction
        enemy.x += enemy.hDir * enemy.speed / 60;

        // Gently adjust vertical position toward target if any
        if (enemy.target) {
          const dy = enemy.target.y - enemy.y;
          enemy.y += Math.sign(dy) * (enemy.speed * 0.3 / 60);

          const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
          if (distance < this.SHOOTER_CONFIG.ATTACK_RANGE && enemy.attackCooldown === 0) {
            this.spawnShooterProjectile(enemy, enemy.target.x, enemy.target.y);
            enemy.attackCooldown = this.SHOOTER_CONFIG.ATTACK_COOLDOWN;
          }
        }

        // Update sprite
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.angle = 0;

        // Remove if it exits world bounds depending on direction
        const bounds = this.scene.cameras.main.getBounds();
        if ((enemy.hDir === 1 && enemy.x > bounds.right + 100) || (enemy.hDir === -1 && enemy.x < bounds.x - 100)) {
          enemy.sprite.destroy();
          this.enemies.splice(i, 1);
        }
        continue; // Skip the default behaviour for shooter enemy
      }
      
      // Decrease attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown--;
      }
      
      // Check if enemy should find a target
      if (!enemy.target || 
          (enemy.targetType === 'drill' && !enemy.target.isAlive) ||
          (enemy.targetType === 'turret' && !enemy.target.active) ||
          (enemy.targetType === 'carrier' && (!this.carrier || !this.carrier.active))) {
        
        // Determine new target based on priority Turret > Drill > Carrier
        const closestTurret = turrets.length > 0 ? this.findClosestTarget(enemy.x, enemy.y, turrets) : null;
        const closestDrill  = drills.length  > 0 ? this.findClosestTarget(enemy.x, enemy.y, drills)  : null;

        if (closestTurret) {
          enemy.target = closestTurret;
          enemy.targetType = 'turret';
        } else if (closestDrill) {
          enemy.target = closestDrill;
          enemy.targetType = 'drill';
        } else if (this.carrier && this.carrier.active) {
          enemy.target = this.carrier;
          enemy.targetType = 'carrier';
        } else {
          enemy.target = null;
          enemy.targetType = null;
        }
      }
      
      // If enemy has a target, move towards it
      if (enemy.target) {
        // Get target position
        const targetX = enemy.target.x;
        const targetY = enemy.target.y;
        
        // Calculate direction to target
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If close enough, attack the target
        if (distance < this.WAVE_SETTINGS.ATTACK_RANGE) {
          // Attack if cooldown is 0
          if (enemy.attackCooldown === 0) {
            if (enemy.targetType === 'drill') {
              this.drillManager.damageDrill(enemy.target, enemy.damage);
            } else if (enemy.targetType === 'turret') {
              this.turretManager.damageTurret(enemy.target, enemy.damage);
            } else if (enemy.targetType === 'carrier') {
              if (this.carrier) this.carrier.damage(enemy.damage);
            }
            
            // Damage terrain where target is
            this.terrainManager.createExplosion(
              targetX, 
              targetY,
              this.WAVE_SETTINGS.TERRAIN_DAMAGE_RADIUS,
              this.WAVE_SETTINGS.TERRAIN_DAMAGE_STRENGTH
            );
            
            enemy.attackCooldown = this.WAVE_SETTINGS.ATTACK_COOLDOWN;
            
            // Visual feedback for attack
            this.showAttackEffect(enemy, targetX, targetY);
          }
        } else {
          // Move towards target
          const moveX = (dx / distance) * (enemy.speed / 60);
          const moveY = (dy / distance) * (enemy.speed / 60);
          
          enemy.x += moveX;
          enemy.y += moveY;
          
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
        }
      } else {
        // If no target, patrol with horizontal movement pattern
        
        // Update patrol timer and change direction if needed
        enemy.patrolTimer--;
        if (enemy.patrolTimer <= 0) {
          enemy.patrolDirection *= -1; // Reverse direction
          enemy.patrolTimer = this.WAVE_SETTINGS.PATROL_DURATION;
        }
        
        // Move horizontally based on patrol direction
        const horizontalSpeed = enemy.speed * this.WAVE_SETTINGS.PATROL_SPEED_FACTOR / 60;
        enemy.x += enemy.patrolDirection * horizontalSpeed;
        
        // Move downward more slowly when patrolling
        const verticalSpeed = enemy.speed * 0.3 / 60;
        enemy.y += verticalSpeed;
        
        // Rotate sprite to face patrol direction
        const angle = enemy.patrolDirection > 0 ? 30 : -30;
        enemy.sprite.angle = angle;
        
        // Update sprite position
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        
        // If enemy hits world boundary, reverse direction
        // Use the world bounds instead of hard-coded values
        if (enemy.x < 50 || enemy.x > this.scene.cameras.main.getBounds().right - 50) {
          enemy.patrolDirection *= -1;
        }
      }
      
      // If enemy has gone off bottom of world, remove it
      if (enemy.y > this.scene.cameras.main.getBounds().bottom) {
        enemy.sprite.destroy();
        this.enemies.splice(i, 1);
      }
    }
    
    // --- Update shooter projectiles ---
    for (let p = this.projectiles.length - 1; p >= 0; p--) {
      const proj = this.projectiles[p];
      const sprite = proj.sprite;

      const bounds = this.scene.cameras.main.getBounds();
      if (sprite.x < bounds.x - 50 || sprite.x > bounds.right + 50 ||
          sprite.y < bounds.y - 50 || sprite.y > bounds.bottom + 50) {
        sprite.destroy();
        this.projectiles.splice(p, 1);
        continue;
      }

      // Terrain collision
      if (this.terrainManager.isSolid(sprite.x, sprite.y)) {
        this.terrainManager.createExplosion(sprite.x, sprite.y, proj.aoeRange, this.SHOOTER_CONFIG.TERRAIN_DAMAGE_STRENGTH);
        sprite.destroy();
        this.projectiles.splice(p, 1);
        continue;
      }

      // Collision with drills
      for (const drill of drills) {
        if (!drill.isAlive) continue;
        if (Phaser.Math.Distance.Between(sprite.x, sprite.y, drill.x, drill.y) < 20) {
          this.drillManager.damageDrill(drill, proj.damage);
          this.terrainManager.createExplosion(sprite.x, sprite.y, proj.aoeRange, this.SHOOTER_CONFIG.TERRAIN_DAMAGE_STRENGTH);
          sprite.destroy();
          this.projectiles.splice(p, 1);
          break;
        }
      }
      if (!this.projectiles[p]) continue; // projectile may be removed

      // Collision with turrets
      for (const turret of turrets) {
        if (!turret.active) continue;
        if (Phaser.Math.Distance.Between(sprite.x, sprite.y, turret.x, turret.y) < 20) {
          this.turretManager.damageTurret(turret, proj.damage);
          this.terrainManager.createExplosion(sprite.x, sprite.y, proj.aoeRange, this.SHOOTER_CONFIG.TERRAIN_DAMAGE_STRENGTH);
          sprite.destroy();
          this.projectiles.splice(p, 1);
          break;
        }
      }
      if (!this.projectiles[p]) continue;

      // Collision with carrier
      if (this.carrier && this.carrier.active && Phaser.Math.Distance.Between(sprite.x, sprite.y, this.carrier.x, this.carrier.y) < 30) {
        this.carrier.damage(proj.damage);
        this.terrainManager.createExplosion(sprite.x, sprite.y, proj.aoeRange, this.SHOOTER_CONFIG.TERRAIN_DAMAGE_STRENGTH);
        sprite.destroy();
        this.projectiles.splice(p, 1);
      }
    }
  }
  
  // Calculate distance between an enemy and a target
  getDistance(enemy, target) {
    const dx = enemy.x - target.x;
    const dy = enemy.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Find closest target from an array of possible targets
  findClosestTarget(x, y, targets) {
    let closest = null;
    let closestDistance = Number.MAX_VALUE;
    
    targets.forEach(target => {
      const targetX = target.x;
      const targetY = target.y;
      const dx = x - targetX;
      const dy = y - targetY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < closestDistance) {
        closest = target;
        closestDistance = distance;
      }
    });
    
    return closest;
  }
  
  // Show visual attack effect
  showAttackEffect(enemy, targetX, targetY) {
    const line = this.scene.add.line(
      0, 0, 
      enemy.x, enemy.y,
      targetX, targetY,
      enemy.tier === 'LARGE' ? 0xff6600 : (enemy.tier === 'MEDIUM' ? 0xff3300 : 0xff0000)
    );
    line.setLineWidth(3, 3);
    line.setOrigin(0, 0);
    
    // Make the line fade out
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        line.destroy();
      }
    });
  }
  
  // Method to damage enemies from drill explosions
  damageEnemiesInRange(x, y, radius, damage) {
    this.enemies.forEach((enemy, index) => {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Calculate damage based on distance
        const actualDamage = Math.floor(damage * (1 - distance / radius));
        this.damageEnemy(index, actualDamage);
      }
    });
  }
  
  // Method to damage an enemy
  damageEnemy(index, amount) {
    const enemy = this.enemies[index];
    if (!enemy) return;
    
    enemy.health -= amount;
    
    // If enemy health is 0 or less, destroy it
    if (enemy.health <= 0) {
      enemy.sprite.destroy();
      this.enemies.splice(index, 1);
    }
  }
  
  getEnemies() {
    return this.enemies;
  }
  
  getCurrentWave() {
    return this.currentWave;
  }
  
  getWaveStatus() {
    return {
      currentWave: this.currentWave,
      isActive: this.isWaveActive,
      enemiesLeft: this.enemiesLeftToSpawn,
      enemiesAlive: this.enemies.length,
      breakTimer: this.isWaveActive ? 0 : this.waveBreakTimer,
      breakDuration: this.WAVE_SETTINGS.BREAK_DURATION
    };
  }
} 