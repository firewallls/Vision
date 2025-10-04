import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button.tsx";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import type { AxiosResponse } from "axios"; // Keep Axios import
import { verifyLogin, verifySignup, resendOTP, type VerifyResponse } from "@/services/api.ts";

interface OTPModalProps {
    Email?: string,
    AccountId?: string | null,
    formtype?: 'signup' | 'signin' | null,
    fullName?: string, // Add fullName for resend functionality
    onSuccess?: (token: string) => void, // Callback for successful verification
    onClose?: () => void // Callback when modal is closed
}

const OTPModal = ({ Email, AccountId, formtype, fullName, onSuccess, onClose }: OTPModalProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        
        if (!Email || !password || password.length !== 6) {
            setErrorMessage("Please enter a valid 6-digit OTP");
            return;
        }

        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            let verify: AxiosResponse<VerifyResponse>; // Keep AxiosResponse type
            
            if (formtype === 'signup') {
                verify = await verifySignup({
                    email: Email,
                    otp: password
                });
            } else {
                verify = await verifyLogin({
                    email: Email,
                    otp: password
                });
            }

            // Success - store token and call success callback
            const token = verify.data.access_token; // Axios: access via .data
            localStorage.setItem('access_token', token);
            localStorage.setItem('token_type', verify.data.token_type);
            
            setSuccessMessage("Verification successful! Redirecting...");
            
            // Call success callback if provided (parent handles navigation to /dashboard)
            if (onSuccess) {
                onSuccess(token);
            }
            
            // Close modal after a short delay
            setTimeout(() => {
                setIsOpen(false);
                if (onClose) onClose();
            }, 1500);

        } catch (error: any) {
            console.log('Failed to verify OTP', error);
            
            // Handle specific error messages from backend (Axios patterns)
            if (error.response?.data?.detail) {
                setErrorMessage(error.response.data.detail);
            } else if (error.response?.status === 401) {
                setErrorMessage("Invalid OTP. Please try again.");
            } else if (error.response?.status === 404) {
                setErrorMessage("User not found. Please sign up first.");
            } else if (error.response?.status === 400) {
                setErrorMessage("Email already verified. Please log in.");
            } else if (error.response?.status === 403) {
                setErrorMessage("Email not verified. Please complete signup first.");
            } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                setErrorMessage("Network error. Please check your connection.");
            } else {
                setErrorMessage(error.response?.data?.message || error.message || "Failed to verify OTP. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!Email) return;
        
        setIsResending(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const formTypeForResend = formtype === 'signup' ? 'signup' : 'login';
            await resendOTP(Email, formTypeForResend);
            setSuccessMessage("OTP resent successfully!");
            setPassword(""); // Clear current OTP input
        } catch (error: any) {
            console.log('Failed to resend OTP', error);
            setErrorMessage(error.response?.data?.detail || error.message || "Failed to resend OTP. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (onClose) onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className='shad-alert-dialog'>
                <AlertDialogHeader className='relative flex justify-center'>
                    <AlertDialogTitle className='h2 text-center'>
                        Enter your OTP
                        <img
                            src='/assets/icons/close-dark.svg'
                            alt='close'
                            width={20}
                            height={24}
                            onClick={handleClose}
                            className='otp-close-button cursor-pointer'
                        />
                    </AlertDialogTitle>
                    <AlertDialogDescription className={'subtitle-2 text-center text-light-100'}>
                        We've sent a code to <span className={'pl-1 text-brand'}>{Email}</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-col items-center space-y-4">
                    <InputOTP 
                        maxLength={6} 
                        value={password} 
                        onChange={setPassword} 
                        pattern={REGEXP_ONLY_DIGITS}
                    >
                        <InputOTPGroup className={'shad-otp'}>
                            <InputOTPSlot index={0} className={'shad-otp-slot'} />
                            <InputOTPSlot index={1} className={'shad-otp-slot'} />
                            <InputOTPSlot index={2} className={'shad-otp-slot'} />
                            <InputOTPSlot index={3} className={'shad-otp-slot'} />
                            <InputOTPSlot index={4} className={'shad-otp-slot'} />
                            <InputOTPSlot index={5} className={'shad-otp-slot'} />
                        </InputOTPGroup>
                    </InputOTP>

                    {/* Error Message */}
                    {errorMessage && (
                        <p className="text-red-500 text-sm text-center">{errorMessage}</p>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <p className="text-green-500 text-sm text-center">{successMessage}</p>
                    )}
                </div>

                <AlertDialogFooter>
                    <div className={'flex w-full gap-4 flex-col'}>
                        <AlertDialogAction 
                            onClick={handleSubmit}
                            className={'shad-submit-btn h-12'}
                            type={'button'}
                            disabled={isLoading || password.length !== 6}
                        >
                            {isLoading ? 'Verifying...' : 'Submit'}
                            {isLoading && (
                                <img 
                                    src={'/assets/icons/loader.svg'}
                                    alt={'loader'}
                                    width={24}
                                    height={24}
                                    className={'ml-2 animate-spin'}
                                />
                            )}
                        </AlertDialogAction>

                        <div className={'subtitle-2 mt-2 text-center text-light-100'}>
                            Didn't get the OTP?
                            <Button 
                                type={'button'}
                                variant='link'
                                className={'pl-1 text-brand'}
                                onClick={handleResendOtp}
                                disabled={isResending}
                            >
                                {isResending ? 'Resending...' : 'Resend OTP'}
                            </Button>
                        </div>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default OTPModal;
