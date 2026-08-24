import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Car,
  MapPin,
  Navigation,
  Search,
  Plus,
  Minus,
  Crosshair,
  Layers,
  Activity,
  AlertTriangle,
  UserCheck,
  Shield,
  Eye,
} from 'lucide-react';
import { LiveDriver, AdminRide } from '../types';

interface Coords {
  lat: number;
  lng: number;
}

interface AdminLiveOperationsMapProps {
  drivers: LiveDriver[];
  rides: AdminRide[];
  onSelectDriver: (driver: LiveDriver) => void;
  onSelectRide: (ride: AdminRide) => void;
}

// Convert Lat/Lng to Web Mercator World Coordinates (at zoom level)
function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = ((1 - mercN / Math.PI) / 2) * scale;
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

export const AdminLiveOperationsMap: React.FC<AdminLiveOperationsMapProps> = ({
  drivers,
  rides,
  onSelectDriver,
  onSelectRide,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState<Coords>({ lat: 31.4055, lng: 31.7385 }); // Kafr El-Batikh, Damietta

  // Filters
  const [showOnlineDrivers, setShowOnlineDrivers] = useState(true);
  const [showBusyDrivers, setShowBusyDrivers] = useState(true);
  const [showStaleDrivers, setShowStaleDrivers] = useState(true);
  const [showSearchingRides, setShowSearchingRides] = useState(true);
  const [showActiveRides, setShowActiveRides] = useState(true);

  // Selected hover popup state
  const [selectedPopup, setSelectedPopup] = useState<{
    type: 'driver' | 'ride';
    data: any;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Update container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 500,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute map tiles to cover viewport
  const tiles = useMemo(() => {
    const scale = 256 * Math.pow(2, zoom);
    const centerWorld = project(center.lat, center.lng, zoom);

    const startX = centerWorld.x - dimensions.width / 2;
    const startY = centerWorld.y - dimensions.height / 2;

    const tileStartX = Math.floor(startX / 256);
    const tileEndX = Math.floor((startX + dimensions.width) / 256);
    const tileStartY = Math.floor(startY / 256);
    const tileEndY = Math.floor((startY + dimensions.height) / 256);

    const result = [];
    const maxTiles = Math.pow(2, zoom);

    for (let x = tileStartX; x <= tileEndX; x++) {
      for (let y = tileStartY; y <= tileEndY; y++) {
        const normX = ((x % maxTiles) + maxTiles) % maxTiles;
        const normY = y;
        if (normY >= 0 && normY < maxTiles) {
          const screenX = x * 256 - startX;
          const screenY = y * 256 - startY;
          result.push({
            url: `https://tile.openstreetmap.org/${zoom}/${normX}/${normY}.png`,
            key: `${zoom}-${x}-${y}`,
            x: screenX,
            y: screenY,
          });
        }
      }
    }
    return result;
  }, [center.lat, center.lng, zoom, dimensions.width, dimensions.height]);

  // Convert Lat/Lng to local container screen (X, Y)
  const latLngToScreen = (lat: number, lng: number): { x: number; y: number } => {
    const centerWorld = project(center.lat, center.lng, zoom);
    const pointWorld = project(lat, lng, zoom);
    return {
      x: pointWorld.x - centerWorld.x + dimensions.width / 2,
      y: pointWorld.y - centerWorld.y + dimensions.height / 2,
    };
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const centerWorld = project(center.lat, center.lng, zoom);
    const newCenterWorld = {
      x: centerWorld.x - dx,
      y: centerWorld.y - dy,
    };
    setCenter(unproject(newCenterWorld.x, newCenterWorld.y, zoom));
    setSelectedPopup(null);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePosRef.current.x;
    const dy = e.touches[0].clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    const centerWorld = project(center.lat, center.lng, zoom);
    const newCenterWorld = {
      x: centerWorld.x - dx,
      y: centerWorld.y - dy,
    };
    setCenter(unproject(newCenterWorld.x, newCenterWorld.y, zoom));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Auto-fit to active entities
  const handleRecenter = () => {
    const validCoords: Coords[] = [];

    drivers.forEach((d) => {
      if (d.last_latitude && d.last_longitude) {
        validCoords.push({ lat: d.last_latitude, lng: d.last_longitude });
      }
    });

    rides.forEach((r) => {
      if (['requested', 'driver_assigned', 'arrived', 'in_transit'].includes(r.status)) {
        if (r.pickup_latitude && r.pickup_longitude) {
          validCoords.push({ lat: r.pickup_latitude, lng: r.pickup_longitude });
        }
      }
    });

    if (validCoords.length > 0) {
      const avgLat = validCoords.reduce((acc, c) => acc + c.lat, 0) / validCoords.length;
      const avgLng = validCoords.reduce((acc, c) => acc + c.lng, 0) / validCoords.length;
      setCenter({ lat: avgLat, lng: avgLng });
      setZoom(14);
    } else {
      setCenter({ lat: 31.4055, lng: 31.7385 });
      setZoom(13);
    }
    setSelectedPopup(null);
  };

  // Filtered lists
  const filteredDrivers = drivers.filter((d) => {
    if (d.is_stale && !showStaleDrivers) return false;
    if (d.active_ride && !showBusyDrivers) return false;
    if (!d.active_ride && !d.is_stale && d.is_online && !showOnlineDrivers) return false;
    return Boolean(d.last_latitude && d.last_longitude);
  });

  const activeRidesList = rides.filter((r) =>
    ['driver_assigned', 'arrived', 'in_transit'].includes(r.status)
  );

  const searchingRidesList = rides.filter((r) => r.status === 'requested');

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] rounded-2xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100 select-none">
      {/* Map Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
      >
        {/* OpenStreetMap Tiles */}
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              className="absolute w-[256px] h-[256px] select-none"
              style={{
                left: `${tile.x}px`,
                top: `${tile.y}px`,
              }}
              draggable={false}
              referrerPolicy="no-referrer"
            />
          ))}
        </div>

        {/* SVG Overlay for Ride Route Lines */}
        {showActiveRides && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {activeRidesList.map((r) => {
              if (
                !r.pickup_latitude ||
                !r.pickup_longitude ||
                !r.dropoff_latitude ||
                !r.dropoff_longitude
              )
                return null;
              const pScreen = latLngToScreen(r.pickup_latitude, r.pickup_longitude);
              const dScreen = latLngToScreen(r.dropoff_latitude, r.dropoff_longitude);

              return (
                <g key={`route-line-${r.id}`}>
                  {/* Outer Glow */}
                  <line
                    x1={pScreen.x}
                    y1={pScreen.y}
                    x2={dScreen.x}
                    y2={dScreen.y}
                    stroke="#10b981"
                    strokeWidth="5"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                  {/* Inner Dashed Line */}
                  <line
                    x1={pScreen.x}
                    y1={pScreen.y}
                    x2={dScreen.x}
                    y2={dScreen.y}
                    stroke="#047857"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Markers Layer */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* 1. Searching Rides Markers */}
          {showSearchingRides &&
            searchingRidesList.map((r) => {
              if (!r.pickup_latitude || !r.pickup_longitude) return null;
              const pos = latLngToScreen(r.pickup_latitude, r.pickup_longitude);

              return (
                <div
                  key={`searching-${r.id}`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                  onClick={() => onSelectRide(r)}
                  onMouseEnter={() =>
                    setSelectedPopup({
                      type: 'ride',
                      data: r,
                      screenX: pos.x,
                      screenY: pos.y,
                    })
                  }
                >
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-amber-400 opacity-75"></span>
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <Search className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                    طلب يبحث عن كابتن
                  </div>
                </div>
              );
            })}

          {/* 2. Active Rides (Pickup & Dropoff Pins) */}
          {showActiveRides &&
            activeRidesList.map((r) => {
              const pPos =
                r.pickup_latitude && r.pickup_longitude
                  ? latLngToScreen(r.pickup_latitude, r.pickup_longitude)
                  : null;
              const dPos =
                r.dropoff_latitude && r.dropoff_longitude
                  ? latLngToScreen(r.dropoff_latitude, r.dropoff_longitude)
                  : null;

              return (
                <React.Fragment key={`active-ride-markers-${r.id}`}>
                  {pPos && (
                    <div
                      style={{ left: `${pPos.x}px`, top: `${pPos.y}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer"
                      onClick={() => onSelectRide(r)}
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                  {dPos && (
                    <div
                      style={{ left: `${dPos.x}px`, top: `${dPos.y}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer"
                      onClick={() => onSelectRide(r)}
                    >
                      <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                        <Navigation className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

          {/* 3. Driver Markers */}
          {filteredDrivers.map((d) => {
            if (!d.last_latitude || !d.last_longitude) return null;
            const pos = latLngToScreen(d.last_latitude, d.last_longitude);

            let markerColor = 'bg-emerald-600 text-white border-white';
            let label = 'متاح';
            let statusClass = 'text-emerald-400';

            if (d.is_stale) {
              markerColor = 'bg-amber-600 text-white border-amber-200';
              label = 'انقطاع نبض';
              statusClass = 'text-amber-400';
            } else if (d.active_ride) {
              markerColor = 'bg-blue-600 text-white border-blue-200';
              label = 'في رحلة';
              statusClass = 'text-blue-400';
            }

            return (
              <div
                key={`driver-marker-${d.id}`}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group transition-transform hover:scale-110"
                onClick={() => onSelectDriver(d)}
                onMouseEnter={() =>
                  setSelectedPopup({
                    type: 'driver',
                    data: d,
                    screenX: pos.x,
                    screenY: pos.y,
                  })
                }
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${markerColor}`}
                >
                  <Car className="w-4 h-4" />
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1">
                  <span>{d.driver_name.split(' ')[0]}</span>
                  <span className={`text-[9px] ${statusClass}`}>({label})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover/Click Interactive Tooltip Card */}
        {selectedPopup && (
          <div
            style={{
              left: `${Math.min(Math.max(selectedPopup.screenX, 120), dimensions.width - 140)}px`,
              top: `${Math.max(selectedPopup.screenY - 110, 10)}px`,
            }}
            className="absolute -translate-x-1/2 z-30 bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 w-64 text-xs dir-rtl pointer-events-auto animate-fade-in"
          >
            {selectedPopup.type === 'driver' ? (
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-slate-800 pb-1">
                  <span className="font-bold text-white text-sm">
                    {selectedPopup.data.driver_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                    ⭐ {selectedPopup.data.rating_average || '5.0'}
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <p>
                    مركبة: {selectedPopup.data.active_vehicle?.make || 'سيارة'}{' '}
                    {selectedPopup.data.active_vehicle?.model || ''} (
                    {selectedPopup.data.active_vehicle?.plate_number || 'بدون لوحة'})
                  </p>
                  <p>
                    الحالة:{' '}
                    <span className="font-semibold text-emerald-400">
                      {selectedPopup.data.is_stale
                        ? 'انقطاع نبض'
                        : selectedPopup.data.active_ride
                        ? 'في رحلة نشطة'
                        : 'متصل وجاهز'}
                    </span>
                  </p>
                  <p>
                    دخل اليوم: {selectedPopup.data.today_gross} ج.م (
                    {selectedPopup.data.today_rides_count} رحلة)
                  </p>
                </div>
                <button
                  onClick={() => onSelectDriver(selectedPopup.data)}
                  className="mt-2.5 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض ملف الكابتن
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-slate-800 pb-1">
                  <span className="font-bold text-amber-400 text-sm">
                    طلب توصيل #{selectedPopup.data.id.substring(0, 6)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-bold">
                    {selectedPopup.data.estimated_fare || selectedPopup.data.customer_total} ج.م
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <p className="truncate">العميل: {selectedPopup.data.customer_name}</p>
                  <p className="truncate">من: {selectedPopup.data.pickup_address_text}</p>
                  <p className="truncate">إلى: {selectedPopup.data.dropoff_address_text}</p>
                </div>
                <button
                  onClick={() => onSelectRide(selectedPopup.data)}
                  className="mt-2.5 w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  فتح تفاصيل الرحلة
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Floating Controls & Toggles */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
          <button
            onClick={() => setZoom((z) => Math.min(z + 1, 18))}
            className="p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200"
            title="تكبير الخريطة"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 1, 10))}
            className="p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
            title="تصغير الخريطة"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
          title="إعادة التمركز على الكباتن والرحلات"
        >
          <Crosshair className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Bottom Map Legend & Filter Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white rounded-xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            طبقات العرض:
          </span>

          {/* Toggle Online */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-300">
            <input
              type="checkbox"
              checked={showOnlineDrivers}
              onChange={(e) => setShowOnlineDrivers(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            كباتن متاحين ({drivers.filter((d) => d.is_online && !d.active_ride && !d.is_stale).length})
          </label>

          {/* Toggle Busy */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-blue-300">
            <input
              type="checkbox"
              checked={showBusyDrivers}
              onChange={(e) => setShowBusyDrivers(e.target.checked)}
              className="rounded accent-blue-500"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            في رحلة ({drivers.filter((d) => d.active_ride).length})
          </label>

          {/* Toggle Stale */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-amber-300">
            <input
              type="checkbox"
              checked={showStaleDrivers}
              onChange={(e) => setShowStaleDrivers(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            انقطاع نبض ({drivers.filter((d) => d.is_stale).length})
          </label>

          {/* Toggle Searching Rides */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-yellow-300">
            <input
              type="checkbox"
              checked={showSearchingRides}
              onChange={(e) => setShowSearchingRides(e.target.checked)}
              className="rounded accent-yellow-500"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse inline-block"></span>
            طلبات تبحث ({searchingRidesList.length})
          </label>

          {/* Toggle Active Rides */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-teal-300">
            <input
              type="checkbox"
              checked={showActiveRides}
              onChange={(e) => setShowActiveRides(e.target.checked)}
              className="rounded accent-teal-500"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block"></span>
            مسارات نشطة ({activeRidesList.length})
          </label>
        </div>

        <div className="text-[10px] text-slate-400">
          تحديث مباشر بنظام Web Mercator • دمياط
        </div>
      </div>
    </div>
  );
};
