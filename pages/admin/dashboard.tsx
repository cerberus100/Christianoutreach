import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminDashboard from '@/components/AdminDashboard';
import { DashboardStats } from '@/types';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('Frontend: Fetching dashboard data...');
      const response = await fetchWithAuth('/api/admin/dashboard');
      console.log('Frontend: Dashboard response status:', response.status);

      const result = await response.json();
      console.log('Frontend: Dashboard response:', result);

      if (result.success) {
        setStats(result.data);
        console.log('Frontend: Dashboard data set successfully');
      } else {
        console.error('Frontend: Dashboard API returned error:', result);
        toast.error(`Failed to load dashboard data: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Frontend: Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    setIsAuthenticated(true);
    fetchDashboardData();
  }, [router, fetchDashboardData]);

  const handleExportData = async () => {
    try {
      toast.success('Export started! This may take a moment...');

      const response = await fetchWithAuth('/api/admin/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filters: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-screening-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Data exported successfully!');
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    }
  };

  const handleViewSubmissions = () => {
    router.push('/admin/submissions');
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    toast.success('Logged out successfully');
    router.push('/admin/login');
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-trust-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-trust-600">Failed to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Health Screening System</title>
        <meta name="description" content="Health screening administration dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen trust-gradient">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-trust-200">
          <div className="desktop-container">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-trust-900">
                  Health Screening Admin
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-trust-600">
                  Welcome, Administrator
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Dashboard Content */}
        <AdminDashboard
          stats={stats}
          onExportData={handleExportData}
          onViewSubmissions={handleViewSubmissions}
          onRefresh={fetchDashboardData}
        />
      </div>
    </>
  );
} 