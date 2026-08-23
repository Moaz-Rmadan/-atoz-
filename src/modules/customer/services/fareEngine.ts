import { mapService, RouteResult } from './mapService';

export interface FareBreakdown {
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  durationMinutes: number;
  timeFare: number;
  bookingFee: number;
  surgeMultiplier: number;
  finalFare: number;
  currency: string;
}

export class FareEngine {
  private static instance: FareEngine;

  // Real, stable Egyptian ride-hailing configurations (EGP)
  private readonly CONFIG = {
    baseFare: 12.00,        // Starting fare
    pricePerKm: 6.50,       // Per Kilometer driving
    pricePerMinute: 0.80,   // Per Minute duration
    bookingFee: 5.00,       // System service fee
    minimumFare: 20.00,     // Floor pricing for short trips
    currency: 'ج.م',
  };

  private constructor() {}

  public static getInstance(): FareEngine {
    if (!FareEngine.instance) {
      FareEngine.instance = new FareEngine();
    }
    return FareEngine.instance;
  }

  /**
   * Calculates the active surge multiplier depending on local time of day
   * Peak Hours (Rush periods 7am-10am & 4pm-7pm, or late nights 12am-4am): 1.2x or 1.25x
   */
  public getActiveSurgeMultiplier(): number {
    const hours = new Date().getHours();
    
    // Late Night Surge (12 AM - 4 AM)
    if (hours >= 0 && hours < 4) {
      return 1.25;
    }
    // Morning Rush (7 AM - 10 AM)
    if (hours >= 7 && hours <= 10) {
      return 1.20;
    }
    // Evening Rush (4 PM - 7 PM)
    if (hours >= 16 && hours <= 19) {
      return 1.20;
    }
    
    return 1.0;
  }

  /**
   * Pure mathematical formula for secure calculation of fares from coordinates
   */
  public async estimateRideFare(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<FareBreakdown> {
    // 1. Validate coordinates logic to block fake/impossible endpoints
    if (
      !pickupLat || !pickupLng || !dropoffLat || !dropoffLng ||
      pickupLat === dropoffLat && pickupLng === dropoffLng
    ) {
      throw new Error('الرجاء اختيار نقطة انطلاق ووجهة وصول صالحتين ومختلفتين.');
    }

    // 2. Query real road distance and traffic duration
    const route: RouteResult = await mapService.calculateRoute(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng
    );

    // 3. Compute detailed break-down
    return this.calculateBreakdown(route.distanceKm, route.durationMinutes);
  }

  /**
   * Map raw distance/duration numbers to strict fare rules
   */
  public calculateBreakdown(distanceKm: number, durationMinutes: number): FareBreakdown {
    const baseFare = this.CONFIG.baseFare;
    const distanceFare = distanceKm * this.CONFIG.pricePerKm;
    const timeFare = durationMinutes * this.CONFIG.pricePerMinute;
    const bookingFee = this.CONFIG.bookingFee;
    const surgeMultiplier = this.getActiveSurgeMultiplier();

    // Sum calculation formula: (base + distance + duration) * surge + service_fee
    const calculatedSum = (baseFare + distanceFare + timeFare) * surgeMultiplier + bookingFee;
    
    // Apply strict system minimum floor pricing
    const finalFareRaw = Math.max(calculatedSum, this.CONFIG.minimumFare);
    const finalFare = Math.round(finalFareRaw * 100) / 100; // Safe rounding to 2 decimal places

    return {
      baseFare,
      distanceKm: Number(distanceKm.toFixed(2)),
      distanceFare: Number(distanceFare.toFixed(2)),
      durationMinutes: Number(durationMinutes.toFixed(2)),
      timeFare: Number(timeFare.toFixed(2)),
      bookingFee,
      surgeMultiplier,
      finalFare,
      currency: this.CONFIG.currency,
    };
  }
}

export const fareEngine = FareEngine.getInstance();
