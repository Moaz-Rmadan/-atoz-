// System User Roles in Kafrawy Super App
export type AppRole = 'customer' | 'driver' | 'provider' | 'merchant' | 'employer' | 'admin';

// Account Verification Status
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// System Permissions
export type AppPermission =
  | 'services:read'
  | 'services:request'
  | 'services:fulfill'
  | 'rides:request'
  | 'rides:accept'
  | 'jobs:post'
  | 'jobs:apply'
  | 'marketplace:buy'
  | 'marketplace:sell'
  | 'admin:all';

// User Profile Model
export interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  roles: AppRole[];
  permissions: AppPermission[];
}

// Authentication State
export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Registration Payload
export interface SignUpPayload {
  email: string;
  password?: string;
  fullName: string;
  phoneNumber?: string;
  role?: AppRole;
}

// Login Payload
export interface SignInPayload {
  email: string;
  password?: string;
}

// Notification Preferences Model
export interface NotificationPreferences {
  profile_id: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  promotional_enabled: boolean;
  updated_at?: string;
}
