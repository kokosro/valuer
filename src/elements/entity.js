const BN = require('bignumber.js');
const fs = require('fs');
const csv = require('csv-parser');
const Transaction = require('./transaction');
const Currencies = require('./currency');

class Entity {
  constructor({
    name,
    txs,
    transactions = null,
    storagePath = './storage/entities',
  }) {
    this.name = name;
    this.memory = {};
    this.memory.input = [];
    this.memory.output = [];
    this.memory['thing-output'] = [];
    this.memory['thing-input'] = [];
    this.storagePath = storagePath;
    this.txs = txs;
    if (txs) {
      this.readTxs(txs);
    } else if (transactions) {
      this.readTransactions(transactions);
    }
    this.unsavedChanges = false;
    this.loaded = null;
  }

  readTxs(txs) {
    this.loaded = false;
    fs.createReadStream(txs)
      .pipe(csv())
      .on('data', this.transact.bind(this))
      .on('end', this.hasLoaded.bind(this));
  }

  readTransactions(transactions) {
    transactions.forEach(this.transactNoSave.bind(this));
    this.hasLoaded();
  }

  hasLoaded() {
    this.loaded = true;
    console.log(`has loaded. ${this}`);
  }


  toString() {
    return this.name;
  }

  static known(val) {
    if (typeof (val) === 'string') {
      if (typeof (Entity.knownInstances[val]) === 'undefined') {
        Entity.knownInstances[val] = new Entity({ name: val });
      }
    }
    return Entity.knownInstances[val];
  }

  transactNoSave({
    type, currency, amount, partner, description,
    date = new Date().getTime(),
    year, month, day,
    decay_per_day = 0.0,
    meta = '',
  }) {
    return this.transact({
      type,
      currency,
      amount,
      partner,
      description,
      date,
      year,
      month,
      day,
      decay_per_day,
      meta,
      doSave: false,
    });
  }

  async transact({
    type, currency, amount, partner, description,
    date = new Date().getTime(),
    year, month, day,
    decay_per_day = 0.0,
    meta = '',
    doSave = true,
  }) {
    let d = date;
    if (year || month || day) {
      d = new Date(year || new Date().getFullYear(),
        (month || (new Date().getMonth() + 1)) - 1,
        day || new Date().getDate()).getTime();
    }

    const transaction = new Transaction({
      type,
      currency: Currencies[Currencies.capitalize(currency)],
      amount: Currencies[currency](amount),
      partner,
      description,
      date: d,
      decay_per_day,
      meta,
    });

    this.memory[type].push(transaction);
    //    console.log(`${this} transacted ${transaction} ${this.balance({ currency, date: d.getTime() })}`);
    if (doSave) {
      await this.save({});
    } else {
      this.unsavedChanges = true;
    }
    return transaction;
  }

  async remove({
    id, type,
    doSave = true,
  }) {
    this.memory[type] = this.memory[type].filter(transaction => transaction.id !== id);
    if (doSave) {
      await this.save({});
    } else {
      this.unsavedChanges = true;
    }
  }

  async input({
    currency, amount, partner, description,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    day = new Date().getDate(),
    doSave = true,
  }) {
    const transaction = await this.transact({
      type: 'input',
      currency,
      amount,
      partner,
      description,
      year,
      month,
      day,
      doSave,
    });
    return transaction;
  }

  async buyThing({
    currency, amount, partner, description,
    decay_per_day = 1 / (2 * 365.25),
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    day = new Date().getDate(),
    doSave = true,
  }) {
    const transaction = await this.transact({
      type: 'thing-input',
      currency,
      amount,
      partner,
      description,
      decay_per_day,
      year,
      month,
      day,
      doSave,
    });
    return transaction;
  }

  async output({
    currency, amount, partner, description,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    day = new Date().getDate(),
    doSave = true,
  }) {
    const transaction = await this.transact({
      type: 'output',
      currency,
      amount,
      partner,
      description,
      year,
      month,
      day,
      doSave,
    });
    return transaction;
  }

  async sellThing({
    currency, amount, partner, description,
    decay_per_day = 0.0,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    day = new Date().getDate(),
    doSave = true,
  }) {
    const transaction = await this.transact({
      type: 'thing-output',
      currency,
      amount,
      partner,
      description,
      decay_per_day,
      year,
      month,
      day,
      doSave,
    });
    return transaction;
  }

  transactions({
    currencies = ['ron', 'usd', 'cad', 'eur', 'eth', 'btc', 'dai'],
    date = new Date().getTime() * 2,
  }) {
    const inputs = this.memory.input.filter(transaction => transaction.date < date && currencies.reduce((r, currency) => r || transaction.currency.is(currency), false));

    const outputs = this.memory.output.filter(transaction => transaction.date < date && currencies.reduce((r, currency) => r || transaction.currency.is(currency), false));
    const thingsInputs = this.memory['thing-input'].filter(transaction => transaction.date < date && currencies.reduce((r, currency) => r || transaction.currency.is(currency), false));
    const thingsOutputs = this.memory['thing-output'].filter(transaction => transaction.date < date && currencies.reduce((r, currency) => r || transaction.currency.is(currency), false));
    const transactions = inputs.concat(outputs).concat(thingsOutputs).concat(thingsInputs);
    transactions.sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      } if (a.date > b.date) {
        return 1;
      }
      return 0;
    });
    return transactions;
  }

  save({
    currencies = ['ron', 'usd', 'cad', 'eur', 'eth', 'btc', 'dai'],
    date = new Date().getTime() * 2,
  }) {
    const thePromise = (resolve, reject) => {
      const transactions = this.transactions({ currencies, date });
      const data = transactions.map(transaction => transaction.toCsv());
      const header = Transaction.header();
      // const f = fs.createWriteStream(this.txs || `./${this.storagePath}/${this.name}.csv`, { flags: 'w' });
      // f.write(`${header.join(',')}\n`);
      // data.forEach((row) => {
      // f.write(`${row.join(',')}\n`);
      // });
      // f.end();
      fs.writeFileSync(`./${this.storagePath}/${this.name}.json`, JSON.stringify(this));
      this.unsavedChanges = false;
      resolve();
    };
    return new Promise(thePromise.bind(this));
  }

  toJSON() {
    return {
      name: this.name,
      transactions: this.transactions({}),
    };
  }

  listTransactions({
    currencies = ['ron', 'cad', 'eur', 'eth', 'btc', 'usd', 'dai'],

    date = new Date().getTime(),
  }) {
    const transactions = this.transactions({ currencies, date });
    console.log('Transactions');
    console.log('----------');
    transactions.forEach((transaction) => {
      console.log(`${transaction.toString(date)}`);
    });
  }

  balance({
    currency,
    date = new Date().getTime(),
    taxed = true,
  }) {
    const inputs = this.memory.input.filter(transaction => transaction.date < date && transaction.currency.is(currency));
    const outputsThings = this.memory['thing-output'].filter(transaction => transaction.date < date && transaction.currency.is(currency));
    const inputsThings = this.memory['thing-input'].filter(transaction => transaction.date < date && transaction.currency.is(currency));
    let inputAmount = inputs.reduce((sum, transaction) => sum.plus(transaction.taxedAmount(taxed)), new BN(0));
    inputAmount = outputsThings.reduce((sum, transaction) => sum.plus(transaction.taxedAmount(taxed)), inputAmount);
    const outputs = this.memory.output.filter(transaction => transaction.date < date && transaction.currency.is(currency));

    let outputAmount = outputs.reduce((sum, transaction) => sum.plus(transaction.taxedAmount(taxed)), new BN(0));
    outputAmount = inputsThings.reduce((sum, transaction) => sum.plus(transaction.taxedAmount(taxed)), outputAmount);
    return inputAmount.minus(outputAmount);
  }

  value({
    currency,
    date = new Date().getTime(),
    taxed = true,
  }) {
    const inputs = this.memory.input.filter(transaction => transaction.date < date && transaction.currency.is(currency));
    const outputsThings = this.memory['thing-output'].filter(transaction => transaction.date < date && transaction.currency.is(currency));
    const inputsThings = this.memory['thing-input'].filter(transaction => transaction.date < date && transaction.currency.is(currency));
    let inputAmount = inputs.reduce((sum, transaction) => sum.plus(transaction.decayedValue(date)), new BN(0));
    inputAmount = outputsThings.reduce((sum, transaction) => sum.plus(transaction.decayedValue(date)), inputAmount);
    const outputs = this.memory.output.filter(transaction => transaction.date < date && transaction.currency.is(currency));

    let outputAmount = outputs.reduce((sum, transaction) => sum.plus(transaction.decayedValue(date)), new BN(0));
    outputAmount = inputsThings.reduce((sum, transaction) => sum.plus(transaction.decayedValue(date)), outputAmount);
    return inputAmount.minus(outputAmount);
  }

  balances({
    currencies = ['ron', 'eur', 'cad', 'usd', 'eth', 'btc', 'dai'],
    date = new Date().getTime(),
    taxed = true,
  }) {
    const balancer = (b, currency) => Object.assign(b, { [currency]: Currencies[currency](this.balance({ currency, date, taxed })) });
    return currencies.reduce(balancer.bind(this), {});
  }

  values({
    currencies = ['ron', 'eur', 'cad', 'usd', 'eth', 'btc', 'dai'],
    date = new Date().getTime(),
    taxed = true,
  }) {
    const valuer = (b, currency) => Object.assign(b, { [currency]: Currencies[currency](this.value({ currency, date, taxed })) });
    return currencies.reduce(valuer.bind(this), {});
  }
}

Entity.knownInstances = {};

module.exports = {
  Entity,
  createEntity: (obj) => {
    const entity = new Entity(obj);
    return entity;
  },
};
