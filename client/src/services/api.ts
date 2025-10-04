// services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://10.7.4.108:8000'; // Adjust this to your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API interfaces
export interface SignupRequest {
  name: string;
  email: string;
}

export interface LoginRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  message: string;
  status: number;
  account_id: string;
}

export interface VerifyResponse {
  access_token: string;
  token_type: string;
}

// API functions
export const createUser = async (data: SignupRequest) => {
  const response = await api.post<AuthResponse>('/signup', data);
  return response;
};

export const login = async (data: LoginRequest) => {
  const response = await api.post<AuthResponse>('/login', data);
  return response;
};

export const verifySignup = async (data: VerifyOTPRequest) => {
  const response = await api.post<VerifyResponse>('/verify-signup', data);
  return response;
};

export const verifyLogin = async (data: VerifyOTPRequest) => {
  const response = await api.post<VerifyResponse>('/verify-login', data);
  return response;
};

// Function to resend OTP (reuses signup/login endpoints)
export const resendOTP = async (email: string, formType: 'signup' | 'login') => {
  if (formType === 'signup') {
    // For signup, we need the name, but since we're resending, we'll use a placeholder
    // You might want to store the original name or modify your backend to handle resend
    const response = await api.post<AuthResponse>('/signup', { name: 'Resend', email });
    return response;
  } else {
    const response = await api.post<AuthResponse>('/login', { email });
    return response;
  }
};

export default api;