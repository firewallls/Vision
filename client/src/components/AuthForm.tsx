import React, { useState } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail, User, Loader2, Github } from 'lucide-react';

// --- Mock API Service ---
// In a real application, this would be in a separate services/api.ts file.
// For this component, we'll simulate the API calls.
export interface AuthResponse {
    account_id: string;
    message: string;
}

const createUser = (data: { name: string; email: string }): Promise<{ data: AuthResponse }> => {
    console.log("Mock API: Creating user...", data);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (data.email.includes("exists")) {
                // Simulate user already exists error
                const error: any = new Error("User already exists.");
                error.response = { status: 400, data: { detail: "User with this email already exists. Please try logging in." } };
                reject(error);
            } else {
                resolve({
                    data: {
                        account_id: `acc_${Date.now()}`,
                        message: "Account created. Please verify your email.",
                    },
                });
            }
        }, 1000);
    });
};

const login = (data: { email: string }): Promise<{ data: AuthResponse }> => {
    console.log("Mock API: Logging in user...", data);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (data.email.includes("notfound")) {
                 // Simulate user not found error
                 const error: any = new Error("Account not found.");
                 error.response = { status: 404, data: { detail: "Account not found. Please sign up first." } };
                 reject(error);
            } else {
                resolve({
                    data: {
                        account_id: `acc_${Date.now()}`,
                        message: "Login successful. Please enter OTP.",
                    },
                });
            }
        }, 1000);
    });
};

// --- OTP Modal Component ---
const OTPModal = ({ Email, AccountId, formtype, onSuccess, onClose }: {
    Email: string,
    AccountId: string,
    formtype: 'signin' | 'signup',
    fullName?: string | null,
    onSuccess: (token: string) => void,
    onClose: () => void
}) => {
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        setIsVerifying(true);
        setError('');
        console.log(`Verifying OTP ${otp} for account ${AccountId}`);
        // Simulate OTP verification API call
        setTimeout(() => {
            if (otp === "123456") {
                onSuccess(`fake-jwt-token-for-${AccountId}`);
            } else {
                setError("Invalid OTP. Please try again.");
            }
            setIsVerifying(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-slate-800 border-2 border-slate-700 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Check your email</h2>
                <p className="text-slate-400 mb-6">We've sent a 6-digit code to <span className="font-semibold text-[#FFB578]">{Email}</span></p>
                <div className="space-y-4">
                     <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full text-center tracking-[0.5em] text-lg bg-slate-900 border-2 border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#E65447]/20 focus:border-[#E65447] transition-all duration-300 p-4"
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        onClick={handleVerify}
                        disabled={isVerifying || otp.length < 6}
                        className="w-full bg-gradient-to-r from-[#E65447] to-[#FF8559] text-white py-3.5 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isVerifying ? <Loader2 className="animate-spin" /> : 'Verify'}
                    </button>
                </div>
                 <button onClick={onClose} className="text-slate-500 hover:text-slate-300 mt-4 text-sm font-semibold">
                    Cancel
                </button>
            </div>
        </div>
    );
};


// --- Main Auth Form Component ---
type formType = 'signin' | 'signup';

// Zod schema generator
const AuthFormSchema = (type: formType) => {
    return z.object({
        FullName: type === 'signup' ? z.string().min(2, { message: "Name must be at least 2 characters." }).max(50) : z.string().optional(),
        Email: z.string().email({ message: "Please enter a valid email." }),
    })
}

const AuthForm = ({ type }: { type: formType }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [accountData, setAccountData] = useState<{
        accountId: string,
        email: string,
        fullName?: string
    } | null>(null);

    // In a real app, useNavigate would be used for routing.
    // const navigate = useNavigate();

    const formSchema = AuthFormSchema(type);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            FullName: "",
            Email: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            let user: { data: AuthResponse };
            if (type === 'signup' && values.FullName) {
                user = await createUser({ name: values.FullName, email: values.Email });
            } else {
                user = await login({ email: values.Email });
            }
            setAccountData({ accountId: user.data.account_id, email: values.Email, fullName: values.FullName });
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            setErrorMessage(detail || `Failed to ${type}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPSuccess = (token: string) => {
        console.log('Authentication successful, token:', token);
        alert("Login successful! Redirecting to dashboard...");
        // navigate('/dashboard');
        window.location.href = '/dashboard'; // Simple redirect
    };

    return (
        <div className="min-h-screen bg-slate-900 font-['DM_Sans',_sans_serif] text-slate-300 flex items-center justify-center p-4 relative overflow-hidden">
             {/* Background Gradient Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#FF8559]/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#E65447]/20 rounded-full blur-3xl animate-pulse"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-800/80 backdrop-blur-md border-2 border-slate-700 rounded-3xl p-8 shadow-2xl">
                    <div className="flex gap-2 mb-8 bg-slate-900 rounded-xl p-1">
                        <a href="#/signin" className={`flex-1 py-3 rounded-lg font-semibold transition-all text-center ${type === 'signin' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            Sign In
                        </a>
                        <a href="#/signup" className={`flex-1 py-3 rounded-lg font-semibold transition-all text-center ${type === 'signup' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            Sign Up
                        </a>
                    </div>

                    <h2 className="text-3xl font-bold text-slate-100 mb-2">
                        {type === 'signin' ? 'Welcome Back!' : 'Create Account'}
                    </h2>
                    <p className="text-slate-400 mb-8">
                        {type === 'signin' ? 'Enter your email to access your account' : 'Sign up to start discovering amazing projects'}
                    </p>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        {type === 'signup' && (
                             <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input {...form.register("FullName")} placeholder="Enter your full name"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#E65447]/20 focus:border-[#E65447] transition-all" />
                                </div>
                                {form.formState.errors.FullName && <p className="text-red-400 text-sm mt-2">{form.formState.errors.FullName.message}</p>}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                             <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input {...form.register("Email")} placeholder="Enter your email"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#E65447]/20 focus:border-[#E65447] transition-all" />
                            </div>
                             {form.formState.errors.Email && <p className="text-red-400 text-sm mt-2">{form.formState.errors.Email.message}</p>}
                        </div>

                        {errorMessage && (
                            <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                                {errorMessage}
                            </p>
                        )}

                        <button type="submit" className="w-full bg-gradient-to-r from-[#E65447] to-[#FF8559] text-white py-3.5 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-60" disabled={isLoading}>
                            {isLoading && <Loader2 className="animate-spin" />}
                            {type === 'signin' ? 'Sign In' : 'Sign Up'}
                        </button>

                         <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-700"></div>
                            <span className="flex-shrink mx-4 text-slate-500 text-xs">OR</span>
                            <div className="flex-grow border-t border-slate-700"></div>
                        </div>

                         <button type="button" className="w-full bg-[#24292f] text-white py-3 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                            <Github size={20} />
                            Sign in with GitHub
                        </button>

                        <div className="text-center text-sm text-slate-400">
                            {type === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                            {' '}
                            <a href={type === 'signin' ? '#/signup' : '#/signin'} className="text-[#FF8559] hover:text-[#FFB578] font-semibold">
                                {type === 'signin' ? 'Sign Up' : 'Sign In'}
                            </a>
                        </div>
                    </form>
                </div>
            </div>

            {accountData && (
                <OTPModal
                    Email={accountData.email}
                    AccountId={accountData.accountId}
                    formtype={type}
                    fullName={accountData.fullName}
                    onSuccess={handleOTPSuccess}
                    onClose={() => setAccountData(null)}
                />
            )}
        </div>
    );
};

export default AuthForm;
