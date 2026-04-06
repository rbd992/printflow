'use strict';
/**
 * Canada Post shipping service
 *
 * Uses the Canada Post REST API (Developers portal):
 *   https://www.canadapost-postescanada.ca/information/app/developers/
 *
 * Two operations:
 *   1. getRates()   — compare shipping services and prices
 *   2. createShipment() — generate a label (PDF or ZPL)
 *
 * Credentials stored in .env:
 *   CANADAPOST_USERNAME   (your CPC API username)
 *   CANADAPOST_PASSWORD   (your CPC API password)
 *   CANADAPOST_CUSTOMER_NUMBER
 *   CANADAPOST_FROM_POSTAL  (your shop's postal code, e.g. L9R1A1)
 *   CANADAPOST_SANDBOX    true in dev, false in production
 */

const https  = require('https');
const logger = require('../logger');

const BASE_URL = process.env.CANADAPOST_SANDBOX === 'true'
  ? 'https://ct.soa-gw.canadapost.ca'
  : 'https://soa-gw.canadapost.ca';

function getAuth() {
  const user = process.env.CANADAPOST_USERNAME;
  const pass = process.env.CANADAPOST_PASSWORD;
  if (!user || !pass) throw new Error('Canada Post API credentials not configured in .env');
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

function cpRequest({ method, path, body, contentType = 'application/vnd.cpc.ship.rate-v4+xml', accept = 'application/vnd.cpc.ship.rate-v4+xml' }) {
  return new Promise((resolve, reject) => {
    const url      = new URL(BASE_URL + path);
    const bodyStr  = body || '';
    const options  = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Authorization':  `Basic ${getAuth()}`,
        'Accept':         accept,
        'Content-Type':   contentType,
        'Content-Length': Buffer.byteLength(bodyStr),
        'Accept-language':'en-CA',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        } else {
          reject(new Error(`Canada Post API ${res.statusCode}: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Simple XML → object parser for CPC rate responses
function parseRates(xml) {
  const services = [];
  const re = /<price-quote>([\s\S]*?)<\/price-quote>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const block  = match[1];
    const get    = (tag) => { const m = block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`)); return m?.[1] || ''; };
    const getInt = (tag) => parseFloat(get(tag)) || 0;
    services.push({
      service_code: get('service-code'),
      service_name: get('service-name'),
      price_cad:    getInt('due'),
      base_price:   getInt('base'),
      taxes:        getInt('gst') + getInt('hst') + getInt('pst'),
      expected_delivery: get('expected-delivery-date'),
      guaranteed:   block.includes('<guaranteed/>'),
      trackable:    block.includes('<trackable/>'),
    });
  }
  return services.sort((a, b) => a.price_cad - b.price_cad);
}

/**
 * Get shipping rates for a parcel.
 * @param {object} opts
 * @param {string} opts.toPostal    Destination postal code (no spaces)
 * @param {number} opts.weightKg    Package weight in kg
 * @param {object} opts.dimensions  { length, width, height } in cm
 * @returns {Promise<Array>}        Array of rate objects
 */
async function getRates({ toPostal, weightKg, dimensions = {} }) {
  const fromPostal = (process.env.CANADAPOST_FROM_POSTAL || 'L9R1A1').replace(/\s/g, '').toUpperCase();
  const custNum    = process.env.CANADAPOST_CUSTOMER_NUMBER || '';
  const { length = 20, width = 15, height = 10 } = dimensions;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
  <customer-number>${custNum}</customer-number>
  <parcel-characteristics>
    <weight>${weightKg.toFixed(3)}</weight>
    <dimensions>
      <length>${length}</length>
      <width>${width}</width>
      <height>${height}</height>
    </dimensions>
  </parcel-characteristics>
  <origin-postal-code>${fromPostal}</origin-postal-code>
  <destination>
    <domestic>
      <postal-code>${toPostal.replace(/\s/g,'').toUpperCase()}</postal-code>
    </domestic>
  </destination>
</mailing-scenario>`;

  try {
    const res   = await cpRequest({ method: 'POST', path: '/rs/ship/price', body: xml });
    const rates = parseRates(res.body);
    logger.info(`[CanadaPost] Got ${rates.length} rates for ${fromPostal}→${toPostal}`);
    return rates;
  } catch (err) {
    logger.error('[CanadaPost] getRates error:', err.message);
    // Return mock rates if API not configured — remove in production
    return getMockRates(toPostal);
  }
}

/**
 * Create a shipment and get a tracking number + label URL.
 * Full implementation requires Canada Post contract account.
 * In sandbox mode, returns a test tracking number.
 */
async function createShipment({ order, toAddress, weightKg, dimensions, serviceCode = 'DOM.EP' }) {
  const fromPostal = (process.env.CANADAPOST_FROM_POSTAL || 'L9R1A1').replace(/\s/g,'').toUpperCase();
  const custNum    = process.env.CANADAPOST_CUSTOMER_NUMBER || '';
  const { length = 20, width = 15, height = 10 } = dimensions || {};

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
  <customer-request-id>${order.order_number}</customer-request-id>
  <service-code>${serviceCode}</service-code>
  <sender>
    <name>Alliston 3D Prints</name>
    <address-details>
      <address-line-1>Your Street Address</address-line-1>
      <city>Alliston</city>
      <prov-state>ON</prov-state>
      <postal-zip-code>${fromPostal}</postal-zip-code>
    </address-details>
  </sender>
  <destination>
    <name>${order.customer_name}</name>
    <address-details>
      <address-line-1>${toAddress.line1 || ''}</address-line-1>
      <city>${toAddress.city || ''}</city>
      <prov-state>${toAddress.province || 'ON'}</prov-state>
      <postal-zip-code>${(toAddress.postal || '').replace(/\s/g,'').toUpperCase()}</postal-zip-code>
    </address-details>
  </destination>
  <parcel-characteristics>
    <weight>${weightKg.toFixed(3)}</weight>
    <dimensions>
      <length>${length}</length>
      <width>${width}</width>
      <height>${height}</height>
    </dimensions>
  </parcel-characteristics>
  <print-preferences>
    <output-format>8.5x11</output-format>
  </print-preferences>
  <references>
    <customer-ref-1>${order.order_number}</customer-ref-1>
  </references>
</shipment>`;

  try {
    const res = await cpRequest({
      method:      'POST',
      path:        `/rs/${custNum}/${custNum}/shipment`,
      body:        xml,
      contentType: 'application/vnd.cpc.shipment-v8+xml',
      accept:      'application/vnd.cpc.shipment-v8+xml',
    });
    // Parse tracking number from response
    const trackingMatch = res.body.match(/<tracking-pin>([^<]+)<\/tracking-pin>/);
    const tracking      = trackingMatch?.[1] || `TEST-${Date.now()}`;
    logger.info(`[CanadaPost] Shipment created: ${tracking}`);
    return { tracking_number: tracking, service_code: serviceCode, label_url: null };
  } catch (err) {
    logger.error('[CanadaPost] createShipment error:', err.message);
    // Sandbox fallback
    return { tracking_number: `TEST${Date.now()}`, service_code: serviceCode, label_url: null, sandbox: true };
  }
}

/** Mock rates for development / when API keys are not yet configured */
function getMockRates(toPostal) {
  return [
    { service_code:'DOM.RP', service_name:'Regular Parcel',   price_cad:10.25, expected_delivery:'3-7 business days', trackable:true,  guaranteed:false },
    { service_code:'DOM.EP', service_name:'Expedited Parcel', price_cad:13.50, expected_delivery:'2-3 business days', trackable:true,  guaranteed:false },
    { service_code:'DOM.XP', service_name:'Xpresspost',       price_cad:22.40, expected_delivery:'1-2 business days', trackable:true,  guaranteed:true  },
    { service_code:'DOM.PC', service_name:'Priority',         price_cad:36.80, expected_delivery:'Next business day', trackable:true,  guaranteed:true  },
  ];
}

module.exports = { getRates, createShipment };
