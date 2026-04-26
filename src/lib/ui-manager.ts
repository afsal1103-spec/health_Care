import { UserType, PageAccess, MenuItem } from "@/types";

export const pageAccess: PageAccess = {
  "/dashboard/admin": ["superadmin"],
  "/dashboard/admin/users": ["superadmin"],
  "/dashboard/admin/doctors": ["superadmin"],
  "/dashboard/admin/reports": ["superadmin"],
  "/dashboard/admin/patients": ["superadmin"],
  "/dashboard/admin/medicals": ["superadmin"],
  "/dashboard/admin/medicalists": ["superadmin"],
  "/dashboard/admin/appointments": ["superadmin"],
  "/dashboard/admin/transactions": ["superadmin"],
  "/dashboard/patient/doctors": ["patient"],
  "/dashboard/patient/nearby-doctors": ["patient"],
  "/dashboard/patient/medicals": ["patient"],
  "/dashboard/patient/consultation": ["patient"],
  "/dashboard/profile": ["patient", "doctor", "medicalist", "superadmin"],
  "/dashboard/settings": ["patient", "doctor", "medicalist", "superadmin"],
  "/dashboard/dashboard/profile": ["patient", "doctor", "medicalist", "superadmin"],
  "/dashboard/dashboard/settings": ["patient", "doctor", "medicalist", "superadmin"],

  "/dashboard/patient": ["patient"],
  "/dashboard/patient/appointments": ["patient"],
  "/dashboard/patient/book-appointment": ["patient"],
  "/dashboard/patient/history": ["patient"],
  "/dashboard/patient/transactions": ["patient"],

  "/dashboard/doctor": ["doctor"],
  "/dashboard/doctor/appointments": ["doctor"],
  "/dashboard/doctor/consultation": ["doctor"],
  "/dashboard/doctor/patients": ["doctor"],
  "/dashboard/doctor/history": ["doctor"],

  "/dashboard/medicalist": ["medicalist"],
  "/dashboard/medicalist/patient-search": ["medicalist"],
  "/dashboard/medicalist/prescriptions": ["medicalist"],
};

export const menuItems: MenuItem[] = [
  {
    key: "admin-dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard/admin",
    roles: ["superadmin"],
  },
  {
    key: "admin-patients",
    label: "Patients Master",
    icon: "Users",
    path: "/dashboard/admin/patients",
    roles: ["superadmin"],
  },
  {
    key: "admin-doctors",
    label: "Doctors Master",
    icon: "Stethoscope",
    path: "/dashboard/admin/doctors",
    roles: ["superadmin"],
  },
  {
    key: "admin-medicals",
    label: "Medical List",
    icon: "Building2",
    path: "/dashboard/admin/medicals",
    roles: ["superadmin"],
  },
  {
    key: "admin-medicalists",
    label: "Medicalist Verification",
    icon: "ShieldCheck",
    path: "/dashboard/admin/medicalists",
    roles: ["superadmin"],
  },
  {
    key: "admin-appointments",
    label: "Master Schedule",
    icon: "Calendar",
    path: "/dashboard/admin/appointments",
    roles: ["superadmin"],
  },
  {
    key: "admin-transactions",
    label: "Verify Payments",
    icon: "IndianRupee",
    path: "/dashboard/admin/transactions",
    roles: ["superadmin"],
  },
  {
    key: "patient-dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard/patient",
    roles: ["patient"],
  },
  {
    key: "patient-nearby-doctors",
    label: "Nearby Doctors",
    icon: "MapPin",
    path: "/dashboard/patient/nearby-doctors",
    roles: ["patient"],
  },
  {
    key: "patient-medicals",
    label: "Nearby Medicals",
    icon: "Building2",
    path: "/dashboard/patient/medicals",
    roles: ["patient"],
  },
  {
    key: "book-appointment",
    label: "Book Appointment",
    icon: "CalendarPlus",
    path: "/dashboard/patient/book-appointment",
    roles: ["patient"],
  },
  {
    key: "my-appointments",
    label: "My Appointments",
    icon: "Calendar",
    path: "/dashboard/patient/appointments",
    roles: ["patient"],
  },
  {
    key: "medical-history",
    label: "Medical History",
    icon: "FileText",
    path: "/dashboard/patient/history",
    roles: ["patient"],
  },
  {
    key: "patient-transactions",
    label: "Transactions",
    icon: "CreditCard",
    path: "/dashboard/patient/transactions",
    roles: ["patient"],
  },
  {
    key: "doctor-dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard/doctor",
    roles: ["doctor"],
  },
  {
    key: "doctor-appointments",
    label: "Appointments",
    icon: "Calendar",
    path: "/dashboard/doctor/appointments",
    roles: ["doctor"],
  },
  {
    key: "doctor-patients",
    label: "My Patients",
    icon: "Users",
    path: "/dashboard/doctor/patients",
    roles: ["doctor"],
  },
  {
    key: "doctor-history",
    label: "Consultation History",
    icon: "History",
    path: "/dashboard/doctor/history",
    roles: ["doctor"],
  },
  {
    key: "medicalist-dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard/medicalist",
    roles: ["medicalist"],
  },
  {
    key: "medicalist-patient-search",
    label: "Patient Search",
    icon: "Search",
    path: "/dashboard/medicalist/patient-search",
    roles: ["medicalist"],
  },
  {
    key: "dispense-medications",
    label: "Stock & Dispense",
    icon: "Pill",
    path: "/dashboard/medicalist/prescriptions",
    roles: ["medicalist"],
  },
  {
    key: "profile",
    label: "Profile Settings",
    icon: "User",
    path: "/dashboard/profile",
    roles: ["patient", "doctor", "medicalist", "superadmin"],
  },
  {
    key: "common-settings",
    label: "Common Settings",
    icon: "Settings",
    path: "/dashboard/settings",
    roles: ["patient", "doctor", "medicalist", "superadmin"],
  },
];

export function hasPageAccess(path: string, userType: UserType): boolean {
  if (pageAccess[path]?.includes(userType)) return true;

  for (const [pagePath, roles] of Object.entries(pageAccess)) {
    if (path.startsWith(pagePath) && roles.includes(userType)) {
      return true;
    }
  }

  return false;
}

export function getMenuItems(userType: UserType): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(userType));
}

export const uiHelpers = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  },

  formatDate: (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },

  formatTime: (time: string): string => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  generateCode: (prefix: string, id: number): string => {
    return `${prefix}-${String(id).padStart(6, "0")}`;
  },

  getStatusColor: (status: string): string => {
    const colors: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  },

  validatePhone: (phone: string): boolean => {
    return /^[6-9]\d{9}$/.test(phone);
  },

  validateEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
};

// Role → default home route
export const roleHome: Record<UserType, string> = {
  superadmin: "/dashboard/admin",
  patient: "/dashboard/patient",
  doctor: "/dashboard/doctor",
  medicalist: "/dashboard/medicalist",
};

export function roleHomePath(userType: UserType): string {
  return roleHome[userType] ?? "/login";
}

// Page keys for quick lookup (path → menu key)
export const pageKeys: Record<string, string> = {
  "/dashboard/patient": "patient-dashboard",
  "/dashboard/patient/doctors": "patient-doctors",
  "/dashboard/patient/nearby-doctors": "patient-nearby-doctors",
  "/dashboard/patient/medicals": "patient-medicals",
  "/dashboard/patient/book-appointment": "book-appointment",
  "/dashboard/patient/appointments": "my-appointments",
  "/dashboard/patient/history": "medical-history",
  "/dashboard/patient/transactions": "patient-transactions",
  "/dashboard/profile": "profile",
  "/dashboard/settings": "common-settings",

  "/dashboard/admin/medicals": "admin-medicals",

  "/dashboard/doctor": "doctor-dashboard",
  "/dashboard/doctor/appointments": "doctor-appointments",
  "/dashboard/doctor/consultation": "consultation",
  "/dashboard/doctor/patients": "doctor-patients",
  "/dashboard/doctor/history": "doctor-history",

  "/dashboard/medicalist": "medicalist-dashboard",
  "/dashboard/medicalist/patient-search": "medicalist-patient-search",
  "/dashboard/medicalist/prescriptions": "dispense-medications",
};

export function activeMenuKeyFor(pathname: string): string | null {
  // choose the longest matching path prefix in pageKeys for nested routes
  const matches = Object.keys(pageKeys).filter((k) => pathname.startsWith(k));
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length);
  return pageKeys[matches[0]];
}
