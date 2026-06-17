// Performance-Optimized Canvas Charting Engine for AeroSpin
// Handles full-workout profiles and rolling open-ride telemetries

// Zone colors for workout profiles
function getZoneColor(powerPct) {
  if (powerPct < 55) return 'rgba(100, 116, 139, 0.4)';  // Z1 Recovery - Slate
  if (powerPct < 75) return 'rgba(59, 130, 246, 0.4)';   // Z2 Endurance - Blue
  if (powerPct < 90) return 'rgba(16, 185, 129, 0.4)';   // Z3 Tempo - Green
  if (powerPct < 105) return 'rgba(245, 175, 25, 0.4)';  // Z4 Threshold - Orange/Gold
  if (powerPct < 120) return 'rgba(249, 115, 22, 0.4)';  // Z5 VO2 Max - Orange
  return 'rgba(239, 68, 68, 0.45)';                       // Z6+ Anaerobic/Sprint - Red
}

function getZoneBorderColor(powerPct) {
  if (powerPct < 55) return '#64748b';
  if (powerPct < 75) return '#3b82f6';
  if (powerPct < 90) return '#10b981';
  if (powerPct < 105) return '#f5af19';
  if (powerPct < 120) return '#f97316';
  return '#ef4444';
}

export const chartEngine = {
  /**
   * Render structured workout target bars and overlay actual ride logs
   */
  drawWorkout(canvas, player, history) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = canvas.parentElement.clientHeight;
    
    ctx.clearRect(0, 0, w, h);

    if (!player || player.intervals.length === 0) return;

    const intervals = player.intervals;
    const totalDuration = player.totalDuration;
    
    // Scale parameters
    const padLeft = 45;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 25;
    const drawW = w - padLeft - padRight;
    const drawH = h - padTop - padBottom;

    // Find max power in the workout to set Y-axis scale (min 150% of FTP or max interval power)
    let maxPct = 130;
    intervals.forEach(inv => {
      maxPct = Math.max(maxPct, inv.startPower, inv.endPower);
    });
    // Add some headroom
    maxPct += 20;

    // Helper functions for coordinates mapping
    const getX = (timeSec) => padLeft + (timeSec / totalDuration) * drawW;
    const getY = (powerPct) => h - padBottom - (powerPct / maxPct) * drawH;
    
    // 1. Draw Y-axis gridlines (50%, 100%, 150% FTP)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px "Share Tech Mono"';
    ctx.textAlign = 'right';
    
    [50, 100, 150].forEach(pct => {
      if (pct < maxPct) {
        const gridY = getY(pct);
        ctx.beginPath();
        ctx.moveTo(padLeft, gridY);
        ctx.lineTo(w - padRight, gridY);
        ctx.stroke();
        ctx.fillText(`${pct}%`, padLeft - 8, gridY + 3);
      }
    });

    // 2. Draw Target Workout Blocks
    let currentX = 0;
    intervals.forEach(inv => {
      const startX = getX(currentX);
      const endX = getX(currentX + inv.duration);
      const startY = getY(inv.startPower);
      const endY = getY(inv.endPower);
      
      // Draw colored interval box
      ctx.beginPath();
      ctx.moveTo(startX, h - padBottom);
      ctx.lineTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX, h - padBottom);
      ctx.closePath();
      
      const avgPct = (inv.startPower + inv.endPower) / 2;
      ctx.fillStyle = getZoneColor(avgPct);
      ctx.fill();
      
      // Draw interval upper line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = getZoneBorderColor(avgPct);
      ctx.lineWidth = 2;
      ctx.stroke();

      currentX += inv.duration;
    });

    // 3. Draw Actual Rider Power History
    if (history && history.length > 0) {
      ctx.beginPath();
      ctx.moveTo(getX(history[0].time), getY((history[0].power / player.ftp) * 100));
      
      for (let i = 1; i < history.length; i++) {
        const pPct = (history[i].power / player.ftp) * 100;
        ctx.lineTo(getX(history[i].time), getY(pPct));
      }
      
      // Outer glow line effect (neon cyan)
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 5;
      ctx.stroke();
      
      // Inner sharp line
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2.0;
      ctx.stroke();
      
      // 4. Draw Heart Rate History on secondary scale (map 50-200 BPM to Y-axis)
      ctx.beginPath();
      const getHrY = (hr) => {
        const hrMin = 50;
        const hrMax = 200;
        const ratio = Math.max(0, Math.min(1, (hr - hrMin) / (hrMax - hrMin)));
        return h - padBottom - ratio * drawH;
      };
      
      ctx.moveTo(getX(history[0].time), getHrY(history[0].hr));
      for (let i = 1; i < history.length; i++) {
        if (history[i].hr > 0) {
          ctx.lineTo(getX(history[i].time), getHrY(history[i].hr));
        }
      }
      
      ctx.strokeStyle = '#f857a6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 5. Draw Time Cursor Line
    const cursorX = getX(player.totalElapsed);
    if (cursorX >= padLeft && cursorX <= w - padRight) {
      ctx.beginPath();
      ctx.moveTo(cursorX, padTop);
      ctx.lineTo(cursorX, h - padBottom);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]); // dashed line
      ctx.stroke();
      ctx.setLineDash([]); // restore solid
      
      // Triangle handle at bottom of cursor
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cursorX - 5, h - padBottom);
      ctx.lineTo(cursorX + 5, h - padBottom);
      ctx.lineTo(cursorX, h - padBottom - 6);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Draw X-axis Timeline labels (every 5-10 mins depending on duration)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px "Share Tech Mono"';
    ctx.textAlign = 'center';
    
    const labelInterval = totalDuration > 1800 ? 600 : 300; // 10 mins or 5 mins
    for (let t = 0; t <= totalDuration; t += labelInterval) {
      const labelX = getX(t);
      const minutes = Math.floor(t / 60);
      ctx.fillText(`${minutes}m`, labelX, h - 8);
    }
  },

  /**
   * Draw a rolling 5-minute chart for open riding and GPX course simulations
   */
  drawRolling(canvas, history, maxWindowSeconds = 300) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = canvas.parentElement.clientHeight;
    
    ctx.clearRect(0, 0, w, h);

    if (!history || history.length === 0) return;

    // Filter history to fit within the scrolling window (e.g. last 300s)
    const latestTime = history[history.length - 1].time;
    const startTime = Math.max(0, latestTime - maxWindowSeconds);
    const windowData = history.filter(pt => pt.time >= startTime);

    if (windowData.length === 0) return;

    const padLeft = 45;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 25;
    const drawW = w - padLeft - padRight;
    const drawH = h - padTop - padBottom;

    // Find max power in window to scale Y-axis (min 250W)
    let maxPowerVal = 250;
    windowData.forEach(pt => {
      maxPowerVal = Math.max(maxPowerVal, pt.power);
    });
    maxPowerVal += 50; // buffer

    // Mapping formulas
    const getX = (t) => padLeft + ((t - startTime) / maxWindowSeconds) * drawW;
    const getY = (p) => h - padBottom - (p / maxPowerVal) * drawH;
    const getHrY = (hr) => {
      const hrMin = 50;
      const hrMax = 200;
      const ratio = Math.max(0, Math.min(1, (hr - hrMin) / (hrMax - hrMin)));
      return h - padBottom - ratio * drawH;
    };

    // Draw Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px "Share Tech Mono"';
    ctx.textAlign = 'right';

    const gridLines = [100, 200, 300, 400];
    gridLines.forEach(p => {
      if (p < maxPowerVal) {
        const gridY = getY(p);
        ctx.beginPath();
        ctx.moveTo(padLeft, gridY);
        ctx.lineTo(w - padRight, gridY);
        ctx.stroke();
        ctx.fillText(`${p}W`, padLeft - 8, gridY + 3);
      }
    });

    // Draw Power Line
    ctx.beginPath();
    ctx.moveTo(getX(windowData[0].time), getY(windowData[0].power));
    for (let i = 1; i < windowData.length; i++) {
      ctx.lineTo(getX(windowData[i].time), getY(windowData[i].power));
    }
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 5;
    ctx.stroke();
    
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Draw HR Line
    ctx.beginPath();
    ctx.moveTo(getX(windowData[0].time), getHrY(windowData[0].hr));
    for (let i = 1; i < windowData.length; i++) {
      if (windowData[i].hr > 0) {
        ctx.lineTo(getX(windowData[i].time), getHrY(windowData[i].hr));
      }
    }
    ctx.strokeStyle = '#f857a6';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw X-axis rolling time labels (every 60s)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px "Share Tech Mono"';
    ctx.textAlign = 'center';
    
    const startMin = Math.ceil(startTime / 60);
    const endMin = Math.floor(latestTime / 60);
    
    for (let m = startMin; m <= endMin; m++) {
      const t = m * 60;
      const labelX = getX(t);
      if (labelX >= padLeft && labelX <= w - padRight) {
        ctx.fillText(`${m}m`, labelX, h - 8);
      }
    }
  }
};
