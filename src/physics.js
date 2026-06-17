// Physics Simulation Engine for AeroSpin
// Calculates speed and distance based on power, slope, and rider weight

const GRAVITY = 9.81; // m/s^2
const AIR_DENSITY = 1.225; // kg/m^3 (sea level, 15°C)
const DEFAULT_BIKE_WEIGHT = 9.0; // kg
const DEFAULT_CRR = 0.004; // Rolling resistance coefficient (road tires)
const DEFAULT_CDA = 0.32; // Drag area (typical road cyclist)

export const physicsEngine = {
  /**
   * Calculates speed in meters per second (m/s) using Newton's method to solve the power equation.
   * P = v * (F_gravity + F_rolling + F_drag)
   * 
   * @param {number} power - Rider power output in Watts
   * @param {number} grade - Slope as a decimal (e.g., 0.05 for 5%)
   * @param {number} riderWeight - Rider weight in kg
   * @param {number} bikeWeight - Bike weight in kg (defaults to 9.0)
   * @param {number} windSpeed - Headwind in m/s (positive for headwind, negative for tailwind)
   * @returns {number} Speed in m/s
   */
  calculateSpeed(power, grade, riderWeight, bikeWeight = DEFAULT_BIKE_WEIGHT, windSpeed = 0) {
    const totalMass = riderWeight + bikeWeight;
    
    // Calculate grade angle
    const theta = Math.atan(grade);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    // Gravity and rolling resistance forces (independent of speed, but act on power as F * v)
    const fGravity = totalMass * GRAVITY * sinTheta;
    const fRolling = totalMass * GRAVITY * cosTheta * DEFAULT_CRR;
    const fStatic = fGravity + fRolling; // combined constant forces
    
    const dragConst = 0.5 * DEFAULT_CDA * AIR_DENSITY;
    
    // We want to solve for speed v (m/s):
    // power = v * (fStatic + dragConst * (v + windSpeed)^2)
    // f(v) = dragConst * v * (v + windSpeed)^2 + fStatic * v - power = 0
    
    // If power is 0 and slope is uphill/flat (fStatic >= 0), speed must be 0
    if (power <= 0 && fStatic >= 0) {
      return 0;
    }
    
    // If power is 0 and downhill (fStatic < 0), we solve for coasting terminal velocity
    // fStatic * v + dragConst * v * (v + windSpeed)^2 = 0
    // dragConst * (v + windSpeed)^2 = -fStatic  => v = sqrt(-fStatic / dragConst) - windSpeed
    if (power <= 0 && fStatic < 0) {
      const coastSpeed = Math.sqrt(-fStatic / dragConst) - windSpeed;
      return Math.max(0, coastSpeed);
    }
    
    // Newton-Raphson Solver
    // f(v) = dragConst * v * (v + vw)^2 + fStatic * v - P
    // f'(v) = dragConst * (v + vw)^2 + 2 * dragConst * v * (v + vw) + fStatic
    //       = dragConst * (3*v^2 + 4*v*vw + vw^2) + fStatic
    let v = 5.0; // initial guess (5 m/s or 18 km/h)
    const maxIterations = 20;
    const tolerance = 1e-4;
    
    for (let i = 0; i < maxIterations; i++) {
      const vWind = v + windSpeed;
      const f = dragConst * v * vWind * vWind + fStatic * v - power;
      const df = dragConst * (3 * v * v + 4 * v * windSpeed + windSpeed * windSpeed) + fStatic;
      
      if (Math.abs(df) < 1e-6) break;
      
      const nextV = v - f / df;
      
      if (Math.abs(nextV - v) < tolerance) {
        v = nextV;
        break;
      }
      v = nextV;
    }
    
    // Speed cannot be negative in our model (we don't slide backward on steep climbs)
    return Math.max(0, v);
  },

  /**
   * Converts m/s to km/h
   */
  mpsToKmh(mps) {
    return mps * 3.6;
  },

  /**
   * Calculates the power required to maintain a certain speed on a slope (for ERG/FTMS simulation target calculations)
   */
  calculateTargetPower(targetSpeedKmh, grade, riderWeight, bikeWeight = DEFAULT_BIKE_WEIGHT) {
    const v = targetSpeedKmh / 3.6;
    const totalMass = riderWeight + bikeWeight;
    const theta = Math.atan(grade);
    const fGravity = totalMass * GRAVITY * Math.sin(theta);
    const fRolling = totalMass * GRAVITY * Math.cos(theta) * DEFAULT_CRR;
    const fDrag = 0.5 * DEFAULT_CDA * AIR_DENSITY * v * v;
    
    const power = v * (fGravity + fRolling + fDrag);
    return Math.max(10, Math.round(power));
  }
};
