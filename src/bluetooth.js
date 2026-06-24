// Web Bluetooth API Manager for AeroSpin
// Connects to Heart Rate, Cycling Power, Cadence, FTMS Smart Trainers,
// and ThinkRider XXPro (dedicated scan with namePrefix filter)

// BLE Service & Characteristic UUIDs - Using full UUIDs for better compatibility
const UUIDS = {
  HR: {
    service: '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
    measurement: '00002a37-0000-1000-8000-00805f9b34fb' // Heart Rate Measurement
  },
  POWER: {
    service: '00001818-0000-1000-8000-00805f9b34fb', // Cycling Power Service
    measurement: '00002a63-0000-1000-8000-00805f9b34fb' // Cycling Power Measurement
  },
  CADENCE: {
    service: '00001816-0000-1000-8000-00805f9b34fb', // Cycling Speed and Cadence
    measurement: '00002a5b-0000-1000-8000-00805f9b34fb' // CSC Measurement
  },
  FTMS: {
    service: '00001826-0000-1000-8000-00805f9b34fb', // Fitness Machine Service
    indoor_bike_data: '00002ad2-0000-1000-8000-00805f9b34fb', // Indoor Bike Data
    control_point: '00002ad9-0000-1000-8000-00805f9b34fb' // Fitness Machine Control Point
  }
};

export class BLEManager {
  constructor() {
    this.devices = { power: null, hr: null, cadence: null, ftms: null };
    this.characteristics = { ftmsControl: null };
    
    // Callback handlers
    this.onPowerUpdate = null;
    this.onCadenceUpdate = null;
    this.onHeartRateUpdate = null;
    this.onSpeedUpdate = null;
    this.onDistanceUpdate = null;
    this.onStatusChange = null; // (deviceKey, statusString)

    // Crank calculations for cadence from power meter
    this.lastCrankRevCount = -1;
    this.lastCrankEventTime = -1;
    
    // Mock Telemetry state (when no hardware is connected)
    this.isMocking = false;
    this.mockInterval = null;
    this.mockTargetPower = 150;
    this.mockCadence = 85;
    this.mockHeartRate = 120;
    this.mockSpeed = 25.0;
    this.mockDistance = 0.0;
    this.mockGrade = 0.0;

    // Check if Web Bluetooth is available
    this.isBluetoothAvailable = 'bluetooth' in navigator;
  }

  // Set status helper
  setStatus(deviceKey, status) {
    if (this.onStatusChange) {
      this.onStatusChange(deviceKey, status);
    }
  }

  // Check browser support
  checkBrowserSupport() {
    if (!this.isBluetoothAvailable) {
      alert('您的瀏覽器不支援 Web Bluetooth API。\n請使用 Google Chrome、Microsoft Edge 或 Opera 瀏覽器。');
      return false;
    }
    return true;
  }

  // --- HEART RATE CONNECTION ---
  async connectHeartRate() {
    if (!this.checkBrowserSupport()) return false;
    
    this.setStatus('hr', 'searching');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [UUIDS.HR.service] },
          { name: 'Polar', namePrefix: 'Polar' },
          { name: 'Garmin', namePrefix: 'Garmin' },
          { name: 'Wahoo', namePrefix: 'Wahoo' }
        ],
        optionalServices: []
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UUIDS.HR.service);
      const characteristic = await service.getCharacteristic(UUIDS.HR.measurement);
      
      this.devices.hr = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this, 'hr'));
      
      characteristic.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const flags = val.getUint8(0);
        const is16Bit = flags & 0x01;
        let hr = 0;
        if (is16Bit) {
          hr = val.getUint16(1, true);
        } else {
          hr = val.getUint8(1);
        }
        if (this.onHeartRateUpdate) this.onHeartRateUpdate(hr);
      });

      await characteristic.startNotifications();
      this.setStatus('hr', 'connected');
      console.log('✅ Heart Rate Monitor connected');
      return true;
    } catch (err) {
      console.error("❌ BLE HR Error:", err);
      this.setStatus('hr', 'disconnected');
      return false;
    }
  }

  // --- CYCLING POWER CONNECTION ---
  async connectPowerMeter() {
    if (!this.checkBrowserSupport()) return false;
    
    this.setStatus('power', 'searching');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [UUIDS.POWER.service] },
          { namePrefix: 'Stages' },
          { namePrefix: 'Quarq' },
          { namePrefix: 'SRM' },
          { namePrefix: 'Power2Max' }
        ],
        optionalServices: []
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UUIDS.POWER.service);
      const characteristic = await service.getCharacteristic(UUIDS.POWER.measurement);
      
      this.devices.power = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this, 'power'));
      
      characteristic.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const flags = val.getUint16(0, true);
        const power = val.getInt16(2, true);
        
        if (this.onPowerUpdate) this.onPowerUpdate(power);

        // Extract Cadence from Crank Revolution Data if present
        const hasCrankRev = flags & 0x20; // Bit 5
        if (hasCrankRev) {
          let offset = 4;
          if (flags & 0x01) offset += 1; // Pedal Balance
          if (flags & 0x08) offset += 8; // Torque
          if (flags & 0x10) offset += 6; // Wheel Revs
          
          if (val.byteLength >= offset + 4) {
            const crankRevs = val.getUint16(offset, true);
            const crankTime = val.getUint16(offset + 2, true);
            this.calculateCadenceFromCrank(crankRevs, crankTime);
          }
        }
      });

      await characteristic.startNotifications();
      this.setStatus('power', 'connected');
      console.log('✅ Power Meter connected');
      return true;
    } catch (err) {
      console.error("❌ BLE Power Error:", err);
      this.setStatus('power', 'disconnected');
      return false;
    }
  }

  // Calculate cadence from successive power meter events
  calculateCadenceFromCrank(crankRevs, crankTime) {
    if (this.lastCrankRevCount > -1 && crankRevs !== this.lastCrankRevCount) {
      let revDiff = crankRevs - this.lastCrankRevCount;
      if (revDiff < 0) revDiff += 65536; // rollover

      let timeDiff = crankTime - this.lastCrankEventTime;
      if (timeDiff < 0) timeDiff += 65536; // rollover

      if (timeDiff > 0) {
        // time is in 1/1024s of a second
        const rpm = (revDiff * 1024 * 60) / timeDiff;
        if (rpm > 0 && rpm < 200) {
          if (this.onCadenceUpdate) this.onCadenceUpdate(Math.round(rpm));
        }
      }
    }
    this.lastCrankRevCount = crankRevs;
    this.lastCrankEventTime = crankTime;
  }

  // --- SPEED AND CADENCE CONNECTION ---
  async connectCadenceSensor() {
    if (!this.checkBrowserSupport()) return false;
    
    this.setStatus('cadence', 'searching');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [UUIDS.CADENCE.service] },
          { namePrefix: 'Garmin' },
          { namePrefix: 'Wahoo' }
        ],
        optionalServices: []
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UUIDS.CADENCE.service);
      const characteristic = await service.getCharacteristic(UUIDS.CADENCE.measurement);
      
      this.devices.cadence = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this, 'cadence'));
      
      characteristic.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const flags = val.getUint8(0);
        const hasWheel = flags & 0x01;
        const hasCrank = flags & 0x02;
        
        let offset = 1;
        if (hasWheel) {
          offset += 6;
        }
        
        if (hasCrank && val.byteLength >= offset + 4) {
          const crankRevs = val.getUint16(offset, true);
          const crankTime = val.getUint16(offset + 2, true);
          this.calculateCadenceFromCrank(crankRevs, crankTime);
        }
      });

      await characteristic.startNotifications();
      this.setStatus('cadence', 'connected');
      console.log('✅ Cadence Sensor connected');
      return true;
    } catch (err) {
      console.error("❌ BLE Cadence Error:", err);
      this.setStatus('cadence', 'disconnected');
      return false;
    }
  }


  // --- FTMS / SMART TRAINER CONTROL CONNECTION ---
  async connectFTMS() {
    if (!this.checkBrowserSupport()) return false;
    
    this.setStatus('power', 'searching');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [UUIDS.FTMS.service] },
          { namePrefix: 'ThinkRider' },
          { namePrefix: 'Wahoo' },
          { namePrefix: 'KICKR' },
          { namePrefix: 'Tacx' },
          { namePrefix: 'Garmin' },
          { namePrefix: 'Elite' },
          { namePrefix: 'Wattbike' }
        ],
        optionalServices: [
          UUIDS.HR.service,
          UUIDS.POWER.service
        ]
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UUIDS.FTMS.service);
      
      this.devices.ftms = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this, 'ftms'));

      // 1. Subscribe to Indoor Bike Data (for telemetry)
      try {
        const dataChar = await service.getCharacteristic(UUIDS.FTMS.indoor_bike_data);
        dataChar.addEventListener('characteristicvaluechanged', (e) => {
          const val = e.target.value;
          this.parseFTMSBikeData(val);
        });
        await dataChar.startNotifications();
        console.log('✅ FTMS Indoor Bike Data notifications started');
      } catch (err) {
        console.warn("⚠️ FTMS data characteristic not supported:", err);
      }

      // 2. Get Control Point Characteristic for writing settings
      try {
        this.characteristics.ftmsControl = await service.getCharacteristic(UUIDS.FTMS.control_point);
        await this.characteristics.ftmsControl.startNotifications();
        
        // Request Control
        await this.requestFTMSControl();
        console.log('✅ FTMS Control Point ready');
      } catch (err) {
        console.error("❌ FTMS control point failed:", err);
      }

      this.setStatus('power', 'connected');
      console.log('✅ Smart Trainer (FTMS) connected');
      return true;
    } catch (err) {
      console.error("❌ BLE FTMS Error:", err);
      this.setStatus('power', 'disconnected');
      return false;
    }
  }

  // Handle device disconnection
  handleDisconnect(deviceKey) {
    console.log(`⚠️ Device disconnected: ${deviceKey}`);
    this.devices[deviceKey] = null;
    this.setStatus(deviceKey, 'disconnected');
    
    if (deviceKey === 'ftms') {
      this.characteristics.ftmsControl = null;
    }
  }

  // Parse FTMS bike metrics data
  parseFTMSBikeData(val) {
    try {
      const flags = val.getUint16(0, true);
      let offset = 2;

      // Bit 0: More Data (0 = present)
      if (!(flags & 0x01)) {
        const speedRaw = val.getUint16(offset, true); // 0.01 km/h
        const speedKmh = speedRaw / 100;
        if (this.onSpeedUpdate) this.onSpeedUpdate(speedKmh);
        offset += 2;
      }

      // Bit 2: Cadence Present
      if (flags & 0x04) {
        const cadenceRaw = val.getUint16(offset, true); // 0.5 RPM
        const cadenceRpm = cadenceRaw / 2;
        if (this.onCadenceUpdate) this.onCadenceUpdate(Math.round(cadenceRpm));
        offset += 2;
      }

      // Bit 4: Total Distance Present
      if (flags & 0x10) {
        const distanceM = val.getUint16(offset, true) + (val.getUint8(offset + 2) << 16); // 24-bit
        if (this.onDistanceUpdate) this.onDistanceUpdate(distanceM / 1000);
        offset += 3;
      }

      // Bit 5: Resistance Level Present
      if (flags & 0x20) {
        offset += 2;
      }

      // Bit 6: Instantaneous Power Present
      if (flags & 0x40) {
        const powerW = val.getInt16(offset, true);
        if (this.onPowerUpdate) this.onPowerUpdate(powerW);
        offset += 2;
      }

      // Bit 9: Heart Rate Present
      if (flags & 0x200) {
        const hrBpm = val.getUint8(offset);
        if (this.onHeartRateUpdate) this.onHeartRateUpdate(hrBpm);
      }
    } catch (err) {
      console.error("Error parsing FTMS data:", err);
    }
  }

  // Send request control command to FTMS
  async requestFTMSControl() {
    if (!this.characteristics.ftmsControl) return;
    try {
      const data = new Uint8Array([0x00]); // Request Control
      await this.characteristics.ftmsControl.writeValue(data);
    } catch (err) {
      console.warn("FTMS Request Control failed:", err);
    }
  }

  // Set target power (ERG Mode)
  async setTargetPower(watts) {
    if (!this.characteristics.ftmsControl) return;
    try {
      // Clamp to reasonable range
      const w = Math.max(0, Math.min(5000, Math.round(watts)));
      const data = new Uint8Array([0x05, w & 0xFF, (w >> 8) & 0xFF]);
      await this.characteristics.ftmsControl.writeValue(data);
    } catch (err) {
      console.error("❌ FTMS Set Target Power failed:", err);
    }
  }

  // Set Slope Simulation (SIM Mode)
  async setIndoorBikeSimulation(slopeGrade, riderWeight) {
    if (!this.characteristics.ftmsControl) return;
    try {
      const gradeVal = Math.round(slopeGrade * 100); // 0.01% resolution
      const crrVal = 40; // 0.004
      const cwVal = 51; // 0.51 kg/m
      
      const data = new Uint8Array([
        0x11, 
        0x00, 0x00, // Wind Speed (0)
        gradeVal & 0xFF, (gradeVal >> 8) & 0xFF, // Grade
        crrVal, // Crr
        cwVal   // Cw
      ]);
      await this.characteristics.ftmsControl.writeValue(data);
    } catch (err) {
      console.error("❌ FTMS Set Simulation failed:", err);
    }
  }

  // --- MOCK MODE DATA GENERATOR ---
  startMocking(userFTP) {
    this.isMocking = true;
    this.mockDistance = 0.0;
    
    if (this.mockInterval) clearInterval(this.mockInterval);
    
    this.mockInterval = setInterval(() => {
      let targetPower = this.mockTargetPower;
      const noise = (Math.random() - 0.5) * 8;
      const currentPower = Math.max(0, Math.round(targetPower + noise));
      
      if (this.onPowerUpdate) this.onPowerUpdate(currentPower);

      const targetCadence = currentPower > 0 ? 88 + (currentPower - userFTP) / 10 + (Math.random() - 0.5) * 4 : 0;
      this.mockCadence = Math.round(Math.max(0, Math.min(120, targetCadence)));
      if (this.onCadenceUpdate) this.onCadenceUpdate(this.mockCadence);

      const targetHr = currentPower > 0 ? 110 + (currentPower / userFTP) * 50 : 65;
      const hrDiff = targetHr - this.mockHeartRate;
      this.mockHeartRate += hrDiff * 0.05 + (Math.random() - 0.5) * 0.5;
      const currentHr = Math.round(Math.max(50, Math.min(195, this.mockHeartRate)));
      if (this.onHeartRateUpdate) this.onHeartRateUpdate(currentHr);

    }, 1000);

    console.log('🎮 Mock mode started');
  }

  stopMocking() {
    this.isMocking = false;
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    console.log('🎮 Mock mode stopped');
  }

  // Disconnect all Bluetooth devices
  disconnectAll() {
    this.stopMocking();
    Object.keys(this.devices).forEach(key => {
      const dev = this.devices[key];
      if (dev && dev.gatt && dev.gatt.connected) {
        try {
          dev.gatt.disconnect();
        } catch (err) {
          console.warn(`Error disconnecting ${key}:`, err);
        }
      }
      this.devices[key] = null;
      this.setStatus(key, 'disconnected');
    });
    this.characteristics.ftmsControl = null;
  }
}

export const ble = new BLEManager();
