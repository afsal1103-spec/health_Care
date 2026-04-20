"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Search,
  Stethoscope,
  Clock,
  AlertCircle,
  Activity,
  CheckCircle,
  Star,
  Video,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";

interface Doctor {
  id: number;
  name: string;
  specialist: string;
  education: string;
  experienceYears: number;
  consultationFee: number;
  rating: number | null;
  availableDays: string[];
  availableTimeStart: string;
  availableTimeEnd: string;
}

const diseaseCategories = [
  "General Checkup",
  "Cardiology (Heart)",
  "Dermatology (Skin)",
  "Neurology (Brain/Nerves)",
  "Orthopedics (Bones)",
  "Pediatrics (Children)",
  "ENT (Ear, Nose, Throat)",
  "Eye Care",
  "Dental",
  "Mental Health",
  "Diabetes",
  "Hypertension",
  "Other",
];

function safeIncludesDay(days: unknown, dayName: string): boolean {
  if (!days) return false;
  if (Array.isArray(days)) return days.includes(dayName);
  if (typeof days === "string") {
    try {
      const parsed = JSON.parse(days);
      if (Array.isArray(parsed)) return parsed.includes(dayName);
    } catch {
      return false;
    }
  }
  return false;
}

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState("");
  const [diseaseCategory, setDiseaseCategory] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [isVideoConsultation, setIsVideoConsultation] = useState(false);
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

  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current, 
      { opacity: 0, x: 20 }, 
      { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [step]);

  const findDoctors = async () => {
    if (!symptoms.trim()) {
      toast.error("Please describe your symptoms");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/recommend-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, diagnosis: diseaseCategory }),
      });

      if (!response.ok) {
        toast.error("AI recommendation failed. Showing all doctors.");
        const fallback = await fetch(`/api/doctors?symptom=${encodeURIComponent(symptoms)}`);
        const data = await fallback.json();
        setDoctors(data);
        setAiInsight("AI recommendation currently unavailable. Showing matching doctors.");
      } else {
        const data = await response.json();
        setDoctors(data.recommendations);
        setAiInsight(data.ai_insight);
      }
      setStep(2);
    } catch (error) {
      console.error("findDoctors error:", error);
      toast.error("Failed to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (doctor: Doctor): string[] => {
    const slots: string[] = [];
    try {
      const startStr = doctor.availableTimeStart || "09:00:00";
      const endStr = doctor.availableTimeEnd || "17:00:00";
      const start = new Date(`2000-01-01T${startStr}`);
      const end = new Date(`2000-01-01T${endStr}`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return slots;

      const current = new Date(start);
      while (current < end) {
        slots.push(format(current, "HH:mm"));
        current.setMinutes(current.getMinutes() + 30);
      }
    } catch (e) {
      console.error("generateTimeSlots error:", e);
    }
    return slots;
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast.error("Please select a date and time slot");
      return;
    }

    setLoading(true);
    try {
      // 0. Check if patient has their own profile/UPI set up (if required by business logic)
      // For now, let's just proceed, but we'll check if the recipient has it.
      
      // 1. Create appointment
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          symptoms,
          disease_category: diseaseCategory || null,
          isVideoConsultation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Appointment created! Please complete payment.");
        
        // 2. Initialize Manual Payment
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "consultation",
            amount: selectedDoctor.consultationFee,
            patientId: data.patient_id,
            doctorId: selectedDoctor.id,
            appointmentId: data.appointment_id,
            description: `Consultation with Dr. ${selectedDoctor.name}`,
          }),
        });

        const checkoutData = await checkoutRes.json();
        
        if (checkoutRes.ok && checkoutData.manual) {
          setPaymentInfo(checkoutData);
          setStep(4);
        } else {
          toast.error(checkoutData.error || "Failed to initialize payment. Please try again from transactions.");
        }
      } else {
        toast.error(data.error || "Failed to book appointment");
      }
    } catch (error) {
      console.error("bookAppointment error:", error);
      toast.error("Failed to reach the server. Please try again.");
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
        toast.success("Payment submitted for verification! Your appointment is pending approval.");
        window.location.href = "/dashboard/patient/appointments";
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6" ref={containerRef}>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Stethoscope className="h-10 w-10 text-blue-600" /> Book Consultation
        </h1>
        <p className="text-gray-500 text-lg">
          Our AI will help you find the best specialist for your needs.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between px-8 relative">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2 relative z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-md ${
                step >= s
                  ? "bg-blue-600 text-white scale-110"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${step >= s ? "text-blue-700" : "text-gray-400"}`}
            >
              {s === 1 ? "Symptoms" : s === 2 ? "Doctor" : s === 3 ? "Schedule" : "Payment"}
            </span>
          </div>
        ))}
        <div className="absolute left-1/2 -translate-x-1/2 w-[60%] h-1 bg-gray-100 -z-0" />
      </div>

      {/* ── Step 1: Symptoms ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50/50 to-white overflow-hidden">
          <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" /> Tell us what's wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="space-y-3">
              <Label htmlFor="symptoms" className="text-lg font-bold text-gray-700 flex items-center gap-2">
                Describe your symptoms <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="symptoms"
                placeholder="e.g., I've been having sharp chest pains and shortness of breath when climbing stairs for the last 3 days..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="min-h-[160px] text-lg p-4 transition-all focus:ring-4 focus:ring-blue-100 border-2 rounded-xl"
              />
              <p className="text-xs text-gray-400">Our AI uses this description to match you with the right specialist.</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-lg font-bold text-gray-700">Medical Category (Optional)</Label>
              <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
                <SelectTrigger className="h-14 text-lg border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all">
                  <SelectValue placeholder="Select a known category if any" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {diseaseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-lg py-3">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={findDoctors}
              disabled={loading || !symptoms.trim()}
              className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 group"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  AI is Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="h-6 w-6 group-hover:scale-125 transition-transform" />
                  Find Best Doctors for Me
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Choose Doctor ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
          {aiInsight && (
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl flex items-start gap-4 border-l-8 border-blue-400">
              <AlertCircle className="h-8 w-8 shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-black mb-1">AI Health Insight</h3>
                <p className="text-blue-50 font-medium leading-relaxed">{aiInsight}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctors.map((doc) => (
              <Card
                key={doc.id}
                className={`group cursor-pointer transition-all duration-300 border-2 overflow-hidden relative ${
                  selectedDoctor?.id === doc.id
                    ? "border-blue-600 bg-blue-50 ring-4 ring-blue-100"
                    : "border-gray-100 hover:border-blue-300 hover:shadow-2xl"
                }`}
                onClick={() => setSelectedDoctor(doc)}
              >
                {selectedDoctor?.id === doc.id && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white p-2 rounded-bl-xl z-10">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <Stethoscope className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-gray-900">Dr. {doc.name}</h3>
                      <p className="text-blue-700 font-bold text-sm bg-blue-100 inline-block px-2 py-0.5 rounded-full">{doc.specialist}</p>
                      <p className="text-gray-500 text-xs font-medium italic mt-1">{doc.education}</p>
                      
                      <div className="flex items-center gap-3 mt-4">
                        <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">
                          <Star className="h-4 w-4 fill-orange-500" />
                          <span className="font-bold">{doc.rating || 0}</span>
                        </div>
                        <div className="text-gray-400 font-medium">•</div>
                        <div className="text-gray-600 font-bold">₹{doc.consultationFee}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" size="lg" className="h-14 px-8 font-bold border-2" onClick={() => setStep(1)}>
              Back to Symptoms
            </Button>
            <Button
              disabled={!selectedDoctor}
              className="flex-1 h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
              onClick={() => setStep(3)}
            >
              Proceed with Dr. {selectedDoctor?.name}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule ─────────────────────────────────────────── */}
      {step === 3 && selectedDoctor && (
        <Card className="border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="bg-gray-50 border-b p-8">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-black text-gray-900">Finalize Consultation</CardTitle>
                <CardDescription className="text-lg">Set your preferred date and time</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-400 uppercase">Consulting with</p>
                <p className="text-xl font-black text-blue-600">Dr. {selectedDoctor.name}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Video Consultation Toggle */}
            <div className="flex items-center justify-between p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-black text-blue-900">Video Consultation</h4>
                  <p className="text-sm text-blue-700 font-medium">Consult live from your home via secure video call</p>
                </div>
              </div>
              <Switch 
                checked={isVideoConsultation} 
                onCheckedChange={setIsVideoConsultation}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <Label className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" /> Select Date
                </Label>
                <div className="border-2 rounded-2xl p-4 bg-white shadow-inner">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const dayName = format(date, "EEEE");
                      return (
                        date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                        !safeIncludesDay(selectedDoctor.availableDays, dayName)
                      );
                    }}
                    className="rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" /> Select Time Slot
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {generateTimeSlots(selectedDoctor).map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={`h-12 font-bold text-sm transition-all border-2 rounded-xl ${
                        selectedTime === time 
                          ? "bg-blue-600 text-white border-blue-600 scale-105" 
                          : "hover:border-blue-300 hover:bg-blue-50"
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
                {selectedDate && generateTimeSlots(selectedDoctor).length === 0 && (
                  <div className="flex items-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-xl border border-orange-100">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-bold">No slots available on this date.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <Button variant="outline" size="lg" className="h-16 px-10 font-bold border-2 rounded-xl" onClick={() => setStep(2)}>
                Change Doctor
              </Button>
              <Button
                disabled={loading || !selectedDate || !selectedTime}
                className="flex-1 h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                onClick={bookAppointment}
              >
                {loading ? "Confirming Booking..." : "Book Appointment Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Payment ────────────────────────────────────────────── */}
      {step === 4 && paymentInfo && (
        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white border-t-8 border-t-blue-600 animate-in zoom-in-95 duration-500">
          <CardHeader className="p-8 border-b bg-gray-50/50 text-center relative">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <IndianRupee className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-black text-gray-900">Complete Payment</CardTitle>
            <CardDescription className="text-lg font-bold text-blue-600">
              Transaction ID: {paymentInfo.transactionCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: QR Code */}
              <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <img 
                    src={paymentInfo.qrCodeUrl} 
                    alt="Payment QR" 
                    className="relative w-64 h-64 rounded-xl shadow-2xl"
                  />
                </div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Scan to Pay ₹{paymentInfo.amount}</p>
              </div>

              {/* Right: Payment Details */}
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Recipient Name</Label>
                    <p className="text-xl font-black text-gray-900">{paymentInfo.accountName}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">UPI ID</Label>
                    <p className="text-xl font-black text-blue-600">{paymentInfo.upiId}</p>
                  </div>
                </div>

                <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                  <div className="flex items-center gap-3 text-orange-800">
                    <AlertCircle className="h-6 w-6" />
                    <h4 className="font-black">Verification Required</h4>
                  </div>
                  <p className="text-sm text-orange-800 font-medium">
                    After making the payment, please enter the 12-digit UTR (Transaction ID) from your payment app (PhonePe, Google Pay, etc.) below.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="utr" className="font-black text-orange-900">Enter UTR / Transaction ID</Label>
                    <Input 
                      id="utr"
                      placeholder="e.g. 123456789012"
                      className="h-12 border-2 border-orange-200 rounded-xl focus:ring-orange-500 bg-white"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-14 border-2 font-black rounded-2xl"
                onClick={() => setStep(3)}
              >
                Back to Schedule
              </Button>
              <Button 
                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 font-black text-lg rounded-2xl shadow-xl shadow-blue-100"
                onClick={submitManualPayment}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify Payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
