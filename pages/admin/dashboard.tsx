import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminDashboard from '@/components/AdminDashboard';
import { DashboardStats } from '@/types';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchDashboardData = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    fetchDashboardData(token);
  }, [router, fetchDashboardData]);

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      toast.success('Export started! This may take a moment...');
      
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          includeFields: ['all'],
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
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    }
  };

  const handleViewSubmissions = () => {
    router.push('/admin/submissions');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
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
          onRefresh={() => fetchDashboardData(localStorage.getItem('adminToken') || '')}
        />
      </div>
    </>
  );
} 