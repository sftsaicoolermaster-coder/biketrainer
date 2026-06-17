// Workout Parsing and Player Engine for AeroSpin

// Predefined workout presets
export const WORKOUT_PRESETS = {
  ftp_test: {
    title: "20分鐘 FTP 測驗 (標準評估)",
    desc: "標準的 FTP 20 分鐘測驗課表。包含高強度暖身與清空排空，再進行 20 分鐘的全力騎乘。",
    intervals: [
      { duration: 600, startPower: 40, endPower: 70, label: "暖身漸進式騎乘" },
      { duration: 120, startPower: 50, endPower: 50, label: "輕鬆恢復" },
      { duration: 30, startPower: 100, endPower: 100, label: "高踏頻刺激" },
      { duration: 30, startPower: 50, endPower: 50, label: "輕鬆恢復" },
      { duration: 30, startPower: 100, endPower: 100, label: "高踏頻刺激" },
      { duration: 30, startPower: 50, endPower: 50, label: "輕鬆恢復" },
      { duration: 120, startPower: 50, endPower: 50, label: "輕鬆恢復" },
      { duration: 300, startPower: 110, endPower: 110, label: "5分鐘排空努力" },
      { duration: 600, startPower: 60, endPower: 60, label: "測驗前充分恢復" },
      { duration: 1200, startPower: 100, endPower: 100, label: "🔥 20分鐘全力 FTP 測驗 🔥" },
      { duration: 300, startPower: 45, endPower: 45, label: "緩和騎乘" }
    ]
  },
  sweet_spot: {
    title: "甜區心肺訓練 (2 x 10分鐘 Sweet Spot)",
    desc: "在 88% - 93% FTP 區間進行兩組 10 分鐘的心肺耐力訓練，能有效提升有氧能力且恢復迅速。",
    intervals: [
      { duration: 480, startPower: 45, endPower: 75, label: "有氧暖身段" },
      { duration: 120, startPower: 55, endPower: 55, label: "暖身恢復" },
      { duration: 600, startPower: 90, endPower: 90, label: "第一組甜區努力 (Zone 3.5)" },
      { duration: 300, startPower: 50, endPower: 50, label: "中間動態恢復" },
      { duration: 600, startPower: 90, endPower: 90, label: "第二組甜區努力 (Zone 3.5)" },
      { duration: 300, startPower: 45, endPower: 45, label: "緩和騎乘" }
    ]
  },
  vo2_max: {
    title: "VO2 Max 爆發力訓練 (5 x 3分鐘 120%)",
    desc: "高強度間歇訓練 (HIIT)。5 組 3 分鐘高達 120% FTP 的心肺刺激，能顯著提升最大攝氧量。",
    intervals: [
      { duration: 600, startPower: 40, endPower: 80, label: "暖身包含漸進加速" },
      { duration: 120, startPower: 50, endPower: 50, label: "恢復準備" },
      { duration: 180, startPower: 120, endPower: 120, label: "⚡️ 第一組 VO2 Max 衝刺 ⚡️" },
      { duration: 180, startPower: 50, endPower: 50, label: "間歇恢復" },
      { duration: 180, startPower: 120, endPower: 120, label: "⚡️ 第二組 VO2 Max 衝刺 ⚡️" },
      { duration: 180, startPower: 50, endPower: 50, label: "間歇恢復" },
      { duration: 180, startPower: 120, endPower: 120, label: "⚡️ 第三組 VO2 Max 衝刺 ⚡️" },
      { duration: 180, startPower: 50, endPower: 50, label: "間歇恢復" },
      { duration: 180, startPower: 120, endPower: 120, label: "⚡️ 第四組 VO2 Max 衝刺 ⚡️" },
      { duration: 180, startPower: 50, endPower: 50, label: "間歇恢復" },
      { duration: 180, startPower: 120, endPower: 120, label: "⚡️ 第五組 VO2 Max 衝刺 ⚡️" },
      { duration: 420, startPower: 45, endPower: 45, label: "緩和騎乘" }
    ]
  },
  active_recovery: {
    title: "主動恢復 (30分鐘 輕踩排乳酸)",
    desc: "極低強度的有氧踩踏，幫助肌肉血液循環並加速乳酸排除。",
    intervals: [
      { duration: 300, startPower: 40, endPower: 50, label: "漸進暖身" },
      { duration: 1200, startPower: 55, endPower: 55, label: "輕鬆排乳酸旋轉" },
      { duration: 300, startPower: 40, endPower: 40, label: "緩和騎乘" }
    ]
  },
  ramp_test: {
    title: "階梯漸進式 FTP 測試 (Ramp Test)",
    desc: "每分鐘增加 5% FTP，直到無法維持踩踏為止。最後完成一分鐘最高平均功率的 75% 即為您的新 FTP。",
    intervals: [
      { duration: 300, startPower: 45, endPower: 45, label: "基本暖身" },
      { duration: 60, startPower: 50, endPower: 50, label: "階梯第 1 階 (50%)" },
      { duration: 60, startPower: 55, endPower: 55, label: "階梯第 2 階 (55%)" },
      { duration: 60, startPower: 60, endPower: 60, label: "階梯第 3 階 (60%)" },
      { duration: 60, startPower: 65, endPower: 65, label: "階梯第 4 階 (65%)" },
      { duration: 60, startPower: 70, endPower: 70, label: "階梯第 5 階 (70%)" },
      { duration: 60, startPower: 75, endPower: 75, label: "階梯第 6 階 (75%)" },
      { duration: 60, startPower: 80, endPower: 80, label: "階梯第 7 階 (80%)" },
      { duration: 60, startPower: 85, endPower: 85, label: "階梯第 8 階 (85%)" },
      { duration: 60, startPower: 90, endPower: 90, label: "階梯第 9 階 (90%)" },
      { duration: 60, startPower: 95, endPower: 95, label: "階梯第 10 階 (95%)" },
      { duration: 60, startPower: 100, endPower: 100, label: "階梯第 11 階 (100% FTP)" },
      { duration: 60, startPower: 105, endPower: 105, label: "階梯第 12 階 (105%)" },
      { duration: 60, startPower: 110, endPower: 110, label: "階梯第 13 階 (110%)" },
      { duration: 60, startPower: 115, endPower: 115, label: "階梯第 14 階 (115%)" },
      { duration: 60, startPower: 120, endPower: 120, label: "階梯第 15 階 (120%)" },
      { duration: 60, startPower: 125, endPower: 125, label: "階梯第 16 階 (125%)" },
      { duration: 60, startPower: 130, endPower: 130, label: "階梯第 17 階 (130%)" },
      { duration: 60, startPower: 135, endPower: 135, label: "階梯第 18 階 (135%)" },
      { duration: 60, startPower: 140, endPower: 140, label: "階梯第 19 階 (140%)" },
      { duration: 60, startPower: 145, endPower: 145, label: "階梯第 20 階 (145%)" },
      { duration: 60, startPower: 150, endPower: 150, label: "階梯第 21 階 (150%)" },
      { duration: 300, startPower: 45, endPower: 45, label: "緩和騎乘" }
    ]
  }
};

export class WorkoutPlayer {
  constructor(workoutData, userFTP = 200) {
    this.title = workoutData.title || "自訂課表";
    this.desc = workoutData.desc || "無說明";
    this.intervals = workoutData.intervals || [];
    this.ftp = userFTP;
    
    // Player State
    this.currentIntervalIndex = 0;
    this.elapsedInCurrentInterval = 0;
    this.totalElapsed = 0;
    this.isPlaying = false;
    
    // Precompute total duration and timeline values
    this.totalDuration = this.intervals.reduce((acc, curr) => acc + curr.duration, 0);
  }

  // Get current active interval
  getCurrentInterval() {
    return this.intervals[this.currentIntervalIndex] || null;
  }

  // Get current target power in Watts (interpolated for ramps)
  getCurrentTargetPower() {
    const interval = this.getCurrentInterval();
    if (!interval) return 0;

    const progress = this.elapsedInCurrentInterval / interval.duration;
    const startW = (interval.startPower / 100) * this.ftp;
    const endW = (interval.endPower / 100) * this.ftp;
    
    return Math.round(startW + (endW - startW) * progress);
  }

  // Get percentage progress in current interval (0 to 1)
  getIntervalProgress() {
    const interval = this.getCurrentInterval();
    if (!interval) return 0;
    return this.elapsedInCurrentInterval / interval.duration;
  }

  // Remaining duration in current interval
  getIntervalRemainingTime() {
    const interval = this.getCurrentInterval();
    if (!interval) return 0;
    return interval.duration - this.elapsedInCurrentInterval;
  }

  // Total remaining duration in workout
  getTotalRemainingTime() {
    return this.totalDuration - this.totalElapsed;
  }

  // Advance by 1 second. Returns true if interval changed, false otherwise.
  // Returns null if workout is finished.
  tick() {
    if (!this.isPlaying) return false;

    const currentInterval = this.getCurrentInterval();
    if (!currentInterval) {
      this.isPlaying = false;
      return null; // Workout finished
    }

    this.elapsedInCurrentInterval++;
    this.totalElapsed++;

    if (this.elapsedInCurrentInterval >= currentInterval.duration) {
      // Move to next interval
      this.currentIntervalIndex++;
      this.elapsedInCurrentInterval = 0;
      
      if (this.currentIntervalIndex >= this.intervals.length) {
        this.isPlaying = false;
        return null; // Finished
      }
      return true; // Changed interval
    }

    return false; // Same interval
  }

  // Skip current interval
  skipInterval() {
    if (this.currentIntervalIndex < this.intervals.length - 1) {
      // Adjust total elapsed by adding remaining time of current interval
      const rem = this.getIntervalRemainingTime();
      this.totalElapsed += rem;
      
      this.currentIntervalIndex++;
      this.elapsedInCurrentInterval = 0;
      return true;
    }
    return false;
  }

  // Previous interval
  prevInterval() {
    if (this.currentIntervalIndex > 0) {
      // Recalculate total elapsed: subtract current elapsed + previous interval duration
      this.totalElapsed -= (this.elapsedInCurrentInterval + this.intervals[this.currentIntervalIndex - 1].duration);
      this.currentIntervalIndex--;
      this.elapsedInCurrentInterval = 0;
      return true;
    }
    return false;
  }

  // Set FTP value
  updateFTP(newFTP) {
    this.ftp = newFTP;
  }

  // Calculate workout statistics estimates
  static estimateTSSandIF(intervals, ftp) {
    let totalDuration = 0;
    let npSumPower = 0;
    
    intervals.forEach(interval => {
      totalDuration += interval.duration;
      // Estimate NP using average of start and end power as a rough estimate
      const avgPowerPct = (interval.startPower + interval.endPower) / 200;
      npSumPower += Math.pow(avgPowerPct * ftp, 4) * interval.duration;
    });

    if (totalDuration === 0) return { tss: 0, intensityFactor: 0 };

    const estimatedNP = Math.pow(npSumPower / totalDuration, 0.25);
    const intensityFactor = estimatedNP / ftp;
    const tss = (totalDuration * estimatedNP * intensityFactor) / (ftp * 3600) * 100;

    return {
      tss: Math.round(tss),
      intensityFactor: parseFloat(intensityFactor.toFixed(2))
    };
  }
}

/**
 * Parses MRC or ERG file content into standard workout structure.
 * 
 * MRC file format overview:
 * [COURSE HEADER]
 * ...
 * [COURSE DATA]
 * <Time in Min>  <Power % of FTP>
 * ...
 */
export function parseMRC(fileText) {
  const lines = fileText.split('\n');
  const keypoints = [];
  let inCourseData = false;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.toUpperCase() === '[COURSE DATA]') {
      inCourseData = true;
      continue;
    }
    if (line.startsWith('[') && line.toUpperCase() !== '[COURSE DATA]') {
      inCourseData = false;
      continue;
    }

    if (inCourseData) {
      // Match two floating point numbers
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const timeMin = parseFloat(parts[0]);
        const powerPct = parseFloat(parts[1]);
        if (!isNaN(timeMin) && !isNaN(powerPct)) {
          keypoints.push({ time: timeMin, power: powerPct });
        }
      }
    }
  }

  if (keypoints.length < 2) {
    throw new Error("課表檔案中查無足夠的區間資料！");
  }

  // Sort keypoints by time
  keypoints.sort((a, b) => a.time - b.time);

  // Convert keypoints to intervals
  const intervals = [];
  for (let i = 0; i < keypoints.length - 1; i++) {
    const kpStart = keypoints[i];
    const kpEnd = keypoints[i + 1];
    
    const durationSeconds = Math.round((kpEnd.time - kpStart.time) * 60);
    if (durationSeconds <= 0) continue; // Skip redundant/error entries

    // Determine target zone label based on intensity
    let label = "踩踏區段";
    const avgPct = (kpStart.power + kpEnd.power) / 2;
    if (avgPct < 55) label = "有氧恢復";
    else if (avgPct < 75) label = "基礎耐力";
    else if (avgPct < 90) label = "節奏區間";
    else if (avgPct < 105) label = "乳酸閥值區段";
    else if (avgPct < 120) label = "VO2 Max 衝刺";
    else label = "無氧爆發衝刺";

    intervals.push({
      duration: durationSeconds,
      startPower: kpStart.power,
      endPower: kpEnd.power,
      label: label
    });
  }

  return {
    title: "載入的自訂課表",
    desc: `共 ${intervals.length} 個區間，匯入自 MRC 檔案。`,
    intervals: intervals
  };
}

/**
 * Parses JSON workout file content.
 * Expected structure:
 * {
 *   "title": "Workout Title",
 *   "desc": "Description",
 *   "intervals": [ { "duration": 300, "startPower": 50, "endPower": 50, "label": "Warmup" } ]
 * }
 */
export function parseJSONWorkout(fileText) {
  const data = JSON.parse(fileText);
  if (!data.intervals || !Array.isArray(data.intervals)) {
    throw new Error("JSON 格式不符！必須包含 intervals 陣列。");
  }
  return {
    title: data.title || "自訂 JSON 課表",
    desc: data.desc || "無說明",
    intervals: data.intervals.map(inv => ({
      duration: Number(inv.duration),
      startPower: Number(inv.startPower || inv.power),
      endPower: Number(inv.endPower !== undefined ? inv.endPower : (inv.startPower || inv.power)),
      label: inv.label || "踩踏區段"
    }))
  };
}
