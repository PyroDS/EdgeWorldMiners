/**
 * CarrierHardpoint.js
 * 
 * Implements a weapon hardpoint for the carrier that can mount different
 * turret types and be independently targeted and damaged by enemies.
 * 
 * Dependencies:
 * - turrets/BaseTurret.js (for base class functionality)
 * - carrier.js (for positioning relative to carrier)
 */

import { BaseTurret } from './turrets/BaseTurret.js';

export class CarrierHardpoint extends BaseTurret {
  /**
   * Creates a new hardpoint attached to the carrier
   * 
   * @param {Phaser.Scene} scene - Phaser scene reference
   * @param {TurretManager} manager - TurretManager for registration and callbacks
   * @param {Object} carrier - The carrier object this hardpoint is attached to
   * @param {number} offsetX - X offset relative to carrier position
   * @param {number} offsetY - Y offset relative to carrier position
   * @param {string} turretType - Type of turret to mount ('PointDefense' by default)
   */
  constructor(scene, manager, carrier, offsetX, offsetY, turretType = 'PointDefense') {
    // Initialize with hardpoint base stats
    super(scene, manager, 
          carrier.x + offsetX, 
          carrier.y + offsetY, 
          { 
            HEALTH: 100,
            RANGE: 0,
            FIRE_RATE: 0,
            DAMAGE: 0
          }, 
          { PRIMARY: 0x5A5A7A });
    
    this.carrier = carrier;
    this.offset = { x: offsetX, y: offsetY };
    this.turretType = turretType;
    this.destroyed = false;
    this.mountedWeapon = null;
    
    // Create visual representation for the hardpoint
    this.createVisuals();
    
    // Create the actual weapon based on type
    this.mountWeapon(turretType);
  }
  
  /**
   * Creates the visual elements for the hardpoint
   */
  createVisuals() {
    // Create a container for all visual elements
    this.container = this.scene.add.container(this.x, this.y);
    
    // Create hardpoint mount base
    this.mount = this.scene.add.rectangle(0, 0, 24, 16, this.COLORS.PRIMARY);
    this.mount.setOrigin(0.5, 0.5);
    
    // Add mount to container
    this.container.add(this.mount);
    
    // Set depth to ensure hardpoint appears above carrier but below UI
    this.container.setDepth(this.carrier.depth + 1);
    
    // Add a static physics body to the container for proper collision
    // This allows enemies to target the hardpoint properly
    this.scene.physics.add.existing(this.container, true); // true = static body
  }
  
  /**
   * Mounts a specific weapon type on this hardpoint
   * 
   * @param {string} turretType - The type of turret to mount
   */
  mountWeapon(turretType) {
    // Remove any existing mounted weapon
    if (this.mountedWeapon) {
      this.mountedWeapon.destroy();
      this.mountedWeapon = null;
    }
    
    // Store the turret type
    this.turretType = turretType;
    
    // Currently only PointDefense is implemented
    if (turretType === 'PointDefense') {
      // Create barrel for point defense turret
      this.barrel = this.scene.add.rectangle(0, -8, 6, 14, 0xaaaaaa);
      this.barrel.setOrigin(0.5, 1);
      
      // Add to container
      this.container.add(this.barrel);
      
      // Set the stats for this weapon type
      this.STATS.RANGE = 300;
      this.STATS.FIRE_RATE = 15; // frames between shots
      this.STATS.PROJECTILE_SPEED = 450;
      this.STATS.DAMAGE = 5;
      this.STATS.ACCURACY = 0.85;
      this.STATS.COLOR = 0xffdd33;
      
      // Initialize fire timer
      this.fireTimer = 0;
      
      // Create projectile array
      this.projectiles = [];
    }
  }
  
  /**
   * Updates the hardpoint position and handles firing logic
   */
  update() {
    // Always update position to follow carrier, even when destroyed
    this.container.x = this.carrier.x + this.offset.x;
    this.container.y = this.carrier.y + this.offset.y;
    
    // Update position reference
    this.x = this.container.x;
    this.y = this.container.y;
    
    // Skip weapon logic if destroyed
    if (this.destroyed) return;
    
    // Handle weapon-specific logic
    if (this.turretType === 'PointDefense') {
      this.updatePointDefense();
    }
    
    // Update projectiles
    this.updateProjectiles();
  }
  
  /**
   * Update logic for point defense turret type
   */
  updatePointDefense() {
    this.fireTimer++;
    
    if (!this.carrier.enemyManager) return;
    
    // Find nearest enemy within range
    let nearest = null;
    let nearestDist = this.STATS.RANGE;
    
    for (const enemy of this.carrier.enemyManager.getEnemies()) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < nearestDist) { 
        nearestDist = dist; 
        nearest = enemy; 
      }
    }
    
    if (nearest && this.fireTimer >= this.STATS.FIRE_RATE) {
      this.fireTimer = 0;
      
      // Rotate barrel to target
      const ang = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
      this.barrel.rotation = ang - Math.PI/2;
      
      // Fire projectile
      this.fireProjectile(nearest.x, nearest.y);
    }
  }
  
  /**
   * Fires a projectile from this hardpoint
   * 
   * @param {number} targetX - Target X position
   * @param {number} targetY - Target Y position
   */
  fireProjectile(targetX, targetY) {
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const inaccuracy = 1 - (this.STATS.ACCURACY ?? 1);
    const maxSpread = Math.PI / 8; // 22.5 degrees
    const spreadRange = inaccuracy * maxSpread;
    const randomOffset = Phaser.Math.FloatBetween(-spreadRange, spreadRange);
    const angle = baseAngle + randomOffset;
    
    const proj = this.scene.add.circle(this.x, this.y, 3, this.STATS.COLOR);
    this.scene.physics.add.existing(proj);
    proj.body.setAllowGravity(false);
    proj.body.setVelocity(
      Math.cos(angle) * this.STATS.PROJECTILE_SPEED, 
      Math.sin(angle) * this.STATS.PROJECTILE_SPEED
    );
    
    proj.setData('damage', this.STATS.DAMAGE);
    proj.setData('angle', angle);
    
    this.projectiles.push(proj);
  }
  
  /**
   * Updates and handles collisions for all projectiles
   */
  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Remove out-of-bounds projectiles
      const bounds = this.scene.cameras.main.getBounds();
      if (proj.x < bounds.x || proj.x > bounds.right || 
          proj.y < bounds.y || proj.y > bounds.bottom) {
        proj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check collision with enemies
      if (this.carrier.enemyManager) {
        for (const enemy of this.carrier.enemyManager.getEnemies()) {
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
          if (dist < enemy.size) {
            const wasDestroyed = enemy.takeDamage(proj.getData('damage'));
            
            if (!wasDestroyed) {
              const damageText = this.scene.add.text(
                enemy.x, 
                enemy.y, 
                proj.getData('damage').toString(), 
                { 
                  fontFamily: 'Arial', 
                  fontSize: '16px', 
                  color: '#ffff00',
                  stroke: '#000000',
                  strokeThickness: 2
                }
              );
              damageText.setOrigin(0.5);
              
              this.scene.tweens.add({
                targets: damageText,
                y: enemy.y - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => {
                  damageText.destroy();
                }
              });
            }
            
            // Impact effect
            const impact = this.scene.add.circle(proj.x, proj.y, 6, this.STATS.COLOR, 0.8);
            impact.setDepth(100);
            this.scene.tweens.add({
              targets: impact,
              alpha: 0,
              scale: 2,
              duration: 250,
              onComplete: () => impact.destroy()
            });
            
            proj.destroy();
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }
  
  /**
   * Override BaseTurret's takeDamage to handle hardpoint destruction
   * 
   * @param {number} amount - Amount of damage to apply
   * @returns {boolean} - Whether the hardpoint was destroyed
   */
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.destroyed = true;
      
      // Visual feedback for destruction
      if (this.barrel) {
        this.barrel.destroy();
        this.barrel = null;
      }
      
      // Show damaged mount with subtle destruction effect
      this.mount.setFillStyle(0x555555);
      
      // Create simple destruction effect using circle graphics
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 30;
        const distance = 3 + Math.random() * 10;
        
        const debris = this.scene.add.circle(
          this.x + Math.cos(angle) * distance,
          this.y + Math.sin(angle) * distance,
          2 + Math.random() * 3,
          0xff8800
        );
        
        // Animate the debris
        this.scene.tweens.add({
          targets: debris,
          x: debris.x + Math.cos(angle) * speed,
          y: debris.y + Math.sin(angle) * speed,
          alpha: 0,
          scale: 0.1,
          duration: 600 + Math.random() * 400,
          onComplete: () => debris.destroy()
        });
      }
      
      // Unregister from enemy manager to prevent targeting
      if (this.carrier && this.carrier.enemyManager) {
        this.carrier.enemyManager.unregisterTarget(this);
      }
      
      // Return true to indicate destruction
      return true;
    }
    
    // Flash red for damage feedback
    const originalTint = this.mount.fillColor;
    this.mount.setFillStyle(0xff5555);
    this.scene.time.delayedCall(100, () => {
      if (this.mount && !this.destroyed) {
        this.mount.setFillStyle(originalTint);
      }
    });
    
    return false;
  }
  
  /**
   * Clean up this hardpoint (called when carrier is destroyed)
   */
  destroy() {
    // Unregister from enemy manager
    if (this.carrier && this.carrier.enemyManager) {
      this.carrier.enemyManager.unregisterTarget(this);
    }
    
    // Destroy all projectiles
    if (this.projectiles) {
      for (const proj of this.projectiles) {
        if (proj) proj.destroy();
      }
      this.projectiles = [];
    }
    
    // Destroy barrel if it still exists
    if (this.barrel) {
      this.barrel.destroy();
      this.barrel = null;
    }
    
    // Destroy mount if it still exists
    if (this.mount) {
      this.mount.destroy();
      this.mount = null;
    }
    
    // Destroy container and all visuals
    if (this.container) {
      // If container has a body (physics), destroy it explicitly
      if (this.container.body) {
        this.container.body.destroy();
      }
      this.container.destroy();
      this.container = null;
    }
    
    this.destroyed = true;
  }
} 