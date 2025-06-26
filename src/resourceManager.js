// Manages player resource count and UI updates
export class ResourceManager {
  constructor(scene) {
    this.scene = scene;
    this.resources = 30;
    scene.registry.set('resources', this.resources);
  }

  spend(amount) {
    if (this.resources >= amount) {
      this.resources -= amount;
      this.scene.registry.set('resources', this.resources);
      return true;
    }
    return false;
  }

  add(amount) {
    this.resources += amount;
    this.scene.registry.set('resources', this.resources);
  }

  get() {
    return this.resources;
  }
}
