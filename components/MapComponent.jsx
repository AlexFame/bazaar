"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Fix default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapComponent({ listings, userLocation }) {
  // Default center (Tbilisi) if no user location
  const center = userLocation ? [userLocation.lat, userLocation.lng] : [41.7151, 44.8271];
  const zoom = userLocation ? 13 : 11;

  const validListings = listings.filter(l => l.latitude && l.longitude);

  const getImageUrl = (path) => {
      if (!path) return null;
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      return data?.publicUrl;
  };

  return (
    <div className="h-[60vh] w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0 mt-4">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {validListings.map(listing => (
          <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
            <Popup>
               <div className="w-[160px] flex flex-col gap-1">
                   {listing.image_path && (
                       <img 
                        src={getImageUrl(listing.image_path)} 
                        alt={listing.title}
                        className="w-full h-24 object-cover rounded-md"
                       />
                   )}
                   <div className="font-bold text-sm mt-1">{listing.price} €</div>
                   <div className="text-xs text-gray-600 truncate">{listing.title}</div>
                   <Link href={`/listing/${listing.id}`} className="block mt-2 text-center bg-black text-white text-xs py-1.5 rounded hover:bg-gray-800 no-underline">
                       Открыть
                   </Link>
               </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Marker for user location */}
        {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })}>
                <Popup>Вы здесь</Popup>
            </Marker>
        )}

        {/* Locate Me Button */}
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: "20px", marginRight: "10px", pointerEvents: "auto", zIndex: 1000 }}>
            <div className="leaflet-control leaflet-bar">
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    const { latitude, longitude } = position.coords;
                                    // We can't easily update parent state from here without a prop, 
                                    // but we can center the map.
                                    // Ideally, we should pass a handler from parent.
                                    // For now, let's just reload the page with location? No, that's bad.
                                    // Let's just center the map instance if we could access it.
                                    // Better: use useMap hook.
                                    alert(`Ваши координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. \n(Для полноценной фильтрации включите геолокацию в фильтрах)`);
                                },
                                (error) => {
                                    console.error("Geolocation error:", error);
                                    let errorMessage = "Не удалось определить местоположение.";
                                    switch(error.code) {
                                        case error.PERMISSION_DENIED:
                                            errorMessage = "Вы запретили доступ к геолокации. Пожалуйста, разрешите доступ в настройках браузера.";
                                            break;
                                        case error.POSITION_UNAVAILABLE:
                                            errorMessage = "Информация о местоположении недоступна.";
                                            break;
                                        case error.TIMEOUT:
                                            errorMessage = "Время ожидания запроса истекло.";
                                            break;
                                    }
                                    alert(errorMessage);
                                }
                            );
                        } else {
                            alert("Геолокация не поддерживается вашим браузером.");
                        }
                    }}
                    className="bg-white w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100 text-black font-bold text-lg"
                    title="Где я?"
                >
                    📍
                </button>
            </div>
        </div>
      </MapContainer>
    </div>
  );
}
