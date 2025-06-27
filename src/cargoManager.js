// Controls cargo movement and delivery to the carrier
export class CargoManager {
  constructor(scene, carrierX, carrierY, resourceManager) {
    this.scene = scene;
    this.carrierX = carrierX;
    this.carrierY = carrierY;
    this.resourceManager = resourceManager;
    this.cargos = [];
    this.carrier = null; // Will be directly set by DrillManager
    
    // Define cargo colors based on value ranges
    this.cargoColors = [
      { max: 1, color: 0xffff00 },      // Yellow for low value (sand/dirt) - up to 1
      { max: 2.5, color: 0x00ff00 },    // Green for medium value (rock/gravel) - up to 2.5
      { max: 5, color: 0x00ffff },      // Cyan for high value (metal ore) - up to 5
      { max: Infinity, color: 0x88aaff } // Blue for very high value (crystal) - above 5
    ];
  }

  setCarrier(carrier) {
    this.carrier = carrier;
    // Update stored coordinates
    this.carrierX = carrier.x;
    this.carrierY = carrier.y;
  }

  spawn(x, y, amount = 1) {
    // Determine cargo color based on amount
    let cargoColor = this.cargoColors[0].color;
    for (const colorDef of this.cargoColors) {
      if (amount <= colorDef.max) {
        cargoColor = colorDef.color;
        break;
      }
    }
    
    // Create cargo rectangle with color based on value
    const sprite = this.scene.add.rectangle(x, y, 10, 10, cargoColor);
    this.scene.physics.add.existing(sprite);
    
    // Get current carrier position if available
    let destX = this.carrierX;
    let destY = this.carrierY;
    
    if (this.carrier && this.carrier.active) {
      destX = this.carrier.x;
      destY = this.carrier.y;
    }
    
    sprite.setData('destination', { x: destX, y: destY });
    sprite.setData('phase', 'ascend');
    
    console.log(`Cargo spawned at ${x},${y}. Destination: ${destX},${destY}`);
    
    // Add text showing value for higher valued resources (optional)
    let valueText = null;
    if (amount > 1.5) {
      valueText = this.scene.add.text(x, y - 10, Math.round(amount * 10) / 10, {
        fontSize: '10px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 2
      });
      valueText.setOrigin(0.5, 0.5);
    }
    
    this.cargos.push({ sprite, amount, valueText });
  }

  update() {
    // Update carrier position if it's available
    if (this.carrier && this.carrier.active) {
      this.carrierX = this.carrier.x;
      this.carrierY = this.carrier.y;
    }
    
    this.cargos = this.cargos.filter(cargo => {
      const sprite = cargo.sprite;
      const valueText = cargo.valueText;
      const phase = sprite.getData('phase');
      
      // Always get the latest carrier position for any cargo in 'fly' phase
      let dest = sprite.getData('destination');
      if (phase === 'fly' && this.carrier && this.carrier.active) {
        dest = { x: this.carrier.x, y: this.carrier.y };
        sprite.setData('destination', dest);
      }

      if (phase === 'ascend') {
        sprite.y -= 2;
        if (valueText) valueText.y -= 2;
        
        if (sprite.y < 450) {
          sprite.setData('phase', 'fly');
          // Update destination with current carrier position
          if (this.carrier && this.carrier.active) {
            sprite.setData('destination', { x: this.carrier.x, y: this.carrier.y });
          }
        }
      } else if (phase === 'fly') {
        this.scene.physics.moveTo(sprite, dest.x, dest.y, 100);
        
        // Update text position if present
        if (valueText) {
          valueText.x = sprite.x;
          valueText.y = sprite.y - 10;
        }
        
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, dest.x, dest.y);
        if (dist < 10) {
          this.resourceManager.add(cargo.amount);
          sprite.destroy();
          if (valueText) valueText.destroy();
          return false;
        }
      }

      return true;
    });
  }
}
