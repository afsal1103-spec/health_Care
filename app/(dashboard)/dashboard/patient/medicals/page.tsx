"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Search, 
  FileText, 
  Download, 
  Printer, 
  ArrowRight,
  Activity,
  Heart,
  Droplets
} from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MapViewHandler = dynamic(() => import('react-leaflet').then(mod => {
  return function MapViewHandler({ center }: { center: [number, number] }) {
    const { useMap } = require('react-leaflet');
    const map = useMap();
    useEffect(() => {
      map.setView(center, 14, { animate: true });
    }, [center, map]);
    return null;
  };
}), { ssr: false });

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icon issue
const customIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
}) : null;

interface Medical {
  id: number;
  name: string;
  contact: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isApproved: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const center = {
  lat: 23.8103, // Default to Dhaka
  lng: 90.4125,
};

export default function PatientMedicalsPage() {
  const router = useRouter();
  const [medicals, setMedicals] = useState<Medical[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [selectedMedical, setSelectedMedical] = useState<Medical | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    manual: boolean;
    transactionId: number;
    transactionCode: string;
    amount: number;
    upiId: string;
    accountName: string;
    qrCodeUrl: string;
  } | null>(null);
  const [utr, setUtr] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([center.lat, center.lng]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadMedicals();
  }, [debouncedSearch]);

  const loadMedicals = async () => {
    setLoading(true);
    try {
      const qs = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/medicals${qs}`);
      const data = await res.json();
      
      const results = Array.isArray(data) ? data : [];
      const approved = results.filter((m: Medical) => m.isApproved);
      setMedicals(approved);

      // Update map center if results found
      if (debouncedSearch && approved.length > 0) {
        const first = approved[0];
        if (first.latitude && first.longitude) {
          setMapCenter([Number(first.latitude), Number(first.longitude)]);
        }
      } else if (!debouncedSearch) {
        setMapCenter([center.lat, center.lng]);
      }
    } finally {
      setLoading(false);
    }
  };

  const purchasePrescription = async (medical: Medical) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/latest`);
      const data = await res.json();
      
      if (res.ok && data && data.prescriptions.length > 0) {
        // Calculate a dummy amount: 200 per medication
        const amount = data.prescriptions.length * 200;
        
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "medical",
            amount: amount,
            patientId: data.patientId,
            medicalId: medical.id,
            description: `Prescription Purchase from ${medical.name}`,
          }),
        });

        const checkoutData = await checkoutRes.json();
        
        if (checkoutRes.ok && checkoutData.manual) {
          setPaymentInfo(checkoutData);
          setShowPayment(true);
          setShowPrescription(false);
        } else {
          toast.error(checkoutData.error || "Failed to initialize payment");
          if (checkoutData.redirect) {
            router.push(checkoutData.redirect);
          }
        }
      } else {
        toast.error("No active prescriptions found to purchase.");
      }
    } catch (error) {
      toast.error("Failed to process purchase");
    } finally {
      setLoading(false);
    }
  };

  const submitManualPayment = async () => {
    if (!utr.trim() || !paymentInfo) {
      toast.error("Please enter the UTR / Transaction ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: paymentInfo.transactionId,
          manualUtr: utr,
        }),
      });

      if (res.ok) {
        toast.success("Payment submitted for verification! Your order is pending approval.");
        router.push("/dashboard/patient/transactions");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit payment verification.");
      }
    } catch (error) {
      toast.error("Error submitting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescription = async (medical: Medical) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/latest`);
      const data = await res.json();
      
      if (res.ok && data) {
        setSelectedPrescription(data);
        setShowPrescription(true);
        toast.success(`Prescription successfully shared with ${medical.name}`);
        
        gsap.from(".prescription-card", {
          opacity: 0,
          scale: 0.9,
          duration: 0.5,
          ease: "back.out(1.7)"
        });
      } else {
        toast.error("No active prescriptions found to share.");
      }
    } catch (error) {
      toast.error("Failed to fetch prescription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Building2 className="h-10 w-10 text-blue-600" /> Nearby Medicals
          </h1>
          <p className="text-gray-500 text-lg">Find pharmacies on live map and purchase prescriptions</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          <Input 
            placeholder="Search by store name or location..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full md:w-80 h-14 pl-12 border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Google Map and Medical Stores List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden h-[500px] z-0">
            {mounted ? (
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <MapViewHandler center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {medicals.map((m) => (
                  m.latitude && m.longitude && (
                    <Marker
                      key={m.id}
                      position={[Number(m.latitude), Number(m.longitude)]}
                      icon={customIcon as L.Icon}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h4 className="font-black text-gray-900">{m.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{m.address}</p>
                          <Button 
                            size="sm" 
                            className="w-full mt-3 h-8 text-[10px] font-black uppercase"
                            onClick={() => purchasePrescription(m)}
                          >
                            Purchase Prescription
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-bold text-gray-400">Loading Live Map...</p>
                </div>
              </div>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {medicals.map((m) => (
              <Card key={m.id} className="group border-none shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gray-50 p-6 flex flex-row items-center justify-between border-b group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg font-black">{m.name}</CardTitle>
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/50 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/50">OPEN</Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-400 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> LOCATION
                    </p>
                    <p className="text-sm font-black text-gray-700 leading-relaxed">{m.address}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => fetchPrescription(m)}
                      variant="outline"
                      className="flex-1 h-12 border-2 font-black rounded-xl"
                    >
                      Share
                    </Button>
                    <Button 
                      onClick={() => purchasePrescription(m)}
                      className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-lg shadow-blue-200"
                    >
                      Purchase Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Prescription View Overlay/Side Tab */}
        <div className="space-y-6">
          {showPayment && paymentInfo && (
            <Card className="border-none shadow-2xl overflow-hidden border-t-8 border-t-blue-600 animate-in slide-in-from-right-10 duration-500">
              <CardHeader className="bg-gray-50/50 p-8 border-b text-center relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPayment(false)}
                >
                  <Activity className="h-5 w-5 rotate-45" />
                </Button>
                <CardTitle className="text-2xl font-black text-gray-900">Manual Payment</CardTitle>
                <CardDescription className="text-blue-600 font-bold">
                  Scan to Pay ₹{paymentInfo.amount}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="bg-white p-2 rounded-2xl shadow-inner border-2 border-blue-50">
                  <img 
                    src={paymentInfo.qrCodeUrl} 
                    alt="UPI QR Code" 
                    className="w-full h-auto aspect-square object-contain"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">UPI ID</p>
                    <p className="text-sm font-black text-blue-900">{paymentInfo.upiId}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase">Enter 12-digit UTR Number</Label>
                    <Input 
                      placeholder="e.g. 123456789012"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black text-lg focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <Button 
                    onClick={submitManualPayment}
                    disabled={loading || !utr.trim()}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-lg shadow-blue-200"
                  >
                    {loading ? "Verifying..." : "Confirm Payment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showPrescription && selectedPrescription && !showPayment ? (
            <Card className="prescription-card border-none shadow-2xl rounded-3xl overflow-hidden border-t-8 border-t-blue-600 animate-in slide-in-from-bottom-10 duration-500">
              <CardHeader className="bg-gray-50/50 p-8 border-b text-center relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPrescription(false)}
                >
                  <Activity className="h-5 w-5 rotate-45" />
                </Button>
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-900">Digital Prescription</CardTitle>
                <CardDescription className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-1">
                  Issued by Dr. {selectedPrescription.doctorName}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  {selectedPrescription.prescriptions.map((p: any, i: number) => (
                    <div key={i} className="p-4 bg-blue-50/50 rounded-2xl border-2 border-blue-100/50 flex flex-col gap-1">
                      <p className="font-black text-gray-900">{p.medicationName}</p>
                      <div className="flex items-center gap-4 text-xs font-bold text-blue-700">
                        <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {p.dosage}</span>
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {p.duration}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 italic mt-1 font-medium">{p.instructions}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t space-y-3">
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-lg shadow-blue-200">
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                  <Button variant="outline" className="w-full h-12 border-2 font-black rounded-xl">
                    <Printer className="h-4 w-4 mr-2" /> Print Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 px-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="font-black text-gray-400 mb-2">Prescription Viewer</h3>
              <p className="text-sm text-gray-500 font-medium">Select a medical store to share your latest prescription and view details here.</p>
            </Card>
          )}

          <Card className="border-none shadow-xl rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-8">
            <h3 className="text-xl font-black mb-4">Emergency Support</h3>
            <p className="text-blue-100 text-sm font-medium mb-6 leading-relaxed">Need urgent medication or can't find a store? Contact our 24/7 medical helpline.</p>
            <Button className="w-full h-12 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl border-none">
              <Phone className="h-4 w-4 mr-2" /> Call Helpline
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
