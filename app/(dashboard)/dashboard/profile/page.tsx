"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  Save,
  Loader2,
  UserCircle,
  Calendar,
  Moon,
  Sun,
  Settings,
  ImagePlus,
  Camera,
  Upload,
  X,
} from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, string | number | null | undefined>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const avatarStorageKey = session?.user?.id
    ? `healthcare-profile-image:${session.user.id}`
    : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const savedCompact = localStorage.getItem("compact-mode");
    const savedFast = localStorage.getItem("fast-mode");

    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    if (savedCompact === "true") {
      setCompactMode(true);
    }
    if (savedFast === "true") {
      setFastMode(true);
      document.documentElement.classList.add("fast-ui");
    }

    // Legacy key cleanup to avoid cross-user image leak.
    localStorage.removeItem("healthcare-profile-image");
  }, []);

  useEffect(() => {
    if (!avatarStorageKey) return;
    const savedImage = localStorage.getItem(avatarStorageKey);
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, [avatarStorageKey]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load profile");
        return;
      }
      setProfile(data || {});
      if (data?.profileImage) {
        setProfileImage(data.profileImage);
        if (avatarStorageKey) localStorage.setItem(avatarStorageKey, data.profileImage);
      } else {
        if (avatarStorageKey) localStorage.removeItem(avatarStorageKey);
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [avatarStorageKey]);

  useEffect(() => {
    if (session?.user) {
      loadProfile();
    }
  }, [session, loadProfile]);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleCompact = (checked: boolean) => {
    setCompactMode(checked);
    localStorage.setItem("compact-mode", checked ? "true" : "false");
  };

  const toggleFastMode = (checked: boolean) => {
    setFastMode(checked);
    localStorage.setItem("fast-mode", checked ? "true" : "false");
    document.documentElement.classList.toggle("fast-ui", checked);
    window.dispatchEvent(new Event("fast-mode-updated"));
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const saveAvatarLocal = (url: string) => {
    setProfileImage(url);
    if (avatarStorageKey) localStorage.setItem(avatarStorageKey, url);
    window.dispatchEvent(new Event("profile-image-updated"));
  };

  const uploadAvatarDataUrl = async (dataUrl: string) => {
    setUploadingImage(true);
    try {
      const res = await fetch("/api/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Image upload failed");
        return false;
      }
      saveAvatarLocal(data.url);
      return true;
    } catch {
      toast.error("Image upload failed");
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeAvatar = async () => {
    setUploadingImage(true);
    try {
      const res = await fetch("/api/profile/image", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to remove image");
        return;
      }
      setProfileImage("");
      if (avatarStorageKey) localStorage.removeItem(avatarStorageKey);
      window.dispatchEvent(new Event("profile-image-updated"));
      toast.success("Profile image removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setUploadingImage(false);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      toast.error("Unable to open camera");
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    stopCamera();
    setCameraOpen(false);
    uploadAvatarDataUrl(dataUrl).then((ok) => {
      if (ok) toast.success("Photo captured");
    });
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large. Max 4MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const ok = await uploadAvatarDataUrl(dataUrl);
      if (ok) toast.success("Profile image selected");
    } catch {
      toast.error("Failed to read image");
    }
    e.currentTarget.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...profile,
        profileImage,
      };
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        await update();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const userType = session?.user?.userType;
  const userName = String(profile?.name || session?.user?.email || "User");
  const initials = userName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div
        className="rounded-3xl p-8 border border-blue-100"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(239,246,255,0.96), rgba(255,255,255,0.9)), url('https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=60')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <User className="h-10 w-10 text-blue-600" /> Profile Settings
        </h1>
        <p className="text-gray-600 text-lg mt-2">Manage profile details and common app settings.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-12 p-1 rounded-xl bg-slate-100">
          <TabsTrigger value="profile" className="font-black">
            Profile Settings
          </TabsTrigger>
          <TabsTrigger value="common" className="font-black">
            Common Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b p-8">
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <ImagePlus className="h-6 w-6 text-blue-600" /> Profile Image
                </CardTitle>
                <CardDescription>Select a profile image and save changes.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-blue-100">
                    {profileImage ? <AvatarImage src={profileImage} alt={userName} /> : null}
                    <AvatarFallback className="bg-blue-600 text-white font-black text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload File
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={uploadingImage}
                      onClick={openCamera}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Open Camera
                    </Button>
                    {profileImage && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                        disabled={uploadingImage}
                        onClick={removeAvatar}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>

                {cameraOpen && (
                  <div className="space-y-4 p-4 border rounded-2xl bg-slate-50">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-w-md rounded-xl border bg-black"
                    />
                    <div className="flex gap-3">
                      <Button type="button" className="rounded-xl" onClick={captureFromCamera} disabled={uploadingImage}>
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Capture Photo"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          stopCamera();
                          setCameraOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b p-8">
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <User className="h-6 w-6 text-blue-600" /> Personal Information
                </CardTitle>
                <CardDescription>Update account and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={profile?.name || ""}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="pl-10 h-12 border-2 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={session?.user?.email || ""} disabled className="pl-10 h-12 border-2 rounded-xl bg-gray-50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={profile?.mobileNo || profile?.contact || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            mobileNo: e.target.value,
                            contact: e.target.value,
                          })
                        }
                        className="pl-10 h-12 border-2 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Gender</Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={String(profile?.gender || "")} onValueChange={(val) => setProfile({ ...profile, gender: val })}>
                        <SelectTrigger className="pl-10 h-12 border-2 rounded-xl">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Age</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={profile?.age || ""}
                        onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                        className="pl-10 h-12 border-2 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-gray-400">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={profile?.address || ""}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="pl-10 h-12 border-2 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(userType === "patient" || userType === "doctor" || userType === "medicalist") && (
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden border-t-8 border-t-orange-500">
                <CardHeader className="bg-orange-50/70 border-b p-8">
                  <CardTitle className="text-2xl font-black flex items-center gap-2 text-orange-900">
                    <IndianRupee className="h-6 w-6 text-orange-600" /> Payment Details
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Update UPI ID to send and receive payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <Label className="text-xs font-black uppercase text-orange-400">UPI ID</Label>
                  <Input
                    placeholder="e.g. name@okicici"
                    value={profile?.upiId || ""}
                    onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                    className="h-14 text-lg font-bold border-2 border-orange-100 rounded-xl mt-2"
                  />
                  <p className="text-xs text-orange-700 mt-2 font-medium">
                    Required for checkout verification flows.
                  </p>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 font-black text-xl rounded-2xl shadow-xl shadow-blue-100 gap-3"
            >
              {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
              Save Profile
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="common" className="space-y-8">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gray-50/70 border-b p-8">
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" /> Common Settings
              </CardTitle>
              <CardDescription>Control app behavior for speed and readability.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDarkMode ? "bg-slate-800 text-yellow-400" : "bg-blue-100 text-blue-600"}`}>
                    {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Dark Mode</p>
                    <p className="text-xs text-gray-500 font-medium">Switch between light and dark appearance.</p>
                  </div>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Compact Mode</p>
                    <p className="text-xs text-gray-500 font-medium">Use denser cards and reduced spacing for faster scanning.</p>
                  </div>
                </div>
                <Switch checked={compactMode} onCheckedChange={toggleCompact} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-orange-100 text-orange-700">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Fast Navigation Mode</p>
                    <p className="text-xs text-gray-500 font-medium">Reduces animations and speeds up route transitions.</p>
                  </div>
                </div>
                <Switch checked={fastMode} onCheckedChange={toggleFastMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
