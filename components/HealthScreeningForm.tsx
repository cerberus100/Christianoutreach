'use client'

import React, { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Webcam from 'react-webcam';
import Image from 'next/image';
import { 
  CameraIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  HeartIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { type FormData } from '@/types';
import { collectClientDeviceInfo } from '@/lib/device-tracker';
import toast from 'react-hot-toast';

interface HealthScreeningFormProps {
  churchId: string;
  churchName: string;
  onSuccess?: (submissionId: string) => void;
}

const STEPS = [
  { id: 1, name: 'Personal Info', icon: UserIcon },
  { id: 2, name: 'Photo', icon: CameraIcon },
  { id: 3, name: 'Health Questions', icon: HeartIcon },
  { id: 4, name: 'Additional Info', icon: DocumentTextIcon },
  { id: 5, name: 'Consent', icon: ShieldCheckIcon },
];

export default function HealthScreeningForm({ 
  churchId, 
  churchName, 
  onSuccess 
}: HealthScreeningFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<FormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      email: '',
      selfie: null,
      familyHistoryDiabetes: false,
      familyHistoryHighBP: false,
      familyHistoryDementia: false,
      nerveSymptoms: false,
      sex: 'male',
      cardiovascularHistory: false,
      chronicKidneyDisease: false,
      diabetes: false,
      insuranceType: 'private',
      tcpaConsent: false,
    },
  });

  const capturePhoto = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Always set captured image first - never remove it on errors
      setCapturedImage(imageSrc);
      setShowCamera(false);
      
      // Convert to File object for form submission
      try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        setValue('selfie', file);
        trigger('selfie');
      } catch (error) {
        console.warn('Photo conversion failed, will use data URL fallback:', error);
        // Create a fallback File-like object from the data URL
        try {
          const byteString = atob(imageSrc.split(',')[1]);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], { type: 'image/jpeg' });
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          setValue('selfie', file);
          trigger('selfie');
        } catch (fallbackError) {
          console.error('All photo conversion methods failed:', fallbackError);
          toast.error('Photo processing issue. Please try uploading a file instead.');
          // Keep the visual photo but note the conversion issue
        }
      }
    }
  }, [setValue, trigger]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // File size validation (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      
      // File type validation - only allow image types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }
      
      // File extension validation
      const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
      if (!allowedExtensions.test(file.name)) {
        toast.error('Invalid file extension. Please use .jpg, .png, or .webp files');
        return;
      }
      
      // Additional security: check for suspicious filenames
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        toast.error('Invalid filename. Please choose a different file');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          
          // Basic image signature validation
          if (!result.startsWith('data:image/')) {
            toast.error('Invalid image file. Please try a different file');
            return;
          }
          
          setCapturedImage(result);
          setValue('selfie', file);
          trigger('selfie');
        } catch (error) {
          console.error('Error processing uploaded photo:', error);
          toast.error('Error processing photo. Please try again.');
        }
      };
      
      reader.onerror = () => {
        toast.error('Error reading photo file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    }
    
    // Clear the input to allow re-uploading the same file
    event.target.value = '';
  };

  const nextStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await trigger(['firstName', 'lastName', 'dateOfBirth', 'phone']);
        break;
      case 2:
        // Check both the form field AND the captured image state to handle async photo processing
        isValid = !!watch('selfie') || !!capturedImage;
        if (!isValid) toast.error('Please take a photo to continue');
        break;
      case 3:
        isValid = true; // Health questions are optional
        break;
      case 4:
        isValid = await trigger(['sex', 'cardiovascularHistory', 'chronicKidneyDisease', 'diabetes', 'insuranceType']);
        if (!isValid) toast.error('Please answer all additional health questions');
        break;
      case 5:
        isValid = watch('tcpaConsent');
        if (!isValid) toast.error('Please provide TCPA consent to continue');
        break;
    }

    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log('Form submission started with data:', data);
    setIsSubmitting(true);
    
    try {
      // Ensure photo is captured before submitting
      if (!data.selfie && !capturedImage) {
        console.log('No photo found - blocking submission');
        toast.error('Please take a photo before submitting');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Photo check passed - creating FormData');
      console.log('Photo file:', data.selfie);
      
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        console.log(`Adding field ${key}:`, value);
        if (key === 'selfie' && value instanceof File) {
          formData.append(key, value);
          console.log(`Added photo file: ${value.name}, size: ${value.size}`);
        } else if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      formData.append('churchId', churchId);
      console.log('Added churchId:', churchId);
      
      // Add client-side device information
      const clientDeviceInfo = collectClientDeviceInfo();
      formData.append('clientDeviceInfo', JSON.stringify(clientDeviceInfo));
      console.log('Added client device info');

      console.log('Sending request to /api/submissions...');
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('Response data:', result);

      if (result.success) {
        console.log('Submission successful!');
        toast.success('Your health screening has been submitted successfully!');
        onSuccess?.(result.data.id);
      } else {
        console.error('Submission failed with error:', result.error);
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="mobile-container">
      <div className="trust-gradient min-h-screen py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Health Screening
          </h1>
          <p className="text-trust-600">
            {churchName}
          </p>
          <p className="text-sm text-trust-500 mt-1">
            Join the fight against diabetes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isActive ? 'text-primary-600' : 
                    isCompleted ? 'text-health-600' : 'text-trust-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-primary-600 bg-primary-50' :
                    isCompleted ? 'border-health-600 bg-health-50' : 'border-trust-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center">{step.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Steps */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="card animate-fade-in-up">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-trust-900 flex items-center">
                  <UserIcon className="w-6 h-6 mr-2 text-primary-600" />
                  Personal Information
                </h2>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      {...register('firstName', { 
                        required: 'First name is required',
                        minLength: { value: 2, message: 'First name must be at least 2 characters' }
                      })}
                      className={`form-input ${errors.firstName ? 'form-input-error' : ''}`}
                      placeholder="Enter your first name"
                    />
                    {errors.firstName && (
                      <p className="form-error">{errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input
                      {...register('lastName', { 
                        required: 'Last name is required',
                        minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                      })}
                      className={`form-input ${errors.lastName ? 'form-input-error' : ''}`}
                      placeholder="Enter your last name"
                    />
                    {errors.lastName && (
                      <p className="form-error">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="text"
                    {...register('dateOfBirth', { 
                      required: 'Date of birth is required',
                      pattern: {
                        value: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
                        message: 'Please enter date in MM/DD/YYYY format (e.g., 02/04/1992)'
                      },
                      validate: (value) => {
                        // Parse MM/DD/YYYY format
                        const parts = value.split('/');
                        if (parts.length !== 3) return 'Please enter date in MM/DD/YYYY format';
                        
                        const month = parseInt(parts[0], 10);
                        const day = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        
                        // Validate ranges
                        if (month < 1 || month > 12) return 'Please enter a valid month (01-12)';
                        if (day < 1 || day > 31) return 'Please enter a valid day (01-31)';
                        if (year < 1900 || year > new Date().getFullYear()) return 'Please enter a valid year';
                        
                        // Check if date is valid
                        const date = new Date(year, month - 1, day);
                        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                          return 'Please enter a valid date';
                        }
                        
                        // Age validation
                        const today = new Date();
                        const birthDate = new Date(year, month - 1, day);
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        
                        if (age < 18) return 'Must be 18 or older';
                        if (age > 120) return 'Please enter a valid date';
                        return true;
                      }
                    })}
                    className={`form-input ${errors.dateOfBirth ? 'form-input-error' : ''}`}
                    placeholder="MM/DD/YYYY (e.g., 02/04/1992)"
                    maxLength={10}
                    onInput={(e) => {
                      // Auto-format as user types
                      let value = e.currentTarget.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2);
                      }
                      if (value.length >= 5) {
                        value = value.substring(0, 5) + '/' + value.substring(5, 9);
                      }
                      e.currentTarget.value = value;
                    }}
                  />
                  {errors.dateOfBirth && (
                    <p className="form-error">{errors.dateOfBirth.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                                            placeholder="(xxx) xxx-xxxx"
                  />
                  {errors.phone && (
                    <p className="form-error">{errors.phone.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photo Capture */}
          {currentStep === 2 && (
            <div className="card animate-fade-in-up">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-trust-900 flex items-center">
                  <CameraIcon className="w-6 h-6 mr-2 text-primary-600" />
                  Take Your Photo
                </h2>
                <p className="text-sm text-trust-600 mt-1">
                  We'll use AI to estimate your health metrics from your photo
                </p>
              </div>
              <div className="card-body">
                {!capturedImage ? (
                  <div className="space-y-4">
                    {showCamera ? (
                      <div className="camera-container">
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="camera-preview"
                          videoConstraints={{
                            width: 1280,
                            height: 720,
                            facingMode: "user"
                          }}
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="btn-primary"
                          >
                            <CameraIcon className="w-5 h-5 mr-2" />
                            Capture
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCamera(false)}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="camera-container">
                          <div className="flex flex-col items-center justify-center h-64 text-trust-500">
                            <PhotoIcon className="w-16 h-16 mb-4" />
                            <p className="text-lg font-medium">Ready to take your photo?</p>
                            <p className="text-sm">This helps us estimate your health metrics</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          <button
                            type="button"
                            onClick={() => setShowCamera(true)}
                            className="btn-primary"
                          >
                            <CameraIcon className="w-5 h-5 mr-2" />
                            Use Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary"
                          >
                            <PhotoIcon className="w-5 h-5 mr-2" />
                            Upload Photo
                          </button>
                        </div>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="camera-container">
                      <Image
                        src={capturedImage}
                        alt="Captured selfie"
                        className="camera-preview"
                        width={640}
                        height={480}
                        unoptimized={true}
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          setValue('selfie', null);
                        }}
                        className="btn-secondary"
                      >
                        Retake Photo
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center text-health-600">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Photo captured successfully!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Health Questions */}
          {currentStep === 3 && (
            <div className="card animate-fade-in-up">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-trust-900 flex items-center">
                  <HeartIcon className="w-6 h-6 mr-2 text-primary-600" />
                  Health Screening Questions
                </h2>
                <p className="text-sm text-trust-600 mt-1">
                  These questions help us assess your health risk factors
                </p>
              </div>
              <div className="card-body space-y-6">
                {/* Family History - Diabetes */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Family History of Diabetes</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      It is estimated that up to 80% of African Americans have a family history of diabetes. 
                      Do you have a family history of diabetes (parents, grandparents, aunts, or uncles)?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryDiabetes')}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryDiabetes')}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Family History - High Blood Pressure */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Family History of High Blood Pressure</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      More than half of all African Americans have a family history of high blood pressure. 
                      Do you have a family history of high blood pressure?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryHighBP')}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryHighBP')}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Family History - Dementia */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Family History of Dementia or Alzheimer's</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      Has your mother, father, grandparent, or close relative ever been treated for dementia or Alzheimer's?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryDementia')}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('familyHistoryDementia')}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Nerve Symptoms */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Nerve Symptoms – Neuropathy</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      Do you have numbness or tingling in your feet after standing or sitting for a while?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('nerveSymptoms')}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('nerveSymptoms')}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Additional Health Info */}
          {currentStep === 4 && (
            <div className="card animate-fade-in-up">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-trust-900 flex items-center">
                  <DocumentTextIcon className="w-6 h-6 mr-2 text-primary-600" />
                  Additional Health Information
                </h2>
                <p className="text-sm text-trust-600 mt-1">
                  Let us know more about your health history and insurance
                </p>
              </div>
              <div className="card-body space-y-6">
                {/* Sex */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Sex</h3>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('sex', { required: true })}
                          value="male"
                          className="radio-custom"
                        />
                        <span className="ml-2">Male</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('sex', { required: true })}
                          value="female"
                          className="radio-custom"
                        />
                        <span className="ml-2">Female</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Cardiovascular History */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Cardiovascular History</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      Have you ever been diagnosed with heart disease, high blood pressure, or stroke?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('cardiovascularHistory', { required: true })}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('cardiovascularHistory', { required: true })}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Chronic Kidney Disease */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Chronic Kidney Disease</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      Have you been diagnosed with chronic kidney disease or are you currently on dialysis?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('chronicKidneyDisease', { required: true })}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('chronicKidneyDisease', { required: true })}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Diabetes */}
                <div className="health-card card">
                  <div className="card-body">
                    <h3 className="font-medium text-trust-900 mb-3">Diabetes</h3>
                    <p className="text-sm text-trust-600 mb-4">
                      Have you ever been diagnosed with diabetes?
                    </p>
                    <div className="flex space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('diabetes', { required: true })}
                          value="true"
                          className="radio-custom"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          {...register('diabetes', { required: true })}
                          value="false"
                          className="radio-custom"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                                 {/* Insurance Type */}
                 <div className="health-card card">
                   <div className="card-body">
                     <h3 className="font-medium text-trust-900 mb-3">Insurance Type</h3>
                     <p className="text-sm text-trust-600 mb-4">
                       What type of insurance do you have?
                     </p>
                     <div className="space-y-3">
                       <label className="flex items-center">
                         <input
                           type="radio"
                           {...register('insuranceType', { required: true })}
                           value="private"
                           className="radio-custom"
                         />
                         <span className="ml-2">Private insurance (Blue Cross, Aetna, Kaiser, etc.)</span>
                       </label>
                       <label className="flex items-center">
                         <input
                           type="radio"
                           {...register('insuranceType', { required: true })}
                           value="government"
                           className="radio-custom"
                         />
                         <span className="ml-2">Government insurance (Medicare, Medi-Cal, Medicaid, VA, etc.)</span>
                       </label>
                       <label className="flex items-center">
                         <input
                           type="radio"
                           {...register('insuranceType', { required: true })}
                           value="none"
                           className="radio-custom"
                         />
                         <span className="ml-2">No insurance / Self-pay</span>
                       </label>
                       <label className="flex items-center">
                         <input
                           type="radio"
                           {...register('insuranceType', { required: true })}
                           value="not-sure"
                           className="radio-custom"
                         />
                         <span className="ml-2">Not sure</span>
                       </label>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {/* Step 5: TCPA Consent */}
          {currentStep === 5 && (
            <div className="card animate-fade-in-up">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-trust-900 flex items-center">
                  <ShieldCheckIcon className="w-6 h-6 mr-2 text-primary-600" />
                  Consent & Follow-up
                </h2>
                <p className="text-sm text-trust-600 mt-1">
                  We need your permission to contact you about your health screening
                </p>
              </div>
              <div className="card-body space-y-4">
                <div className="medical-card card">
                  <div className="card-body">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('tcpaConsent', { required: true })}
                        className="checkbox-custom mt-1"
                      />
                      <div>
                        <span className="font-medium text-trust-900">
                          TCPA Consent - I agree to be contacted about my health screening
                        </span>
                        <p className="text-sm text-trust-600 mt-2">
                          By providing my phone number and checking this box, I consent to receive calls, texts, and messages from this health ministry regarding my health screening results, follow-up appointments, health tips, and related communications. I understand that:
                        </p>
                        <ul className="text-sm text-trust-600 mt-2 ml-4 space-y-1">
                          <li>• Message and data rates may apply</li>
                          <li>• I can opt-out at any time by replying STOP</li>
                          <li>• This consent is not required to receive services</li>
                          <li>• Communications may include appointment reminders, health education, and follow-up care coordination</li>
                        </ul>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-trust-50 border border-trust-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-trust-500 mt-0.5" />
                    <div className="text-sm text-trust-600">
                      <p className="font-medium mb-1">Important Notice</p>
                      <p>
                        This screening is for informational purposes only and does not replace professional medical advice. 
                        Please consult with your healthcare provider for any health concerns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`btn-secondary ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary"
              >
                Next
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-health"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Screening
                    <CheckCircleIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 