import { ResourceManager } from './resourceManager.js';
import { MacroTurret } from './turrets/MacroTurret.js';

// TurretManager.js – Refactor Road-map
// -------------------------------------------------------------
// We are migrating from "one giant manager file" to a modular
// architecture that scales with many turret / building types.
// Key points of the plan:
// 1.  BaseTurret class in src/turrets/BaseTurret.js encapsulates
//     graphics, per-instance state, update() loop, damage & death.
// 2.  Each concrete turret (e.g. MacroTurret, FlameTurret) lives in
//     its own file under src/turrets/, subclassing BaseTurret and
//     providing its own STAT / COLOR blocks plus specific behaviour.
// 3.  TurretManager becomes lightweight: it validates placement,
//     owns an array of turret instances, calls turret.update(dt),
//     and offers helper queries such as findNearestEnemy().
// 4.  Stats are data-driven (see future src/data/turretStats.js) so
//     research upgrades can tweak numbers without touching code.
// 5.  ResearchManager (future) will expose getStatMultiplier() that
//     turrets consult to apply tech bonuses.
// -------------------------------------------------------------
//  This comment should remain at the top of the file until the
//  migration is fully completed.
// -------------------------------------------------------------

export class TurretManager {
  constructor(scene, resourceManager, terrainManager) {
    this.scene = scene;
    this.resourceManager = resourceManager;
    this.terrainManager = terrainManager;
    this.turrets = [];
    this.projectiles = [];
    this.enemies = []; // This will store enemies when they are added to the game
    
    // Reference stats from the default MacroTurret; UI code can keep using TurretManager.TURRET_STATS
    this.TURRET_STATS = MacroTurret.STATS;
    
    // Colors
    this.COLORS = MacroTurret.COLORS;
  }

  createRangeCircle(x, y) {
    const range = this.scene.add.circle(x, y, this.TURRET_STATS.RANGE, this.COLORS.RANGE, 0.2);
    return range;
  }
  
  createTurretPreview(x, y) {
    // Create a container for the turret preview
    const container = this.scene.add.container(x, y);
    
    // Base of the turret - a rectangle
    const base = this.scene.add.rectangle(0, 0, 30, 30, this.COLORS.TURRET);
    
    // Turret barrel - smaller rectangle on top of base 
    const barrel = this.scene.add.rectangle(0, -20, 10, 20, this.COLORS.TURRET);
    
    // Add AOE indicator for preview
    const aoeIndicator = this.scene.add.circle(0, -15, 5, this.COLORS.EXPLOSION, 0.8);
    
    // Add all parts to the container
    container.add([base, barrel, aoeIndicator]);
    
    return container;
  }
  
  tryPlaceTurret(x, y) {
    if (!this.terrainManager.canPlaceDrillAt(x, y)) return false;
    
    const turret = new MacroTurret(this.scene, this, x, y);
    this.turrets.push(turret);
    return true;
  }
  
  spawnProjectile(x, y, targetX, targetY) {
    // Base angle directly toward target
    const baseAngle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

    // Calculate random spread based on accuracy
    const inaccuracy = 1 - (this.TURRET_STATS.ACCURACY ?? 1);
    const maxSpread = this.TURRET_STATS.MAX_SPREAD_RAD ?? 0;
    const spreadRange = inaccuracy * maxSpread;
    const randomOffset = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
    const finalAngle = baseAngle + randomOffset;

    const projectile = this.scene.add.circle(x, y - 20, 5, this.COLORS.PROJECTILE);
    this.scene.physics.add.existing(projectile);

    // Set velocity based on finalAngle
    const speed = this.TURRET_STATS.PROJECTILE_SPEED;
    projectile.body.setVelocity(
      Math.cos(finalAngle) * speed,
      Math.sin(finalAngle) * speed
    );

    // Set gravity to zero to ensure projectiles fly straight
    projectile.body.setGravity(0, 0);

    this.projectiles.push({
      sprite: projectile,
      damage: this.TURRET_STATS.PROJECTILE_DAMAGE,
      aoeRange: this.TURRET_STATS.AOE_RANGE,
      aoeDamage: this.TURRET_STATS.AOE_DAMAGE
    });
  }
  
  findNearestEnemy(x, y, range) {
    let nearestEnemy = null;
    let nearestDistance = range;
    
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(
        x, y,
        enemy.x, enemy.y
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
    
    return nearestEnemy;
  }
  
  update() {
    // Update turret instances
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const turret = this.turrets[i];
      turret.update();
    }
    
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const sprite = projectile.sprite;
      
      // Remove projectiles that have gone off world bounds
      const bounds = this.scene.cameras.main.getBounds();
      if (sprite.x < bounds.x || sprite.x > bounds.right || 
          sprite.y < bounds.y || sprite.y > bounds.bottom) {
        sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check for collision with enemies
      for (const enemy of this.enemies) {
        const distance = Phaser.Math.Distance.Between(
          sprite.x, sprite.y,
          enemy.x, enemy.y
        );
        
        // Simple collision detection
        if (distance < 20) { // Assuming enemy has a radius of ~20
          // Apply direct hit damage to the primary target
          enemy.health -= projectile.damage;
          
          // Create explosion effect
          this.createExplosionEffect(sprite.x, sprite.y, projectile.aoeRange);
          
          // Apply AOE damage to all enemies in range (including the primary target)
          this.damageEnemiesInRange(sprite.x, sprite.y, projectile.aoeRange, projectile.aoeDamage);
          
          // Remove projectile
          sprite.destroy();
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
  
  // Create visual explosion effect
  createExplosionEffect(x, y, radius) {
    // Create expanding circle for explosion
    const explosion = this.scene.add.circle(x, y, 10, this.COLORS.EXPLOSION, 0.8);
    
    // Create pulsating effect with scale and alpha
    this.scene.tweens.add({
      targets: explosion,
      scale: radius / 10, // Scale to match AOE radius
      alpha: 0,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Create particle effect for more visual impact
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.8;
      
      const particle = this.scene.add.circle(
        x, 
        y, 
        3, 
        this.COLORS.EXPLOSION
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 250 + Math.random() * 200,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }
  
  // Damage enemies in AOE range
  damageEnemiesInRange(x, y, radius, damage) {
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      
      if (distance <= radius) {
        // Apply damage with falloff based on distance from center
        const damageMultiplier = 1 - (distance / radius * 0.5); // 50% damage at the edge of radius
        const actualDamage = Math.round(damage * damageMultiplier);
        
        enemy.health -= actualDamage;
        
        // Show damage number
        if (actualDamage > 0) {
          this.showDamageIndicator(enemy.x, enemy.y, actualDamage);
        }
        
        // Remove enemy if dead
        if (enemy.health <= 0) {
          enemy.sprite.destroy();
          const index = this.enemies.indexOf(enemy);
          if (index > -1) this.enemies.splice(index, 1);
        }
      }
    }
  }
  
  // Method for enemies to damage turrets
  damageTurret(turret, amount) {
    if (!turret || !turret.active) return;
    
    turret.health -= amount;
    
    // Show damage visual
    this.showDamageIndicator(turret.x, turret.y, amount);
    
    // Check if destroyed
    if (turret.health <= 0) {
      this.destroyTurret(turret);
    } else {
      // Visual feedback for damage - flash red
      this.scene.tweens.add({
        targets: [turret.container.getAt(0), turret.container.getAt(1)],
        fillColor: { from: this.COLORS.DAMAGE_INDICATOR, to: this.COLORS.TURRET },
        duration: 200
      });
    }
  }
  
  // Show damage number indicator
  showDamageIndicator(x, y, amount) {
    const damageText = this.scene.add.text(
      x, y - 20, 
      `-${amount}`, 
      { fontSize: '16px', fill: '#ff0000' }
    );
    
    this.scene.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        damageText.destroy();
      }
    });
  }
  
  // Destroy a turret
  destroyTurret(turret) {
    turret.active = false;
    
    // Explosion effect
    const explosion = this.scene.add.circle(turret.x, turret.y, 30, 0xff6600, 0.8);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => {
        explosion.destroy();
      }
    });
    
    // Fade out and destroy turret graphics
    this.scene.tweens.add({
      targets: turret.container,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        turret.container.destroy();
        const index = this.turrets.indexOf(turret);
        if (index > -1) {
          this.turrets.splice(index, 1);
        }
      }
    });
    
    // Create debris particles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      
      const particle = this.scene.add.rectangle(
        turret.x, 
        turret.y, 
        5, 
        5, 
        this.COLORS.TURRET_BASE
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: turret.x + Math.cos(angle) * speed,
        y: turret.y + Math.sin(angle) * speed,
        angle: 360 * (Math.random() > 0.5 ? 1 : -1),
        alpha: 0,
        duration: 800 + Math.random() * 400,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }
  
  // Get all active turrets for targeting
  getTurrets() {
    return this.turrets.filter(turret => turret.active);
  }

  getTurretCount() {
    return this.turrets.filter(turret => turret.active).length;
  }
} 