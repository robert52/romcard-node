const moment = require('moment');
const crypto = require('crypto');
const Lazy = require('lazy.js');
const constants = require('./constants');

const TrTypeResponseFields = {
  [constants.TRANSACTION_TYPE_PREAUTH]: ['TERMINAL', 'TRTYPE', 'ORDER',
    'AMOUNT', 'CURRENCY','DESC', 'ACTION', 'RC', 'MESSAGE', 'RRN',
    'INT_REF', 'APPROVAL', 'TIMESTAMP', 'NONCE'],
  [constants.TRANSACTION_TYPE_SALE]: ['ACTION', 'RC', 'MESSAGE', 'TRTYPE',
    'AMOUNT','CURRENCY', 'ORDER', 'RRN', 'INT_REF', 'TIMESTAMP', 'NONCE'],
};

TrTypeResponseFields[constants.TRANSACTION_TYPE_REVERSAL] = TrTypeResponseFields[constants.TRANSACTION_TYPE_SALE];

const TrTypeResponseFieldsMap = {
  [constants.TRANSACTION_TYPE_PREAUTH]: {
    TERMINAL: 'terminalId',
    TRTYPE: 'trType',
    ORDER: 'orderId',
    AMOUNT: 'amount',
    CURRENCY: 'currency',
    DESC: 'description',
    ACTION: 'status',
    RC: 'bankResponseCode',
    MESSAGE: 'bankResponseMessage',
    RRN: 'referenceValue',
    INT_REF: 'internalReferenceValue',
    APPROVAL: 'authCode',
    TIMESTAMP: 'timestamp',
    NONCE: 'nonce'
  },
  [constants.TRANSACTION_TYPE_SALE]: {
    ACTION: 'status',
    RC: 'bankResponseCode',
    MESSAGE: 'bankResponseMessage',
    TRTYPE: 'trType',
    AMOUNT: 'amount',
    CURRENCY: 'currency',
    ORDER: 'orderId',
    RRN: 'referenceValue',
    INT_REF: 'internalReferenceValue',
    TIMESTAMP: 'timestamp',
    NONCE: 'nonce'
  }
};

TrTypeResponseFieldsMap[constants.TRANSACTION_TYPE_REVERSAL] = TrTypeResponseFieldsMap[constants.TRANSACTION_TYPE_SALE];

module.exports.getTimestamp = getTimestamp;
module.exports.generateNonce = generateNonce;
module.exports.signData = signData;
module.exports.getResponseFieldsByTransactionType = getResponseFieldsByTransactionType;
module.exports.mapGatewayResponseFields = mapGatewayResponseFields;

function getTimestamp() {
  return moment().utcOffset(0).format('YYYYMMDDHHmmss');
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function signData(data, key) {
  const fields = getResponseFieldsByTransactionType(data.TRTYPE);

  const valuesString = fields.map((field) => {
    let value = data[field];

    if(value === null || typeof value === 'undefined' || value === '') {
      return '-';
    }

    value = String(value);
    return `${value.length}${value}`;
  }).join('');

  const hmac = crypto.createHmac('sha1', Buffer.from(key, 'hex'));

  hmac.update(valuesString);

  return hmac.digest('hex').toUpperCase();
}

function getResponseFieldsByTransactionType(trType) {
  return TrTypeResponseFields[trType] || [];
}

function mapGatewayResponseFields(response) {
  const result = {};
  const map = TrTypeResponseFieldsMap[response['TRTYPE']] || {};

  Lazy(response).keys().each((field) => {
    if(typeof map[field] !== 'undefined') {
      result[map[field]] = response[field];
    }
  });

  return result;
}