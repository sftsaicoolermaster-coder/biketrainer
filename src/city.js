// Virtual City and Scenic Attractions Engine for AeroSpin
// Renders a low-hardware 2D parallax city with vector landmarks and animated cyclist

// Landmark databases for different tours
const LANDMARKS = {
  taipei: [
    { name: "台北101 (Taipei 101)", dist: 1500, draw: drawTaipei101, desc: "世界知名摩天大樓，高508公尺，曾為世界第一高樓。", image: "/images/taipei_101.png" },
    { name: "圓山大飯店 (Grand Hotel)", dist: 4500, draw: drawGrandHotel, desc: "傳統宮殿式建築地標，巍峨高聳，富麗堂皇。" },
    { name: "美麗華摩天輪 (Miramar Ferris Wheel)", dist: 7500, draw: drawFerrisWheel, desc: "台北著名夜景地標，巨型綠光摩天輪。" },
    { name: "陽明山登頂 (Yangmingshan Peak)", dist: 11000, draw: drawMountainPeak, desc: "台北近郊火山群，溫泉與四季花卉聞名。" }
  ],
  paris: [
    { name: "艾菲爾鐵塔 (Eiffel Tower)", dist: 2000, draw: drawEiffelTower, desc: "巴黎地標鏤空鐵塔，高330公尺，建於1889年。", image: "/images/eiffel_tower.png" },
    { name: "凱旋門 (Arc de Triomphe)", dist: 5000, draw: drawArcDeTriomphe, desc: "拿破崙為紀念奧斯特利茨戰役勝利而建的宏偉拱門。" },
    { name: "羅浮宮金字塔 (Louvre Pyramid)", dist: 8000, draw: drawLouvre, desc: "貝聿銘設計的玻璃金字塔，羅浮宮博物館入口。" },
    { name: "塞納河畔 (River Seine)", dist: 12000, draw: drawSeineBridge, desc: "浪漫的塞納河與古老石拱橋。" }
  ],
  tokyo: [
    { name: "東京鐵塔 (Tokyo Tower)", dist: 1800, draw: drawTokyoTower, desc: "紅白相間的經典鐵塔，高333公尺，模仿巴黎鐵塔建造。", image: "/images/tokyo_tower.png" },
    { name: "淺草寺雷門 (Senso-ji Temple)", dist: 4800, draw: drawSensoji, desc: "東京最古老寺廟，門前懸掛巨大的紅色燈籠。" },
    { name: "彩虹大橋 (Rainbow Bridge)", dist: 8200, draw: drawRainbowBridge, desc: "橫跨東京灣的雙層懸索橋，夜間發出紅白綠光芒。" },
    { name: "富士山遠眺 (Mt. Fuji View)", dist: 12500, draw: drawFuji, desc: "日本精神象徵，白雪覆頂的對稱圓錐火山。" }
  ]
};

// Vector Landmark Drawing Functions (rendered in 2D Canvas)
function drawTaipei101(ctx, x, y, h) {
  ctx.save();
  ctx.translate(x, y);
  
  const w = 40;
  ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 6;
  
  // Base
  ctx.fillRect(-w/2, -15, w, 15);
  ctx.strokeRect(-w/2, -15, w, 15);
  
  // 8 Trapezoid Segments
  let currY = -15;
  for (let i = 0; i < 8; i++) {
    const segH = 20;
    const bottomW = w * 0.9 - i * 1.5;
    const topW = w * 0.7 - i * 1.5;
    
    ctx.beginPath();
    ctx.moveTo(-bottomW/2, currY);
    ctx.lineTo(-topW/2, currY - segH);
    ctx.lineTo(topW/2, currY - segH);
    ctx.lineTo(bottomW/2, currY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    currY -= segH;
  }
  
  // Spire
  ctx.beginPath();
  ctx.moveTo(-2, currY);
  ctx.lineTo(-1, currY - 35);
  ctx.lineTo(1, currY - 35);
  ctx.lineTo(2, currY);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  
  // Spire Beacon
  ctx.beginPath();
  ctx.arc(0, currY - 35, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 12;
  ctx.fill();
  
  ctx.restore();
}

function drawEiffelTower(ctx, x, y, h) {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = 'rgba(248, 87, 166, 0.15)';
  ctx.strokeStyle = '#f857a6';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#f857a6';
  ctx.shadowBlur = 6;
  
  // Base arch legs
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.quadraticCurveTo(-15, -40, 0, -40);
  ctx.quadraticCurveTo(15, -40, 35, 0);
  ctx.lineTo(25, 0);
  ctx.quadraticCurveTo(12, -28, 0, -28);
  ctx.quadraticCurveTo(-12, -28, -25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // First Platform
  ctx.fillRect(-28, -48, 56, 8);
  ctx.strokeRect(-28, -48, 56, 8);

  // Middle Section (tapered)
  ctx.beginPath();
  ctx.moveTo(-22, -48);
  ctx.lineTo(-12, -110);
  ctx.lineTo(12, -110);
  ctx.lineTo(22, -48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Second Platform
  ctx.fillRect(-14, -116, 28, 6);
  ctx.strokeRect(-14, -116, 28, 6);

  // Top Section
  ctx.beginPath();
  ctx.moveTo(-10, -116);
  ctx.lineTo(-4, -180);
  ctx.lineTo(4, -180);
  ctx.lineTo(10, -116);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dome & Spire
  ctx.beginPath();
  ctx.arc(0, -182, 4, Math.PI, 0);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, -186);
  ctx.lineTo(0, -210);
  ctx.stroke();
  
  // Beacon Light beam
  const time = Date.now() / 1000;
  const angle = (time % 4) * Math.PI / 2; // rotating beam
  const beamW = 40;
  
  ctx.save();
  ctx.translate(0, -210);
  ctx.rotate(angle);
  
  const beamGrad = ctx.createLinearGradient(0, 0, 150, 40);
  beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = beamGrad;
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, -beamW);
  ctx.lineTo(150, beamW);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  ctx.restore();
}

function drawTokyoTower(ctx, x, y, h) {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = 'rgba(245, 175, 25, 0.15)';
  ctx.strokeStyle = '#f5af19';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#f5af19';
  ctx.shadowBlur = 6;
  
  // Structure lines
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.quadraticCurveTo(-10, -80, -12, -120);
  ctx.lineTo(-4, -190);
  ctx.lineTo(4, -190);
  ctx.lineTo(12, -120);
  ctx.quadraticCurveTo(10, -80, 35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Platforms
  ctx.fillRect(-18, -60, 36, 6);
  ctx.strokeRect(-18, -60, 36, 6);
  
  ctx.fillRect(-13, -120, 26, 6);
  ctx.strokeRect(-13, -120, 26, 6);
  
  // Spire
  ctx.beginPath();
  ctx.moveTo(0, -190);
  ctx.lineTo(0, -225);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  
  ctx.restore();
}

function drawGrandHotel(ctx, x, y, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;

  // Main Tiered Palace building
  const layers = [
    { w: 90, h: 12 },
    { w: 84, h: 12 },
    { w: 78, h: 12 },
    { w: 70, h: 10 },
    { w: 60, h: 10 }
  ];

  let currY = 0;
  layers.forEach((ly, i) => {
    // Columns
    ctx.fillRect(-ly.w/2, currY - ly.h, ly.w, ly.h);
    ctx.strokeRect(-ly.w/2, currY - ly.h, ly.w, ly.h);
    
    // Traditional curved Chinese roof on top of each layer
    ctx.beginPath();
    ctx.moveTo(-ly.w/2 - 4, currY - ly.h);
    ctx.quadraticCurveTo(-ly.w/2, currY - ly.h + 2, -ly.w/2 + 6, currY - ly.h);
    ctx.lineTo(ly.w/2 - 6, currY - ly.h);
    ctx.quadraticCurveTo(ly.w/2, currY - ly.h + 2, ly.w/2 + 4, currY - ly.h);
    ctx.strokeStyle = '#f5af19'; // Gold roofs!
    ctx.stroke();
    
    currY -= ly.h + 2;
  });

  ctx.restore();
}

function drawFerrisWheel(ctx, x, y, h) {
  ctx.save();
  ctx.translate(x, y - 75);
  
  ctx.strokeStyle = '#38ef7d'; // Green laser lines
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#38ef7d';
  ctx.shadowBlur = 6;
  
  // Support A-frame legs
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-25, 75);
  ctx.moveTo(0, 0);
  ctx.lineTo(25, 75);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();
  
  // Wheel rotations
  const time = Date.now() / 3000;
  ctx.rotate(time);
  
  // Outer / Inner rings
  ctx.strokeStyle = '#38ef7d';
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.stroke();
  
  // Spokes
  const numSpokes = 12;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * 50, Math.sin(angle) * 50);
    ctx.stroke();
    
    // Gondolas
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 50, Math.sin(angle) * 50, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  
  ctx.restore();
}

function drawMountainPeak(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(100, 116, 139, 0.1)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(-120, 0);
  ctx.lineTo(-30, -70);
  ctx.lineTo(0, -95);
  ctx.lineTo(40, -60);
  ctx.lineTo(120, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArcDeTriomphe(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  
  // Main frame
  ctx.fillRect(-24, -36, 48, 36);
  ctx.strokeRect(-24, -36, 48, 36);
  
  // Center arch cutout
  ctx.fillStyle = '#070a13'; // Match sky background
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-10, -20);
  ctx.quadraticCurveTo(0, -28, 10, -20);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Arch decorative line
  ctx.strokeRect(-28, -41, 56, 5);
  ctx.restore();
}

function drawLouvre(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 1.5;
  
  // Triangular pyramid
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(0, -28);
  ctx.lineTo(35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Grid lines
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(0, -28);
  ctx.moveTo(18, 0); ctx.lineTo(0, -28);
  ctx.moveTo(-35, 0); ctx.lineTo(18, 0); // floor flat
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
  ctx.stroke();
  ctx.restore();
}

function drawSeineBridge(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(-80, 0);
  ctx.quadraticCurveTo(-40, -12, 0, 0);
  ctx.quadraticCurveTo(40, -12, 80, 0);
  ctx.stroke();
  ctx.restore();
}

function drawSensoji(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  
  // Gate pillars
  ctx.fillRect(-25, -35, 8, 35);
  ctx.strokeRect(-25, -35, 8, 35);
  ctx.fillRect(17, -35, 8, 35);
  ctx.strokeRect(17, -35, 8, 35);
  
  // Roof
  ctx.beginPath();
  ctx.moveTo(-32, -35);
  ctx.quadraticCurveTo(-15, -45, 0, -45);
  ctx.quadraticCurveTo(15, -45, 32, -35);
  ctx.lineTo(25, -30);
  ctx.lineTo(-25, -30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(245, 175, 25, 0.2)';
  ctx.strokeStyle = '#f5af19';
  ctx.fill();
  ctx.stroke();
  
  // Center big lantern
  ctx.beginPath();
  ctx.arc(0, -20, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fill();
  
  ctx.restore();
}

function drawRainbowBridge(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  
  // Tower A
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-50, -50, 8, 50);
  ctx.strokeRect(42, -50, 8, 50);
  
  // Rainbow Cable line
  const grad = ctx.createLinearGradient(-80, 0, 80, 0);
  grad.addColorStop(0, '#ff5858');
  grad.addColorStop(0.5, '#38ef7d');
  grad.addColorStop(1, '#00f2fe');
  
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#38ef7d';
  ctx.shadowBlur = 4;
  
  ctx.beginPath();
  ctx.moveTo(-80, -20);
  ctx.quadraticCurveTo(-50, -50, -46, -50);
  ctx.quadraticCurveTo(0, -15, 42, -50);
  ctx.quadraticCurveTo(50, -50, 80, -20);
  ctx.stroke();
  
  ctx.restore();
}

function drawFuji(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
  ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
  ctx.lineWidth = 2.0;
  
  // Large mountain
  ctx.beginPath();
  ctx.moveTo(-160, 0);
  ctx.quadraticCurveTo(-60, -90, -30, -90);
  ctx.lineTo(30, -90);
  ctx.quadraticCurveTo(60, -90, 160, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Snow cap top
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-39, -65);
  ctx.lineTo(-30, -90);
  ctx.lineTo(30, -90);
  ctx.lineTo(39, -65);
  ctx.lineTo(20, -58);
  ctx.lineTo(0, -68);
  ctx.lineTo(-20, -58);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

export class CityManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.activeRouteKey = 'taipei'; // taipei, paris, tokyo
    
    // Physics position states (in meters)
    this.distanceTraveled = 0;
    this.speedMps = 0;
    this.cadenceRpm = 0;
    
    // Animation frame handle
    this.animationId = null;
    
    // Parallax background scroll offsets
    this.starsOffset = 0;
    this.skylineOffset1 = 0;
    this.skylineOffset2 = 0;
    this.roadOffset = 0;
    
    // Cyclist pedal angle (in radians)
    this.pedalAngle = 0;

    // Toast notifications for landmarks
    this.lastTriggeredLandmark = null;
    this.toastTimeout = null;
    
    this.stars = [];
    this.initStars();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.5, // top half
        size: Math.random() * 1.5 + 0.5,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
        phase: Math.random() * Math.PI
      });
    }
  }

  setRoute(routeKey) {
    if (LANDMARKS[routeKey]) {
      this.activeRouteKey = routeKey;
    } else {
      // mapping GPX presets
      if (routeKey === 'alpe_huez') this.activeRouteKey = 'tokyo'; // Tokyo/Fuji fits climb
      else if (routeKey === 'rolling_hills') this.activeRouteKey = 'paris';
      else this.activeRouteKey = 'taipei';
    }
    this.lastTriggeredLandmark = null;
  }

  // Update physical coordinates
  updateMetrics(speedKmh, cadenceRpm, elapsedSec, totalDistanceKm) {
    this.speedMps = speedKmh / 3.6;
    this.cadenceRpm = cadenceRpm;
    this.distanceTraveled = totalDistanceKm * 1000; // in meters
    
    // Check if near a landmark to trigger toast alerts in UI
    this.checkLandmarks();
  }

  // Check if cyclist is passing an attraction
  checkLandmarks() {
    const list = LANDMARKS[this.activeRouteKey];
    const riderDist = this.distanceTraveled;
    
    for (let lm of list) {
      // If within 150m of a landmark and not triggered recently
      if (Math.abs(riderDist - lm.dist) < 150) {
        if (this.lastTriggeredLandmark !== lm.name) {
          this.lastTriggeredLandmark = lm.name;
          this.showAttractionToast(lm);
        }
        break;
      }
    }
  }

  showAttractionToast(lm) {
    const toast = document.getElementById('attraction-toast');
    if (!toast) return;

    this.activeLandmark = lm;

    document.getElementById('toast-title').textContent = `📍 抵達景點：${lm.name.split(' (')[0]}`;
    document.getElementById('toast-desc').textContent = lm.desc;
    
    const imgWrapper = document.getElementById('toast-img-wrapper');
    const toastImg = document.getElementById('toast-img');
    const fallbackIcon = document.getElementById('toast-fallback-icon');
    const btnView = document.getElementById('btn-toast-view-large');

    if (lm.image) {
      if (toastImg) toastImg.src = lm.image;
      if (imgWrapper) imgWrapper.style.display = 'block';
      if (fallbackIcon) fallbackIcon.style.display = 'none';
      if (btnView) btnView.style.display = 'inline-block';
    } else {
      if (imgWrapper) imgWrapper.style.display = 'none';
      if (fallbackIcon) fallbackIcon.style.display = 'block';
      if (btnView) btnView.style.display = 'none';
    }

    toast.classList.remove('hidden');
    toast.classList.add('toast-enter');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('hidden');
    }, 8000);
  }

  // Render loop
  start() {
    if (this.animationId) return;
    
    const animate = () => {
      this.tickPhysics();
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  tickPhysics() {
    // Parallax scrolling updates (60fps increments)
    const dt = 1 / 60;
    const dx = this.speedMps * dt; // meters moved this frame
    
    this.starsOffset = (this.starsOffset + dx * 0.05) % 800;
    this.skylineOffset1 = (this.skylineOffset1 + dx * 0.2) % 800;
    this.skylineOffset2 = (this.skylineOffset2 + dx * 0.6) % 800;
    this.roadOffset = (this.roadOffset + dx * 25) % 40; // dashed road segments
    
    // Leg/Crank rotation angle based on cadence
    if (this.cadenceRpm > 0) {
      const revsPerSec = this.cadenceRpm / 60;
      this.pedalAngle += revsPerSec * Math.PI * 2 * dt;
    }
  }

  draw() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    
    // Fit canvas to element width
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = canvas.parentElement.clientHeight || 250;
    
    const roadY = h - 50;

    // 1. Draw Space Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, roadY);
    skyGrad.addColorStop(0, '#04050f');
    skyGrad.addColorStop(0.7, '#1b0b30');
    skyGrad.addColorStop(1, '#2f1554');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, roadY);

    // 2. Draw Twinkling Stars
    ctx.fillStyle = '#ffffff';
    const time = Date.now();
    this.stars.forEach(star => {
      const starX = ((star.x * w - this.starsOffset) % w + w) % w;
      const opacity = 0.3 + 0.7 * Math.sin(time * star.twinkleSpeed + star.phase);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillRect(starX, star.y * roadY, star.size, star.size);
      ctx.restore();
    });

    // 3. Draw Parallax Layer 1: Distant City Skyline Silhouettes
    ctx.fillStyle = 'rgba(32, 17, 60, 0.4)';
    const baseBuildingW = 55;
    for (let i = -1; i < (w / baseBuildingW) + 2; i++) {
      const left = i * baseBuildingW - (this.skylineOffset1 % baseBuildingW);
      // Fixed deterministic height using sine wave
      const buildH = 60 + Math.sin(i * 1.7) * 35;
      ctx.fillRect(left, roadY - buildH, baseBuildingW - 3, buildH);
    }

    // 4. Draw Parallax Layer 2: Midground Buildings
    ctx.fillStyle = 'rgba(21, 10, 40, 0.85)';
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)'; // cyan neon building grid lines
    ctx.lineWidth = 1;
    const midBuildingW = 75;
    for (let i = -1; i < (w / midBuildingW) + 2; i++) {
      const left = i * midBuildingW - (this.skylineOffset2 % midBuildingW);
      const buildH = 50 + Math.cos(i * 2.3) * 25;
      ctx.fillRect(left, roadY - buildH, midBuildingW - 5, buildH);
      ctx.strokeRect(left, roadY - buildH, midBuildingW - 5, buildH);
    }

    // 5. Draw Active Attractions / Landmarks (Layer 3)
    const landmarksList = LANDMARKS[this.activeRouteKey];
    const scaleFactor = 25; // 1px on screen = X meters in world (visual scaling)
    
    landmarksList.forEach(lm => {
      // Calculate screen X relative to rider position
      // Rider is placed at screen X = 90px
      const riderX = 90;
      const distDelta = lm.dist - this.distanceTraveled;
      const screenX = riderX + (distDelta * (120 / scaleFactor)); // scale distance representation
      
      // Draw landmark if on screen (with horizontal padding)
      if (screenX > -150 && screenX < w + 150) {
        lm.draw(ctx, screenX, roadY, 150);
        
        // Landmark marker label
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px var(--font-display)';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name.split(' ')[0], screenX, roadY - 145);
        ctx.restore();
      }
    });

    // 6. Draw Road (Layer 4)
    ctx.fillStyle = '#0f172a'; // slate 900
    ctx.fillRect(0, roadY, w, h - roadY);
    
    // Road border lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(w, roadY);
    ctx.stroke();
    
    // Dashed road marks (motion indicators)
    ctx.strokeStyle = '#f5af19'; // Yellow dashed line
    ctx.lineWidth = 2.5;
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.moveTo(-this.roadOffset, roadY + 22);
    ctx.lineTo(w - this.roadOffset + 40, roadY + 22);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 7. Draw Vector Animated Cyclist Avatar (centered at X=90)
    drawCyclist(ctx, 90, roadY, this.pedalAngle, this.speedMps);
  }
}

// Draw a beautiful vector neon cyclist in sync with cadence and wheel speed
function drawCyclist(ctx, x, roadY, pedalAngle, speedMps) {
  const y = roadY - 2; // offset from road
  
  // Dimensions
  const wheelR = 17;
  const wheelX1 = x - 28;
  const wheelX2 = x + 28;
  const wheelY = y - wheelR;
  const bottomBracketY = y - wheelR - 3; // BB height
  
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;

  // --- 1. WHEELS (Spinning spokes based on speed) ---
  const wheelSpinAngle = -(Date.now() / 1000) * (speedMps / wheelR) * 2; // negative rotates forward
  
  [wheelX1, wheelX2].forEach(wx => {
    // Tire outer ring
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR, 0, Math.PI*2);
    ctx.strokeStyle = '#64748b'; // slate gray tires
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Rim ring
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR - 2, 0, Math.PI*2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.75;
    for (let i = 0; i < 8; i++) {
      const spAngle = wheelSpinAngle + (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, wheelY);
      ctx.lineTo(wx + Math.cos(spAngle)*(wheelR-2), wheelY + Math.sin(spAngle)*(wheelR-2));
      ctx.stroke();
    }
  });

  // --- 2. BICYCLE FRAME (Cyan Neon Glowing lines) ---
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 5;
  
  const seatTubeTopX = x - 8;
  const seatTubeTopY = y - 41;
  const headTubeTopX = x + 18;
  const headTubeTopY = y - 44;
  const seatX = seatTubeTopX - 4;
  const seatY = seatTubeTopY - 2;
  const bbX = x - 5;
  const bbY = bottomBracketY;

  // Frame Diamond Geometry
  ctx.beginPath();
  ctx.moveTo(wheelX1, wheelY); // Rear Hub
  ctx.lineTo(bbX, bbY); // BB
  ctx.lineTo(seatTubeTopX, seatTubeTopY); // Seatpost collar
  ctx.lineTo(wheelX1, wheelY); // Seat stay
  
  ctx.moveTo(bbX, bbY);
  ctx.lineTo(headTubeTopX, headTubeTopY - 5); // Down tube
  ctx.lineTo(seatTubeTopX, seatTubeTopY); // Top tube
  ctx.stroke();
  
  // Forks
  ctx.beginPath();
  ctx.moveTo(headTubeTopX, headTubeTopY);
  ctx.lineTo(wheelX2, wheelY); // Front Fork
  ctx.strokeStyle = '#00f2fe';
  ctx.stroke();

  // Handlebars
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(headTubeTopX, headTubeTopY);
  ctx.lineTo(headTubeTopX + 2, headTubeTopY - 7); // Stem
  ctx.lineTo(headTubeTopX + 7, headTubeTopY - 7); // Bars
  ctx.quadraticCurveTo(headTubeTopX + 11, headTubeTopY - 3, headTubeTopX + 6, headTubeTopY + 1); // Drops hook
  ctx.stroke();

  // Saddle
  ctx.fillStyle = '#475569';
  ctx.fillRect(seatX - 6, seatY, 15, 3);

  // --- 3. PEDALS & CRANK ARMS (Rotating based on cadence angle) ---
  const crankR = 6.5;
  
  // Pedal 1 (Right, facing viewer)
  const p1X = bbX + crankR * Math.cos(pedalAngle);
  const p1Y = bbY + crankR * Math.sin(pedalAngle);
  
  // Pedal 2 (Left, behind frame)
  const p2X = bbX - crankR * Math.cos(pedalAngle);
  const p2Y = bbY - crankR * Math.sin(pedalAngle);

  // Draw Back Crank & Pedal (dimmer)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(bbX, bbY);
  ctx.lineTo(p2X, p2Y);
  ctx.stroke();
  ctx.fillRect(p2X - 3, p2Y - 1, 6, 2);

  // --- 4. RIDER CYCLIST (Magenta neon silhouette) ---
  ctx.strokeStyle = '#f857a6';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#f857a6';
  ctx.shadowBlur = 6;
  
  const hipX = seatX + 2;
  const hipY = seatY - 5;
  const shoulderX = x + 5;
  const shoulderY = y - 56;
  const headX = shoulderX + 4;
  const headY = shoulderY - 8;
  const handX = headTubeTopX + 8;
  const handY = headTubeTopY - 6;

  // Head
  ctx.beginPath();
  ctx.arc(headX, headY, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#f857a6';
  ctx.fill();
  ctx.stroke();

  // Torso / Back
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  
  // Arms
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // --- 5. LEG JOINT MATH (Inverse Kinematics circle intersection) ---
  // Left Leg (Back Leg, dimmer/transparent magenta)
  drawLeg(ctx, hipX, hipY, p2X, p2Y, false);
  
  // Right Leg (Front Leg, bright magenta)
  drawLeg(ctx, hipX, hipY, p1X, p1Y, true);

  // Draw Front Crank & Pedal (overlapping front leg)
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(bbX, bbY);
  ctx.lineTo(p1X, p1Y);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(p1X - 3.5, p1Y - 1, 7, 2.5);

  ctx.restore();
}

// Leg joint solver (circle-circle intersection so knees bend forward properly)
function drawLeg(ctx, hipX, hipY, pedalX, pedalY, isFrontLeg) {
  const dx = pedalX - hipX;
  const dy = pedalY - hipY;
  const d = Math.sqrt(dx * dx + dy * dy);
  
  // Thigh & Calf lengths
  const l1 = 15;
  const l2 = 15;
  
  // Midpoint between hip and pedal
  const mx = hipX + dx / 2;
  const my = hipY + dy / 2;
  
  // Distance from midpoint to knee joint
  const hSq = l1 * l1 - (d * d) / 4;
  const h = hSq > 0 ? Math.sqrt(hSq) : 0;
  
  // Rotate vector clockwise to get forward offset
  // Since pedal is always below hip, dy > 0, rotating clockwise (dy, -dx) always yields positive X offset
  const kx = mx + h * (dy / d);
  const ky = my - h * (dx / d);

  ctx.save();
  if (!isFrontLeg) {
    ctx.strokeStyle = 'rgba(248, 87, 166, 0.35)'; // dim back leg
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = '#f857a6';
    ctx.shadowColor = '#f857a6';
    ctx.shadowBlur = 6;
  }
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kx, ky); // Thigh
  ctx.lineTo(pedalX, pedalY); // Calf
  ctx.stroke();
  ctx.restore();
}
