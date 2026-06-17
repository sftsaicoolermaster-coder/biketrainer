// GPX Parsing and Elevation Course Engine for AeroSpin

// Earth Radius in meters for Haversine formula
const EARTH_RADIUS = 6371000;

// Haversine formula to compute distance between two lat/lon coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c; // returns distance in meters
}

// Simple moving average to smooth noisy GPS elevations
function smoothElevations(points, windowSize = 5) {
  const smoothed = [];
  const half = Math.floor(windowSize / 2);
  
  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let w = -half; w <= half; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < points.length) {
        sum += points[idx].ele;
        count++;
      }
    }
    smoothed.push(sum / count);
  }
  
  // Re-assign smoothed elevation to points
  for (let i = 0; i < points.length; i++) {
    points[i].ele = smoothed[i];
  }
}

// Calculate slope grade between successive points
function calculateGrades(points) {
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      points[i].grade = 0;
      continue;
    }
    
    const dp = points[i];
    const prev = points[i - 1];
    const distDelta = dp.dist - prev.dist;
    
    if (distDelta > 0.1) { // avoid division by near-zero
      const eleDelta = dp.ele - prev.ele;
      points[i].grade = eleDelta / distDelta; // ratio (e.g. 0.05 for 5%)
    } else {
      points[i].grade = points[i - 1].grade;
    }
  }
}

export const gpxEngine = {
  /**
   * Parse a GPX XML string into a structured route array
   */
  parseGPX(gpxText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");
    
    // Check for parse errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("GPX 檔案解析失敗！非合法的 XML 格式。");
    }

    const trkName = xmlDoc.querySelector("trk > name")?.textContent || "載入的路徑";
    const trackPoints = xmlDoc.querySelectorAll("trkpt");

    if (trackPoints.length < 2) {
      throw new Error("GPX 軌跡點不足 (至少需要2點)。");
    }

    const points = [];
    let accumulatedDistance = 0;

    for (let i = 0; i < trackPoints.length; i++) {
      const pt = trackPoints[i];
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const ele = parseFloat(pt.querySelector("ele")?.textContent || "0");

      if (isNaN(lat) || isNaN(lon)) continue;

      if (i > 0) {
        const prevPt = points[points.length - 1];
        const d = haversineDistance(prevPt.lat, prevPt.lon, lat, lon);
        accumulatedDistance += d;
      }

      points.push({
        lat: lat,
        lon: lon,
        ele: ele,
        dist: accumulatedDistance // in meters
      });
    }

    // Apply filters
    smoothElevations(points, 7); // Smooth elevations to avoid trainer shocks
    calculateGrades(points);

    // Compute meta stats
    const totalDist = accumulatedDistance; // in meters
    let totalAscent = 0;
    let maxGrade = 0;
    
    for (let i = 1; i < points.length; i++) {
      const eleDiff = points[i].ele - points[i - 1].ele;
      if (eleDiff > 0) totalAscent += eleDiff;
      
      const absGrade = Math.abs(points[i].grade);
      if (absGrade > maxGrade) maxGrade = absGrade;
    }

    return {
      name: trkName,
      points: points,
      totalDistance: totalDist, // meters
      totalAscent: totalAscent, // meters
      maxGrade: maxGrade * 100, // percentage
      avgGrade: (totalDist > 0) ? (points[points.length - 1].ele - points[0].ele) / totalDist * 100 : 0
    };
  },

  /**
   * Find and interpolate grade (slope ratio) at a specific distance (in meters) along the route
   */
  getGradeAtDistance(route, currentDistanceMeters) {
    if (!route || !route.points || route.points.length === 0) return 0;
    
    const pts = route.points;
    const len = pts.length;
    
    // Clamp distance to bounds
    if (currentDistanceMeters <= 0) return pts[0].grade;
    if (currentDistanceMeters >= route.totalDistance) return pts[len - 1].grade;

    // Binary search to find the segment
    let low = 0;
    let high = len - 1;
    let index = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (pts[mid].dist <= currentDistanceMeters) {
        index = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Interpolate grade between index and index+1
    if (index >= len - 1) return pts[len - 1].grade;
    
    const ptA = pts[index];
    const ptB = pts[index + 1];
    
    const ratio = (currentDistanceMeters - ptA.dist) / (ptB.dist - ptA.dist);
    return ptA.grade + ratio * (ptB.grade - ptA.grade);
  },

  /**
   * Procedural generator for standard courses
   */
  generatePresetRoute(type) {
    const points = [];
    let name = "";
    let totalDistance = 0;
    let startEle = 0;
    
    if (type === 'alpe_huez') {
      name = "阿爾卑斯經典爬坡段 (Alpe d'Huez)";
      totalDistance = 13800; // 13.8 km
      startEle = 740; // 740m to 1800m
      
      const numPoints = 200;
      for (let i = 0; i < numPoints; i++) {
        const dist = (i / (numPoints - 1)) * totalDistance;
        const fraction = i / (numPoints - 1);
        
        // Base climb + hairpin ripples (slope oscillation)
        const climbProgress = fraction * 1060; // total 1060m climb
        const hairpins = Math.sin(fraction * Math.PI * 21) * 30; // 21 hairpins
        const ele = startEle + climbProgress + hairpins;
        
        points.push({ lat: 45.0 + fraction * 0.1, lon: 6.0 + fraction * 0.05, ele, dist });
      }
    } else if (type === 'flat_loop') {
      name = "平坦計時賽環線 (Flat Loop)";
      totalDistance = 10000; // 10 km
      startEle = 50;
      
      const numPoints = 150;
      for (let i = 0; i < numPoints; i++) {
        const dist = (i / (numPoints - 1)) * totalDistance;
        const fraction = i / (numPoints - 1);
        
        // Minor variations (+- 3m)
        const ele = startEle + Math.sin(fraction * Math.PI * 4) * 4 + Math.cos(fraction * Math.PI * 10) * 2;
        points.push({ lat: 25.0 + Math.sin(fraction * Math.PI * 2) * 0.05, lon: 121.0 + Math.cos(fraction * Math.PI * 2) * 0.05, ele, dist });
      }
    } else {
      // rolling_hills
      name = "丘陵起伏路段 (Rolling Hills)";
      totalDistance = 15400; // 15.4 km
      startEle = 100;
      
      const numPoints = 200;
      for (let i = 0; i < numPoints; i++) {
        const dist = (i / (numPoints - 1)) * totalDistance;
        const fraction = i / (numPoints - 1);
        
        // Rolling waves
        const ele = startEle + 
          Math.sin(fraction * Math.PI * 8) * 45 + 
          Math.sin(fraction * Math.PI * 2.5) * 60 + 
          Math.cos(fraction * Math.PI * 20) * 8;
        points.push({ lat: 24.5 + fraction * 0.08, lon: 120.8 + Math.sin(fraction * Math.PI * 6) * 0.04, ele, dist });
      }
    }

    smoothElevations(points, 5);
    calculateGrades(points);

    // Compute stats
    let totalAscent = 0;
    let maxGrade = 0;
    
    for (let i = 1; i < points.length; i++) {
      const eleDiff = points[i].ele - points[i - 1].ele;
      if (eleDiff > 0) totalAscent += eleDiff;
      
      const absGrade = Math.abs(points[i].grade);
      if (absGrade > maxGrade) maxGrade = absGrade;
    }

    return {
      name: name,
      points: points,
      totalDistance: totalDistance,
      totalAscent: totalAscent,
      maxGrade: maxGrade * 100,
      avgGrade: (points[points.length - 1].ele - points[0].ele) / totalDistance * 100
    };
  },

  /**
   * Render route elevation profile onto a Canvas context
   */
  drawElevationProfile(canvas, route, currentDistanceMeters = 0) {
    if (!route || !route.points || route.points.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    const pts = route.points;
    const len = pts.length;
    
    // Find min/max elevation for scaling
    let minEle = Infinity;
    let maxEle = -Infinity;
    
    pts.forEach(p => {
      if (p.ele < minEle) minEle = p.ele;
      if (p.ele > maxEle) maxEle = p.ele;
    });
    
    // Padding
    const padX = 10;
    const padY = 10;
    const drawW = w - 2 * padX;
    const drawH = h - 2 * padY;
    
    const eleRange = maxEle - minEle || 10; // avoid div by zero
    const distMax = route.totalDistance || 1;
    
    // Helper to map distance & elevation to canvas X & Y
    const getX = (dist) => padX + (dist / distMax) * drawW;
    const getY = (ele) => h - padY - ((ele - minEle) / eleRange) * drawH;
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gridY = padY + (i / 4) * drawH;
      ctx.beginPath();
      ctx.moveTo(padX, gridY);
      ctx.lineTo(w - padX, gridY);
      ctx.stroke();
    }
    
    // Build path
    ctx.beginPath();
    ctx.moveTo(getX(pts[0].dist), getY(pts[0].ele));
    
    for (let i = 1; i < len; i++) {
      ctx.lineTo(getX(pts[i].dist), getY(pts[i].ele));
    }
    
    // Draw fill area (semi-transparent orange/yellow gradient)
    const gradient = ctx.createLinearGradient(0, padY, 0, h - padY);
    gradient.addColorStop(0, 'rgba(245, 175, 25, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 175, 25, 0.02)');
    
    // Close the path to form a polygon
    ctx.lineTo(getX(pts[len - 1].dist), h - padY);
    ctx.lineTo(getX(pts[0].dist), h - padY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line border
    ctx.beginPath();
    ctx.moveTo(getX(pts[0].dist), getY(pts[0].ele));
    for (let i = 1; i < len; i++) {
      ctx.lineTo(getX(pts[i].dist), getY(pts[i].ele));
    }
    ctx.strokeStyle = '#f5af19';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(245, 175, 25, 0.5)';
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow
    
    // Draw Rider Current Position Dot
    const dotX = getX(currentDistanceMeters);
    const currentEle = pts[0].ele + (pts[len-1].ele - pts[0].ele) * (currentDistanceMeters / distMax); // approximate if exact not looked up, but let's interpolate properly
    
    // Find interpolated elevation for exact dot positioning
    let riderEle = pts[0].ele;
    for (let i = 0; i < len - 1; i++) {
      if (pts[i].dist <= currentDistanceMeters && pts[i+1].dist >= currentDistanceMeters) {
        const r = (currentDistanceMeters - pts[i].dist) / (pts[i+1].dist - pts[i].dist || 1);
        riderEle = pts[i].ele + r * (pts[i+1].ele - pts[i].ele);
        break;
      }
    }
    const dotY = getY(riderEle);
    
    // Glowing outer ring
    ctx.beginPath();
    ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    
    // Inner solid core
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#070a13';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }
};
