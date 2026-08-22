import { Accelerometer, Gyroscope, DeviceMotion } from 'expo-sensors';
import * as Location from 'expo-location';
import { UserLocation } from '../../types';

export interface SensorFrame {
  timestamp: number;
  accel: { x: number; y: number; z: number; magnitude: number; jerk: number };
  gyro: { x: number; y: number; z: number; magnitude: number };
  speedKmH: number;
}

export type SensorListener = (frame: SensorFrame) => void;

class SensorHubService {
  private isListening = false;
  private isSimulated = false;
  private listeners: Set<SensorListener> = new Set();
  private history: SensorFrame[] = [];
  private readonly MAX_HISTORY_LENGTH = 30; // ~3 seconds at 100ms interval

  private currentAccel = { x: 0, y: 0, z: 1, magnitude: 1, jerk: 0 };
  private currentGyro = { x: 0, y: 0, z: 0, magnitude: 0 };
  private currentSpeedKmH = 0;
  private lastAccelMag = 1;
  private lastAccelTime = Date.now();

  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private locationSubscription: any = null;
  private simInterval: any = null;

  private currentLocation: UserLocation = {
    latitude: 28.5672,
    longitude: 77.2100,
    speed: 0,
    addressName: 'AIIMS Corridor, Ring Road, New Delhi',
    regionCode: 'IN-DL',
  };

  constructor() {
    // Set sensor update interval (100ms for smooth 10Hz anomaly sampling)
    try {
      Accelerometer.setUpdateInterval(100);
      Gyroscope.setUpdateInterval(100);
    } catch {
      // In web or restricted environments, fallback gracefully
    }
  }

  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (initialLoc) {
          this.currentLocation = {
            latitude: initialLoc.coords.latitude,
            longitude: initialLoc.coords.longitude,
            speed: (initialLoc.coords.speed || 0) * 3.6, // m/s to km/h
            accuracy: initialLoc.coords.accuracy || 10,
            regionCode: this.detectRegionFromCoords(
              initialLoc.coords.latitude,
              initialLoc.coords.longitude
            ),
          };
        }

        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 5,
          },
          (loc) => {
            const speedKmH = Math.max(0, (loc.coords.speed || 0) * 3.6);
            this.currentSpeedKmH = speedKmH;
            this.currentLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              speed: speedKmH,
              accuracy: loc.coords.accuracy || 10,
              heading: loc.coords.heading || 0,
              regionCode: this.detectRegionFromCoords(
                loc.coords.latitude,
                loc.coords.longitude
              ),
            };
          }
        );
      }

      // Start Accelerometer
      this.accelSubscription = Accelerometer.addListener((data) => {
        if (this.isSimulated) return;
        const now = Date.now();
        const dt = Math.max(0.01, (now - this.lastAccelTime) / 1000);
        const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        const jerk = Math.abs(mag - this.lastAccelMag) / dt;

        this.currentAccel = {
          x: data.x,
          y: data.y,
          z: data.z,
          magnitude: mag,
          jerk,
        };
        this.lastAccelMag = mag;
        this.lastAccelTime = now;
        this.emitFrame();
      });

      // Start Gyroscope
      this.gyroSubscription = Gyroscope.addListener((data) => {
        if (this.isSimulated) return;
        const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        this.currentGyro = {
          x: data.x,
          y: data.y,
          z: data.z,
          magnitude: mag,
        };
      });

      this.isListening = true;
      return true;
    } catch (err) {
      console.warn('Physical sensors unavailable, enabling fallback mode:', err);
      this.isListening = true;
      return true;
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.accelSubscription) this.accelSubscription.remove();
    if (this.gyroSubscription) this.gyroSubscription.remove();
    if (this.locationSubscription) this.locationSubscription.remove();
    if (this.simInterval) clearInterval(this.simInterval);
  }

  public subscribe(listener: SensorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitFrame() {
    const frame: SensorFrame = {
      timestamp: Date.now(),
      accel: { ...this.currentAccel },
      gyro: { ...this.currentGyro },
      speedKmH: this.currentSpeedKmH,
    };

    this.history.push(frame);
    if (this.history.length > this.MAX_HISTORY_LENGTH) {
      this.history.shift();
    }

    this.listeners.forEach((l) => l(frame));
  }

  public getHistory(): SensorFrame[] {
    return [...this.history];
  }

  public getCurrentLocation(): UserLocation {
    return { ...this.currentLocation };
  }

  public setMockLocation(location: Partial<UserLocation>) {
    this.currentLocation = {
      ...this.currentLocation,
      ...location,
    };
  }

  /**
   * Sensor Simulation Studio: Inject programmatic motion profiles
   */
  public injectSimulatedFrame(
    accel: { x: number; y: number; z: number; jerk?: number },
    gyro: { x: number; y: number; z: number },
    speedKmH: number
  ) {
    this.isSimulated = true;
    const mag = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
    const gyroMag = Math.sqrt(gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z);

    this.currentAccel = {
      ...accel,
      magnitude: mag,
      jerk: accel.jerk ?? Math.abs(mag - this.lastAccelMag) * 10,
    };
    this.currentGyro = {
      ...gyro,
      magnitude: gyroMag,
    };
    this.currentSpeedKmH = speedKmH;
    this.lastAccelMag = mag;
    this.lastAccelTime = Date.now();

    this.emitFrame();
  }

  public resetSimulation() {
    this.isSimulated = false;
    this.currentAccel = { x: 0, y: 0, z: 1, magnitude: 1, jerk: 0 };
    this.currentGyro = { x: 0, y: 0, z: 0, magnitude: 0 };
    this.currentSpeedKmH = 0;
    this.emitFrame();
  }

  public detectRegionFromCoords(lat: number, lng: number): string {
    // Spatial boundary approximations for key Indian states/regions
    if (lat >= 28.3 && lat <= 28.9 && lng >= 76.8 && lng <= 77.5) return 'IN-DL'; // Delhi NCR
    if (lat >= 12.7 && lat <= 13.3 && lng >= 77.3 && lng <= 77.8) return 'IN-KA'; // Bengaluru / Karnataka
    if (lat >= 18.4 && lat <= 19.5 && lng >= 72.7 && lng <= 74.0) return 'IN-MH'; // Mumbai-Pune Corridor
    if (lat >= 12.8 && lat <= 13.3 && lng >= 80.0 && lng <= 80.4) return 'IN-TN'; // Chennai / TN
    if (lat >= 17.2 && lat <= 17.6 && lng >= 78.2 && lng <= 78.7) return 'IN-TS'; // Hyderabad / TS
    if (lat >= 22.3 && lat <= 22.8 && lng >= 88.1 && lng <= 88.6) return 'IN-WB'; // Kolkata / WB
    if (lat >= 25.5 && lat <= 29.0 && lng >= 77.5 && lng <= 83.5) return 'IN-UP'; // Uttar Pradesh
    return 'IN-DL'; // Default fallback
  }
}

export const SensorHub = new SensorHubService();
