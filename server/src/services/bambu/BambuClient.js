'use strict';
/**
 * BambuClient
 * Connects to a single Bambu Lab printer via either:
 *
 *   LAN Mode  — mqtts://PRINTER_IP:8883
 *               username = "bblp"
 *               password = ACCESS_CODE (shown on printer touchscreen)
 *
 *   Cloud Mode — mqtts://us.mqtt.bambulab.com:8883
 *                username = BAMBU_USER_ID (uid from Bambu account)
 *                password = BAMBU_TOKEN  (from cloud login)
 *
 * The MQTT message format is identical between both modes.
 * Cloud mode lets you monitor/control from anywhere — no LAN required.
 */

const mqtt   = require('mqtt');
const { EventEmitter } = require('events');
const { lanMqttOptions, cloudMqttOptions } = require('./BambuCloud');
const logger = require('../logger');

const POLL_INTERVAL_MS  = 8000;
const OFFLINE_TIMEOUT_MS = 30000;

class BambuClient extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.serial      Printer serial number
   * @param {string} opts.name        Human-readable name
   * @param {string} opts.mode        'lan' | 'cloud'
   *
   * LAN mode:
   * @param {string} opts.ip          Printer LAN IP
   * @param {string} opts.accessCode  8-digit LAN code
   *
   * Cloud mode:
   * @param {string} opts.uid         Bambu account user ID
   * @param {string} opts.token       Bambu cloud access token
   */
  constructor({ serial, name, mode = 'lan', ip, accessCode, uid, token }) {
    super();
    this.serial      = serial;
    this.name        = name;
    this.mode        = mode;
    this.ip          = ip;
    this.accessCode  = accessCode;
    this.uid         = uid;
    this.token       = token;
    this.client      = null;
    this._pollTimer  = null;
    this._offlineTimer = null;
    this._connected  = false;
    this.state       = this._blankState();
  }

  _blankState() {
    return {
      serial:          this.serial,
      name:            this.name,
      mode:            this.mode,
      online:          false,
      status:          'offline',
      print_pct:       0,
      layer_num:       0,
      total_layer_num: 0,
      eta_min:         0,
      filename:        '',
      nozzle_temp:     0,
      nozzle_target:   0,
      bed_temp:        0,
      bed_target:      0,
      chamber_temp:    0,
      speed_pct:       100,
      fan_gear:        0,
      filament_used_g: 0,
      wifi_signal:     '',
      error_code:      '',
      ams:             [],
      raw:             {},
      updated_at:      new Date().toISOString(),
    };
  }

  connect() {
    if (this.client) this.disconnect();

    // Build connection options based on mode
    let mqttOpts;
    if (this.mode === 'cloud') {
      if (!this.uid || !this.token) {
        logger.error(`[Bambu:${this.serial}] Cloud mode requires uid and token`);
        this.emit('error', new Error('Cloud mode requires uid and token'));
        return;
      }
      mqttOpts = cloudMqttOptions(this.uid, this.token);
      logger.info(`[Bambu:${this.serial}] Connecting via CLOUD (${mqttOpts.host})`);
    } else {
      if (!this.ip || !this.accessCode) {
        logger.error(`[Bambu:${this.serial}] LAN mode requires ip and accessCode`);
        this.emit('error', new Error('LAN mode requires ip and accessCode'));
        return;
      }
      mqttOpts = lanMqttOptions(this.ip, this.accessCode, this.serial);
      logger.info(`[Bambu:${this.serial}] Connecting via LAN (${this.ip})`);
    }

    this.client = mqtt.connect(mqttOpts);

    this.client.on('connect', () => {
      logger.info(`[Bambu:${this.serial}] Connected (${this.mode} mode)`);
      this._connected   = true;
      this.state.online = true;
      this.emit('connected', { mode: this.mode });

      const topics = [`device/${this.serial}/report`];
      this.client.subscribe(topics, { qos: 0 }, (err) => {
        if (err) {
          logger.error(`[Bambu:${this.serial}] Subscribe error:`, err.message);
        } else {
          this._requestPush();
          this._startPolling();
        }
      });
    });

    this.client.on('message', (topic, payload) => {
      this._resetOfflineTimer();
      try {
        const msg = JSON.parse(payload.toString());
        this._handleMessage(msg);
      } catch {
        logger.warn(`[Bambu:${this.serial}] Bad JSON on ${topic}`);
      }
    });

    this.client.on('reconnect', () => {
      logger.info(`[Bambu:${this.serial}] Reconnecting…`);
      this.emit('reconnecting');
    });

    this.client.on('offline', () => {
      logger.warn(`[Bambu:${this.serial}] MQTT offline`);
      this._markOffline();
    });

    this.client.on('error', (err) => {
      logger.error(`[Bambu:${this.serial}] MQTT error: ${err.message}`);
      this.emit('error', err);
    });

    this.client.on('close', () => {
      this._connected = false;
      this._markOffline();
    });
  }

  disconnect() {
    this._stopPolling();
    if (this.client) { this.client.end(true); this.client = null; }
    this._connected = false;
    this._markOffline();
  }

  _handleMessage(msg) {
    const print = msg.print;
    if (!print) return;

    const prev = { ...this.state };
    this.state.raw        = print;
    this.state.online     = true;
    this.state.updated_at = new Date().toISOString();

    if (print.gcode_state !== undefined) {
      const map = { IDLE:'idle', PREPARE:'preparing', RUNNING:'printing', PAUSE:'paused', FINISH:'idle', FAILED:'error' };
      this.state.status = map[print.gcode_state] || print.gcode_state?.toLowerCase() || 'idle';
    }
    if (print.mc_percent !== undefined)           this.state.print_pct       = Math.round(print.mc_percent);
    if (print.layer_num  !== undefined)           this.state.layer_num        = print.layer_num;
    if (print.total_layer_num !== undefined)      this.state.total_layer_num  = print.total_layer_num;
    if (print.mc_remaining_time !== undefined)    this.state.eta_min          = print.mc_remaining_time;
    if (print.subtask_name)                       this.state.filename         = print.subtask_name;
    if (print.nozzle_temper !== undefined)        this.state.nozzle_temp      = Math.round(print.nozzle_temper * 10) / 10;
    if (print.nozzle_target_temper !== undefined) this.state.nozzle_target    = Math.round(print.nozzle_target_temper);
    if (print.bed_temper !== undefined)           this.state.bed_temp         = Math.round(print.bed_temper * 10) / 10;
    if (print.bed_target_temper !== undefined)    this.state.bed_target       = Math.round(print.bed_target_temper);
    if (print.chamber_temper !== undefined)       this.state.chamber_temp     = Math.round(print.chamber_temper * 10) / 10;
    if (print.spd_mag !== undefined)              this.state.speed_pct        = print.spd_mag;
    if (print.wifi_signal)                        this.state.wifi_signal      = print.wifi_signal;
    if (print.print_error !== undefined)          this.state.error_code       = print.print_error !== 0 ? `0x${print.print_error.toString(16).toUpperCase()}` : '';

    if (print.ams?.ams) {
      this.state.ams = print.ams.ams.map((unit, ui) => ({
        unit: ui,
        trays: (unit.tray || []).map((tray, ti) => ({
          index:      ti,
          tray_id:    tray.id,
          material:   tray.tray_type || '',
          color:      tray.tray_color ? `#${tray.tray_color.slice(0,6)}` : '',
          remain_pct: tray.remain !== undefined ? tray.remain : 100,
          loaded:     tray.tray_now === tray.id,
          tag_uid:    tray.tag_uid || '',
        })),
      }));
    }

    const wasActive   = ['printing','preparing','paused'].includes(prev.status);
    const nowFinished = this.state.status === 'idle' && prev.status !== 'idle' && wasActive;
    if (nowFinished && prev.filament_used_g > 0) {
      this.emit('print_complete', { serial: this.serial, filename: prev.filename, filament_used_g: prev.filament_used_g, ams: this.state.ams });
    }

    this.emit('state', { ...this.state });
  }

  _publish(payload) {
    if (!this._connected || !this.client) return;
    this.client.publish(`device/${this.serial}/request`, JSON.stringify(payload), { qos: 0 });
  }

  _requestPush() { this._publish({ pushing: { sequence_id: '0', command: 'pushall' } }); }
  pause()        { this._publish({ print: { sequence_id: '0', command: 'pause'  } }); }
  resume()       { this._publish({ print: { sequence_id: '0', command: 'resume' } }); }
  stop()         { this._publish({ print: { sequence_id: '0', command: 'stop'   } }); }
  setSpeed(level){ this._publish({ print: { sequence_id: '0', command: 'print_speed', param: String(level) } }); }

  _startPolling() {
    this._stopPolling();
    this._pollTimer    = setInterval(() => { if (this._connected) this._requestPush(); }, POLL_INTERVAL_MS);
    this._resetOfflineTimer();
  }
  _stopPolling() {
    if (this._pollTimer)    { clearInterval(this._pollTimer);   this._pollTimer    = null; }
    if (this._offlineTimer) { clearTimeout(this._offlineTimer); this._offlineTimer = null; }
  }
  _resetOfflineTimer() {
    if (this._offlineTimer) clearTimeout(this._offlineTimer);
    this._offlineTimer = setTimeout(() => { logger.warn(`[Bambu:${this.serial}] Offline timeout`); this._markOffline(); }, OFFLINE_TIMEOUT_MS);
  }
  _markOffline() {
    this.state.online = false;
    this.state.status = 'offline';
    this.emit('state', { ...this.state });
  }

  get isConnected()  { return this._connected; }
  get currentState() { return { ...this.state }; }
}

module.exports = BambuClient;

