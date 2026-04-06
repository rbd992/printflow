'use strict';
/**
 * BambuCloud
 * Handles authentication with Bambu Lab's cloud services to get
 * an MQTT token for connecting via us.mqtt.bambulab.com
 *
 * Flow:
 *   1. POST /v1/user-service/user/login  → sends 2FA code to email
 *   2. POST /v1/user-service/user/login  → with 2FA code → returns token + uid
 *   3. Use uid + token to connect to us.mqtt.bambulab.com:8883
 *
 * Based on community reverse engineering of Bambu's API.
 * Tested against firmware 01.08.x and 01.09.x (October 2025).
 */

const https  = require('https');
const logger = require('../logger');

const CLOUD_API  = 'api.bambulab.com';
const CLOUD_MQTT = 'us.mqtt.bambulab.com';
const CLOUD_PORT = 8883;

/**
 * Make an HTTPS request to Bambu's API.
 */
function bambuRequest({ method, path, body, token }) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
      'User-Agent':    'bambu_network_agent/01.09.05.01',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request({
      hostname: CLOUD_API,
      path,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.message || json.error || `HTTP ${res.statusCode}`));
          }
        } catch {
          // Non-JSON response
          logger.error('[BambuCloud] Non-JSON response from ' + path + ': ' + data.slice(0, 200));
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, _raw: data });
          } else {
            reject(new Error(`Server returned non-JSON (HTTP ${res.statusCode}): ${data.slice(0, 100)}`));
          }
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Step 1: Send login request — triggers a 2FA code email.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{tfaKey: string}>} tfaKey needed for step 2
 */
async function requestLoginCode(email, password) {
  logger.info(`[BambuCloud] Requesting login code for ${email}`);
  const res = await bambuRequest({
    method: 'POST',
    path:   '/v1/user-service/user/login',
    body:   { account: email, password },
  });

  // If login succeeds without 2FA
  if (res.accessToken) {
    logger.info('[BambuCloud] Login succeeded without 2FA');
    return { token: res.accessToken, uid: res.uid, noTfa: true };
  }

  // 2FA required — Bambu returns loginType='verifyCode'
  // tfaKey may be an empty string in newer API versions — check loginType instead
  if (res.loginType === 'verifyCode' || res.tfaKey !== undefined) {
    logger.info('[BambuCloud] 2FA required — code sent to email');
    return { tfaKey: res.tfaKey || '' };
  }

  const errMsg = res.message || JSON.stringify(res);
  logger.error('[BambuCloud] Unexpected login response: ' + errMsg);
  throw new Error(errMsg || 'Login failed — check your email and password');
}

/**
 * Step 2: Submit 2FA code to get the access token.
 * @param {string} tfaKey  from step 1
 * @param {string} code    6-digit code from email
 * @returns {Promise<{token: string, uid: string}>}
 */
async function submitLoginCode(tfaKey, code, email) {
  logger.info('[BambuCloud] Submitting 2FA code');
  // When tfaKey is empty string, still send it with tfaCode (not account+code)
  const body = tfaKey !== undefined
    ? { tfaKey: tfaKey || '', tfaCode: code }
    : { account: email, code };
  const res = await bambuRequest({
    method: 'POST',
    path:   '/v1/user-service/user/login',
    body,
  });

  if (res.accessToken && res.uid) {
    logger.info(`[BambuCloud] Authenticated as uid=${res.uid}`);
    return { token: res.accessToken, uid: res.uid };
  }

  // Log full response so we can see what Bambu actually returned
  logger.error('[BambuCloud] Verify failed, full response: ' + JSON.stringify(res));
  throw new Error(res.message || 'Invalid 2FA code');
}

/**
 * Get list of devices bound to this Bambu account.
 * @param {string} token
 * @returns {Promise<Array>} array of device objects
 */
async function getDevices(token) {
  const res = await bambuRequest({
    method: 'GET',
    path:   '/v1/iot-service/api/user/device',
    token,
  });
  return res.devices || res.data || [];
}

/**
 * Build the MQTT connection options for cloud mode.
 * @param {string} uid    Bambu user ID (e.g. "u_abc123")
 * @param {string} token  Access token from login
 * @returns {object}      mqtt.connect() options
 */
function cloudMqttOptions(uid, token) {
  return {
    host:               CLOUD_MQTT,
    port:               CLOUD_PORT,
    protocol:           'mqtts',
    username:           uid,
    password:           token,
    clientId:           `printflow_${uid}_${Date.now()}`,
    rejectUnauthorized: false,
    reconnectPeriod:    10000,
    connectTimeout:     15000,
    keepalive:          30,
    clean:              true,
  };
}

/**
 * Build the MQTT connection options for LAN mode.
 * @param {string} ip          Printer IP address
 * @param {string} accessCode  8-digit LAN access code
 * @param {string} serial      Printer serial number
 * @returns {object}
 */
function lanMqttOptions(ip, accessCode, serial) {
  return {
    host:               ip,
    port:               CLOUD_PORT,
    protocol:           'mqtts',
    username:           'bblp',
    password:           accessCode,
    clientId:           `printflow_${serial}_${Date.now()}`,
    rejectUnauthorized: false,
    reconnectPeriod:    5000,
    connectTimeout:     10000,
    keepalive:          30,
    clean:              true,
  };
}

module.exports = {
  requestLoginCode,
  submitLoginCode,
  getDevices,
  cloudMqttOptions,
  lanMqttOptions,
  CLOUD_MQTT,
  CLOUD_PORT,
};
