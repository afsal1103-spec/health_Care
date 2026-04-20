export type UserType = 'superadmin' | 'doctor' | 'medicalist' | 'patient';

export interface User {
  id: number;
  email: string;
  userType: UserType;
  isActive: boolean;
  createdAt: Date;
}

export interface Patient {
  id: number;
  userId: number;
  patientCode: string;
  name: string;
  mobileNo: string;
  address: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
}

export interface Doctor {
  id: number;
  userId: number;
  doctorCode: string;
  name: string;
  specialist: string;
  contact: string;
  education: string;
  experienceYears?: number;
  consultationFee: number;
  availableDays: string[];
  availableTimeStart: string;
  availableTimeEnd: string;
  rating: number;
  isAvailable: boolean;
}

export interface Appointment {
  id: number;
  appointmentCode: string;
  patientId: number;
  doctorId: number;
  bookedBy: 'patient' | 'system';
  bookedByUserId?: number;
  appointmentDate: Date;
  appointmentTime: string;
  symptoms?: string;
  diseaseCategory?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  notes?: string;
  patientName?: string;
  doctorName?: string;
  doctorSpecialist?: string;
}

export interface Consultation {
  id: number;
  appointmentId?: number;
  patientId: number;
  doctorId: number;
  consultationDate: Date;
  diagnosis: string;
  symptomsObserved?: string;
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  diabetesReading?: number;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  prescriptions?: Prescription[];
}

export interface Prescription {
  id: number;
  consultationId: number;
  prescriptionCode: string;
  medicationName: string;
  dosage: string;
  duration?: string;
  instructions?: string;
  isActive: boolean;
}

export interface Transaction {
  id: number;
  transactionCode: string;
  patientId: number;
  doctorId?: number;
  appointmentId?: number;
  consultationId?: number;
  type: 'consultation' | 'medication' | 'lab_test' | 'other';
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'upi' | 'insurance' | 'online';
  description?: string;
  transactionDate: Date;
}

export interface PageAccess {
  [key: string]: UserType[];
}

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  roles: UserType[];
  children?: MenuItem[];
}