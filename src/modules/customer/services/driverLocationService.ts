import { geolocationService, GeolocationCoords } from './geolocationService';
import { mobilityApi } from './mobilityApi';

export class DriverLocationService {
  private static instance: DriverLocationService;
  private activeWatchId: number = -1;
  private currentRideId: string | null = null;
  private currentDriverId: string | null = null;
  
  private lastCoords: GeolocationCoords | null = null;
  private lastUpdateTimestamp: number = 0;

  private constructor() {}

  public static getInstance(): DriverLocationService {
    if (!DriverLocationService.instance) {
      DriverLocationService.instance = new DriverLocationService();
    }
    return DriverLocationService.instance;
  }

  /**
   * Start tracking and automatically publishing the driver's GPS location to the server
   */
  public startTracking(
    rideId: string,
    driverId: string,
    onLocalUpdate?: (coords: GeolocationCoords) => void
  ): void {
    // If already tracking another ride, stop it first
    if (this.activeWatchId !== -1) {
      this.stopTracking();
    }

    this.currentRideId = rideId;
    this.currentDriverId = driverId;
    this.lastCoords = null;
    this.lastUpdateTimestamp = 0;

    console.log(`Starting real-time GPS tracking for Driver ${driverId} on Ride ${rideId}`);

    this.activeWatchId = geolocationService.watchPosition(
      async (coords) => {
        // Local state feedback callback (for rendering local speedometer/accuracy indicator)
        if (onLocalUpdate) {
          onLocalUpdate(coords);
        }

        // Apply intelligent throttling before writing to database
        if (this.shouldPublishLocation(coords)) {
          await this.publishLocation(coords);
        }
      },
      (error) => {
        console.error('GPS tracking subscription failure:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  /**
   * Stop watching GPS coordinates and clear tracking states
   */
  public stopTracking(): void {
    if (this.activeWatchId !== -1) {
      geolocationService.clearWatch(this.activeWatchId);
      console.log(`Stopped GPS tracking watch ${this.activeWatchId}`);
      this.activeWatchId = -1;
    }
    this.currentRideId = null;
    this.currentDriverId = null;
    this.lastCoords = null;
    this.lastUpdateTimestamp = 0;
  }

  /**
   * Manually publish a singular coordinate update
   */
  public async publishLocation(coords: GeolocationCoords): Promise<void> {
    if (!this.currentRideId || !this.currentDriverId) return;

    try {
      await mobilityApi.sendLocationUpdate(
        this.currentRideId,
        this.currentDriverId,
        coords.latitude,
        coords.longitude,
        coords.heading || 0
      );

      this.lastCoords = coords;
      this.lastUpdateTimestamp = Date.now();
    } catch (e) {
      console.error('Failed to publish location update to database:', e);
    }
  }

  /**
   * Smart throttling evaluation to prevent server overloading
   * Pushes updates only if:
   * 1. 5 seconds have elapsed since last write
   * 2. OR the driver has moved more than 10 meters (0.01 km)
   */
  private shouldPublishLocation(coords: GeolocationCoords): boolean {
    if (!this.lastCoords) {
      return true; // First update must always write
    }

    const timeDifferenceMs = Date.now() - this.lastUpdateTimestamp;
    
    // Strict protection: do not write faster than every 3 seconds under any circumstance
    if (timeDifferenceMs < 3000) {
      return false;
    }

    // Force update if more than 10 seconds have passed to keep map feed fresh
    if (timeDifferenceMs >= 10000) {
      return true;
    }

    // Calculate physical distance between previous location and current location
    const distanceKm = this.calculateHaversineDistance(
      this.lastCoords.latitude,
      this.lastCoords.longitude,
      coords.latitude,
      coords.longitude
    );

    // If moved more than 10 meters (0.01 km), publish immediately
    if (distanceKm >= 0.01) {
      return true;
    }

    // If more than 5 seconds passed and has moved even a tiny bit, publish
    if (timeDifferenceMs >= 5000 && distanceKm >= 0.002) {
      return true;
    }

    return false;
  }

  /**
   * Returns distance in kilometers between two GPS points
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const driverLocationService = DriverLocationService.getInstance();
