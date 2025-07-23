import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { HealthSubmission, OutreachLocation } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import HealthAnalysisPortfolio from '../../components/GeneticTestingPortfolio';

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<HealthSubmission[]>([]);
  const [locations, setLocations] = useState<OutreachLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<HealthSubmission | null>(null);
  const [showGeneticPortfolio, setShowGeneticPortfolio] = useState(false);

  // Create location name mapping
  const locationNameMap = new Map();
  locations.forEach(location => {
    locationNameMap.set(location.id, location.name);
  });

  const fetchSubmissions = useCallback(async (token: string) => {
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.append('location', filterLocation);
      if (filterRisk) params.append('riskLevel', filterRisk);
      if (filterStatus) params.append('followUpStatus', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/submissions?${params.toString()}`, {
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
        setSubmissions(result.data);
      } else {
        toast.error('Failed to load submissions');
      }
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  }, [router, filterLocation, filterRisk, filterStatus, searchTerm]);

  const fetchLocations = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/admin/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocations(result.data);
        }
      }
    } catch {
      // Error fetching locations
    }
  }, []);

  // Check authentication and fetch data
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    // Fetch both submissions and locations
    Promise.all([
      fetchSubmissions(token),
      fetchLocations(token)
    ]);
  }, [router, fetchSubmissions, fetchLocations]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedSubmission) {
          setSelectedSubmission(null);
          setShowGeneticPortfolio(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [selectedSubmission]);

  const updateFollowUpStatus = async (submissionId: string, status: string, notes?: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followUpStatus: status,
          followUpNotes: notes,
          followUpDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Follow-up status updated!');
        fetchSubmissions(token);
      } else {
        toast.error(result.error || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    }
  };

  const exportSubmissions = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
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
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          includeFields: ['all'],
          filterBy: {
            churchId: filterLocation || undefined,
            riskLevel: filterRisk || undefined,
            followUpStatus: filterStatus || undefined,
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-screening-submissions-${new Date().toISOString().split('T')[0]}.csv`;
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

  // Filter submissions based on search and filters
  const filteredSubmissions = submissions.filter((submission) => {
    const searchMatch = searchTerm === '' || 
      submission.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.phone?.includes(searchTerm);

    const locationMatch = filterLocation === '' || submission.churchId === filterLocation;
    const riskMatch = filterRisk === '' || submission.healthRiskLevel === filterRisk;
    const statusMatch = filterStatus === '' || submission.followUpStatus === filterStatus;

    return searchMatch && locationMatch && riskMatch && statusMatch;
  });

  const getRiskColorClass = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'Low': return 'risk-low';
      case 'Moderate': return 'risk-moderate';
      case 'High': return 'risk-high';
      case 'Very High': return 'risk-very-high';
      default: return 'bg-trust-100 text-trust-800';
    }
  };

  const getStatusColorClass = (status?: string) => {
    switch (status) {
      case 'Completed': return 'bg-health-100 text-health-800';
      case 'Contacted': return 'bg-primary-100 text-primary-800';
      case 'Scheduled': return 'bg-medical-100 text-medical-800';
      default: return 'bg-trust-100 text-trust-800';
    }
  };

  const handleRecommendationUpdate = (recommendations: string[]) => {
    if (selectedSubmission) {
      setSelectedSubmission(prev => prev ? {
        ...prev,
        recommendations
      } : null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-trust-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Form Submissions - Health Screening System</title>
        <meta name="description" content="View and manage health screening submissions" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen trust-gradient">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-trust-200">
          <div className="desktop-container">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="text-trust-600 hover:text-trust-900"
                >
                  ← Dashboard
                </button>
                <h1 className="text-xl font-semibold text-trust-900">
                  Form Submissions
                </h1>
                <span className="px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">
                  {filteredSubmissions.length} total
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportSubmissions}
                  className="btn-secondary flex items-center"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="desktop-container py-8">
          {/* Filters */}
          <div className="card mb-6">
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className="form-label">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-trust-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input pl-10"
                      placeholder="Search by name, email, or phone..."
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="form-label">Location</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="form-input"
                  >
                    <option value="">All Locations</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>

                {/* Risk Filter */}
                <div>
                  <label className="form-label">Risk Level</label>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    className="form-input"
                  >
                    <option value="">All Risk Levels</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="form-label">Follow-up Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-input"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="card">
            <div className="card-body">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <UserIcon className="w-16 h-16 text-trust-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-trust-900 mb-2">No submissions found</h3>
                  <p className="text-trust-600">
                    {searchTerm || filterLocation || filterRisk || filterStatus
                      ? 'Try adjusting your filters to see more results.'
                      : 'Submissions will appear here once people start filling out the health screening form.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-trust-200">
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Participant</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Photo</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Location</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Health Risk</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">BMI</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Follow-up</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="border-b border-trust-100 hover:bg-trust-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-trust-900">
                                {submission.firstName} {submission.lastName}
                              </div>
                              <div className="text-sm text-trust-600">
                                Age: {submission.estimatedAge || 'N/A'}, Gender: {submission.estimatedGender || 'N/A'}
                              </div>
                              {submission.email && (
                                <div className="text-sm text-trust-500">{submission.email}</div>
                              )}
                              {submission.phone && (
                                <div className="text-sm text-trust-500">{submission.phone}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center">
                              {submission.selfieUrl ? (
                                <img
                                  src={submission.selfieUrl}
                                  alt={`${submission.firstName} ${submission.lastName}`}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-trust-200 cursor-pointer hover:border-primary-400 transition-colors"
                                  onClick={() => setSelectedSubmission(submission)}
                                  onError={(e) => {
                                    console.error('Thumbnail failed to load:', submission.selfieUrl);
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxNkMyMC42ODYzIDE2IDE4IDE4LjY4NjMgMTggMjJDMTggMjUuMzEzNyAyMC42ODYzIDI4IDI0IDI4QzI3LjMxMzcgMjggMzAgMjUuMzEzNyAzMCAyMkMzMCAxOC42ODYzIDI3LjMxMzcgMTYgMjQgMTZaIiBmaWxsPSIjOTk5OTk5Ii8+CjxwYXRoIGQ9Ik0xNiAzNkMxNiAzMC40NzcxIDE5LjU4MTcgMjYgMjQgMjZDMjguNDE4MyAyNiAzMiAzMC40NzcxIDMyIDM2SDM2VjQwSDE2VjM2WiIgZmlsbD0iIzk5OTk5OSIvPgo8L3N2Zz4K';
                                  }}
                                  onLoad={() => {
                                    console.log('Thumbnail loaded successfully:', submission.selfieUrl);
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-trust-100 border-2 border-trust-200 flex items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
                                     onClick={() => setSelectedSubmission(submission)}>
                                  <svg className="w-6 h-6 text-trust-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-trust-700">
                              {locationNameMap.get(submission.churchId) || submission.churchId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColorClass(submission.healthRiskLevel)}`}>
                              {submission.healthRiskLevel || 'Unknown'}
                            </span>
                            {submission.healthRiskScore && (
                              <div className="text-xs text-trust-500 mt-1">
                                Score: {submission.healthRiskScore}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-trust-900">
                              {submission.estimatedBMI && !isNaN(Number(submission.estimatedBMI)) 
                                ? Number(submission.estimatedBMI).toFixed(1) 
                                : 'N/A'}
                            </div>
                            {submission.bmiCategory && (
                              <div className="text-xs text-trust-500">
                                {submission.bmiCategory}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-trust-900">
                              {format(new Date(submission.submissionDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-trust-500">
                              {format(new Date(submission.submissionDate), 'h:mm a')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={submission.followUpStatus || 'Pending'}
                              onChange={(e) => updateFollowUpStatus(submission.id, e.target.value)}
                              className={`text-xs rounded-full border-0 px-2 py-1 ${getStatusColorClass(submission.followUpStatus)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowGeneticPortfolio(false);
                              }}
                              className="text-primary-600 hover:text-primary-900"
                              title="View details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submission Details Modal */}
        {selectedSubmission && !showGeneticPortfolio && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedSubmission(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Header with Prominent Close Button */}
              <div className="sticky top-0 bg-white border-b border-trust-200 p-6 rounded-t-lg z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-trust-900">
                    Submission Details
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowGeneticPortfolio(true)}
                      className="px-4 py-2 bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      🏥 Medical Referrals
                    </button>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="p-2 text-trust-400 hover:text-trust-900 hover:bg-trust-100 rounded-lg transition-colors"
                      title="Close (ESC)"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {/* Enhanced Photo Section */}
                  <div className="flex justify-center">
                    {selectedSubmission.selfieUrl ? (
                      <div className="text-center">
                        <div className="relative group">
                          <img
                            src={selectedSubmission.selfieUrl}
                            alt={`${selectedSubmission.firstName} ${selectedSubmission.lastName}`}
                            className="w-40 h-40 rounded-xl object-cover border-4 border-trust-200 shadow-lg mx-auto cursor-pointer hover:border-primary-400 transition-all duration-300 group-hover:shadow-xl"
                            onError={(e) => {
                              console.error('Failed to load image:', selectedSubmission.selfieUrl);
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA1MkM2OC45NTQzIDUyIDYwIDYwLjk1NDMgNjAgNzJDNjAgODMuMDQ1NyA2OC45NTQzIDkyIDgwIDkyQzkxLjA0NTcgOTIgMTAwIDgzLjA0NTcgMTAwIDcyQzEwMCA2MC45NTQzIDkxLjA0NTcgNTIgODAgNTJaIiBmaWxsPSIjOTk5OTk5Ii8+CjxwYXRoIGQ9Ik01MiAxMjBDNTIgMTAxLjkwOSA2My42NDY4IDg2IDgwIDg2Qzk2LjM1MzIgODYgMTA4IDEwMS45MDkgMTA4IDEyMEgxMjBWMTMySDUyVjEyMFoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==';
                              target.parentElement?.parentElement?.classList.add('error-state');
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', selectedSubmission.selfieUrl);
                            }}
                            onClick={() => {
                              // Click to view full size in new tab
                              window.open(selectedSubmission.selfieUrl, '_blank');
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-300 flex items-center justify-center">
                            <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              Click to enlarge
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-trust-500 mt-3">Participant Photo</p>
                        <p className="text-xs text-trust-400 mt-1">Click image to view full size</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-40 h-40 rounded-xl bg-trust-100 border-4 border-trust-200 flex items-center justify-center mx-auto">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-trust-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-trust-400 text-sm font-medium">No Photo Available</span>
                          </div>
                        </div>
                        <p className="text-xs text-trust-500 mt-3">No photo uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Personal Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Full Name</label>
                        <p className="text-trust-900 font-medium text-lg">{selectedSubmission.firstName} {selectedSubmission.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Date of Birth</label>
                        <p className="text-trust-900">{selectedSubmission.dateOfBirth}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Email</label>
                        <p className="text-trust-900">{selectedSubmission.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Phone</label>
                        <p className="text-trust-900">{selectedSubmission.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Location</label>
                        <p className="text-trust-900">{locationNameMap.get(selectedSubmission.churchId) || selectedSubmission.churchId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-trust-700 block mb-1">Submission Date</label>
                        <p className="text-trust-900">{format(new Date(selectedSubmission.submissionDate), 'MMM dd, yyyy \'at\' h:mm a')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Health Metrics */}
                  <div className="bg-health-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-trust-900 mb-3">Health Metrics</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center">
                        <label className="text-sm font-medium text-trust-700 block mb-1">Estimated BMI</label>
                        <p className="text-2xl font-bold text-trust-900">
                          {selectedSubmission.estimatedBMI && !isNaN(Number(selectedSubmission.estimatedBMI))
                            ? Number(selectedSubmission.estimatedBMI).toFixed(1)
                            : 'N/A'}
                        </p>
                        {selectedSubmission.bmiCategory && (
                          <p className="text-sm text-trust-600">{selectedSubmission.bmiCategory}</p>
                        )}
                      </div>
                      <div className="text-center">
                        <label className="text-sm font-medium text-trust-700 block mb-1">Estimated Age</label>
                        <p className="text-2xl font-bold text-trust-900">{selectedSubmission.estimatedAge || 'N/A'}</p>
                      </div>
                      <div className="text-center">
                        <label className="text-sm font-medium text-trust-700 block mb-1">Gender</label>
                        <p className="text-2xl font-bold text-trust-900">{selectedSubmission.estimatedGender || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Health Responses */}
                  <div>
                    <h4 className="text-lg font-medium text-trust-900 mb-3">Health Responses</h4>
                    <div className="bg-white border border-trust-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Family History - Diabetes:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.familyHistoryDiabetes ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.familyHistoryDiabetes ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Family History - High Blood Pressure:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.familyHistoryHighBP ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.familyHistoryHighBP ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Family History - Dementia:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.familyHistoryDementia ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.familyHistoryDementia ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Nerve Symptoms:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.nerveSymptoms ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.nerveSymptoms ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  {selectedSubmission.recommendations && selectedSubmission.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-trust-900 mb-3">AI Recommendations</h4>
                      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                        <ul className="space-y-2">
                          {selectedSubmission.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary-600 mr-2">•</span>
                              <span className="text-trust-700">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Device and Network Information */}
                  <div className="border-t border-trust-200 pt-6">
                    <h4 className="text-lg font-medium text-trust-900 mb-3">Device & Network Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">IP Address:</span>
                          <span className="text-trust-900 font-mono">
                            {selectedSubmission.networkInfo?.ipAddress || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Device Type:</span>
                          <span className="text-trust-900">
                            {selectedSubmission.deviceInfo?.device?.type || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Browser:</span>
                          <span className="text-trust-900">
                            {selectedSubmission.deviceInfo?.browser ? 
                              `${selectedSubmission.deviceInfo.browser.name} ${selectedSubmission.deviceInfo.browser.version}` : 
                              'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Operating System:</span>
                          <span className="text-trust-900">
                            {selectedSubmission.deviceInfo?.os ? 
                              `${selectedSubmission.deviceInfo.os.name} ${selectedSubmission.deviceInfo.os.version}` : 
                              'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Screen Resolution:</span>
                          <span className="text-trust-900">
                            {selectedSubmission.deviceInfo?.screen ? 
                              `${selectedSubmission.deviceInfo.screen.width}x${selectedSubmission.deviceInfo.screen.height}` : 
                              'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Timezone:</span>
                          <span className="text-trust-900">
                            {selectedSubmission.deviceInfo?.timezone || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Referrer:</span>
                          <span className="text-trust-900 text-xs">
                            {selectedSubmission.networkInfo?.referrer || 'Direct'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-trust-600 font-medium">Fingerprint:</span>
                          <span className="text-trust-900 font-mono text-xs">
                            {selectedSubmission.submissionFingerprint?.slice(0, 12) || 'N/A'}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Footer with Multiple Close Options */}
                <div className="mt-8 pt-6 border-t border-trust-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div className="text-sm text-trust-500">
                    Press <kbd className="px-2 py-1 bg-trust-100 rounded text-xs">ESC</kbd> or click outside to close
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="px-6 py-2 bg-trust-100 text-trust-700 hover:bg-trust-200 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setShowGeneticPortfolio(true)}
                      className="px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium transition-colors"
                    >
                      View Medical Referrals
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Genetic Testing Portfolio Modal */}
        {selectedSubmission && showGeneticPortfolio && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50"
            onClick={() => {
              setSelectedSubmission(null);
              setShowGeneticPortfolio(false);
            }}
          >
            <div 
              className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Header with Prominent Close Buttons */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-trust-900">
                  🏥 Medical Recommendations - {selectedSubmission.firstName} {selectedSubmission.lastName}
                </h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowGeneticPortfolio(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    ← Back to Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setShowGeneticPortfolio(false);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close (ESC)"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <HealthAnalysisPortfolio 
                submission={{
                  id: selectedSubmission.id,
                  name: `${selectedSubmission.firstName} ${selectedSubmission.lastName}`,
                  age: selectedSubmission.estimatedAge || 0,
                  gender: selectedSubmission.estimatedGender || 'Unknown',
                  healthRiskScore: selectedSubmission.healthRiskScore || 0,
                  estimatedBMI: selectedSubmission.estimatedBMI || 0,
                  bmiCategory: selectedSubmission.bmiCategory || 'Unknown',
                  familyHistory: {
                    diabetes: selectedSubmission.familyHistoryDiabetes || false,
                    hypertension: selectedSubmission.familyHistoryHighBP || false,
                    dementia: selectedSubmission.familyHistoryDementia || false,
                    heartDisease: selectedSubmission.cardiovascularHistory || false
                  },
                  symptoms: {
                    nervePain: selectedSubmission.nerveSymptoms || false,
                    memoryIssues: false, // Not currently captured in form
                    balanceProblems: false, // Not currently captured in form
                    visionChanges: false // Not currently captured in form
                  }
                }}
                onRecommendationUpdate={handleRecommendationUpdate}
              />

              {/* Enhanced Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-500">
                  Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd> or click outside to close
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowGeneticPortfolio(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    ← Back to Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setShowGeneticPortfolio(false);
                    }}
                    className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Close All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 