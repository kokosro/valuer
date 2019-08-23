const BN = require('bignumber.js');
const uuid = require('uuid/v1');

const taxesPercentages = (description, exists = false) => {
  const percentages = {
    wage: 1155 / 2145,
    crypto: 0.1,
    withdraw: 0.05,
    ins: 0.01,
  };

  if (exists) {
    return typeof (percentages[description]) !== 'undefined';
  }
  const defaultP = 0.01;

  if (typeof (percentages[description]) === 'undefined') {
    return new BN(defaultP);
  }

  return new BN(percentages[description]);
};

class Transaction {
  constructor({
    id = uuid(),
    type, currency, amount, partner, description, date,
    vat = 0.0,
    decay_per_day = 0.0,
    meta = '',
  }) {
    this.id = id;
    this.type = type;
    this.currency = currency;
    this.amount = amount;
    this.partner = partner;
    this.description = description;
    this.date = date;
    this.vat = new BN(vat);
    this.meta = meta;
    this.decay_per_day = new BN(decay_per_day);
    // indexing required by type, currency, partner and date (grouped by periods of 1 days)
  }

  toJSON(date = new Date().getTime()) {
    const header = Transaction.header();
    const that = this;
    const info = header.reduce((r, h) => Object.assign(r, { [h]: that.value(h, date) }), {});
    return info;
  }

  static header() {
    return ['id', 'year', 'month', 'day', 'type', 'currency', 'amount', 'partner', 'description', 'vat', 'decay_per_day', 'meta', 'decay_value', 'taxed_amount'];
  }

  value_id() {
    return this.id;
  }

  value_decay_value() {
    return this.decayedValue();
  }

  value_taxed_amount() {
    return this.taxedAmount();
  }

  value_meta() {
    return this.meta;
  }

  value_year() {
    const now = new Date(this.date);
    return now.getFullYear();
  }

  value_month() {
    const now = new Date(this.date);
    return now.getMonth() + 1;
  }

  value_day() {
    const now = new Date(this.date);
    return now.getDate();
  }

  value_vat() {
    return this.vat.toFixed(4);
  }

  value_type() {
    return this.type;
  }

  value_currency() {
    return typeof (this.currency) === 'string' ? this.currency.toLowerCase()
      : new this.currency().toSymbol().toLowerCase();
  }

  value_amount() {
    return this.amount.toValue();
  }

  value_decay_per_day() {
    return this.decay_per_day.toFixed(8);
  }

  value_partner() {
    return this.partner;
  }

  value_description() {
    return this.description;
  }

  value(header, date = new Date().getTime()) {
    return this[`value_${header}`](date);
  }

  toCsv() {
    const headers = Transaction.header();
    return headers.map(this.value.bind(this));
  }

  estimateTaxes() {
    if (taxesPercentages(this.description, true)) {
      return new this.currency(this.vat.multipliedBy(this.amount).plus(taxesPercentages(this.description).multipliedBy(this.amount)));
    }
    return new this.currency(0);
  }

  taxedAmount(withTax = true) {
    if (withTax) {
      if (this.type === 'output') {
        return new this.currency(this.amount.plus(this.estimateTaxes()));
      } if (this.type === 'input') {
        return new this.currency(this.amount.minus(this.estimateTaxes()));
      } if (this.type === 'thing-input') {
        return new this.currency(this.amount.minus(this.estimateTaxes()));
      } if (this.type === 'thing-output') {
        return new this.currency(this.amount.plus(this.estimateTaxes()));
      }
    }
    return this.currency(this.amount);
  }

  decayedValue(date = new Date().getTime()) {
    const days = Math.floor((date - this.date) / (24 * 3600 * 1000));

    const dv = new this.currency(this.amount.minus(this.amount.multipliedBy(this.decay_per_day.multipliedBy(days))));
    if (dv.isPositive()) {
      return dv;
    }
    return new this.currency(0);
  }

  sign() {
    return this.type === 'input' || this.type === 'thing-output' ? '+' : '-';
  }

  toString(radix = new Date().getTime()) {
    return `${new Date(this.date).toISOString()}\t${this.id}\t${this.sign()}${this.amount}\t${this.estimateTaxes()}\t${this.partner}\t${this.description}${this.type.replace('thing-input', '') !== this.type ? `\t${this.decayedValue(radix)}` : ''}`;
  }
}

module.exports = Transaction;
