const BN = require('bignumber.js');

const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const createCurrency = ({
  symbol, precision,
}) => {
  class Currency extends BN {
    constructor(val = 0) {
      super(val);
      this.symbol = symbol;
      this.precision = precision;
    }

    estimate(toCurrency, exchange) {
      //* *//
    }

    static is(type) {
      if (typeof (type) === 'string') {
        //        console.log(type, symbol, 'string');
        return symbol.toLowerCase() === type.toLowerCase();
      }
      if (typeof (type.symbol) === 'string') {
        //        console.log(type, symbol, 'cur');
        return symbol.toLowerCase() === type.symbol.toLowerCase();
      }
      //      console.log(type, symbol, 'none');
      return false;
    }

    toSymbol() {
      return `${symbol}`;
    }

    toString() {
      return `${symbol}${this.toFixed(this.precision)}`;
    }

    toValue() {
      return this.toFixed(this.precision);
    }

    toJSON() {
      return this.toValue();
    }
  }
  return Currency;
};


const valuer = Currency => value => new Currency(value);

const Ron = createCurrency({ symbol: 'ron', precision: 2 });
const Eur = createCurrency({ symbol: 'eur', precision: 2 });
const Cad = createCurrency({ symbol: 'cad', precision: 2 });
const Usd = createCurrency({ symbol: 'usd', precision: 2 });
const Eth = createCurrency({ symbol: 'eth', precision: 8 });
const Btc = createCurrency({ symbol: 'btc', precision: 8 });
const Dai = createCurrency({ symbol: 'dai', precision: 8 });


module.exports = {
  createCurrency,
  Ron,
  Eur,
  Cad,
  Usd,
  Eth,
  Btc,
  Dai,
  ron: valuer(Ron),
  eur: valuer(Eur),
  cad: valuer(Cad),
  usd: valuer(Usd),
  eth: valuer(Eth),
  btc: valuer(Btc),
  dai: valuer(Dai),
  capitalize,
};
