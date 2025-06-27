export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  userType: 'client' | 'fourmiz';
  isVerified: boolean;
  rating: number;
  totalOrders: number;
  createdAt: Date;
  referralCode: string;
  referredBy?: string;
  wallet: Wallet;
  availability?: FourmizAvailability;
}

export interface Wallet {
  balance: number;
  directCommissions: number;
  indirectCommissions: number;
  referralEarnings: number;
  totalEarnings: number;
}

export interface FourmizAvailability {
  isAvailable: boolean;
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  radius: number; // en km
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  services: Service[];
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  isEligibleTaxCredit: boolean;
  estimatedDuration: number; // en minutes
  requiresDeposit: boolean;
  requiredFields: FormField[];
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'time' | 'location';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface Order {
  id: string;
  clientId: string;
  fourmizId?: string;
  serviceId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  details: Record<string, any>;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduledTime: Date;
  budget: number;
  totalAmount: number;
  createdAt: Date;
  completedAt?: Date;
  rating?: number;
  review?: string;
}

export interface Chat {
  id: string;
  orderId: string;
  participants: string[];
  messages: Message[];
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'location';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'referral' | 'system';
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  monthlyEarnings: number;
  referralTree: ReferralNode[];
}

export interface ReferralNode {
  userId: string;
  userName: string;
  level: number;
  earnings: number;
  referrals: ReferralNode[];
}