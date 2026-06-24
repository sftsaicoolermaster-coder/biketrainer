import { ble } from './bluetooth.js';
import { WORKOUT_PRESETS, WorkoutPlayer, parseMRC, parseJSONWorkout } from './workout.js';
import { gpxEngine } from './gpx.js';
import { physicsEngine } from './physics.js';
import { chartEngine } from './chart.js';
import { audioManager } from './audio.js';
import { CityManager } from './city.js';

let cityManager = null;

// Application State
let state = {
  ftp: 200,
  weight: 70,
  isRideActive: false,
  isRidePaused: false,
  
  // Active Profiles
  currentWorkout: null, // Workout player instance
  currentRoute: null,   // GPX Route stats object
  
  // Real-time telemetry values
  currentPower: 0,
  powerBuffer3s: [],
  currentCadence: 0,
  currentHeartRate: 0,
  currentSpeedKmh: 0,
  currentDistanceKm: 0.0,
  currentGradePct: 0.0,
  currentAltitudeM: 0,

  // Workout metrics
  avgCadenceSum: 0,
  avgCadenceTicks: 0,
  maxHeartRate: 0,
  avgHrSum: 0,
  avgHrTicks: 0,
  avgPowerSum: 0,
  avgPowerTicks: 0,
  maxPower: 0,
  
  // Session Logs
  rideHistory: [], // array of { time, power, hr, cadence, speed, distance, grade, altitude }
  startTimeISO: null,
  
  // Ticker timer ID
  tickerInterval: null,

  // Trainer control mode
  trainerControlMode: 'erg'
};

// DOM Elements Selection
const el = {
  ftpInput: document.getElementById('ftp-input'),
  weightInput: document.getElementById('weight-input'),
  mockToggle: document.getElementById('mock-mode-toggle'),
  voiceToggle: document.getElementById('voice-assist-toggle'),
  
  // Sidebar Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  
  // Device Connections
  btnConnectPower: document.getElementById('btn-connect-power'),
  btnConnectHr: document.getElementById('btn-connect-hr'),
  btnConnectCadence: document.getElementById('btn-connect-cadence'),
  devPower: document.getElementById('dev-power'),
  devHr: document.getElementById('dev-hr'),
  devCadence: document.getElementById('dev-cadence'),
  trainerModePanel: document.getElementById('trainer-mode-panel'),
  valFtmsTargetW: document.getElementById('val-ftms-target-w'),
  btnFtmsDec: document.getElementById('btn-ftms-dec'),
  btnFtmsInc: document.getElementById('btn-ftms-inc'),
  btnFtmsErg: document.getElementById('btn-ftms-erg'),
  btnFtmsSim: document.getElementById('btn-ftms-sim'),
  // Workouts Panel
  // Workouts Panel
  presetSelect: document.getElementById('workout-preset-select'),
  workoutDropzone: document.getElementById('workout-file-dropzone'),
  workoutFileInput: document.getElementById('workout-file-input'),
  workoutPreviewInfo: document.getElementById('workout-preview-info'),
  previewTitle: document.getElementById('preview-workout-title'),
  previewDuration: document.getElementById('preview-workout-duration'),
  previewTss: document.getElementById('preview-workout-tss'),
  previewIf: document.getElementById('preview-workout-if'),
  previewMaxP: document.getElementById('preview-workout-max-p'),
  previewTimeline: document.getElementById('workout-timeline-preview-bar'),
  
  // GPX Routes Panel
  gpxDropzone: document.getElementById('gpx-file-dropzone'),
  gpxFileInput: document.getElementById('gpx-file-input'),
  gpxRouteInfo: document.getElementById('gpx-route-info'),
  gpxRouteName: document.getElementById('gpx-route-name'),
  gpxInfoDistance: document.getElementById('gpx-info-distance'),
  gpxInfoAscent: document.getElementById('gpx-info-ascent'),
  gpxInfoAvgGrade: document.getElementById('gpx-info-avg-grade'),
  gpxInfoMaxGrade: document.getElementById('gpx-info-max-grade'),
  gpxCanvas: document.getElementById('elevation-profile-canvas'),
  presetRoutes: document.querySelectorAll('.route-preset-item'),
  
  // Main Telemetry Displays
  valPower: document.getElementById('val-power'),
  valPower3s: document.getElementById('val-power-3s'),
  valTargetPower: document.getElementById('val-target-power'),
  powerZoneTag: document.getElementById('power-zone-tag'),
  powerCard: document.getElementById('metric-power-card'),
  valCadence: document.getElementById('val-cadence'),
  valAvgCadence: document.getElementById('val-avg-cadence'),
  cadenceSpinner: document.getElementById('cadence-spinner'),
  valHr: document.getElementById('val-hr'),
  valMaxHr: document.getElementById('val-max-hr'),
  valAvgHr: document.getElementById('val-avg-hr'),
  heartPulse: document.getElementById('heart-pulse'),
  hrCard: document.getElementById('metric-hr-card'),
  valSpeed: document.getElementById('val-speed'),
  valGrade: document.getElementById('val-grade'),
  valDistance: document.getElementById('val-distance'),
  
  // Workout Status Bar
  workoutStatusContainer: document.getElementById('workout-status-container'),
  valIntervalTime: document.getElementById('val-interval-time'),
  valTotalTime: document.getElementById('val-total-time'),
  intervalTitleLabel: document.getElementById('interval-title-label'),
  intervalInstructionText: document.getElementById('interval-instruction-text'),
  intervalProgressFill: document.getElementById('interval-progress-fill'),
  
  // Chart Visualizer
  chartCanvas: document.getElementById('workout-chart-canvas'),
  
  // Master Ride Controls
  btnRideStart: document.getElementById('btn-ride-start'),
  btnRidePause: document.getElementById('btn-ride-pause'),
  btnRideStop: document.getElementById('btn-ride-stop'),
  btnWorkoutPrev: document.getElementById('btn-workout-prev'),
  btnWorkoutNext: document.getElementById('btn-workout-next'),
  
  // Summary Modal
  summaryModal: document.getElementById('summary-modal'),
  btnCloseSummary: document.getElementById('btn-close-summary'),
  btnCloseSummaryBottom: document.getElementById('btn-close-summary-bottom'),
  btnExportTcx: document.getElementById('btn-export-tcx'),
  sumDuration: document.getElementById('sum-duration'),
  sumDistance: document.getElementById('sum-distance'),
  sumAvgPower: document.getElementById('sum-avg-power'),
  sumNp: document.getElementById('sum-np'),
  sumTss: document.getElementById('sum-tss'),
  sumIf: document.getElementById('sum-if'),
  sumAvgHr: document.getElementById('sum-avg-hr'),
  sumKj: document.getElementById('sum-kj'),
  zoneBarsContainer: document.getElementById('zone-bars-container')
};

// Power Zone Colors and Names for Labels
const ZONE_METADATA = [
  { name: "Z1 恢復區 (Recovery)", limit: 55, class: "zone-z1" },
  { name: "Z2 有氧區 (Endurance)", limit: 75, class: "zone-z2" },
  { name: "Z3 節奏區 (Tempo)", limit: 90, class: "zone-z3" },
  { name: "Z4 乳酸閥值 (Threshold)", limit: 105, class: "zone-z4" },
  { name: "Z5 VO2 Max (VO2 Max)", limit: 120, class: "zone-z5" },
  { name: "Z6 無氧耐力 (Anaerobic)", limit: 150, class: "zone-z6" },
  { name: "Z7 爆發力 (Neuromuscular)", limit: Infinity, class: "zone-z7" }
];

// Determine power zone from current power and FTP
function getPowerZoneIndex(power, ftp) {
  const pct = (power / ftp) * 100;
  for (let i = 0; i < ZONE_METADATA.length; i++) {
    if (pct < ZONE_METADATA[i].limit) return i;
  }
  return ZONE_METADATA.length - 1;
}

// ----------------------------------------------------
// UI TABS & INITIALIZATION
// ----------------------------------------------------
function initApp() {
  // Load settings from localStorage
  const savedFtp = localStorage.getItem('ftp');
  const savedWeight = localStorage.getItem('weight');
  const savedHeight = localStorage.getItem('height');
  
  if (savedFtp) {
    state.ftp = parseInt(savedFtp);
    el.ftpInput.value = savedFtp;
  } else {
    state.ftp = parseInt(el.ftpInput.value) || 200;
  }

  // iOS/iPadOS browser detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosWarning = document.getElementById('ios-ble-warning');
  if (iosWarning) {
    if (isIOS) {
      iosWarning.classList.remove('hidden');
    } else {
      iosWarning.classList.add('hidden');
    }
  }

  if (savedWeight) {
    state.weight = parseInt(savedWeight);
    el.weightInput.value = savedWeight;
  } else {
    state.weight = parseInt(el.weightInput.value) || 70;
  }

  const heightInput = document.getElementById('height-input');
  if (heightInput) {
    if (savedHeight) {
      state.height = parseInt(savedHeight);
      heightInput.value = savedHeight;
    } else {
      state.height = parseInt(heightInput.value) || 175;
    }
    heightInput.addEventListener('change', () => {
      state.height = parseInt(heightInput.value) || 175;
      localStorage.setItem('height', state.height);
    });
  } else {
    state.height = 175;
  }
  
  el.ftpInput.addEventListener('change', () => {
    state.ftp = parseInt(el.ftpInput.value) || 200;
    localStorage.setItem('ftp', state.ftp);
    if (state.currentWorkout) {
      state.currentWorkout.updateFTP(state.ftp);
      updateWorkoutPreview(state.currentWorkout);
      drawCharts();
    }
  });

  el.weightInput.addEventListener('change', () => {
    state.weight = parseInt(el.weightInput.value) || 70;
    localStorage.setItem('weight', state.weight);
  });

  // Workout intensity scale selector
  const intensitySelect = document.getElementById('workout-intensity-scale');
  if (intensitySelect) {
    intensitySelect.addEventListener('change', () => {
      const scale = parseFloat(intensitySelect.value) || 1.0;
      if (state.currentWorkout) {
        state.currentWorkout.intensityScale = scale;
        updateWorkoutPreview(state.currentWorkout);
        drawCharts();
      }
    });
  }

  // Gemini API Key Visibility Toggle
  const keyInput = document.getElementById('gemini-api-key');
  const toggleVisBtn = document.getElementById('btn-toggle-api-key');
  if (toggleVisBtn && keyInput) {
    toggleVisBtn.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        toggleVisBtn.textContent = '隱藏';
      } else {
        keyInput.type = 'password';
        toggleVisBtn.textContent = '顯示';
      }
    });
  }

  // Save & Validate Gemini Key
  const saveKeyBtn = document.getElementById('btn-save-api-key');

  function updateGeminiStatusUI(hasKey, isValidating = false, isValid = false, errMsg = '') {
    const statusText = document.getElementById('ai-connection-status');
    if (!statusText) return;
    
    if (isValidating) {
      statusText.style.color = '#f59e0b'; // Orange
      statusText.textContent = '金鑰驗證中...';
    } else if (isValid) {
      statusText.style.color = '#10b981'; // Green
      statusText.textContent = '已連線 (Google AI 運行中)';
    } else if (hasKey) {
      statusText.style.color = '#ef4444'; // Red
      statusText.textContent = errMsg ? `驗證失敗: ${errMsg}` : '已儲存，但未驗證';
    } else {
      statusText.style.color = '#ef4444'; // Red
      statusText.textContent = '未儲存金鑰';
    }
  }

  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey && keyInput) {
    keyInput.value = savedKey;
    updateGeminiStatusUI(true, false, true);
  } else {
    updateGeminiStatusUI(false);
  }

  if (saveKeyBtn && keyInput) {
    saveKeyBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) {
        localStorage.removeItem('gemini_api_key');
        updateGeminiStatusUI(false);
        alert('已移除金鑰。');
        return;
      }

      updateGeminiStatusUI(true, true);

      try {
        const res = await callGeminiAPI(key, "Say 'OK' in one word.");
        localStorage.setItem('gemini_api_key', key);
        updateGeminiStatusUI(true, false, true);
        alert(`Gemini API 金鑰驗證成功（使用模型: ${res.model}）並已儲存！`);
      } catch (err) {
        updateGeminiStatusUI(true, false, false, err.message);
        alert(`驗證失敗: ${err.message}`);
      }
    });
  }

  // Sound Settings
  audioManager.setVoiceEnabled(el.voiceToggle.checked);
  el.voiceToggle.addEventListener('change', () => {
    audioManager.setVoiceEnabled(el.voiceToggle.checked);
  });

  // Tab Switching
  el.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      el.tabButtons.forEach(b => b.classList.remove('active'));
      el.tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const panelId = `panel-${btn.dataset.tab}`;
      document.getElementById(panelId).classList.add('active');
    });
  });

  // Visual Tab Switching (Chart vs City)
  const vtabButtons = document.querySelectorAll('.vtab-btn');
  const vpanels = document.querySelectorAll('.visual-panel');
  vtabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      vtabButtons.forEach(b => b.classList.remove('active'));
      vpanels.forEach(p => p.classList.add('hidden'));
      
      btn.classList.add('active');
      const panelId = `visual-panel-${btn.dataset.vtab}`;
      const targetPanel = document.getElementById(panelId);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
      }
      
      if (btn.dataset.vtab === 'chart') {
        drawCharts();
      }
    });
  });

  // Setup Bluetooth Event Handlers
  setupBLEListeners();

  // Setup File Uploads & Drag-and-drops
  setupFileDropzones();

  // Load Initial Presets
  loadPresetWorkout();
  
  // Initialize City Parallax engine
  const cityCanvas = document.getElementById('virtual-city-canvas');
  if (cityCanvas) {
    cityManager = new CityManager(cityCanvas);
    cityManager.start();
  }
  
  // Resize Handler for Canvas Drawing
  window.addEventListener('resize', drawCharts);

  // Initial draw
  drawCharts();

  // Bind AI Advice button in Summary Modal
  const btnGenSummary = document.getElementById('btn-generate-ai-summary');
  if (btnGenSummary) {
    btnGenSummary.addEventListener('click', generateAIAdvice);
  }
}

// ----------------------------------------------------
// BLE CONNECTIONS & telemetry BINDINGS
// ----------------------------------------------------
function setupBLEListeners() {
  // Bind UI Buttons to Bluetooth Connection triggers
  el.btnConnectPower.addEventListener('click', async () => {
    if (ble.devices.power || ble.devices.ftms) {
      ble.disconnectAll();
    } else {
      // Prompt user to connect Smart Trainer (FTMS) or Standard Power Meter
      const useTrainer = confirm("您要連線至「智慧訓練台 (FTMS)」以支援雙向阻力控制嗎？\n(若為一般功率計，請選擇取消即可)");
      let success = false;
      if (useTrainer) {
        success = await ble.connectFTMS();
      } else {
        success = await ble.connectPowerMeter();
      }
      
      if (success && ble.devices.ftms) {
        el.trainerModePanel.classList.remove('hidden');
      }
    }
  });

  el.btnConnectHr.addEventListener('click', async () => {
    if (ble.devices.hr) {
      ble.devices.hr.gatt.disconnect();
    } else {
      await ble.connectHeartRate();
    }
  });

  el.btnConnectCadence.addEventListener('click', async () => {
    if (ble.devices.cadence) {
      ble.devices.cadence.gatt.disconnect();
    } else {
      await ble.connectCadenceSensor();
    }
  });

  // Bluetooth Status Visual Updates
  ble.onStatusChange = (deviceKey, status) => {
    let devEl, btnEl, statusTextEl;

    if (deviceKey === 'power' || deviceKey === 'ftms') {
      devEl = el.devPower;
      btnEl = el.btnConnectPower;
      statusTextEl = devEl ? devEl.querySelector('.device-status-text') : null;
    } else if (deviceKey === 'hr') {
      devEl = el.devHr;
      btnEl = el.btnConnectHr;
      statusTextEl = devEl ? devEl.querySelector('.device-status-text') : null;
    } else if (deviceKey === 'cadence') {
      devEl = el.devCadence;
      btnEl = el.btnConnectCadence;
      statusTextEl = devEl ? devEl.querySelector('.device-status-text') : null;
    }

    if (!devEl) return;

    // Reset classes
    devEl.classList.remove('status-disconnected', 'status-searching', 'status-connected');
    
    if (status === 'connected') {
      devEl.classList.add('status-connected');
      if (statusTextEl) statusTextEl.textContent = '已連線 ✓';
      else devEl.querySelector('.device-status-text').textContent = '已連線';
      btnEl.textContent = '中斷連線';
      
      if (ble.devices.ftms) {
        el.trainerModePanel.classList.remove('hidden');
      }
    } else if (status === 'searching') {
      devEl.classList.add('status-searching');
      if (statusTextEl) statusTextEl.textContent = '掃描中...';
      else devEl.querySelector('.device-status-text').textContent = '配對搜尋中...';
      btnEl.textContent = '取消';
    } else {
      devEl.classList.add('status-disconnected');
      if (statusTextEl) statusTextEl.textContent = '未連線';
      else devEl.querySelector('.device-status-text').textContent = '未連線';
      btnEl.textContent = '連線';
      btnEl.classList.add('btn-connect');
      btnEl.classList.remove('btn-connected-tr');

      if (deviceKey === 'power') {
        if (!el.mockToggle.checked) {
          el.trainerModePanel.classList.add('hidden');
        }
      }
    }
  };

  // Bind BLE Real-Time Metric Feeds
  ble.onPowerUpdate = (power) => {
    state.currentPower = power;
    el.valPower.textContent = power;
    
    // Add to 3s rolling average buffer
    state.powerBuffer3s.push(power);
    if (state.powerBuffer3s.length > 3) state.powerBuffer3s.shift();
    const sum3s = state.powerBuffer3s.reduce((a, b) => a + b, 0);
    el.valPower3s.textContent = Math.round(sum3s / state.powerBuffer3s.length);

    // Update Zone Tag UI
    const zoneIdx = getPowerZoneIndex(power, state.ftp);
    el.powerZoneTag.textContent = ZONE_METADATA[zoneIdx].name;
    
    // Pulse animation based on power zone
    el.powerCard.style.boxShadow = `0 0 20px ${getPowerZoneShadowColor(zoneIdx)}`;
  };

  ble.onCadenceUpdate = (rpm) => {
    state.currentCadence = rpm;
    el.valCadence.textContent = rpm;
    
    // Animate pedal spinner based on rpm
    if (rpm > 0) {
      el.cadenceSpinner.classList.add('spin-anim');
      const duration = 60 / rpm; // seconds per revolution
      el.cadenceSpinner.style.animationDuration = `${duration}s`;
    } else {
      el.cadenceSpinner.classList.remove('spin-anim');
    }
  };

  ble.onHeartRateUpdate = (hr) => {
    state.currentHeartRate = hr;
    el.valHr.textContent = hr;
    
    // Heart pulse speed matching heartbeats
    if (hr > 0) {
      el.heartPulse.classList.add('pulse-anim');
      const pulseDuration = 60 / hr;
      el.heartPulse.style.animationDuration = `${pulseDuration}s`;
      
      // Update max/avg HR calculations
      if (state.isRideActive && !state.isRidePaused) {
        state.maxHeartRate = Math.max(state.maxHeartRate, hr);
        state.avgHrSum += hr;
        state.avgHrTicks++;
        el.valMaxHr.textContent = state.maxHeartRate;
        el.valAvgHr.textContent = Math.round(state.avgHrSum / state.avgHrTicks);
      }
    } else {
      el.heartPulse.classList.remove('pulse-anim');
    }
  };

  // Mock toggle listener
  el.mockToggle.addEventListener('change', () => {
    if (el.mockToggle.checked) {
      if (state.isRideActive) {
        ble.startMocking(state.ftp);
      }
      el.trainerModePanel.classList.remove('hidden');
      // Set default target power to 150W in mock target display
      el.valFtmsTargetW.textContent = ble.mockTargetPower || 150;
    } else {
      ble.stopMocking();
      if (!ble.devices.ftms) {
        el.trainerModePanel.classList.add('hidden');
      }
    }
  });
}

function getPowerZoneShadowColor(index) {
  if (index === 0) return 'rgba(100, 116, 139, 0.2)';
  if (index === 1) return 'rgba(59, 130, 246, 0.3)';
  if (index === 2) return 'rgba(16, 185, 129, 0.3)';
  if (index === 3) return 'rgba(245, 175, 25, 0.3)';
  if (index === 4) return 'rgba(249, 115, 22, 0.3)';
  return 'rgba(239, 68, 68, 0.4)';
}

// ----------------------------------------------------
// WORKOUT / GPX FILE UPLOADS
// ----------------------------------------------------
function setupFileDropzones() {
  // Workout Dropzone
  el.workoutDropzone.addEventListener('click', () => el.workoutFileInput.click());
  el.workoutFileInput.addEventListener('change', (e) => handleWorkoutFile(e.target.files[0]));
  
  // Drag over effects
  el.workoutDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.workoutDropzone.style.borderColor = 'var(--color-power)';
  });
  el.workoutDropzone.addEventListener('dragleave', () => {
    el.workoutDropzone.style.borderColor = 'var(--border-color)';
  });
  el.workoutDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.workoutDropzone.style.borderColor = 'var(--border-color)';
    handleWorkoutFile(e.dataTransfer.files[0]);
  });

  // Preset Selector
  el.presetSelect.addEventListener('change', loadPresetWorkout);

  // GPX Dropzone
  el.gpxDropzone.addEventListener('click', () => el.gpxFileInput.click());
  el.gpxFileInput.addEventListener('change', (e) => handleGpxFile(e.target.files[0]));
  
  el.gpxDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.gpxDropzone.style.borderColor = 'var(--color-speed)';
  });
  el.gpxDropzone.addEventListener('dragleave', () => {
    el.gpxDropzone.style.borderColor = 'var(--border-color)';
  });
  el.gpxDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.gpxDropzone.style.borderColor = 'var(--border-color)';
    handleGpxFile(e.dataTransfer.files[0]);
  });

  // Preset Routes
  el.presetRoutes.forEach(item => {
    item.addEventListener('click', () => {
      el.presetRoutes.forEach(r => r.classList.remove('active'));
      item.classList.add('active');
      loadPresetRoute(item.dataset.route);
    });
  });

  // Source-category tabs (Free Data panel)
  const srcTabs = document.querySelectorAll('.src-tab');
  const srcPanels = document.querySelectorAll('.src-panel');
  srcTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      srcTabs.forEach(t => t.classList.remove('active'));
      srcPanels.forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      const panel = document.getElementById(`src-${tab.dataset.src}`);
      if (panel) panel.classList.remove('hidden');
    });
  });

  // Manual elevation enrich button
  const btnEnrich = document.getElementById('btn-enrich-elevation');
  if (btnEnrich) {
    btnEnrich.addEventListener('click', async () => {
      if (!state.currentRoute) {
        alert('請先載入一條路線再補充海拔資料。');
        return;
      }
      await enrichRouteElevation(state.currentRoute);
      updateRouteInfoUI(state.currentRoute);
    });
  }
}

// Load default selected preset workout
function loadPresetWorkout() {
  const presetKey = el.presetSelect.value;
  if (presetKey === 'none') {
    state.currentWorkout = null;
    el.previewTitle.textContent = '自由騎乘';
    el.previewDuration.textContent = '-- 分 -- 秒';
    el.previewTss.textContent = '0';
    el.previewIf.textContent = '0.00';
    el.previewMaxP.textContent = '--% FTP';
    el.previewTimeline.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.85rem;">目前無載入課表，阻力將由手動設定或虛擬路線坡度控制</div>';
    drawCharts();
    return;
  }
  const rawData = WORKOUT_PRESETS[presetKey];
  if (rawData) {
    const player = new WorkoutPlayer(rawData, state.ftp);
    const intensitySelect = document.getElementById('workout-intensity-scale');
    if (intensitySelect) {
      player.intensityScale = parseFloat(intensitySelect.value) || 1.0;
    }
    state.currentWorkout = player;
    updateWorkoutPreview(player);
    drawCharts();
  }
}

// Load custom workout file (mrc or json)
async function handleWorkoutFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    let workoutData;
    if (file.name.endsWith('.json')) {
      workoutData = parseJSONWorkout(text);
    } else {
      workoutData = parseMRC(text);
    }
    
    state.currentWorkout = new WorkoutPlayer(workoutData, state.ftp);
    const intensitySelect = document.getElementById('workout-intensity-scale');
    if (intensitySelect) {
      state.currentWorkout.intensityScale = parseFloat(intensitySelect.value) || 1.0;
    }
    updateWorkoutPreview(state.currentWorkout);
    drawCharts();
    
    alert(`成功載入課表：${state.currentWorkout.title}`);
  } catch (err) {
    alert(`課表載入錯誤: ${err.message}`);
  }
}

// Update UI info block for workouts
function updateWorkoutPreview(player) {
  el.previewTitle.textContent = player.title;
  
  const min = Math.floor(player.totalDuration / 60);
  const sec = player.totalDuration % 60;
  el.previewDuration.textContent = `${min} 分 ${sec} 秒`;
  
  // Calculate estimates
  const scale = player.intensityScale || 1.0;
  const est = WorkoutPlayer.estimateTSSandIF(player.intervals, player.ftp, scale);
  el.previewTss.textContent = est.tss;
  el.previewIf.textContent = est.intensityFactor;
  
  let maxP = 0;
  player.intervals.forEach(inv => maxP = Math.max(maxP, inv.startPower, inv.endPower));
  el.previewMaxP.textContent = `${Math.round(maxP * scale)}% FTP`;
  
  // Render timeline mini-bar
  renderTimelineBar(player);
}

// Draw a simple CSS flex blocks preview of workout
function renderTimelineBar(player) {
  el.previewTimeline.innerHTML = '';
  const scale = player.intensityScale || 1.0;
  player.intervals.forEach(inv => {
    const block = document.createElement('div');
    const widthPct = (inv.duration / player.totalDuration) * 100;
    const avgPct = ((inv.startPower + inv.endPower) / 2) * scale;
    
    block.style.width = `${widthPct}%`;
    block.style.height = '100%';
    block.style.backgroundColor = getZoneCSSColor(avgPct);
    block.title = `${inv.label}: ${Math.round(inv.startPower * scale)}% - ${Math.round(inv.endPower * scale)}% FTP, ${Math.floor(inv.duration/60)}m`;
    
    el.previewTimeline.appendChild(block);
  });
}

function getZoneCSSColor(powerPct) {
  if (powerPct < 55) return '#64748b'; // Z1 Recovery
  if (powerPct < 75) return '#3b82f6'; // Z2 Endurance
  if (powerPct < 90) return '#10b981'; // Z3 Tempo
  if (powerPct < 105) return '#f5af19'; // Z4 Threshold
  if (powerPct < 120) return '#f97316'; // Z5 VO2 Max
  return '#ef4444'; // Z6+ Anaerobic
}

// Load GPX preset routes
function loadPresetRoute(routeKey) {
  const route = gpxEngine.generatePresetRoute(routeKey);
  state.currentRoute = route;
  updateRouteInfoUI(route);
  
  if (cityManager) {
    cityManager.setRoute(routeKey);
  }
  
  // Clear speed and distance on route change
  if (!state.isRideActive) {
    state.currentDistanceKm = 0.0;
    state.currentGradePct = 0.0;
    el.valDistance.textContent = '0.00';
    el.valGrade.textContent = '0.0';
  }
}

// Load custom GPX or KML route
async function handleGpxFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    let route;
    if (file.name.toLowerCase().endsWith('.kml')) {
      route = parseKML(text);
    } else {
      route = gpxEngine.parseGPX(text);
    }
    state.currentRoute = route;

    // Clear preset routes active state
    el.presetRoutes.forEach(r => r.classList.remove('active'));

    // Auto-enrich elevation if all points have zero elevation
    const eleToggle = document.getElementById('ele-enrich-toggle');
    const allZero = route.points.every(p => p.ele === 0);
    if (eleToggle && eleToggle.checked && allZero) {
      await enrichRouteElevation(route);
    }

    updateRouteInfoUI(route);
    if (cityManager) {
      cityManager.setRoute('taipei');
    }
    alert(`成功載入路線軌跡：${route.name}`);
  } catch (err) {
    alert(`路線載入錯誤: ${err.message}`);
  }
}

// Parse KML files (from gov.tw and others)
function parseKML(kmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) throw new Error('KML 檔案解析失敗！非合法的 XML 格式。');

  // Try to get route name
  const nameEl = xmlDoc.querySelector('Document > name, Folder > name, Placemark > name');
  const routeName = nameEl ? nameEl.textContent.trim() : '匯入的 KML 路線';

  // Extract coordinates from LineString or Track
  let coordText = '';
  const lineString = xmlDoc.querySelector('LineString > coordinates');
  const track = xmlDoc.querySelector('Track > coord') || xmlDoc.querySelector('MultiTrack coord');

  if (lineString) {
    coordText = lineString.textContent.trim();
  } else {
    // gx:Track format
    const coords = xmlDoc.querySelectorAll('gx\\:coord, coord');
    coordText = Array.from(coords).map(c => c.textContent.trim().replace(/\s+/g, ',')).join(' ');
  }

  if (!coordText) throw new Error('KML 中找不到 LineString 或 Track 座標資料。');

  // Parse coord entries: "lon,lat,ele" per KML spec
  const rawPoints = coordText.trim().split(/\s+/).filter(Boolean);
  if (rawPoints.length < 2) throw new Error('KML 座標點不足（至少需要 2 個點）。');

  const points = [];
  let accumulatedDistance = 0;

  // Haversine (duplicated locally for self-contained use)
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  for (const raw of rawPoints) {
    const parts = raw.split(',');
    if (parts.length < 2) continue;
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const ele = parts.length >= 3 ? parseFloat(parts[2]) : 0;
    if (isNaN(lat) || isNaN(lon)) continue;

    if (points.length > 0) {
      const prev = points[points.length - 1];
      accumulatedDistance += haversine(prev.lat, prev.lon, lat, lon);
    }
    points.push({ lat, lon, ele: isNaN(ele) ? 0 : ele, dist: accumulatedDistance });
  }

  if (points.length < 2) throw new Error('KML 座標有效點不足。');

  // Calculate grades
  for (let i = 1; i < points.length; i++) {
    const d = points[i].dist - points[i-1].dist;
    points[i].grade = d > 0.1 ? (points[i].ele - points[i-1].ele) / d : points[i-1].grade || 0;
  }
  points[0].grade = points[1] ? points[1].grade : 0;

  let totalAscent = 0, maxGrade = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].ele - points[i-1].ele;
    if (diff > 0) totalAscent += diff;
    if (Math.abs(points[i].grade) > maxGrade) maxGrade = Math.abs(points[i].grade);
  }

  return {
    name: routeName,
    points,
    totalDistance: accumulatedDistance,
    totalAscent,
    maxGrade: maxGrade * 100,
    avgGrade: accumulatedDistance > 0 ? (points[points.length-1].ele - points[0].ele) / accumulatedDistance * 100 : 0
  };
}

// Enrich a route's elevation using Open-Meteo Elevation API (batch of 100)
async function enrichRouteElevation(route) {
  const statusEl = document.getElementById('ele-enrich-status');
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

  const pts = route.points;
  const BATCH = 100;
  setStatus('查詢中...');

  try {
    for (let i = 0; i < pts.length; i += BATCH) {
      const batch = pts.slice(i, i + BATCH);
      const lats = batch.map(p => p.lat.toFixed(6)).join(',');
      const lons = batch.map(p => p.lon.toFixed(6)).join(',');
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo API 回應錯誤: ${res.status}`);
      const data = await res.json();
      if (!data.elevation) throw new Error('API 回傳格式不符。');
      data.elevation.forEach((ele, j) => {
        pts[i + j].ele = ele;
      });
      setStatus(`${Math.min(i + BATCH, pts.length)}/${pts.length} 點`);
    }

    // Recalculate grades after elevation fill
    for (let i = 1; i < pts.length; i++) {
      const d = pts[i].dist - pts[i-1].dist;
      pts[i].grade = d > 0.1 ? (pts[i].ele - pts[i-1].ele) / d : (pts[i-1].grade || 0);
    }
    pts[0].grade = pts[1] ? pts[1].grade : 0;

    // Recompute stats
    let totalAscent = 0, maxGrade = 0;
    for (let i = 1; i < pts.length; i++) {
      const diff = pts[i].ele - pts[i-1].ele;
      if (diff > 0) totalAscent += diff;
      if (Math.abs(pts[i].grade) > maxGrade) maxGrade = Math.abs(pts[i].grade);
    }
    route.totalAscent = totalAscent;
    route.maxGrade = maxGrade * 100;
    route.avgGrade = route.totalDistance > 0 ? (pts[pts.length-1].ele - pts[0].ele) / route.totalDistance * 100 : 0;

    setStatus('✅ 補充完成');
    setTimeout(() => setStatus(''), 4000);
  } catch (err) {
    console.error('Elevation enrich failed:', err);
    setStatus('❌ 查詢失敗');
    setTimeout(() => setStatus(''), 5000);
  }
}

// Update UI info for GPX routes
function updateRouteInfoUI(route) {
  el.gpxRouteInfo.classList.remove('hidden');
  el.gpxRouteName.textContent = route.name;
  el.gpxInfoDistance.textContent = `${(route.totalDistance / 1000).toFixed(2)} km`;
  el.gpxInfoAscent.textContent = `${Math.round(route.totalAscent)} m`;
  el.gpxInfoAvgGrade.textContent = `${route.avgGrade.toFixed(1)} %`;
  el.gpxInfoMaxGrade.textContent = `${route.maxGrade.toFixed(1)} %`;
  
  // Render elevation graph
  gpxEngine.drawElevationProfile(el.gpxCanvas, route, state.currentDistanceKm * 1000);
}

// ----------------------------------------------------
// THE MASTER RIDE TICKER
// ----------------------------------------------------
function startRide() {
  if (state.isRideActive && !state.isRidePaused) return;

  state.isRideActive = true;
  state.isRidePaused = false;
  state.startTimeISO = state.startTimeISO || new Date().toISOString();

  // Button switches
  el.btnRideStart.classList.add('hidden');
  el.btnRidePause.classList.remove('hidden');
  el.btnRideStop.disabled = false;

  // Enable/disable interval skipping
  if (state.currentWorkout) {
    el.btnWorkoutPrev.disabled = false;
    el.btnWorkoutNext.disabled = false;
    el.workoutStatusContainer.classList.remove('hidden');
  } else {
    el.workoutStatusContainer.classList.add('hidden');
  }

  // Start mocking if checked
  if (el.mockToggle.checked) {
    ble.startMocking(state.ftp);
  }

  // Setup coaching welcome voice alert
  if (state.rideHistory.length === 0) {
    audioManager.speak("開始訓練。祝您騎乘愉快！");
    if (state.currentWorkout) {
      const inv = state.currentWorkout.getCurrentInterval();
      setTimeout(() => {
        audioManager.speak(`第一區間：${inv.label}，目標 ${state.currentWorkout.getCurrentTargetPower()} 瓦，持續 ${Math.floor(inv.duration/60)} 分鐘。`);
      }, 3500);
    }
  }

  // Set interval timer ticker (runs every 1 second)
  state.tickerInterval = setInterval(rideTick, 1000);
}

function pauseRide() {
  if (!state.isRideActive || state.isRidePaused) return;
  
  state.isRidePaused = true;
  clearInterval(state.tickerInterval);
  ble.stopMocking();

  el.btnRideStart.classList.remove('hidden');
  el.btnRidePause.classList.add('hidden');
  
  audioManager.speak("已暫停訓練。");
}

function rideTick() {
  if (!state.isRideActive || state.isRidePaused) return;

  let targetPower = 0;

  // 1. Process structured workout step
  if (state.currentWorkout) {
    const player = state.currentWorkout;
    player.isPlaying = true;
    
    // Calculate current target
    targetPower = player.getCurrentTargetPower();
    el.valTargetPower.textContent = targetPower;
    
    // Auto sync target power to BLE Trainer (FTMS ERG mode)
    if (ble.devices.ftms) {
      ble.setTargetPower(targetPower);
    }
    el.valFtmsTargetW.textContent = targetPower;
    
    // Sync to simulator generator
    if (ble.isMocking) {
      ble.mockTargetPower = targetPower;
    }

    // Workouts enforce ERG Mode control UI buttons
    if (!el.btnFtmsErg.classList.contains('active')) {
      el.btnFtmsErg.classList.add('active');
      el.btnFtmsSim.classList.remove('active');
    }
    state.trainerControlMode = 'erg';

    // Tick the workout player
    const intervalRemaining = player.getIntervalRemainingTime();
    
    // TTS Audio Prompts for countdown and start
    if (intervalRemaining <= 3 && intervalRemaining > 0) {
      audioManager.playCountdown(false); // beep countdown
      audioManager.speak(intervalRemaining.toString());
    }

    const tickResult = player.tick();
    
    if (tickResult === true) {
      // Changed Interval!
      audioManager.playCountdown(true); // high beep
      const inv = player.getCurrentInterval();
      const nextW = player.getCurrentTargetPower();
      audioManager.speak(`進入下一區間：${inv.label}。目標 ${nextW} 瓦，持續 ${Math.floor(inv.duration/60)} 分鐘。`);
    } else if (tickResult === null) {
      // Workout Complete!
      audioManager.speak("課表訓練已全部完成！做得好！");
      stopRide();
      return;
    }

    // Update interval player UI
    const currentInv = player.getCurrentInterval();
    el.intervalTitleLabel.textContent = currentInv.label;
    el.valIntervalTime.textContent = formatDuration(player.getIntervalRemainingTime());
    el.valTotalTime.textContent = formatDuration(player.getTotalRemainingTime());
    
    const progress = player.getIntervalProgress();
    el.intervalProgressFill.style.width = `${progress * 100}%`;
  } else {
    // Open riding / No target
    if (state.trainerControlMode === 'erg') {
      const manualPower = parseInt(el.valFtmsTargetW.textContent) || 150;
      el.valTargetPower.textContent = manualPower;
      if (ble.devices.ftms) {
        ble.setTargetPower(manualPower);
      }
      if (ble.isMocking) {
        ble.mockTargetPower = manualPower;
      }
    } else {
      el.valTargetPower.textContent = '--';
    }
  }

  // 2. Process GPX Route Simulation / Slope adjustment
  if (state.currentRoute) {
    const distMeters = state.currentDistanceKm * 1000;
    const gradeVal = gpxEngine.getGradeAtDistance(state.currentRoute, distMeters);
    state.currentGradePct = gradeVal * 100;
    
    // Display slope
    el.valGrade.textContent = state.currentGradePct.toFixed(1);
    
    // Sync slope grade to trainer (FTMS SIM mode)
    if (ble.devices.ftms && !state.currentWorkout && state.trainerControlMode === 'sim') {
      ble.setIndoorBikeSimulation(state.currentGradePct, state.weight);
    }

    
    // Update mini profile marker
    gpxEngine.drawElevationProfile(el.gpxCanvas, state.currentRoute, distMeters);

    // If GPX route is completed
    if (distMeters >= state.currentRoute.totalDistance) {
      audioManager.speak("您已抵達虛擬路線終點，恭喜完騎！");
      stopRide();
      return;
    }
  }

  // 3. Physics speed & distance calculations (once a second)
  const powerIn = state.currentPower;
  const gradeIn = state.currentGradePct / 100; // ratio
  
  const speedMps = physicsEngine.calculateSpeed(powerIn, gradeIn, state.weight);
  state.currentSpeedKmh = physicsEngine.mpsToKmh(speedMps);
  
  el.valSpeed.textContent = state.currentSpeedKmh.toFixed(1);
  
  // Accumulate distance
  state.currentDistanceKm += (speedMps * 1) / 1000; // speed * 1s
  el.valDistance.textContent = state.currentDistanceKm.toFixed(2);

  // Sync to City Parallax engine
  if (cityManager) {
    cityManager.updateMetrics(
      state.currentSpeedKmh,
      state.currentCadence,
      state.rideHistory.length + 1,
      state.currentDistanceKm
    );
  }

  // 4. Update session statistics averages
  if (powerIn > 0) {
    state.maxPower = Math.max(state.maxPower, powerIn);
    state.avgPowerSum += powerIn;
    state.avgPowerTicks++;
  }
  
  if (state.currentCadence > 0) {
    state.avgCadenceSum += state.currentCadence;
    state.avgCadenceTicks++;
    el.valAvgCadence.textContent = Math.round(state.avgCadenceSum / state.avgCadenceTicks);
  }

  // 5. Append log to history
  const timeElapsed = state.rideHistory.length + 1;
  
  // Fetch altitude from GPX if active
  let altitude = 0;
  if (state.currentRoute) {
    const pts = state.currentRoute.points;
    const distM = state.currentDistanceKm * 1000;
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i].dist <= distM && pts[i+1].dist >= distM) {
        const r = (distM - pts[i].dist) / (pts[i+1].dist - pts[i].dist || 1);
        altitude = pts[i].ele + r * (pts[i+1].ele - pts[i].ele);
        break;
      }
    }
  }
  state.currentAltitudeM = Math.round(altitude);

  state.rideHistory.push({
    time: timeElapsed,
    power: powerIn,
    hr: state.currentHeartRate,
    cadence: state.currentCadence,
    speed: state.currentSpeedKmh,
    distance: state.currentDistanceKm,
    grade: state.currentGradePct,
    altitude: state.currentAltitudeM
  });

  // 6. Refresh charts
  drawCharts();
}

function stopRide() {
  if (!state.isRideActive) return;

  state.isRideActive = false;
  state.isRidePaused = false;
  clearInterval(state.tickerInterval);
  ble.stopMocking();

  // Reset Control Buttons
  el.btnRideStart.classList.remove('hidden');
  el.btnRidePause.classList.add('hidden');
  el.btnRideStop.disabled = true;
  el.btnWorkoutPrev.disabled = true;
  el.btnWorkoutNext.disabled = true;

  audioManager.speak("訓練結束。即將開啟數據統計面板。");

  // Show summary modal
  calculateSummaryStats();

  initSummaryAISection();

  el.summaryModal.classList.remove('hidden');
}

// Format duration helper (hh:mm:ss or mm:ss)
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ----------------------------------------------------
// CHART DRAWING & ZONE STATISTICS
// ----------------------------------------------------
function drawCharts() {
  if (state.currentWorkout) {
    chartEngine.drawWorkout(el.chartCanvas, state.currentWorkout, state.rideHistory);
  } else {
    // Scroll chart for open / GPX riding
    chartEngine.drawRolling(el.chartCanvas, state.rideHistory, 300);
  }
}

// Calculate ride statistics after stopping
function calculateSummaryStats() {
  const durationSec = state.rideHistory.length;
  
  // 1. Core Summary Stats
  el.sumDuration.textContent = formatDuration(durationSec);
  el.sumDistance.textContent = `${state.currentDistanceKm.toFixed(2)} km`;
  
  const avgPower = state.avgPowerTicks > 0 ? Math.round(state.avgPowerSum / state.avgPowerTicks) : 0;
  el.sumAvgPower.textContent = `${avgPower} W`;
  
  const avgHr = state.avgHrTicks > 0 ? Math.round(state.avgHrSum / state.avgHrTicks) : 0;
  el.sumAvgHr.textContent = `${avgHr} BPM`;
  
  // Kilojoules calculation (Power * seconds / 1000)
  const totalKJ = Math.round((avgPower * durationSec) / 1000);
  el.sumKj.textContent = `${totalKJ} kJ`;

  // 2. Normalized Power (NP), IF, TSS
  // NP = 4th root of (average of 30-second rolling average raised to the 4th power)
  let np = 0;
  let tss = 0;
  let intensityFactor = 0.00;

  if (durationSec >= 30) {
    let rollSum4th = 0;
    let rollTicks = 0;
    
    // Calculate 30s rolling averages
    for (let i = 29; i < durationSec; i++) {
      let sum30s = 0;
      for (let j = 0; j < 30; j++) {
        sum30s += state.rideHistory[i - j].power;
      }
      const avg30s = sum30s / 30;
      rollSum4th += Math.pow(avg30s, 4);
      rollTicks++;
    }

    if (rollTicks > 0) {
      np = Math.round(Math.pow(rollSum4th / rollTicks, 0.25));
      intensityFactor = np / state.ftp;
      
      // TSS = (sec * NP * IF) / (FTP * 3600) * 100
      tss = Math.round((durationSec * np * intensityFactor) / (state.ftp * 3600) * 100);
    }
  } else {
    // Fallback for short rides
    np = avgPower;
    intensityFactor = np / state.ftp;
    tss = Math.round((durationSec * np * intensityFactor) / (state.ftp * 3600) * 100);
  }

  el.sumNp.textContent = `${np} W`;
  el.sumIf.textContent = intensityFactor.toFixed(2);
  el.sumTss.textContent = tss;

  // 3. Power Zones Distribution Bars
  calculateZoneDistribution(durationSec);
}

function calculateZoneDistribution(totalSec) {
  el.zoneBarsContainer.innerHTML = '';
  
  // Set buckets
  const zoneSeconds = [0, 0, 0, 0, 0, 0, 0];
  
  state.rideHistory.forEach(pt => {
    const idx = getPowerZoneIndex(pt.power, state.ftp);
    zoneSeconds[idx]++;
  });

  ZONE_METADATA.forEach((meta, idx) => {
    const sec = zoneSeconds[idx];
    const pct = totalSec > 0 ? (sec / totalSec) * 100 : 0;
    
    const row = document.createElement('div');
    row.className = 'zone-row';
    
    row.innerHTML = `
      <span class="zone-name">${meta.name.split(' ')[0]} ${meta.name.split(' ')[1]}</span>
      <div class="zone-bar-bg">
        <div class="zone-bar-fill ${meta.class}" style="width: ${pct}%"></div>
      </div>
      <span class="zone-time">${formatDuration(sec)}</span>
    `;
    
    el.zoneBarsContainer.appendChild(row);
  });
}

// ----------------------------------------------------
// XML TCX FILE EXPORTING (Garmin/Strava Compatible)
// ----------------------------------------------------
function exportTCX() {
  if (state.rideHistory.length === 0) {
    alert("無任何騎乘紀錄可供匯出！");
    return;
  }

  const durationSec = state.rideHistory.length;
  const avgPower = state.avgPowerTicks > 0 ? Math.round(state.avgPowerSum / state.avgPowerTicks) : 0;
  const maxSpdKmh = state.rideHistory.reduce((acc, curr) => Math.max(acc, curr.speed), 0);
  const maxSpdMps = maxSpdKmh / 3.6;
  const distanceM = Math.round(state.currentDistanceKm * 1000);
  
  // Rough estimate of calories (using power & metabolic efficiency of 22%)
  // Calories = AvgPower * seconds * 4.184 / 1000 * 0.22 (actually 1 kJ power ~= 1-1.1 kcal food energy)
  const calories = Math.round((avgPower * durationSec) / 1000 * 1.1);

  // Generate ISO time strings
  const startTime = state.startTimeISO || new Date().toISOString();
  
  let trackpointsXML = "";
  
  state.rideHistory.forEach((pt) => {
    // Calculate timestamp for each second
    const ptTime = new Date(new Date(startTime).getTime() + pt.time * 1000).toISOString();
    
    let gpsXML = "";
    if (state.currentRoute) {
      // Find GPS location along GPX based on accumulated distance
      const pts = state.currentRoute.points;
      const distM = pt.distance * 1000;
      let lat = pts[0].lat;
      let lon = pts[0].lon;
      
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].dist <= distM && pts[i+1].dist >= distM) {
          const r = (distM - pts[i].dist) / (pts[i+1].dist - pts[i].dist || 1);
          lat = pts[i].lat + r * (pts[i+1].lat - pts[i].lat);
          lon = pts[i].lon + r * (pts[i+1].lon - pts[i].lon);
          break;
        }
      }
      
      gpsXML = `
              <Position>
                <LatitudeDegrees>${lat.toFixed(6)}</LatitudeDegrees>
                <LongitudeDegrees>${lon.toFixed(6)}</LongitudeDegrees>
              </Position>`;
    }

    trackpointsXML += `            <Trackpoint>
              <Time>${ptTime}</Time>${gpsXML}
              <AltitudeMeters>${pt.altitude}</AltitudeMeters>
              <DistanceMeters>${Math.round(pt.distance * 1000)}</DistanceMeters>
              <HeartRateBpm>
                <Value>${pt.hr}</Value>
              </HeartRateBpm>
              <Cadence>${pt.cadence}</Cadence>
              <Extensions>
                <TPX xmlns="http://www.garmin.com/xmlschemas/activityextension/v2">
                  <Watts>${pt.power}</Watts>
                  <Speed>${(pt.speed / 3.6).toFixed(2)}</Speed>
                </TPX>
              </Extensions>
            </Trackpoint>\n`;
  });

  const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase 
  xmlns="http://www.garmin.com/xmlschemas/trainingcenterdatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/trainingcenterdatabase/v2 http://www.garmin.com/xmlschemas/trainingcenterdatabasev2.xsd">
  <Activities>
    <Activity Sport="Biking">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${durationSec}</TotalTimeSeconds>
        <DistanceMeters>${distanceM}</DistanceMeters>
        <MaximumSpeed>${maxSpdMps.toFixed(2)}</MaximumSpeed>
        <Calories>${calories}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${trackpointsXML}        </Track>
      </Lap>
      <Creator xsi:type="Device_t">
        <Name>AeroSpin Web Trainer</Name>
        <UnitId>0</UnitId>
        <ProductID>0</ProductID>
        <Version>
          <VersionMajor>1</VersionMajor>
          <VersionMinor>0</VersionMinor>
          <BuildMajor>0</BuildMajor>
          <BuildMinor>0</BuildMinor>
        </Version>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

  // Create downloadable file link
  const blob = new Blob([tcxContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStr = new Date(startTime).toLocaleDateString().replace(/\//g, '-');
  a.download = `AeroSpin_Ride_${dateStr}.tcx`;
  a.href = url;
  a.click();
  
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// UI ACTIONS BINDINGS
// ----------------------------------------------------
el.btnRideStart.addEventListener('click', startRide);
el.btnRidePause.addEventListener('click', pauseRide);
el.btnRideStop.addEventListener('click', () => {
  if (confirm("您確定要結束這次的騎乘訓練嗎？")) {
    stopRide();
  }
});

el.btnWorkoutPrev.addEventListener('click', () => {
  if (state.currentWorkout && state.currentWorkout.prevInterval()) {
    audioManager.playCountdown(true);
    const inv = state.currentWorkout.getCurrentInterval();
    audioManager.speak(`回到上一個區間：${inv.label}。目標 ${state.currentWorkout.getCurrentTargetPower()} 瓦。`);
    rideTick(); // force redraw instantly
  }
});

el.btnWorkoutNext.addEventListener('click', () => {
  if (state.currentWorkout && state.currentWorkout.skipInterval()) {
    audioManager.playCountdown(true);
    const inv = state.currentWorkout.getCurrentInterval();
    audioManager.speak(`跳過此區間。進入下一區間：${inv.label}。目標 ${state.currentWorkout.getCurrentTargetPower()} 瓦。`);
    rideTick(); // force redraw instantly
  }
});

// FTMS MANUAL TARGET POWER ADJUSTMENTS
el.btnFtmsDec.addEventListener('click', () => {
  if (state.isRideActive && state.currentWorkout) return; // disabled only during active structured workouts
  const val = Math.max(50, (parseInt(el.valFtmsTargetW.textContent) || 150) - 10);
  el.valFtmsTargetW.textContent = val;
  if (ble.isMocking) ble.mockTargetPower = val;
  if (ble.devices.ftms) ble.setTargetPower(val);
  if (state.trainerControlMode === 'erg') {
    el.valTargetPower.textContent = val;
  }
});

el.btnFtmsInc.addEventListener('click', () => {
  if (state.isRideActive && state.currentWorkout) return; // disabled only during active structured workouts
  const val = Math.min(600, (parseInt(el.valFtmsTargetW.textContent) || 150) + 10);
  el.valFtmsTargetW.textContent = val;
  if (ble.isMocking) ble.mockTargetPower = val;
  if (ble.devices.ftms) ble.setTargetPower(val);
  if (state.trainerControlMode === 'erg') {
    el.valTargetPower.textContent = val;
  }
});

// FTMS Modes toggling
el.btnFtmsErg.addEventListener('click', () => {
  el.btnFtmsErg.classList.add('active');
  el.btnFtmsSim.classList.remove('active');
  state.trainerControlMode = 'erg';
  
  // Immediately sync target power to trainer/mock
  const targetW = parseInt(el.valFtmsTargetW.textContent) || 150;
  if (ble.devices.ftms) {
    ble.setTargetPower(targetW);
  }
  if (ble.isMocking) {
    ble.mockTargetPower = targetW;
  }
  el.valTargetPower.textContent = targetW;
});

el.btnFtmsSim.addEventListener('click', () => {
  el.btnFtmsSim.classList.add('active');
  el.btnFtmsErg.classList.remove('active');
  state.trainerControlMode = 'sim';
  
  // Immediately sync simulation grade to trainer
  if (ble.devices.ftms) {
    ble.setIndoorBikeSimulation(state.currentGradePct, state.weight);
  }
  el.valTargetPower.textContent = '--';
});

// Summary Modal Close
const closeSummary = () => {
  el.summaryModal.classList.add('hidden');
  
  if (cityManager) {
    cityManager.updateMetrics(0, 0, 0, 0);
  }

  // Reset ride log history for the next session
  state.rideHistory = [];
  state.currentDistanceKm = 0.0;
  state.currentGradePct = 0.0;
  state.avgPowerSum = 0;
  state.avgPowerTicks = 0;
  state.avgCadenceSum = 0;
  state.avgCadenceTicks = 0;
  state.avgHrSum = 0;
  state.avgHrTicks = 0;
  state.maxHeartRate = 0;
  state.maxPower = 0;
  state.startTimeISO = null;
  
  el.valPower.textContent = '0';
  el.valPower3s.textContent = '0';
  el.valCadence.textContent = '0';
  el.valHr.textContent = '0';
  el.valSpeed.textContent = '0.0';
  el.valGrade.textContent = '0.0';
  el.valDistance.textContent = '0.00';
  el.valAvgCadence.textContent = '0';
  el.valMaxHr.textContent = '0';
  el.valAvgHr.textContent = '0';
  
  drawCharts();
};

el.btnCloseSummary.addEventListener('click', closeSummary);
el.btnCloseSummaryBottom.addEventListener('click', closeSummary);
el.btnExportTcx.addEventListener('click', exportTCX);

// Scenic Photo Viewer Event Bindings
const btnViewLarge = document.getElementById('btn-toast-view-large');
const scenicModal = document.getElementById('scenic-modal');
const btnCloseScenic = document.getElementById('btn-close-scenic');
const btnCloseScenicBottom = document.getElementById('btn-close-scenic-bottom');
const scenicModalTitle = document.getElementById('scenic-modal-title');
const scenicModalImg = document.getElementById('scenic-modal-img');
const scenicModalDesc = document.getElementById('scenic-modal-desc');

if (btnViewLarge) {
  btnViewLarge.addEventListener('click', () => {
    if (cityManager && cityManager.activeLandmark) {
      const lm = cityManager.activeLandmark;
      if (scenicModalTitle) scenicModalTitle.textContent = lm.name;
      if (scenicModalImg) scenicModalImg.src = lm.image || '';
      if (scenicModalDesc) scenicModalDesc.textContent = lm.desc;
      if (scenicModal) scenicModal.classList.remove('hidden');
    }
  });
}

const closeScenicModal = () => {
  if (scenicModal) scenicModal.classList.add('hidden');
};

if (btnCloseScenic) btnCloseScenic.addEventListener('click', closeScenicModal);
if (btnCloseScenicBottom) btnCloseScenicBottom.addEventListener('click', closeScenicModal);

// Initialize application on load
window.addEventListener('DOMContentLoaded', initApp);

// Retrieve stored API key
function getGeminiApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

// Initialize AI section in the Summary Modal
function initSummaryAISection() {
  const apiKey = getGeminiApiKey();
  const warningEl = document.getElementById('ai-summary-warning');
  const loadingEl = document.getElementById('ai-summary-loading');
  const resultEl = document.getElementById('ai-summary-result');
  const btnEl = document.getElementById('btn-generate-ai-summary');

  if (warningEl) warningEl.classList.add('hidden');
  if (loadingEl) loadingEl.classList.add('hidden');
  if (resultEl) resultEl.classList.add('hidden');

  if (!apiKey) {
    if (warningEl) {
      warningEl.innerHTML = `
        ⚠️ 尚未設定 Gemini API 金鑰！<br>
        請至左側邊欄「AI 助理」分頁中填寫並儲存您的 API 金鑰。
      `;
      warningEl.classList.remove('hidden');
    }
    if (btnEl) btnEl.classList.add('hidden');
  } else {
    if (btnEl) {
      btnEl.textContent = '✨ 產生 AI 訓練建議';
      btnEl.classList.remove('hidden');
    }
  }
}

// Generate Gemini AI Advisor training suggestions
async function generateAIAdvice() {
  const apiKey = getGeminiApiKey();
  const warningEl = document.getElementById('ai-summary-warning');
  const loadingEl = document.getElementById('ai-summary-loading');
  const resultEl = document.getElementById('ai-summary-result');
  const btnEl = document.getElementById('btn-generate-ai-summary');
  const sidebarSuggestionEl = document.getElementById('ai-sidebar-suggestion');

  if (!apiKey) return;

  // Show loading, hide others
  if (warningEl) warningEl.classList.add('hidden');
  if (resultEl) resultEl.classList.add('hidden');
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (btnEl) btnEl.classList.add('hidden');

  // Compute metrics
  const durationSec = state.rideHistory.length;
  const avgPower = state.avgPowerTicks > 0 ? Math.round(state.avgPowerSum / state.avgPowerTicks) : 0;
  const maxPower = state.maxPower || 0;
  const avgHr = state.avgHrTicks > 0 ? Math.round(state.avgHrSum / state.avgHrTicks) : 0;
  const maxHr = state.maxHeartRate || 0;
  const distKm = state.currentDistanceKm.toFixed(2);
  const ftp = state.ftp;
  const weight = state.weight;
  const height = state.height || 175;
  const intensitySelect = document.getElementById('workout-intensity-scale');
  const intensityScale = intensitySelect ? intensitySelect.value : '1.0';

  // Compute zones time
  const zoneSeconds = [0, 0, 0, 0, 0, 0, 0];
  state.rideHistory.forEach(pt => {
    const idx = getPowerZoneIndex(pt.power, state.ftp);
    zoneSeconds[idx]++;
  });
  
  const zoneDistributionText = ZONE_METADATA.map((meta, idx) => {
    return `- ${meta.name}: ${formatDuration(zoneSeconds[idx])}`;
  }).join('\n');

  // Build the prompt
  const prompt = `您是專業的自行車訓練智慧教練。請針對以下踩踏訓練數據進行分析：

【使用者基本資料】
- 身高：${height} 公分
- 體重：${weight} 公斤
- FTP 閥值功率：${ftp} 瓦
- 課表設定強度百分比：${Math.round(parseFloat(intensityScale) * 100)}%

【本次騎乘訓練數據】
- 訓練時間：${formatDuration(durationSec)}
- 總騎乘距離：${distKm} 公里
- 平均功率：${avgPower} 瓦
- 最大功率：${maxPower} 瓦
- 平均心率：${avgHr} BPM
- 最大心率：${maxHr} BPM

【各功率區間分佈】
${zoneDistributionText}

請以專業自行車教練的視角，為使用者提供：
1. 本次訓練的整體結論與評估（包含對比其身高體重與 FTP，分析強度是否合適）。
2. 詳細的心率與功率數據分析（如心率與功率的對應關係，是否過高或過低）。
3. 針對下一次訓練設定的具體建議（例如是否需要調整 FTP 功率極限值、或是下次是否可以使用 6 成或 8 成強度課表）。

請用繁體中文回覆，使用 Markdown 格式輸出。`;

  try {
    const res = await callGeminiAPI(apiKey, prompt);
    const markdown = res.text || '無法產生建議，請稍後重試。';
    
    // Parse markdown to HTML
    const htmlContent = parseMarkdownToHtml(markdown);
    
    // Hide loading
    if (loadingEl) loadingEl.classList.add('hidden');

    // Show result inside modal
    if (resultEl) {
      resultEl.innerHTML = htmlContent;
      resultEl.classList.remove('hidden');
    }

    // Sync to sidebar suggestion box too!
    if (sidebarSuggestionEl) {
      sidebarSuggestionEl.innerHTML = htmlContent;
    }

    // Restore button with reload text
    if (btnEl) {
      btnEl.textContent = '✨ 重新分析建議';
      btnEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Gemini API Error:", err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (warningEl) {
      warningEl.innerHTML = `
        ❌ 呼叫 Gemini AI 失敗：<br>
        <span style="font-size: 0.8rem; color: #f87171;">${err.message}</span>
      `;
      warningEl.classList.remove('hidden');
    }
    if (btnEl) {
      btnEl.textContent = '✨ 重試產生建議';
      btnEl.classList.remove('hidden');
    }
  }
}

// Generic call to Gemini API with fallback models
async function callGeminiAPI(apiKey, promptText) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { text, model };
        }
      } else {
        const errData = await response.json();
        const msg = errData.error?.message || `HTTP error! status: ${response.status}`;
        lastError = new Error(`${model} 失敗: ${msg}`);
      }
    } catch (err) {
      lastError = new Error(`${model} 連線錯誤: ${err.message}`);
    }
  }

  throw lastError || new Error("呼叫所有 Gemini 模型均失敗");
}

// Lightweight Markdown to HTML Converter
function parseMarkdownToHtml(md) {
  let html = md;
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Unordered list items
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  
  // Wrap contiguous lists
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Split into paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<li')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).filter(p => p).join('\n');
  
  return html;
}


