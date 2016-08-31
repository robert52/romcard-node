const express = require('express');
const nunjucks = require('express-nunjucks');
const app = express();
const bodyParser = require('body-parser');
const constants = require('../lib/constants');
const Gateway = require('../lib/Gateway');
const XError = require('../lib/XError');

// Init gateway object with the required parameters
const gateway = new Gateway({
  merchantName: 'PONY CAR SHARING',
  merchantUrl: 'http://localhost',
  terminalId: '60000863',
  email: 'iulian@mediadrome.at',
  secretKey: '17E308CAE9EE71BB87671128F488097B',
  sandbox: false,
  callbackUrl: 'http://localhost/callback'
});

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');

nunjucks.setup({
  // (default: true) controls if output with dangerous characters are escaped automatically.
  autoescape: true,
  // (default: false) throw errors when outputting a null/undefined value.
  throwOnUndefined: false,
  // (default: false) automatically remove trailing newlines from a block/tag.
  trimBlocks: false,
  // (default: false) automatically remove leading whitespace from a block/tag.
  lstripBlocks: false,
  // (default: false) if true, the system will automatically update templates when they are changed on the filesystem.
  watch: true,
  // (default: false) if true, the system will avoid using a cache and templates will be recompiled every single time.
  noCache: true,
  // (default: see nunjucks syntax) defines the syntax for nunjucks tags.
  tags: {}
}, app);

app.get('/', (req, res) => {

  gateway.prepareAuthRecurringData({
    amount: '1.00',
    currency: 'RON',
    orderId: '20160720123',
    description: 'Testing',
    recurFreq: '1',
    recurExp: '20161231'
  })
    .then(({data, redirectUrl}) => {
      return res.render('index', {
        data, redirectUrl
      });
    });
});

app.get('/callback', (req, res) => {
  console.log(req.query);

  gateway.parseGatewayResponse(req.query)
    .then((gatewayResponse) => {
      console.log(gatewayResponse);
      switch (gatewayResponse.trType) {
        case constants.TRANSACTION_TYPE_PREAUTH:
          // handle pre-auth
          if(parseInt(gatewayResponse.status) === constants.STATUS_APPROVED_TRANSACTION) {
            // transaction approved

            gateway.prepareReversalRequestData({
              orderId: gatewayResponse.orderId,
              amount: gatewayResponse.amount,
              referenceValue: gatewayResponse.referenceValue,
              internalReferenceValue: gatewayResponse.internalReferenceValue
            })
              .then((result) => {
                return res.render('sale', result);
              })
              .catch((err) => {
                console.error(err);
                return res.sendStatus(500);
              });
          }

          if (parseInt(gatewayResponse.status) === constants.STATUS_PROCESSING_ERROR) {
            return res.sendStatus(500);
          }

          break;
        case constants.TRANSACTION_TYPE_SALE:
          // handle sale
          res.sendStatus(200);
          break;
        case constants.TRANSACTION_TYPE_REVERSAL:
          // handle reversal
          res.sendStatus(200);
          break;
      }
    })
    .catch(XError, (err) => {
      // handle errors
      console.error(err);
      res.sendStatus(500);
    })
    .catch((err) => {
      // handle generic error
      res.sendStatus(500);
    });
});

app.listen(80, function () {
  console.log('Example app listening on port 80!');
});
