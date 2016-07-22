/**
 * @typedef {Object} GatewayConfig
 * @property {String} merchantName
 * @property {String} merchantUrl
 * @property {String} terminalId
 * @property {String} email
 * @property {String} secretKey
 * @property {String} callbackUrl
 * @property {Boolean} sandbox
 */




const constants = require('./constants');
const utils = require('./utils');
const Promise = require('bluebird');
const Lazy = require('lazy.js');
const XError = require('./XError');

class Gateway {
  /**
   * @param {GatewayConfig} config
   */
  constructor(config) {

    if (!config) {
      throw new XError('Config is required', 'PARAM_REQUIRED');
    }

    this.config = Object.assign({
      merchantName: '',
      merchantUrl: '',
      terminalId: '',
      email: '',
      sandbox: false,
      secretKey: '',
      callbackUrl: ''
    }, config);

    if(!this.config.merchantName) {
      throw new XError('Missing merchant name', 'REQUIRED_FIELD');
    }

    if(!this.config.merchantName) {
      throw new XError('Missing merchant name', 'REQUIRED_FIELD');
    }

    if(!this.config.merchantUrl) {
      throw new XError('Missing merchant URL', 'REQUIRED_FIELD');
    }

    if (!this.config.secretKey) {
      throw new XError('Missing secret key', 'REQUIRED_FIELD');
    }

    if (!this.config.callbackUrl) {
      throw new XError('Missing callback URL', 'REQUIRED_FIELD');
    }

    if(!this.config.terminalId) {
      throw new XError('Missing terminal ID', 'REQUIRED_FIELD');
    }

    this.config.merchantId = `0000000${this.config.terminalId}`;
  }

  getRequestsEndpoint() {
    return constants.REQUEST_ENDPOINTS[this.config.sandbox ? constants.SANDBOX_MODE : constants.LIVE_MODE];
  }

  /**
   * @typedef {Object} AuthRequestParams
   * @property {String} amount
   * @property {String} currency
   * @property {String} orderId
   * @property {String} description
   */

  /**
   * @param {AuthRequestParams} params
   * return {Promise}
   */
  prepareAuthRequestData(params) {
    return new Promise((resolve, reject) => {

      if(!params.amount) {
        return reject(new XError('Amount is required', 'REQUIRED_FIELD'));
      }

      if(!params.orderId) {
        return reject(new XError('Order ID is required', 'REQUIRED_FIELD'));
      }

      const requestData = {
        AMOUNT: params.amount || '0.00',
        CURRENCY: params.currency || 'RON',
        ORDER: params.orderId || '',
        DESC: params.description || '',
        MERCH_NAME: this.config.merchantName,
        MERCH_URL: this.config.merchantUrl,
        MERCHANT: this.config.merchantId || '',
        TERMINAL: this.config.terminalId || '',
        EMAIL: this.config.email || '',
        TRTYPE: constants.TRANSACTION_TYPE_PREAUTH,
        COUNTRY: null,
        MERCH_GMT: null,
        TIMESTAMP: utils.getTimestamp(),
        NONCE: utils.generateNonce(),
        BACKREF: this.config.callbackUrl
      };

      requestData['P_SIGN'] = utils.signData(requestData, this.config.secretKey);

      return resolve({
        data: requestData,
        redirectUrl: this.getRequestsEndpoint()
      });
    });
  }

  /**
   * @typedef {Object} SaleRequestParams
   * @property {String} amount
   * @property {String} currency
   * @property {String} orderId
   * @property {String} referenceValue
   * @property {String} internalReferenceValue
   */

  /**
   * @param {SaleRequestParams} params
   * return {Promise}
   */
  prepareSaleRequestData(params) {
    return this._prepareSaleReversalRequest(params, constants.TRANSACTION_TYPE_SALE);
  }

  /**
   * @typedef {Object} ReversalRequestParams
   * @property {String} amount
   * @property {String} currency
   * @property {String} orderId
   * @property {String} referenceValue
   * @property {String} internalReferenceValue
   */

  /**
   * @param {ReversalRequestParams} params
   * return {Promise}
   */
  prepareReversalRequestData(params) {
    return this._prepareSaleReversalRequest(params, constants.TRANSACTION_TYPE_REVERSAL);
  }

  /**
   * @param {SaleRequestParams|ReversalRequestParams} params
   * @param {String} trType
   * return {Promise}
   */
  _prepareSaleReversalRequest(params, trType) {
    return new Promise((resolve, reject) => {

      if(!params.amount) {
        return reject(new XError('Amount is required', 'REQUIRED_FIELD'));
      }

      if(!params.orderId) {
        return reject(new XError('Order ID is required', 'REQUIRED_FIELD'));
      }

      if(!params.referenceValue) {
        return reject(new XError('Reference value is required', 'REQUIRED_FIELD'));
      }

      if(!params.internalReferenceValue) {
        return reject(new XError('Internal Reference value is required', 'REQUIRED_FIELD'));
      }

      const requestData = {
        ORDER: params.orderId || '',
        AMOUNT: params.amount || '0.00',
        CURRENCY: params.currency || 'RON',
        RRN: params.referenceValue || '',
        INT_REF: params.internalReferenceValue,
        TRTYPE: trType,
        TERMINAL: this.config.terminalId || '',
        TIMESTAMP: utils.getTimestamp(),
        NONCE: utils.generateNonce(),
        BACKREF: this.config.callbackUrl,
      };

      requestData['P_SIGN'] = utils.signData(requestData, this.config.secretKey);

      return resolve({
        data: requestData,
        redirectUrl: this.getRequestsEndpoint()
      });
    });
  }

  parseGatewayResponse(data) {
    return new Promise((resolve, reject) => {
      const expectedFields = utils.getResponseFieldsByTransactionType(data.TRTYPE);

      Lazy(expectedFields).each((field) => {
        if(typeof data[field] === 'undefined') {
          reject(new XError(`Invalid response data: missing '${field}' field`, 'RESPONSE_MISSING_FIELD'));
        }
      });

      const dataHash = utils.signData(Lazy(data).pick(expectedFields).toObject(),
        this.config.secretKey);

      if(dataHash !== data.P_SIGN) {
        reject(new XError(`Invalid response hash ${dataHash} - ${data.P_SIGN}`, 'INVALID_PSIGN'));
      }

      return resolve(utils.mapGatewayResponseFields(data));
    });
  }
}

module.exports = Gateway;