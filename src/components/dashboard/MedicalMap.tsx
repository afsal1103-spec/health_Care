"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Component to handle map view updates
function MapViewHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14, { animate: true });
  }, [center, map]);
  return null;
}

// Fix Leaflet default icon issue
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Medical {
  id: number;
  name: string;
  contact: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isApproved: boolean;
}

const center: [number, number] = [23.8103, 90.4125]; // Default to Dhaka

export function MedicalMap() {
  const [medicals, setMedicals] = useState<Medical[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  useEffect(() => {
    setMounted(true);
    async function fetchMedicals() {
      try {
        const response = await fetch("/api/medicals");
        const data = await response.json();
        const results = Array.isArray(data) ? data : [];
        setMedicals(
          results.filter(
            (m: Medical) => m.isApproved && m.latitude && m.longitude
          )
        );
      } catch (error) {
        console.error("Failed to fetch medicals:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMedicals();
  }, []);

  const filteredMedicals = medicals.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-center map on search results
  useEffect(() => {
    if (searchTerm && filteredMedicals.length > 0) {
      const first = filteredMedicals[0];
      if (first.latitude && first.longitude) {
        setMapCenter([Number(first.latitude), Number(first.longitude)]);
      }
    } else if (!searchTerm) {
      setMapCenter(center);
    }
  }, [searchTerm, filteredMedicals]);

  if (!mounted) return <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-[2.5rem]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <MapPin className="h-6 w-6 text-blue-600" /> Nearby Pharmacies
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Free Open-Source Tracking</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search Pharmacy..." 
            className="pl-10 h-10 rounded-xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden z-0">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "400px", width: "100%" }}
          scrollWheelZoom={false}
        >
          <MapViewHandler center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {filteredMedicals.map((m) => (
            <Marker
              key={m.id}
              position={[Number(m.latitude), Number(m.longitude)]}
              icon={customIcon}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h4 className="font-black text-slate-900 text-sm mb-1 uppercase tracking-tight">{m.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3 w-3" /> {m.address}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                     <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-blue-600" />
                        <span className="text-[10px] font-black text-slate-600">{m.contact}</span>
                     </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Card>
    </div>
  );
}

