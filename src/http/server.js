const express = require('express');
const bodyParser = require('body-parser');

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^next" }] */
const errorHandler = (err, req, res, next) => {
  if (err) {
    res.status(err.status || 500)
      .send({ message: err.message || 'Unknown' });
  }
};

const define = ({
  routes,
  config,
  system,
}) => {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(routes({ config, system }));
  app.use(errorHandler);
  return app;
};

module.exports = define;
