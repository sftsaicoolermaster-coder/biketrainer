// Bluetooth Device Discovery & Pairing UI Manager
// Provides advanced device search and filtering capabilities

export class DeviceDiscovery {
  constructor() {
    this.discoveredDevices = [];
    this.isScanning = false;
    this.scanTimeout = null;
    
    // Device type categorization
    this.deviceCategories = {
      trainer: {
        label: '智慧訓練台',
        prefixes: ['ThinkRider', 'Wahoo', 'KICKR', 'Tacx', 'Garmin', 'Elite', 'Wattbike', 'Peloton'],
        color: '#00f2fe'
      },
      powerMeter: {
        label: '功率計',
        prefixes: ['Stages', 'Quarq', 'SRM', 'Power2Max', 'Dura-Ace'],
        color: '#00f2fe'
      },
      heartRate: {
        label: '心率帶',
        prefixes: ['Polar', 'Garmin', 'Wahoo', 'Coospo'],
        color: '#f857a6'
      },
      cadence: {
        label: '踏頻感測器',
        prefixes: ['Garmin', 'Wahoo', 'Giant'],
        color: '#38ef7d'
      },
      speed: {
        label: '速度感測器',
        prefixes: ['Garmin', 'Wahoo'],
        color: '#f5af19'
      },
      unknown: {
        label: '其他設備',
        prefixes: [],
        color: '#94a3b8'
      }
    };
  }

  // Categorize device by name
  categorizeDevice(deviceName) {
    if (!deviceName) return 'unknown';
    
    for (const [category, config] of Object.entries(this.deviceCategories)) {
      if (category === 'unknown') continue;
      for (const prefix of config.prefixes) {
        if (deviceName.includes(prefix)) {
          return category;
        }
      }
    }
    return 'unknown';
  }

  // Create device info object
  createDeviceInfo(name, category) {
    return {
      name: name || '未知設備',
      category: category,
      categoryLabel: this.deviceCategories[category].label,
      timestamp: new Date(),
      color: this.deviceCategories[category].color,
      signalStrength: Math.floor(Math.random() * 100)
    };
  }

  // Start scanning for devices
  async startScanning(timeoutMs = 15000) {
    if (this.isScanning) {
      console.warn('⚠️ Already scanning...');
      return;
    }

    this.isScanning = true;
    this.discoveredDevices = [];
    console.log('🔍 Starting Bluetooth device scan...');

    try {
      // Request device with filters for all supported services
      const filters = [
        { services: ['0000180d-0000-1000-8000-00805f9b34fb'] }, // HR
        { services: ['00001818-0000-1000-8000-00805f9b34fb'] }, // Power
        { services: ['00001816-0000-1000-8000-00805f9b34fb'] }, // Cadence
        { services: ['00001826-0000-1000-8000-00805f9b34fb'] }, // FTMS
        // Brand prefixes
        { namePrefix: 'ThinkRider' },
        { namePrefix: 'Wahoo' },
        { namePrefix: 'Tacx' },
        { namePrefix: 'Garmin' },
        { namePrefix: 'Polar' },
        { namePrefix: 'Stages' },
        { namePrefix: 'Quarq' },
        { namePrefix: 'Elite' },
        { namePrefix: 'Wattbike' }
      ];

      // Set timeout for scanning
      this.scanTimeout = setTimeout(() => {
        this.stopScanning();
      }, timeoutMs);

      // Note: Web Bluetooth API doesn't have a true "scan all devices" mode
      // This is a simulated implementation that would work with requestDevice
      console.log('📡 Scan filters configured');
      return true;
    } catch (err) {
      console.error('❌ Scanning error:', err);
      this.isScanning = false;
      return false;
    }
  }

  // Stop scanning
  stopScanning() {
    this.isScanning = false;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    console.log('⏹️ Bluetooth scan stopped');
  }

  // Add discovered device to list (called when device found)
  addDiscoveredDevice(name, category = null) {
    // Avoid duplicates
    if (this.discoveredDevices.some(d => d.name === name)) {
      return;
    }

    const deviceCategory = category || this.categorizeDevice(name);
    const deviceInfo = this.createDeviceInfo(name, deviceCategory);
    this.discoveredDevices.push(deviceInfo);
    
    console.log(`✅ Device discovered: ${name} (${deviceInfo.categoryLabel})`);
    return deviceInfo;
  }

  // Get devices filtered by category
  getDevicesByCategory(category) {
    return this.discoveredDevices.filter(d => d.category === category);
  }

  // Get all trainer devices
  getTrainers() {
    return this.getDevicesByCategory('trainer');
  }

  // Get all heart rate devices
  getHeartRates() {
    return this.getDevicesByCategory('heartRate');
  }

  // Get all cadence devices
  getCadences() {
    return this.getDevicesByCategory('cadence');
  }

  // Clear discovered devices
  clearDevices() {
    this.discoveredDevices = [];
  }

  // Get summary statistics
  getDiscoverySummary() {
    const summary = {};
    for (const category of Object.keys(this.deviceCategories)) {
      summary[category] = this.getDevicesByCategory(category).length;
    }
    return summary;
  }
}

export const deviceDiscovery = new DeviceDiscovery();
