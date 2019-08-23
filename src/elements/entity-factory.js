const { Entity, createEntity } = require('./entity');
const S = require('../manipulation/string');

class EntityFactory {
  constructor() {
    this.entities = {};
  }

  create(systemData) {
    const entity = createEntity(systemData);
    this.entities[entity.hash()] = entity;
    return this.entities[entity.hash()];
  }

  byName(name) {
    if (!this.entities[S.hash(name)]) {
      return this.create({ name });
    }
    return this.entities[S.hash(name)];
  }

  reload(name) {
    const hash = S.hash(name);
    delete this.entities[hash];
    return this.create({ name });
  }
}

module.exports = EntityFactory;
