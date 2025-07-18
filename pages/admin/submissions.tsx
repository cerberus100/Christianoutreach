import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  HeartIcon,
  ChartBarIcon,
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
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
    } catch (error) {
      console.error('Fetch submissions error:', error);
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
    } catch (error) {
      console.error('Fetch locations error:', error);
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
    } catch (error) {
      console.error('Update error:', error);
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
    } catch (error) {
      console.error('Export error:', error);
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-trust-900">
                    Submission Details
                  </h3>
                  <button
                    onClick={() => setShowGeneticPortfolio(true)}
                    className="text-trust-400 hover:text-trust-600"
                  >
                    🏥 Medical Referrals
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-trust-700">Name</label>
                      <p className="text-trust-900">{selectedSubmission.firstName} {selectedSubmission.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-trust-700">Date of Birth</label>
                      <p className="text-trust-900">{selectedSubmission.dateOfBirth}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-trust-700">Email</label>
                      <p className="text-trust-900">{selectedSubmission.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-trust-700">Phone</label>
                      <p className="text-trust-900">{selectedSubmission.phone || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-trust-700">Estimated BMI</label>
                      <p className="text-trust-900">
                        {selectedSubmission.estimatedBMI && !isNaN(Number(selectedSubmission.estimatedBMI))
                          ? Number(selectedSubmission.estimatedBMI).toFixed(1)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-trust-700">Estimated Age</label>
                      <p className="text-trust-900">{selectedSubmission.estimatedAge || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-trust-700">Gender</label>
                      <p className="text-trust-900">{selectedSubmission.estimatedGender || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-trust-700">Health Responses</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span>Family History - Diabetes:</span>
                        <span className={selectedSubmission.familyHistoryDiabetes ? 'text-orange-600' : 'text-health-600'}>
                          {selectedSubmission.familyHistoryDiabetes ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Family History - High Blood Pressure:</span>
                        <span className={selectedSubmission.familyHistoryHighBP ? 'text-orange-600' : 'text-health-600'}>
                          {selectedSubmission.familyHistoryHighBP ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Family History - Dementia:</span>
                        <span className={selectedSubmission.familyHistoryDementia ? 'text-orange-600' : 'text-health-600'}>
                          {selectedSubmission.familyHistoryDementia ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nerve Symptoms:</span>
                        <span className={selectedSubmission.nerveSymptoms ? 'text-orange-600' : 'text-health-600'}>
                          {selectedSubmission.nerveSymptoms ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedSubmission.recommendations && (
                    <div>
                      <label className="text-sm font-medium text-trust-700">AI Recommendations</label>
                      <ul className="mt-2 space-y-1">
                        {selectedSubmission.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-trust-600">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Device and Network Information */}
                  <div className="border-t border-trust-200 pt-4">
                    <label className="text-sm font-medium text-trust-700">Device & Network Information</label>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-trust-600">IP Address:</span>
                        <span className="ml-2 text-trust-900 font-mono">
                          {selectedSubmission.networkInfo?.ipAddress || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Device Type:</span>
                        <span className="ml-2 text-trust-900">
                          {selectedSubmission.deviceInfo?.device?.type || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Browser:</span>
                        <span className="ml-2 text-trust-900">
                          {selectedSubmission.deviceInfo?.browser ? 
                            `${selectedSubmission.deviceInfo.browser.name} ${selectedSubmission.deviceInfo.browser.version}` : 
                            'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Operating System:</span>
                        <span className="ml-2 text-trust-900">
                          {selectedSubmission.deviceInfo?.os ? 
                            `${selectedSubmission.deviceInfo.os.name} ${selectedSubmission.deviceInfo.os.version}` : 
                            'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Screen Resolution:</span>
                        <span className="ml-2 text-trust-900">
                          {selectedSubmission.deviceInfo?.screen ? 
                            `${selectedSubmission.deviceInfo.screen.width}x${selectedSubmission.deviceInfo.screen.height}` : 
                            'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Timezone:</span>
                        <span className="ml-2 text-trust-900">
                          {selectedSubmission.deviceInfo?.timezone || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Fingerprint:</span>
                        <span className="ml-2 text-trust-900 font-mono text-xs">
                          {selectedSubmission.submissionFingerprint || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-trust-600">Referrer:</span>
                        <span className="ml-2 text-trust-900 text-xs">
                          {selectedSubmission.networkInfo?.referrer || 'Direct'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowGeneticPortfolio(true)}
                    className="btn-primary"
                  >
                    Medical Referrals
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Genetic Testing Portfolio Modal */}
        {selectedSubmission && showGeneticPortfolio && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-trust-900">
                  Medical Recommendations - {selectedSubmission.firstName} {selectedSubmission.lastName}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowGeneticPortfolio(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                  >
                    Back to Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setShowGeneticPortfolio(false);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

                             <HealthAnalysisPortfolio 
                 submission={{
                   id: selectedSubmission.id,
                   name: `${selectedSubmission.firstName} ${selectedSubmission.lastName}`,
                   age: 0, // Default age since not available in current data
                   gender: 'Unknown', // Default gender since not available
                   healthRiskScore: selectedSubmission.healthRiskScore || 0,
                   estimatedBMI: selectedSubmission.estimatedBMI || 0,
                   bmiCategory: selectedSubmission.bmiCategory || 'Unknown',
                   familyHistory: {
                     diabetes: false, // Default values - these would come from form data
                     hypertension: false,
                     dementia: false,
                     heartDisease: false
                   },
                   symptoms: {
                     nervePain: false, // Default values - these would come from form data
                     memoryIssues: false,
                     balanceProblems: false,
                     visionChanges: false
                   }
                 }}
                 onRecommendationUpdate={handleRecommendationUpdate}
               />
            </div>
          </div>
        )}
      </div>
    </>
  );
} 