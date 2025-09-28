import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  UserIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { HealthSubmission, OutreachLocation } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import HealthAnalysisPortfolio from '../../components/GeneticTestingPortfolio';
import { fetchWithAuth } from '@/lib/api-client';

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
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [isRefreshingPhotos, setIsRefreshingPhotos] = useState(false);

  // Create location name mapping
  const locationNameMap = new Map();
  locations.forEach(location => {
    locationNameMap.set(location.id, location.name);
  });

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.append('churchId', filterLocation);
      if (filterRisk) params.append('riskLevels', filterRisk);
      if (filterStatus) params.append('followUpStatuses', filterStatus);
      if (searchTerm) params.append('searchTerm', searchTerm);

      const response = await fetchWithAuth(`/api/admin/submissions?${params.toString()}`);

      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data.items);
      } else {
        toast.error('Failed to load submissions');
      }
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  }, [filterLocation, filterRisk, filterStatus, searchTerm]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/admin/locations');

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

  const getSignedPhotoUrl = useCallback(async (photoPath: string): Promise<string | null> => {
    // Check if we already have this URL cached
    if (signedUrls.has(photoPath)) {
      return signedUrls.get(photoPath)!;
    }

    // Check if we're already loading this URL
    if (loadingUrls.has(photoPath)) {
      return null;
    }

    try {
      setLoadingUrls(prev => new Set(prev).add(photoPath));

      const response = await fetchWithAuth('/api/admin/photo-url', {
        method: 'POST',
        body: JSON.stringify({ photoPath }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSignedUrls(prev => new Map(prev).set(photoPath, result.data.signedUrl));
          return result.data.signedUrl;
        }
      }
    } catch (error) {
      console.error('Failed to get signed URL:', error);
    } finally {
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoPath);
        return newSet;
      });
    }

    return null;
  }, [signedUrls, loadingUrls]);

  // Photo component with signed URL handling
  const PhotoDisplay = ({ photoPath, alt, className, onClick }: {
    photoPath: string;
    alt: string;
    className: string;
    onClick?: () => void;
  }) => {
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    useEffect(() => {
      const loadPhoto = async () => {
        if (!photoPath) return;
        
        setIsLoadingUrl(true);
        const signedUrl = await getSignedPhotoUrl(photoPath);
        setDisplayUrl(signedUrl);
        setIsLoadingUrl(false);
      };

      loadPhoto();
    }, [photoPath]);

    if (isLoadingUrl) {
      return (
        <div className={`${className} bg-trust-100 border-4 border-trust-200 flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <span className="text-trust-400 text-sm">Loading...</span>
          </div>
        </div>
      );
    }

    if (!displayUrl) {
      return (
        <div className={`${className} bg-trust-100 border-4 border-trust-200 flex items-center justify-center`}>
          <div className="text-center">
            <svg className="w-12 h-12 text-trust-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-trust-400 text-sm font-medium">No Photo Available</span>
          </div>
        </div>
      );
    }

    return (
      <img
        src={displayUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        onError={(e) => {
          console.error('Failed to load image:', displayUrl);
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="text-center">
                <svg class="w-12 h-12 text-trust-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="text-trust-400 text-sm font-medium">Photo Unavailable</span>
              </div>
            `;
          }
        }}
      />
    );
  };

  // Check authentication and fetch data
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchSubmissions(), fetchLocations()]);
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
    try {
      const response = await fetchWithAuth(`/api/admin/submissions/${submissionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          followUpStatus: status,
          followUpNotes: notes,
          followUpDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Follow-up status updated!');
        fetchSubmissions();
      } else {
        toast.error(result.error || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    }
  };

  const exportSubmissions = async () => {
    try {
      toast.success('Export started! This may take a moment...');
      
      const response = await fetchWithAuth('/api/admin/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filters: {
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            churchIds: filterLocation ? [filterLocation] : undefined,
            riskLevels: filterRisk ? [filterRisk] : undefined,
            followUpStatuses: filterStatus ? [filterStatus] : undefined,
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

  const refreshPhotos = async () => {
    setIsRefreshingPhotos(true);
    try {
      const response = await fetchWithAuth('/api/admin/refresh-photos', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(result.message);
          
          // Show detailed results if there were issues
          if (result.data.errors.length > 0) {
            console.warn('Photo refresh issues:', result.data.errors);
            toast.error(`${result.data.photosMissing} photos are missing from storage`);
          }
          
          // Clear the signed URLs cache to force refresh
          setSignedUrls(new Map());
          
          // Reload submissions to get updated URLs
          fetchSubmissions();
        } else {
          toast.error(result.error || 'Photo refresh failed');
        }
      } else {
        toast.error('Photo refresh failed');
      }
    } catch (error) {
      console.error('Photo refresh error:', error);
      toast.error('Photo refresh failed');
    } finally {
      setIsRefreshingPhotos(false);
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
                  onClick={refreshPhotos}
                  disabled={isRefreshingPhotos}
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh all photos and fix broken URLs"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshingPhotos ? 'animate-spin' : ''}`} />
                  {isRefreshingPhotos ? 'Refreshing...' : 'Refresh Photos'}
                </button>
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
              {submissions.length === 0 ? (
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
                                <PhotoDisplay
                                  photoPath={submission.selfieUrl}
                                  alt={`${submission.firstName} ${submission.lastName}`}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-trust-200 cursor-pointer hover:border-primary-400 transition-colors"
                                  onClick={() => setSelectedSubmission(submission)}
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
                          <PhotoDisplay
                            photoPath={selectedSubmission.selfieUrl}
                            alt={`${selectedSubmission.firstName} ${selectedSubmission.lastName}`}
                            className="w-40 h-40 rounded-xl object-cover border-4 border-trust-200 shadow-lg mx-auto cursor-pointer hover:border-primary-400 transition-all duration-300 group-hover:shadow-xl"
                            onClick={async () => {
                              // Get signed URL and open in new tab
                              const signedUrl = await getSignedPhotoUrl(selectedSubmission.selfieUrl);
                              if (signedUrl) {
                                window.open(signedUrl, '_blank');
                              }
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
                      {/* Family History */}
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
                        <span className="text-trust-700">Family History - Asthma:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.familyHistoryAsthma ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.familyHistoryAsthma ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Eczema History:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.eczemaHistory ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.eczemaHistory ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-trust-700">Nerve Symptoms:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.nerveSymptoms ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                          {selectedSubmission.nerveSymptoms ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {/* Current Health Conditions */}
                      <div className="border-t border-trust-200 pt-3 mt-3">
                        <h5 className="text-sm font-medium text-trust-600 mb-2">Current Health Conditions</h5>
                        <div className="flex justify-between items-center">
                          <span className="text-trust-700">Sex:</span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                            {selectedSubmission.sex || 'Not specified'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-trust-700">Cardiovascular History:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.cardiovascularHistory ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                            {selectedSubmission.cardiovascularHistory ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-trust-700">Chronic Kidney Disease:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.chronicKidneyDisease ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                            {selectedSubmission.chronicKidneyDisease ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-trust-700">Diabetes:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.diabetes ? 'bg-orange-100 text-orange-800' : 'bg-health-100 text-health-800'}`}>
                            {selectedSubmission.diabetes ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-trust-700">Insurance Type:</span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                            {selectedSubmission.insuranceType || 'Not specified'}
                          </span>
                        </div>
                        {selectedSubmission.insuranceId && (
                          <div className="flex justify-between items-center">
                            <span className="text-trust-700">Insurance ID:</span>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                              {selectedSubmission.insuranceId}
                            </span>
                          </div>
                        )}
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