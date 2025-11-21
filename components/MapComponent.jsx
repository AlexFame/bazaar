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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      </MapContainer>
    </div>
  );
}
