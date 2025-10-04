import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form"
import { Input } from "../components/ui/input"
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {createUser, login, type AuthResponse} from "@/services/api.ts";
import OTPModal from "@/components/OTPModal.tsx";
import type {AxiosResponse} from "axios";


type formType = 'signin' | 'signup';

// Create a function to generate the schema based on the form type
const AuthFormSchema = (type: formType) => {
  return z.object({
    FullName: type === 'signup' ? z.string().min(2).max(50) : z.string().optional(),
    Email: z.string().email(),
  })
}

const AuthForm = ({type}: {type: formType}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [accountData, setAccountData] = useState<{
        accountId: string,
        email: string,
        fullName?: string
    } | null>(null);

    const navigate = useNavigate();

    const formSchema = AuthFormSchema(type);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            FullName: "",
            Email: "",
        },
    });

    // Submit handler
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        setErrorMessage('');
        
        try {
            let user: AxiosResponse<AuthResponse>;
            
            if (type === 'signup' && values.FullName) {
                user = await createUser({
                    name: values.FullName,
                    email: values.Email
                });
            } else {
                user = await login({
                    email: values.Email,
                });
            }

            // Set account data to show OTP modal
            setAccountData({
                accountId: user.data.account_id,
                email: values.Email,
                fullName: values.FullName
            });

        } catch (error: any) {
            console.error('Auth error:', error);
            
            // Handle specific error messages from backend
            if (error.response?.data?.detail) {
                setErrorMessage(error.response.data.detail);
            } else if (error.response?.status === 404 && type === 'signin') {
                setErrorMessage("Account not found. Please sign up first.");
            } else if (error.response?.status === 403) {
                setErrorMessage("Email not verified. Please complete signup first.");
            } else if (error.response?.status === 400) {
                setErrorMessage("User already exists. Please try logging in.");
            } else {
                setErrorMessage(`Failed to ${type === 'signup' ? 'create account' : 'sign in'}. Please try again.${error}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle successful OTP verification
    const handleOTPSuccess = (token: string) => {
        console.log('Authentication successful, token:', token);
        navigate('/dashboard');
    };

    // Handle OTP modal close
    const handleOTPClose = () => {
        setAccountData(null);
    };

    return (
        <>
            {/* Sign In / Sign Up toggle buttons */}
            <div className="flex gap-2 mb-8 bg-gray-100 rounded-xl p-1">
                <Link
                    to="/signin"
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all text-center ${
                        type === 'signin'
                            ? 'bg-white text-purple-600 shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Sign In
                </Link>
                <Link
                    to="/signup"
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all text-center ${
                        type === 'signup'
                            ? 'bg-white text-purple-600 shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Sign Up
                </Link>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {type === 'signin' ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="text-gray-600 mb-8">
                {type === 'signin'
                    ? 'Enter your email to access your account'
                    : 'Sign up to start discovering amazing projects'}
            </p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {type === 'signup' && (
                        <FormField
                            control={form.control}
                            name="FullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="block text-sm font-medium text-gray-700">
                                        Full Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Enter your full name" 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-500 text-sm mt-1"/>
                                </FormItem>
                            )}
                        />
                    )}
                    
                    <FormField
                        control={form.control}
                        name="Email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="block text-sm font-medium text-gray-700">
                                    Email
                                </FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="Enter your email" 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage className="text-red-500 text-sm mt-1"/>
                            </FormItem>
                        )}
                    />
                    
                    {errorMessage && (
                        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                            {errorMessage}
                        </p>
                    )}
                    
                    <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3.5 rounded-xl font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {type === 'signin' ? 'Sign In' : 'Sign Up'}
                        {isLoading && (
                            <img 
                                src="/assets/icons/loader.svg" 
                                alt="loader" 
                                width={24} 
                                height={24} 
                                className="ml-2 animate-spin"
                            />
                        )}
                    </Button>

                    <div className="text-center text-sm text-gray-600">
                        {type === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                        {' '}
                        <Link 
                            to={type === 'signin' ? '/signup' : '/signin'} 
                            className="text-purple-600 hover:text-purple-700 font-semibold"
                        >
                            {type === 'signin' ? 'Sign Up' : 'Sign In'}
                        </Link>
                    </div>
                </form>
            </Form>

            {/* OTP Modal */}
            {accountData && (
                <OTPModal 
                    Email={accountData.email}
                    AccountId={accountData.accountId}
                    formtype={type}
                    fullName={accountData.fullName}
                    onSuccess={(token) => {
                        console.log('Auth successful with token:', token);
                        navigate('/dashboard');
                    }}
                    onClose={handleOTPClose}
                />
            )}
        </>
    );
};

export default AuthForm;