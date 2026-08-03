import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerModalProps {
  initial: { lat: number; lng: number } | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}

const DEFAULT_CENTER: [number, number] = [-34.9011, -56.1645];

export default function LocationPickerModal({ initial, onConfirm, onClose }: LocationPickerModalProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapRefInstance = useRef<L.Map | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const start: [number, number] = initial ? [initial.lat, initial.lng] : DEFAULT_CENTER;
    const mapInstance = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(start, initial ? 17 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance);

    const icon = L.divIcon({
      className: 'location-picker-pin',
      html: '<div class="location-picker-pin-head"></div>',
      iconSize: [34, 46],
      iconAnchor: [17, 46],
    });

    const marker = L.marker(start, { icon, draggable: true }).addTo(mapInstance);
    markerRef.current = marker;

    mapInstance.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
    });

    mapRefInstance.current = mapInstance;
    window.setTimeout(() => mapInstance.invalidateSize(), 50);

    return () => {
      mapInstance.remove();
      mapRefInstance.current = null;
      markerRef.current = null;
    };
  }, [initial]);

  const useGps = () => {
    if (!navigator.geolocation) {
      alert(t('publicIndex.locationNotSupported'));
      return;
    }
    setLocating(true);
    let watchId: number | null = null;
    let best: { lat: number; lng: number; accuracy: number } | null = null;
    let done = false;
    const settle = (lat: number, lng: number) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setLocating(false);
      markerRef.current?.setLatLng([lat, lng]);
      mapRefInstance.current?.setView([lat, lng], 19);
    };
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!best || accuracy < best.accuracy) best = { lat: latitude, lng: longitude, accuracy };
        if (accuracy <= 25) settle(latitude, longitude);
      },
      () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        setLocating(false);
        if (best) {
          markerRef.current?.setLatLng([best.lat, best.lng]);
          mapRefInstance.current?.setView([best.lat, best.lng], 19);
        } else {
          alert(t('publicIndex.locationError'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    window.setTimeout(() => {
      if (best) settle(best.lat, best.lng);
      else if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setLocating(false);
        alert(t('publicIndex.locationError'));
      }
    }, 12000);
  };

  const handleConfirm = () => {
    const pos = markerRef.current?.getLatLng();
    if (pos) onConfirm(pos.lat, pos.lng);
  };

  return (
    <div className="dash-modal-overlay flex" onClick={onClose}>
      <div className="dash-modal-content glass-panel location-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{t('staffDashboard.mapPickerTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn" aria-label={t('staffDashboard.mapPickerCancel')}>✕</button>
        </div>
        <div className="dash-modal-body">
          <p className="text-muted">{t('staffDashboard.mapPickerHint')}</p>
          <div ref={mapRef} className="location-picker-map" />
          <div className="flex flex-gap-8 mt-12">
            <button type="button" className="dash-btn btn btn-secondary fs-13 nowrap" onClick={useGps} disabled={locating}>
              <Crosshair size={14} className="mr-8 vertical-align-middle" />
              {locating ? t('staffDashboard.locationLoading') : t('staffDashboard.mapPickerUseGps')}
            </button>
            <div className="flex-1"></div>
            <button type="button" className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.mapPickerCancel')}</button>
            <button type="button" className="dash-btn dash-btn-success" onClick={handleConfirm}>{t('staffDashboard.mapPickerConfirm')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
