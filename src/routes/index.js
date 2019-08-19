const handlers = require('./handlers');

const define = ({ config, system }) => {
  const router = handlers({ config, system });
  router.get('/me', (req, res) => {
    const date = parseInt(req.query.date || new Date().getTime());
    res.json({
      balance: system.balances({ date }),
      value: system.values({ date }),
      transactions: system.transactions({ date }).map(t => t.toJSON(date)),
      name: system.name,
      unsavedChanges: system.unsavedChanges,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/fullme', (req, res) => {
    const date = parseInt(req.query.date || new Date().getTime());
    res.json({
      balance: system.balances({ date: date * 2 }),
      value: system.values({ date }),
      transactions: system.transactions({ date: date * 2 }).map(t => t.toJSON(date)),
      name: system.name,
      unsavedChanges: system.unsavedChanges,
      date: new Date(date * 2).toISOString(),
    });
  });

  router.get('/balance', (req, res) => {
    const date = parseInt(req.query.date || new Date().getTime());
    const balance = system.balances({ date });
    const value = system.values({ date });
    res.json({
      balance,
      value,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/value', (req, res) => {
    const date = parseInt(req.query.date || new Date().getTime());
    const value = system.values({ date });

    res.json({
      value,
      date: new Date(date).toISOString(),
    });
  });

  router.get('/transactions', (req, res) => {
    const date = parseInt(req.query.date || new Date().getTime());
    const transactions = system.transactions({ date }).map(t => t.toJSON(date));
    res.json({
      transactions,
      date: new Date(date).toISOString(),
    });
  });

  router.post('/commit', async (req, res) => {
    await system.save({});
    res.json({ message: 'ok' });
  });

  router.post('/remove', async (req, res) => {
    const { id, type } = req.body;
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
    await system.remove({
      id, type, doSave,
    });
    res.status(200).json({ message: 'ok' });
  });

  router.post('/transaction', async (req, res) => {
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
    const transaction = await system.transact({
      type, currency, amount, partner, description, meta, decay_per_day, year, month, day, doSave,
    });
    res.status(200).json({
      transaction,
    });
  });

  return router;
};

module.exports = define;
