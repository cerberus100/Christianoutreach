import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import { 
  UserIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
}

export default function AdminLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Login successful!');
        
        // Store auth token
        localStorage.setItem('adminToken', result.data.token);
        
        // Redirect to dashboard
        router.push('/admin/dashboard');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login - Health Screening System</title>
        <meta name="description" content="Admin login for health screening management system" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen trust-gradient flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <HeartIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gradient">
              Admin Portal
            </h2>
            <p className="mt-2 text-sm text-trust-600">
              Health Screening Management System
            </p>
          </div>

          {/* Login Form */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-center mb-6">
                <ShieldCheckIcon className="h-6 w-6 text-primary-600 mr-2" />
                <span className="text-lg font-medium text-trust-900">Secure Login</span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="form-label">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-trust-400" />
                    </div>
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Please enter a valid email address',
                        },
                      })}
                      className={`form-input pl-10 ${errors.email ? 'form-input-error' : ''}`}
                      placeholder="admin@yourorganization.org"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="form-error">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-trust-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                      className={`form-input pl-10 pr-10 ${errors.password ? 'form-input-error' : ''}`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-trust-400 hover:text-trust-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-trust-400 hover:text-trust-600" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="form-error">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner mr-2" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                        Sign in to Dashboard
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-trust-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-trust-500">Security Notice</span>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs text-trust-500">
                    This is a secure area for authorized personnel only. 
                    All access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Credentials Notice (remove in production) */}
          <div className="card bg-health-50 border-health-200">
            <div className="card-body">
              <div className="text-center">
                <h3 className="text-sm font-medium text-health-800 mb-2">
                  Demo Credentials
                </h3>
                <div className="text-xs text-health-600 space-y-1">
                  <p><strong>Email:</strong> admin@demo.org</p>
                  <p><strong>Password:</strong> demo123</p>
                </div>
                <p className="text-xs text-health-500 mt-2">
                  (Remove this section in production)
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-trust-500">
              © 2024 Health Screening System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 