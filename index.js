const BN = require('bignumber.js');
const uuid = require('uuid/v1');
const csv = require('csv-parser');
const fs = require('fs');

const { Entity, createEntity } = require('./src/elements/entity');
const systemData = require('./storage/entities/system.json');
const Server = require('./src/http/server');
const Routes = require('./src/routes');


const run = () => {
  const system = createEntity(systemData);
  const server = Server({
    routes: Routes,
    system,
  });
  server.listen(12345, () => {
    console.log('started');
  });
};


run();
