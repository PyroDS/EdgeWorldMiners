// Controls cargo movement and delivery to the carrier
export class CargoManager {
  constructor(scene, carrierX, carrierY, resourceManager) {
    this.scene = scene;
    this.carrierX = carrierX;
    this.carrierY = carrierY;
    this.resourceManager = resourceManager;
    this.cargos = [];
  }

  spawn(x, y, amount = 1) {
    const sprite = this.scene.add.rectangle(x, y, 10, 10, 0xffff00);
    this.scene.physics.add.existing(sprite);
    sprite.setData('destination', { x: this.carrierX, y: this.carrierY });
    sprite.setData('phase', 'ascend');
    this.cargos.push({ sprite, amount });
  }

  update() {
    this.cargos = this.cargos.filter(cargo => {
      const sprite = cargo.sprite;
      const phase = sprite.getData('phase');
      const dest = sprite.getData('destination');

      if (phase === 'ascend') {
        sprite.y -= 2;
        if (sprite.y < 450) {
          sprite.setData('phase', 'fly');
        }
      } else if (phase === 'fly') {
        this.scene.physics.moveTo(sprite, dest.x, dest.y, 100);
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, dest.x, dest.y);
        if (dist < 10) {
          this.resourceManager.add(cargo.amount);
          sprite.destroy();
          return false;
        }
      }

      return true;
    });
  }
}
