"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import gsap from "gsap";

const MEDICAL_SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Gynecologist",
  "Obstetrician",
  "Psychiatrist",
  "Psychologist",
  "Ophthalmologist",
  "ENT Specialist",
  "Dentist",
  "Endocrinologist",
  "Gastroenterologist",
  "Pulmonologist",
  "Nephrologist",
  "Urologist",
  "Oncologist",
  "Radiologist",
  "Anesthesiologist",
  "Pathologist",
  "Rheumatologist",
  "Hematologist",
  "Immunologist",
  "Infectiologist",
  "Geriatrician",
  "Sports Medicine Specialist",
  "Physical Medicine & Rehabilitation",
  "Plastic Surgeon",
  "Vascular Surgeon",
  "Cardiothoracic Surgeon",
  "Neurosurgeon",
  "Diabetologist",
  "Allergist",
  "Neonatologist",
  "Emergency Medicine Specialist",
];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "",
    mobileNo: "",
    gender: "",
    age: "",
    address: "",
    specialist: "",
    education: "",
    doctorRegistrationNumber: "",
    diagnosis: "",
    symptoms: "",
    currentMedications: "",
    upiId: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.userType === "doctor" && !formData.specialist) {
      toast.error("Please select a specialization");
      return;
    }

    if (formData.userType === "medicalist" && !formData.upiId) {
      toast.error("UPI ID is required for medical stores to receive payments");
      return;
    }

    if (!formData.gender) {
      toast.error("Please select your gender");
      return;
    }

    if (!formData.age || parseInt(formData.age) <= 0) {
      toast.error("Please enter a valid age");
      return;
    }

    // Validate mobile number (10 digits)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobileNo)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
          mobileNo: formData.mobileNo,
          gender: formData.gender,
          age: formData.age,
          address: formData.address,
          upiId: formData.upiId,
          specialist:
            formData.userType === "doctor" ? formData.specialist : undefined,
          education:
            formData.userType === "doctor" ? formData.education : undefined,
          doctorRegistrationNumber:
            formData.userType === "doctor" ? formData.doctorRegistrationNumber : undefined,
          diagnosis:
            formData.userType === "patient" ? formData.diagnosis : undefined,
          symptoms:
            formData.userType === "patient" ? formData.symptoms : undefined,
          currentMedications:
            formData.userType === "patient" ? formData.currentMedications : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account created successfully! Please login.");
        router.push("/login");
      } else {
        toast.error(data.error || "Failed to create account");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={cardRef}>
      <Card className="w-full max-w-2xl mx-auto border-t-4 border-t-blue-600 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-gray-800">Telemedicine Portal</CardTitle>
          <CardDescription className="text-center text-lg">
            Join our platform to experience seamless healthcare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* User Type */}
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-sm font-semibold">I am a...</Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, userType: value, specialist: "" })
                  }
                >
                  <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="medicalist">Medical Store / Pharmacy</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobileNo" className="text-sm font-semibold">Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border-2 border-slate-100 bg-slate-50 rounded-xl text-sm font-black text-slate-500">
                    +91
                  </div>
                  <Input
                    id="mobileNo"
                    placeholder="9876543210"
                    maxLength={10}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                    value={formData.mobileNo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) {
                        setFormData({ ...formData, mobileNo: val });
                      }
                    }}
                    required
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-semibold">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-semibold">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="25"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-semibold">Complete Address</Label>
              <Input
                id="address"
                placeholder="Door No, Street, City, State, ZIP"
                className="transition-all focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>

            {/* UPI ID (Account Details) */}
            {(formData.userType === "doctor" || formData.userType === "medicalist") && (
              <div className="p-4 bg-orange-50 rounded-lg space-y-2 border border-orange-100 animate-in fade-in slide-in-from-top-4 duration-500">
                <Label htmlFor="upiId" className="text-sm font-bold text-orange-900">
                  UPI ID (Account to Receive Payments) {formData.userType === "medicalist" && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="upiId"
                  placeholder="e.g. yourname@okicici"
                  className="bg-white border-orange-200 focus:ring-orange-500"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  required={formData.userType === "medicalist"}
                />
                <p className="text-[10px] text-orange-700 font-medium">
                  This ID will be used for patients to send you payments directly.
                </p>
              </div>
            )}

            {/* Doctor-only fields */}
            {formData.userType === "doctor" && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="font-bold text-blue-800">Professional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialist">Specialization</Label>
                    <Select
                      value={formData.specialist}
                      onValueChange={(value) =>
                        setFormData({ ...formData, specialist: value })
                      }
                    >
                      <SelectTrigger id="specialist">
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {MEDICAL_SPECIALTIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education">Education/Degrees</Label>
                    <Input
                      id="education"
                      placeholder="e.g., MBBS, MD (Neurology)"
                      value={formData.education}
                      onChange={(e) =>
                        setFormData({ ...formData, education: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="regNum">Doctor Registration Number</Label>
                    <Input
                      id="regNum"
                      placeholder="Reg No (will be verified by Admin)"
                      value={formData.doctorRegistrationNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, doctorRegistrationNumber: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Patient-only fields */}
            {formData.userType === "patient" && (
              <div className="p-4 bg-green-50 rounded-lg space-y-4 border border-green-100 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="font-bold text-green-800">Medical History (Optional)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Known Diagnosis</Label>
                    <Input
                      id="diagnosis"
                      placeholder="Any existing conditions..."
                      value={formData.diagnosis}
                      onChange={(e) =>
                        setFormData({ ...formData, diagnosis: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Current Symptoms</Label>
                    <Textarea
                      id="symptoms"
                      placeholder="Describe what you're feeling..."
                      value={formData.symptoms}
                      onChange={(e) =>
                        setFormData({ ...formData, symptoms: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meds">Current Medications</Label>
                    <Input
                      id="meds"
                      placeholder="List your daily medications..."
                      value={formData.currentMedications}
                      onChange={(e) =>
                        setFormData({ ...formData, currentMedications: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-12 shadow-md transition-all active:scale-95" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              Login here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
