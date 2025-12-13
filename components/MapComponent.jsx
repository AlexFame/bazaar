"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

// Fix default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocateControl({ onLocationFound }) {
    const map = useMap();
    const [loading, setLoading] = useState(false);

    const handleLocate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);

        if (!navigator.geolocation) {
            alert("Геолокация не поддерживается вашим браузером.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.flyTo([latitude, longitude], 13);
                setLoading(false);
                if (onLocationFound) onLocationFound({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLoading(false);
                let errorMessage = "Не удалось определить местоположение.";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Вы запретили доступ к геолокации. Разрешите доступ в настройках.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Информация о местоположении недоступна.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Время ожидания истекло.";
                        break;
                }
                alert(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 
            }
        );
    };

    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: "20px", marginRight: "10px", pointerEvents: "auto", zIndex: 1000 }}>
            <div className="leaflet-control leaflet-bar">
                <button 
                    onClick={handleLocate}
                    className="bg-white w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 text-black font-bold text-lg rounded shadow-md transition-colors"
                    title="Где я?"
                    disabled={loading}
                    type="button" 
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        "📍"
                    )}
                </button>
            </div>
        </div>
    );
}

export default function MapComponent({ listings, userLocation }) {
  // Internal state for user location found via the map button
  const [internalUserPos, setInternalUserPos] = useState(null);

  // Effective user location: either passed prop or internally found
  const effectiveUserLoc = internalUserPos || userLocation;

  // Default center (Tbilisi) if no user location
  const center = effectiveUserLoc ? [effectiveUserLoc.lat, effectiveUserLoc.lng] : [41.7151, 44.8271];
  const zoom = effectiveUserLoc ? 13 : 11;

  const validListings = listings.filter(l => {
      const lat = parseFloat(l.latitude);
      const lng = parseFloat(l.longitude);
      return !isNaN(lat) && !isNaN(lng);
  });

  const getImageUrl = (path) => {
      if (!path) return null;
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      return data?.publicUrl;
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-gray-100 z-0">
        <MapContainer 
            center={center} 
            zoom={zoom} 
            style={{ height: "100%", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <LocateControl onLocationFound={setInternalUserPos} />

            {/* User Location Marker */}
            {effectiveUserLoc && (
                <Marker 
                    position={[effectiveUserLoc.lat, effectiveUserLoc.lng]}
                    icon={L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })}
                >
                    <Popup>
                        <div className="text-center">
                            <span className="font-bold">Вы здесь</span>
                        </div>
                    </Popup>
                </Marker>
            )}

            {validListings.map(listing => (
                <Marker 
                    key={listing.id} 
                    position={[parseFloat(listing.latitude), parseFloat(listing.longitude)]}
                >
                    <Popup>
                        <div className="min-w-[150px]">
                            {getImageUrl(listing.main_image_path) && (
                                <div className="w-full h-24 relative mb-2 rounded overflow-hidden">
                                     <img 
                                        src={getImageUrl(listing.main_image_path)} 
                                        alt={listing.title}
                                        className="w-full h-full object-cover"
                                     />
                                </div>
                            )}
                            <Link href={`/listing/${listing.id}`} className="font-bold hover:underline block mb-1 text-sm">
                                {listing.title}
                            </Link>
                            <p className="text-sm font-semibold">{listing.price} €</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    </div>
  );
}
