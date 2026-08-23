export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export class GeolocationService {
  private static instance: GeolocationService;

  private constructor() {}

  public static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation is supported by the environment
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && 'geolocation' in window.navigator;
  }

  /**
   * Request current position once
   */
  public async requestCurrentPosition(options?: PositionOptions): Promise<GeolocationCoords> {
    if (!this.isSupported()) {
      throw new Error('خدمة تحديد الموقع الجغرافي غير مدعومة في هذا المتصفح أو البيئة.');
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const coords = this.mapAndValidatePosition(position);
            resolve(coords);
          } catch (err: any) {
            reject(err);
          }
        },
        (error) => {
          reject(new Error(this.getArabicErrorMessage(error)));
        },
        defaultOptions
      );
    });
  }

  /**
   * Watch location continuously
   */
  public watchPosition(
    onSuccess: (coords: GeolocationCoords) => void,
    onError: (error: Error) => void,
    options?: PositionOptions
  ): number {
    if (!this.isSupported()) {
      onError(new Error('خدمة تحديد الموقع الجغرافي غير مدعومة في هذا المتصفح أو البيئة.'));
      return -1;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    };

    return window.navigator.geolocation.watchPosition(
      (position) => {
        try {
          const coords = this.mapAndValidatePosition(position);
          onSuccess(coords);
        } catch (err: any) {
          onError(err);
        }
      },
      (error) => {
        onError(new Error(this.getArabicErrorMessage(error)));
      },
      defaultOptions
    );
  }

  /**
   * Clear a watching listener
   */
  public clearWatch(watchId: number): void {
    if (this.isSupported() && watchId !== -1) {
      window.navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Validate coordinates to ensure they are on Earth and within valid boundaries
   */
  public validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Determine the qualitative accuracy category of GPS signal
   */
  public calculateAccuracyQuality(accuracyInMeters: number): 'excellent' | 'good' | 'poor' {
    if (accuracyInMeters <= 15) return 'excellent';
    if (accuracyInMeters <= 50) return 'good';
    return 'poor';
  }

  /**
   * Maps native GeolocationPosition to strict domain structure and validates coordinate logic
   */
  private mapAndValidatePosition(position: GeolocationPosition): GeolocationCoords {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;

    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('تم التقاط إحداثيات موقع جغرافي غير صالحة أو خارج نطاق كوكب الأرض.');
    }

    // Filter out obvious noise or extreme inaccuracy (e.g., accuracy over 100 meters is rejected)
    if (accuracy > 100) {
      throw new Error(`دقة موقع GPS ضعيفة جداً (${accuracy.toFixed(0)} متر) ولا يمكن استخدامها لتحديد المواقع بدقة.`);
    }

    // Prevent old cached timestamps (older than 2 minutes)
    const ageMs = Date.now() - position.timestamp;
    if (ageMs > 120000) {
      throw new Error('إحداثيات الموقع قديمة جداً ولا تمثل موقعك الحالي.');
    }

    return {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      timestamp: position.timestamp,
    };
  }

  /**
   * Returns clear, friendly Arabic error descriptions for GPS states
   */
  private getArabicErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'يرجى السماح بالوصول إلى الموقع الجغرافي (GPS) لتحديد مكانك ومطابقة الرحلات.';
      case error.POSITION_UNAVAILABLE:
        return 'إشارة تحديد الموقع غير متوفرة حالياً. يرجى التحقق من تفعيل الـ GPS في جهازك.';
      case error.TIMEOUT:
        return 'انتهت المهلة الزمنية لتحديد الموقع الجغرافي. يرجى التحقق من اتصال الشبكة وإشارة الـ GPS.';
      default:
        return 'حدث خطأ غير متوقع أثناء محاولة تحديد موقعك الجغرافي.';
    }
  }
}

export const geolocationService = GeolocationService.getInstance();
