"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Users,
  Shield,
  ArrowRight,
  Zap,
  Heart,
  Clock,
  Star,
  CheckCircle,
  MapPin,
  PhoneCall,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden selection:bg-blue-500/30">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      <header className="border-b border-white/5 backdrop-blur-md fixed w-full z-50 bg-[#020617]/50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">Telemedicine</span>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Services</Link>
            <Link href="#" className="hover:text-white transition-colors">Specialists</Link>
            <Link href="#" className="hover:text-white transition-colors">How it works</Link>
          </div>

          <div className="flex gap-4">
            <Link href="/login" prefetch>
              <Button variant="ghost" className="text-white font-bold text-xs uppercase tracking-widest hover:bg-white/5">
                Login
              </Button>
            </Link>
            <Link href="/signup" prefetch>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-blue-600/20 rounded-xl">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-48 pb-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Badge className="mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20 py-1.5 px-4 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse">
                <Clock className="h-3 w-3 mr-2" /> Just In 30 Mins
              </Badge>

              <h1 className="text-6xl md:text-7xl font-black leading-[0.95] tracking-tighter mb-8">
                Your Wellness Is <br />
                <span className="text-blue-500 italic">Just A Call Away</span>
              </h1>

              <p className="text-lg text-gray-400 mb-10 max-w-xl font-medium leading-relaxed">
                Experience premium medical care at your doorstep. 24/7 access to certified doctors, nurses, and specialists without leaving your home.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Link href="/signup" prefetch>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-16 px-10 rounded-2xl shadow-2xl shadow-blue-600/30 w-full sm:w-auto">
                    Instant Appointment
                    <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <div className="flex items-center gap-4 px-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl h-16 group cursor-pointer hover:bg-white/10 transition-all">
                   <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                      <PhoneCall className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">24/7 Helpline</p>
                      <p className="text-sm font-black">+1 (800) HEALTH</p>
                   </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 mt-16">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 w-10 rounded-full border-2 border-[#020617] bg-slate-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://images.unsplash.com/photo-${[
                          '1537368910025-700350fe46c7',
                          '1570295999919-56ceb5ecca61',
                          '1580489944761-15a19d654956',
                          '1507003211169-0a1dd7228f2d'
                        ][i-1]}?auto=format&fit=crop&w=100&h=100&q=80`} alt="user" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-orange-500 mb-0.5">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">500+ Happy Patients</p>
                  </div>
                </div>
                
                <div className="h-12 w-px bg-white/10 hidden sm:block" />

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tighter">DHA Certified</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Medical Professionals</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 p-4 bg-gradient-to-br from-blue-600/20 to-transparent rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-[0_0_100px_rgba(37,99,235,0.1)] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=1200&auto=format&fit=crop"
                  className="rounded-[2.5rem] w-full h-[600px] object-cover shadow-2xl relative z-0"
                  alt="Doctor at home"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1200&auto=format&fit=crop";
                  }}
                />
                
                {/* Floating UI Elements */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-10 top-1/4 bg-[#020617] border border-white/10 p-5 rounded-2xl shadow-2xl backdrop-blur-xl hidden md:block"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Health Score</p>
                      <p className="text-2xl font-black text-white tracking-tighter">98.4%</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-8 bottom-1/4 bg-blue-600 p-6 rounded-3xl shadow-2xl shadow-blue-600/40 hidden md:block"
                >
                  <p className="text-white font-black text-2xl tracking-tighter mb-1">30 MINS</p>
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Average Arrival</p>
                </motion.div>
              </div>

              {/* Glowing ring behind image */}
              <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full -z-10 opacity-50" />
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-32 border-t border-white/5">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-white/5 text-gray-400 border-white/10 py-1 px-4 rounded-full font-black text-[10px] uppercase tracking-[0.3em]">
              Premium Services
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Why Choose Our Care?</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Feature 
              icon={<Zap className="h-6 w-6" />} 
              title="Quick & Safe" 
              desc="Evidence-based medical practices with a patient-centric approach." 
            />
            <Feature 
              icon={<Users className="h-6 w-6" />} 
              title="Multi-lingual" 
              desc="Experienced, internationally certified staff speaking your language." 
            />
            <Feature 
              icon={<Shield className="h-6 w-6" />} 
              title="Trusted Care" 
              desc="DHA & MOH certified doctors available 24x7 at your doorstep." 
            />
            <Feature 
              icon={<CheckCircle className="h-6 w-6" />} 
              title="Compassionate" 
              desc="Delivering care that builds strong relationships and unshakable trust." 
            />
          </div>
        </section>

        {/* CTA Banner */}
        <section className="container mx-auto px-6 pb-32">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-600/20"
          >
            <div className="absolute top-0 right-0 p-20 opacity-10 rotate-12">
              <Activity className="h-64 w-64 text-white" />
            </div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-white leading-tight">
                Ready To Get The Best <br /> Treatment At Home?
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/signup" prefetch>
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-black uppercase tracking-widest text-xs h-16 px-12 rounded-2xl shadow-xl w-full sm:w-auto">
                    Book Now
                  </Button>
                </Link>
                <div className="flex items-center gap-3 text-white/80">
                   <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest">System Online & Active</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer Minimal */}
      <footer className="border-t border-white/5 py-12 bg-[#010413]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-3 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
            <Stethoscope className="h-5 w-5" />
            <span className="text-sm font-black tracking-tighter uppercase italic">Telemedicine</span>
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            © 2026 Telemedicine Platform • Certified Healthcare
          </p>
          <div className="flex gap-6 text-gray-500">
             <MapPin className="h-4 w-4 hover:text-blue-500 transition-colors" />
             <PhoneCall className="h-4 w-4 hover:text-blue-500 transition-colors" />
             <Heart className="h-4 w-4 hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="group bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-xl hover:bg-white/10 hover:border-blue-500/30 transition-all duration-500 shadow-xl"
    >
      <div className="mb-6 text-blue-500 bg-blue-500/10 h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
        {icon}
      </div>
      <h3 className="font-black text-xl mb-4 tracking-tighter">{title}</h3>
      <p className="text-gray-500 group-hover:text-gray-400 text-sm font-medium leading-relaxed transition-colors">{desc}</p>
    </motion.div>
  );
}
