import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  QrCodeIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { OutreachLocation } from '@/types';
import toast from 'react-hot-toast';

interface LocationForm {
  name: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<OutreachLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OutreachLocation | null>(null);
  const [openQRDropdown, setOpenQRDropdown] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LocationForm>();

  const fetchLocations = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/admin/locations', {
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
        setLocations(result.data);
      } else {
        toast.error('Failed to load locations');
      }
    } catch (error) {
      console.error('Fetch locations error:', error);
      toast.error('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Check authentication and fetch locations
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchLocations(token);
  }, [router, fetchLocations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openQRDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setOpenQRDropdown(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openQRDropdown]);

  const onSubmit = async (data: LocationForm) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const url = editingLocation 
        ? `/api/admin/locations/${editingLocation.id}`
        : '/api/admin/locations';
      
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingLocation ? 'Location updated!' : 'Location created!');
        setShowAddForm(false);
        setEditingLocation(null);
        reset();
        fetchLocations(token);
      } else {
        toast.error(result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Operation failed');
    }
  };

  const handleEdit = (location: OutreachLocation) => {
    setEditingLocation(location);
    setValue('name', location.name);
    setValue('address', location.address);
    setValue('contactPerson', location.contactPerson);
    setValue('contactEmail', location.contactEmail);
    setValue('contactPhone', location.contactPhone);
    setShowAddForm(true);
  };

  const handleDelete = async (location: OutreachLocation) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) return;

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Location deleted!');
        fetchLocations(token);
      } else {
        toast.error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const downloadQRCode = async (location: OutreachLocation, style: 'regular' | 'prayer' = 'regular') => {
    try {
      const formUrl = `${window.location.origin}/form/${location.id}`;
      const endpoint = style === 'prayer' ? '/api/admin/qr-code-prayer' : '/api/admin/qr-code';
      const qrResponse = await fetch(`${endpoint}?url=${encodeURIComponent(formUrl)}&name=${encodeURIComponent(location.name)}`);
      
      if (qrResponse.ok) {
        const blob = await qrResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${location.name}-${style}-qr.${style === 'prayer' ? 'svg' : 'png'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`${style === 'prayer' ? 'Prayer Hands' : 'Regular'} QR Code downloaded!`);
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR code error:', error);
      toast.error('Failed to generate QR code');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen trust-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-trust-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Outreach Locations - Health Screening System</title>
        <meta name="description" content="Manage outreach locations and QR codes" />
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
                  Outreach Locations
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setEditingLocation(null);
                    reset();
                    setShowAddForm(true);
                  }}
                  className="btn-primary flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Location
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="desktop-container py-8">
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="card mb-8">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-trust-900">
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Location Name *</label>
                      <input
                        {...register('name', {
                          required: 'Location name is required',
                          minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                        placeholder="e.g., First Baptist Church"
                      />
                      {errors.name && (
                        <p className="form-error">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Address *</label>
                      <input
                        {...register('address', { required: 'Address is required' })}
                        className={`form-input ${errors.address ? 'form-input-error' : ''}`}
                        placeholder="123 Main St, City, State 12345"
                      />
                      {errors.address && (
                        <p className="form-error">{errors.address.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Contact Person *</label>
                      <input
                        {...register('contactPerson', { required: 'Contact person is required' })}
                        className={`form-input ${errors.contactPerson ? 'form-input-error' : ''}`}
                        placeholder="Pastor John Smith"
                      />
                      {errors.contactPerson && (
                        <p className="form-error">{errors.contactPerson.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Contact Email *</label>
                      <input
                        type="email"
                        {...register('contactEmail', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address'
                          }
                        })}
                        className={`form-input ${errors.contactEmail ? 'form-input-error' : ''}`}
                        placeholder="pastor@church.org"
                      />
                      {errors.contactEmail && (
                        <p className="form-error">{errors.contactEmail.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Contact Phone *</label>
                      <input
                        type="tel"
                        {...register('contactPhone', { required: 'Phone number is required' })}
                        className={`form-input ${errors.contactPhone ? 'form-input-error' : ''}`}
                        placeholder="(xxx) xxx-xxxx"
                      />
                      {errors.contactPhone && (
                        <p className="form-error">{errors.contactPhone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingLocation(null);
                        reset();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingLocation ? 'Update Location' : 'Create Location'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Locations List */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-trust-900">
                All Outreach Locations ({locations.length})
              </h2>
            </div>
            <div className="card-body">
              {locations.length === 0 ? (
                <div className="text-center py-12">
                  <BuildingOfficeIcon className="w-16 h-16 text-trust-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-trust-900 mb-2">No locations yet</h3>
                  <p className="text-trust-600 mb-4">
                    Create your first outreach location to start collecting health screenings.
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add First Location
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-trust-200">
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Location</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Form Link</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Submissions</th>
                        <th className="text-left py-3 px-4 font-medium text-trust-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => {
                        const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${location.id}`;
                        
                        return (
                          <tr key={location.id} className="border-b border-trust-100 hover:bg-trust-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-trust-900">{location.name}</div>
                                <div className="text-sm text-trust-600">{location.address}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="text-sm font-medium text-trust-900">{location.contactPerson}</div>
                                <div className="text-sm text-trust-600">{location.contactEmail}</div>
                                <div className="text-sm text-trust-600">{location.contactPhone}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <code className="text-xs bg-trust-100 px-2 py-1 rounded text-trust-800 max-w-xs truncate">
                                  {formUrl}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(formUrl, 'Form URL')}
                                  className="text-trust-400 hover:text-trust-600"
                                  title="Copy URL"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                                <a
                                  href={formUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-trust-400 hover:text-trust-600"
                                  title="Open form"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </a>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                                {location.totalSubmissions || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenQRDropdown(openQRDropdown === location.id ? null : location.id)}
                                    className="text-primary-600 hover:text-primary-900 flex items-center"
                                    title="Download QR Code"
                                  >
                                    <QrCodeIcon className="w-4 h-4" />
                                    <ChevronDownIcon className="w-3 h-3 ml-1" />
                                  </button>
                                  {openQRDropdown === location.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-trust-200 rounded-md shadow-lg z-50">
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            downloadQRCode(location, 'regular');
                                            setOpenQRDropdown(null);
                                          }}
                                          className="block w-full text-left px-4 py-2 text-sm text-trust-900 hover:bg-trust-50"
                                        >
                                          📱 Regular QR Code
                                        </button>
                                        <button
                                          onClick={() => {
                                            downloadQRCode(location, 'prayer');
                                            setOpenQRDropdown(null);
                                          }}
                                          className="block w-full text-left px-4 py-2 text-sm text-trust-900 hover:bg-trust-50"
                                        >
                                          🙏 Prayer Hands QR Code
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleEdit(location)}
                                  className="text-trust-600 hover:text-trust-900"
                                  title="Edit location"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/admin/submissions?location=${location.id}`)}
                                  className="text-health-600 hover:text-health-900"
                                  title="View submissions"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(location)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete location"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 