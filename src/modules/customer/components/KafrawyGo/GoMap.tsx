import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Car, Compass, Crosshair, Plus, Minus } from 'lucide-react';

interface Coords {
  lat: number;
  lng: number;
}

interface GoMapProps {
  userLocation?: Coords | null;
  pickupLocation?: Coords | null;
  dropoffLocation?: Coords | null;
  driverLocation?: { lat: number; lng: number; heading?: number | null } | null;
  routeCoordinates?: [number, number][]; // [lat, lng] array from OSRM
  onMapClick?: (coords: Coords) => void;
  onRecenter?: () => void;
  interactive?: boolean;
}

// Convert Lat/Lng to Web Mercator World Coordinates (at zoom level)
function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (1 - mercN / Math.PI) / 2 * scale;
  return { x, y };
}

// Convert World Coordinates back to Lat/Lng
function unproject(x: number, y: number, zoom: number): Coords {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (y / scale);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export const GoMap: React.FC<GoMapProps> = ({
  userLocation,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  routeCoordinates = [],
  onMapClick,
  onRecenter,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  const [zoom, setZoom] = useState(14);
  const [center, setCenter] = useState<Coords>(() => {
    return userLocation || pickupLocation || { lat: 31.4055, lng: 31.7385 }; // Default Kafr El-Batikh, Damietta
  });

  // Pan interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Update container dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 400,
          height: entry.contentRect.height || 600,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-center when user location or route changes
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      // Fit both pickup and dropoff
      const midLat = (pickupLocation.lat + dropoffLocation.lat) / 2;
      const midLng = (pickupLocation.lng + dropoffLocation.lng) / 2;
      setCenter({ lat: midLat, lng: midLng });
      
      const latDiff = Math.abs(pickupLocation.lat - dropoffLocation.lat);
      const lngDiff = Math.abs(pickupLocation.lng - dropoffLocation.lng);
      const maxDiff = Math.max(latDiff, lngDiff);
      if (maxDiff > 0.05) setZoom(12);
      else if (maxDiff > 0.02) setZoom(13);
      else setZoom(14);
    } else if (pickupLocation) {
      setCenter(pickupLocation);
      setZoom(15);
    } else if (userLocation) {
      setCenter(userLocation);
    }
  }, [pickupLocation?.lat, pickupLocation?.lng, dropoffLocation?.lat, dropoffLocation?.lng, userLocation?.lat, userLocation?.lng]);

  // Center on Driver if in active tracking
  useEffect(() => {
    if (driverLocation && !dropoffLocation) {
      setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
    }
  }, [driverLocation?.lat, driverLocation?.lng]);

  // Screen position calculation
  const centerWorld = useMemo(() => project(center.lat, center.lng, zoom), [center, zoom]);

  const latLngToScreen = useCallback(
    (lat: number, lng: number) => {
      const world = project(lat, lng, zoom);
      return {
        x: world.x - centerWorld.x + dimensions.width / 2,
        y: world.y - centerWorld.y + dimensions.height / 2,
      };
    },
    [centerWorld, dimensions, zoom]
  );

  // Compute Tiles to render
  const tiles = useMemo(() => {
    const tileSize = 256;
    const minTileX = Math.floor((centerWorld.x - dimensions.width / 2) / tileSize);
    const maxTileX = Math.floor((centerWorld.x + dimensions.width / 2) / tileSize);
    const minTileY = Math.floor((centerWorld.y - dimensions.height / 2) / tileSize);
    const maxTileY = Math.floor((centerWorld.y + dimensions.height / 2) / tileSize);

    const tileList: { key: string; url: string; x: number; y: number }[] = [];
    const maxTiles = Math.pow(2, zoom);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxTiles) continue;
        const normalizedX = ((tx % maxTiles) + maxTiles) % maxTiles;
        const screenX = tx * tileSize - centerWorld.x + dimensions.width / 2;
        const screenY = ty * tileSize - centerWorld.y + dimensions.height / 2;

        // Use high-contrast clean CartoDB Voyager / OSM tiles
        const sub = ['a', 'b', 'c'][Math.abs((tx + ty) % 3)];
        const url = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${normalizedX}/${ty}.png`;
        tileList.push({
          key: `${zoom}-${tx}-${ty}`,
          url,
          x: screenX,
          y: screenY,
        });
      }
    }
    return tileList;
  }, [centerWorld, dimensions, zoom]);

  // Compute Route SVG Path
  const routeSvgPath = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return '';
    const points = routeCoordinates.map(([lat, lng]) => {
      const pt = latLngToScreen(lat, lng);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  }, [routeCoordinates, latLngToScreen]);

  // Mouse & Touch Pan Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !interactive) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const newCenterWorldX = centerWorld.x - dx;
    const newCenterWorldY = centerWorld.y - dy;
    const newCenter = unproject(newCenterWorldX, newCenterWorldY, zoom);
    setCenter(newCenter);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 18));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 10));

  const handleRecenterClick = () => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom(15);
    }
    onRecenter?.();
  };

  return (
    <div
      ref={containerRef}
      id="kafrawy-go-map"
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#e8ecf1] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Map Tile Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
            className="absolute w-[256px] h-[256px] will-change-transform"
            style={{
              transform: `translate3d(${tile.x}px, ${tile.y}px, 0)`,
            }}
          />
        ))}
      </div>

      {/* SVG Overlay for Polylines & Geometric Routes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {routeSvgPath && (
          <>
            {/* Outer Route Glow / Border */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-20"
            />
            {/* Main Road Route */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Animated Directional Dash */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="6, 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-dash"
            />
          </>
        )}
      </svg>

      {/* Map Markers Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* User GPS Location Marker */}
        {userLocation && (
          (() => {
            const pos = latLngToScreen(userLocation.lat, userLocation.lng);
            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out"
                style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full animate-ping absolute" />
                  <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Pickup Marker */}
        {pickupLocation && (
          (() => {
            const pos = latLngToScreen(pickupLocation.lat, pickupLocation.lng);
            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-full transition-transform duration-300 ease-out"
                style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
              >
                <div className="flex flex-col items-center">
                  <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm mb-1 whitespace-nowrap">
                    نقطة الركوب
                  </span>
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="w-1.5 h-2 bg-emerald-600 -mt-0.5 rounded-b-full shadow-sm" />
                </div>
              </div>
            );
          })()
        )}

        {/* Dropoff Marker */}
        {dropoffLocation && (
          (() => {
            const pos = latLngToScreen(dropoffLocation.lat, dropoffLocation.lng);
            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-full transition-transform duration-300 ease-out"
                style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
              >
                <div className="flex flex-col items-center">
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm mb-1 whitespace-nowrap">
                    الوجهة
                  </span>
                  <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="w-1.5 h-2 bg-rose-600 -mt-0.5 rounded-b-full shadow-sm" />
                </div>
              </div>
            );
          })()
        )}

        {/* Live Driver Car Marker */}
        {driverLocation && (
          (() => {
            const pos = latLngToScreen(driverLocation.lat, driverLocation.lng);
            const heading = driverLocation.heading || 0;
            return (
              <motion.div
                initial={false}
                animate={{
                  x: pos.x,
                  y: pos.y,
                  rotate: heading,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-2xl border-2 border-white flex items-center justify-center transform transition-transform">
                    <Car className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                </div>
              </motion.div>
            );
          })()
        )}
      </div>

      {/* Floating Map Controls */}
      <div className="absolute left-4 top-20 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleRecenterClick}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 active:scale-90 transition-all cursor-pointer"
          title="موقعي الحالي"
        >
          <Crosshair className="w-5 h-5 text-emerald-600" />
        </button>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-11 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
