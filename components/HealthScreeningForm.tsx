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
  { id: 4, name: 'Consent', icon: ShieldCheckIcon },
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
      consentScheduling: false,
      consentTexting: false,
      consentFollowup: false,
    },
  });

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
      // Convert data URL to File object
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          setValue('selfie', file);
        });
    }
  }, [setValue]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setValue('selfie', file);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await trigger(['firstName', 'lastName', 'dateOfBirth']);
        break;
      case 2:
        isValid = !!watch('selfie');
        if (!isValid) toast.error('Please take a photo to continue');
        break;
      case 3:
        isValid = true; // Health questions are optional
        break;
      case 4:
        isValid = watch('consentScheduling') && watch('consentTexting') && watch('consentFollowup');
        if (!isValid) toast.error('Please provide all consent permissions');
        break;
    }

    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'selfie' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      formData.append('churchId', churchId);
      
      // Add client-side device information
      const clientDeviceInfo = collectClientDeviceInfo();
      formData.append('clientDeviceInfo', JSON.stringify(clientDeviceInfo));

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Your health screening has been submitted successfully!');
        onSuccess?.(result.data.id);
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
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
                    type="date"
                    {...register('dateOfBirth', { 
                      required: 'Date of birth is required',
                      validate: (value) => {
                        const today = new Date();
                        const birthDate = new Date(value);
                        const age = today.getFullYear() - birthDate.getFullYear();
                        if (age < 18) return 'Must be 18 or older';
                        if (age > 120) return 'Please enter a valid date';
                        return true;
                      }
                    })}
                    className={`form-input ${errors.dateOfBirth ? 'form-input-error' : ''}`}
                    max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                  {errors.dateOfBirth && (
                    <p className="form-error">{errors.dateOfBirth.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    {...register('phone', {
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                    placeholder="(555) 123-4567"
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

          {/* Step 4: Consent */}
          {currentStep === 4 && (
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
                        {...register('consentScheduling', { required: true })}
                        className="checkbox-custom mt-1"
                      />
                      <div>
                        <span className="font-medium text-trust-900">
                          I consent to be contacted for scheduling follow-up appointments
                        </span>
                        <p className="text-sm text-trust-600 mt-1">
                          This allows us to help you schedule any necessary follow-up care or consultations.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="medical-card card">
                  <div className="card-body">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('consentTexting', { required: true })}
                        className="checkbox-custom mt-1"
                      />
                      <div>
                        <span className="font-medium text-trust-900">
                          I consent to receive text messages about my health
                        </span>
                        <p className="text-sm text-trust-600 mt-1">
                          We may send you important health reminders, tips, and updates via text message.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="medical-card card">
                  <div className="card-body">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('consentFollowup', { required: true })}
                        className="checkbox-custom mt-1"
                      />
                      <div>
                        <span className="font-medium text-trust-900">
                          I consent to follow-up communications about my health screening
                        </span>
                        <p className="text-sm text-trust-600 mt-1">
                          This includes calls, emails, or messages about your results and next steps.
                        </p>
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

            {currentStep < 4 ? (
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