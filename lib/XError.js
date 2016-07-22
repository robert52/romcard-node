class XError extends Error {
  constructor(message, code) {
    super();
    this.message = message;
    this.code = code;
    this.name = this.constructor.name;

    Error.captureStackTrace(this);
  }
}

module.exports = XError;
