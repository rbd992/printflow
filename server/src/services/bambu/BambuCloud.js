'use strict';
const https  = require('https');
const logger = require('../logger');

const CLOUD_API  = 'api.bambulab.com';
const CLOUD_MQTT = 'us.mqtt.bambulab.com';
const CLOUD_PORT = 8883;

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
      hostname: CLOUD_API, path, method, headers,
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        // Bambu verify endpoint returns empty body on success
        if (!data || data.trim() === '') {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, _empty: true });
          } else {
            reject(new Error(`HTTP ${res.statusCode} with empty response`));
          }
          return;
        }
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.message || json.error || `HTTP ${res.statusCode}`));
          }
        } catch {
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

async function requestLoginCode(email, password) {
  logger.info(`[BambuCloud] Requesting login code for ${email}`);
  const res = await bambuRequest({
    method: 'POST', path: '/v1/user-service/user/login',
    body: { account: email, password },
  });

  if (res.accessToken) {
    logger.info('[BambuCloud] Login succeeded without 2FA');
    return { token: res.accessToken, uid: res.uid, noTfa: true };
  }

  if (res.loginType === 'verifyCode' || res.tfaKey !== undefined) {
    logger.info('[BambuCloud] 2FA required — code sent to email');
    return { tfaKey: res.tfaKey || '' };
  }

  const errMsg = res.message || JSON.stringify(res);
  logger.error('[BambuCloud] Unexpected login response: ' + errMsg);
  throw new Error(errMsg || 'Login failed — check your email and password');
}

async function submitLoginCode(tfaKey, code, email) {
  logger.info('[BambuCloud] Submitting 2FA code');
  const body = { tfaKey: tfaKey || '', tfaCode: code };
  const res = await bambuRequest({
    method: 'POST', path: '/v1/user-service/user/login', body,
  });

  if (res.accessToken && res.uid) {
    logger.info(`[BambuCloud] Authenticated as uid=${res.uid}`);
    return { token: res.accessToken, uid: res.uid };
  }

  // Bambu returns empty body when verify succeeds — need to re-login to get token
  if (res.success && res._empty) {
    logger.info('[BambuCloud] Verify accepted (empty response) — needs re-login to get token');
    return { needsRelogin: true };
  }

  logger.error('[BambuCloud] Verify failed, response: ' + JSON.stringify(res));
  throw new Error(res.message || 'Invalid verification code');
}

async function getDevices(token) {
  const res = await bambuRequest({
    method: 'GET', path: '/v1/iot-service/api/user/device', token,
  });
  return res.devices || res.data || [];
}

function cloudMqttOptions(uid, token) {
  return {
    host: CLOUD_MQTT, port: CLOUD_PORT, protocol: 'mqtts',
    username: uid, password: token,
    clientId: `printflow_${uid}_${Date.now()}`,
    rejectUnauthorized: false, reconnectPeriod: 10000, connectTimeout: 15000, keepalive: 30, clean: true,
  };
}

function lanMqttOptions(ip, accessCode, serial) {
  return {
    host: ip, port: CLOUD_PORT, protocol: 'mqtts',
    username: 'bblp', password: accessCode,
    clientId: `printflow_${serial}_${Date.now()}`,
    rejectUnauthorized: false, reconnectPeriod: 5000, connectTimeout: 10000, keepalive: 30, clean: true,
  };
}

module.exports = { requestLoginCode, submitLoginCode, getDevices, cloudMqttOptions, lanMqttOptions, CLOUD_MQTT, CLOUD_PORT };
