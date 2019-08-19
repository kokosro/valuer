const Entity = require('./entity');

class Partner {
  static entity(val) {
    if (typeof (val) === 'string') {
      return Entity.known(val);
    }
    return val;
  }
}

module.exports = Partner;
