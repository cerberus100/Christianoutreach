import { GetServerSideProps } from 'next';
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import HealthScreeningForm from '@/components/HealthScreeningForm';
import { OutreachLocation } from '@/types';
import { CheckCircleIcon, HeartIcon } from '@heroicons/react/24/outline';

interface FormPageProps {
  church: OutreachLocation;
  error?: string;
}

export default function FormPage({ church, error }: FormPageProps) {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');

  const handleSuccess = (id: string) => {
    setSubmissionId(id);
    setIsSubmitted(true);
  };

  if (error) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="mobile-container">
          <div className="card text-center">
            <div className="card-body">
              <div className="text-red-500 mb-4">
                <HeartIcon className="w-16 h-16 mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-trust-900 mb-4">
                Oops! Something went wrong
              </h1>
              <p className="text-trust-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <>
        <Head>
          <title>Thank You - Health Screening | {church.name}</title>
          <meta name="description" content="Thank you for completing your health screening" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        
        <div className="min-h-screen trust-gradient flex items-center justify-center">
          <div className="mobile-container">
            <div className="card text-center animate-fade-in-up">
              <div className="card-body">
                <div className="text-health-600 mb-6">
                  <CheckCircleIcon className="w-20 h-20 mx-auto" />
                </div>
                
                <h1 className="text-3xl font-bold text-gradient mb-4">
                  Thank You!
                </h1>
                
                <p className="text-lg text-trust-700 mb-4">
                  Your health screening has been submitted successfully.
                </p>
                
                <div className="bg-health-50 border border-health-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-health-800">
                    <strong>Submission ID:</strong> {submissionId}
                  </p>
                  <p className="text-sm text-health-600 mt-2">
                    Save this ID for your records. We'll contact you soon with your results and next steps.
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <h3 className="font-semibold text-trust-900">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-trust-600">

                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
                      You'll receive your results and personalized recommendations
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
                      Our team will contact you to discuss follow-up care if needed
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-trust-200">
                  <p className="text-sm text-trust-500">
                    Thank you for taking the first step in your health journey with {church.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Health Screening | {church.name}</title>
        <meta name="description" content={`Complete your health screening with ${church.name} - Join the fight against diabetes`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Health Screening" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Custom branding if available */}
        {church.brandingColors && (
          <style jsx>{`
            :root {
              --primary-color: ${church.brandingColors.primary};
              --secondary-color: ${church.brandingColors.secondary};
              --accent-color: ${church.brandingColors.accent};
            }
          `}</style>
        )}
      </Head>

      <HealthScreeningForm
        churchId={church.id}
        churchName={church.name}
        onSuccess={handleSuccess}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { churchId } = context.params!;

  try {
    // Query the church/location from DynamoDB
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const { docClient, TABLES } = await import('@/lib/aws-config');
    
    let church: OutreachLocation | null = null;

    try {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLES.CHURCHES,
        FilterExpression: 'id = :churchId',
        ExpressionAttributeValues: {
          ':churchId': churchId as string,
        },
      }));

      if (result.Items && result.Items.length > 0) {
        church = result.Items[0] as OutreachLocation;
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
    }
    
    if (!church) {
      return {
        props: {
          church: null,
          error: 'Church not found. Please check your QR code and try again.',
        },
      };
    }

    if (!church.isActive) {
      return {
        props: {
          church: null,
          error: 'This health screening is currently unavailable. Please contact the church directly.',
        },
      };
    }

    return {
      props: {
        church,
      },
    };
  } catch (error) {
    console.error('Error fetching church:', error);
    return {
      props: {
        church: null,
        error: 'Unable to load the health screening form right now. Please try again later.',
      },
    };
  }
}; 