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
   * Request current position once with high-accuracy and fallback mechanism
   */
  public async requestCurrentPosition(options?: PositionOptions): Promise<GeolocationCoords> {
    if (!this.isSupported()) {
      throw new Error('خدمة تحديد الموقع الجغرافي غير مدعومة في هذا المتصفح أو البيئة.');
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
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
          // If high-accuracy timed out or unavailable, try low-accuracy fallback (e.g. WiFi/Cell/IP-based)
          if ((error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) && defaultOptions.enableHighAccuracy) {
            window.navigator.geolocation.getCurrentPosition(
              (fallbackPos) => {
                try {
                  const fallbackCoords = this.mapAndValidatePosition(fallbackPos);
                  resolve(fallbackCoords);
                } catch (fallbackErr: any) {
                  reject(fallbackErr);
                }
              },
              (fallbackError) => {
                reject(new Error(this.getArabicErrorMessage(fallbackError)));
              },
              {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000,
              }
            );
          } else {
            reject(new Error(this.getArabicErrorMessage(error)));
          }
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
      timeout: 20000,
      maximumAge: 15000,
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
        // If watch encounters timeout, try not to abort but report friendly warning
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

    // Ensure accuracy is a positive valid number
    const safeAccuracy = typeof accuracy === 'number' && !isNaN(accuracy) && accuracy >= 0 ? accuracy : 50;

    // Prevent completely stale cached timestamps older than 10 minutes
    const ageMs = Date.now() - position.timestamp;
    if (ageMs > 600000) {
      throw new Error('إحداثيات الموقع قديمة جداً ولا تمثل موقعك الحالي.');
    }

    return {
      latitude,
      longitude,
      accuracy: safeAccuracy,
      heading: heading || null,
      speed: speed || null,
      timestamp: position.timestamp || Date.now(),
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
