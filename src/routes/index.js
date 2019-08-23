const handlers = require('./handlers');

const define = ({ config, factory }) => {
  const router = handlers({ config, factory });
  router.get('/:company/reload', (req, res) => {
    const entity = factory.reload(req.params.name);
    res.json({
      message: 'ok',
      date: new Date().toISOString(),
    });
  });
  router.get('/:company/me', (req, res) => {
    const entity = factory.byName(req.params.company);
    const date = parseInt(req.query.date || new Date().getTime());
    res.json({
      balance: entity.balances({ date }),
      value: entity.values({ date }),
      transactions: entity.transactions({ date }).map(t => t.toJSON(date)),
      name: entity.name,
      unsavedChanges: entity.unsavedChanges,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/:company/fullme', (req, res) => {
    const entity = factory.byName(req.params.company);
    const date = parseInt(req.query.date || new Date().getTime());

    res.json({
      balance: entity.balances({ date: date * 2 }),
      value: entity.values({ date }),
      transactions: entity.transactions({ date: date * 2 }).map(t => t.toJSON(date)),
      name: entity.name,
      unsavedChanges: entity.unsavedChanges,
      date: new Date(date * 2).toISOString(),
    });
  });

  router.get('/:company/balance', (req, res) => {
    const entity = factory.byName(req.params.company);
    const date = parseInt(req.query.date || new Date().getTime());
    const balance = entity.balances({ date });
    const value = entity.values({ date });
    res.json({
      balance,
      value,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/:company/value', (req, res) => {
    const entity = factory.byName(req.params.company);
    const date = parseInt(req.query.date || new Date().getTime());
    const value = entity.values({ date });

    res.json({
      value,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/:company/transactions', (req, res) => {
    const entity = factory.byName(req.params.company);
    const date = parseInt(req.query.date || new Date().getTime());
    const transactions = entity.transactions({ date }).map(t => t.toJSON(date));
    res.json({
      transactions,
      date: new Date(date).toISOString(),
    });
  });

  router.post('/:company/commit', async (req, res) => {
    const entity = factory.byName(req.params.company);
    await entity.save({});
    res.json({ message: 'ok' });
  });

  router.post('/:company/remove', async (req, res) => {
    const { id, type } = req.body;
    const entity = factory.byName(req.params.company);
    if (!id) {
      res.status(400).json({ error: 'id must be provided' });
    }
    if (!type) {
      res.status(400).json({ error: 'type must be provided' });
    }
    const acceptedTypes = ['input', 'output', 'thing-input', 'thing-output'];
    if (!acceptedTypes.includes(type)) {
      res.status(400).json({ error: `Unknown tx type ${type}` });
    }
    const doSave = req.body.commit || false;
    await entity.remove({
      id, type, doSave,
    });
    res.status(200).json({ message: 'ok' });
  });

  router.post('/:company/transaction', async (req, res) => {
    const entity = factory.byName(req.params.company);
    const data = req.body;
    const acceptedTypes = ['input', 'output', 'thing-input', 'thing-output'];
    const acceptedCurrency = ['ron', 'eur', 'usd', 'cad', 'btc', 'eth'];
    if (!acceptedTypes.includes(data.type)) {
      res.status(400).json({ error: `Unknown tx type ${data.type}` });
      return;
    }
    if (!acceptedCurrency.includes(data.currency)) {
      res.status(400).json({ error: `Unknown currency ${data.currency}` });
      return;
    }

    const { type } = data;
    const { currency } = data;
    const { amount } = data;
    const { partner } = data;
    const { description } = data;
    const meta = typeof (data.meta) === 'string' ? data.meta : JSON.stringify(data.meta);
    const { decay_per_day } = data;
    const year = parseInt(data.year || new Date().getFullYear());
    const month = parseInt(data.month || (new Date().getMonth() + 1));
    const day = parseInt(data.day || (new Date().getDate()));
    const doSave = data.commit || false;
    const transaction = await entity.transact({
      type, currency, amount, partner, description, meta, decay_per_day, year, month, day, doSave,
    });
    res.status(200).json({
      transaction,
    });
  });

  return router;
};

module.exports = define;
