import { useRouter } from 'next/router';
import Head from 'next/head';
import { HeartIcon, ChartBarIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Health Screening System</title>
        <meta name="description" content="Community health screening system for diabetes prevention and wellness outreach" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen trust-gradient">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl">
                    <span className="block text-trust-900">Community Health</span>
                    <span className="block text-gradient">Screening System</span>
                  </h1>
                  <p className="mt-3 text-base text-trust-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Empowering church communities to fight diabetes and promote wellness through 
                    AI-powered health screenings and comprehensive follow-up care.
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <div className="rounded-md shadow">
                      <button
                        onClick={() => router.push('/admin/login')}
                        className="w-full flex items-center justify-center px-8 py-3 btn-primary text-base md:py-4 md:text-lg md:px-10"
                      >
                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                        Admin Portal
                      </button>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-3">
                      <a
                        href="#features"
                        className="w-full flex items-center justify-center px-8 py-3 btn-secondary text-base md:py-4 md:text-lg md:px-10"
                      >
                        Learn More
                      </a>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <div className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full bg-gradient-to-br from-primary-400 via-health-400 to-medical-400 flex items-center justify-center">
              <HeartIcon className="w-32 h-32 text-white/20" />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-trust-900 sm:text-4xl">
                Complete Health Screening Solution
              </p>
              <p className="mt-4 max-w-2xl text-xl text-trust-500 lg:mx-auto">
                Everything you need to run effective health outreach programs in your community.
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <HeartIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-trust-900">AI-Powered Health Analysis</p>
                  <p className="mt-2 ml-16 text-base text-trust-500">
                    Advanced AI analyzes facial photos to estimate BMI, age, and health risk factors.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-health-500 text-white">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-trust-900">Multi-Location Management</p>
                  <p className="mt-2 ml-16 text-base text-trust-500">
                    Track submissions across multiple churches and outreach locations with unique QR codes.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-medical-500 text-white">
                    <ChartBarIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-trust-900">Comprehensive Analytics</p>
                  <p className="mt-2 ml-16 text-base text-trust-500">
                    Real-time dashboards with health risk distribution, demographics, and performance metrics.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-trust-500 text-white">
                    <ShieldCheckIcon className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-trust-900">HIPAA-Compliant Security</p>
                  <p className="mt-2 ml-16 text-base text-trust-500">
                    Enterprise-grade security with data encryption, secure authentication, and privacy controls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-600">
          <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Ready to start screening?</span>
              <span className="block">Access the admin portal.</span>
            </h2>
            <p className="mt-4 text-lg leading-6 text-primary-200">
              Log in to manage your health screening campaigns and view comprehensive analytics.
            </p>
            <button
              onClick={() => router.push('/admin/login')}
              className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 sm:w-auto"
            >
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Access Admin Portal
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-trust-800">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-trust-400 text-sm">
                © 2024 Health Screening System. Built with ❤️ for community health initiatives.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
} 