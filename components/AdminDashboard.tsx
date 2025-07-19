'use client'

import React from 'react';
import {
  UsersIcon,
  HeartIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { DashboardStats } from '@/types';
import { format } from 'date-fns';
import SMSManagement from './SMSManagement';

interface AdminDashboardProps {
  stats: DashboardStats;
  onExportData: () => void;
  onViewSubmissions: () => void;
  onRefresh?: () => void;
}

const RISK_COLORS = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  'very-high': '#ef4444',
};

const BMI_COLORS = {
  underweight: '#3b82f6',
  normal: '#22c55e',
  overweight: '#f59e0b',
  obese: '#ef4444',
};

export default function AdminDashboard({
  stats,
  onExportData,
  onViewSubmissions,
  onRefresh,
}: AdminDashboardProps) {
  // const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  // const [selectedMetric, setSelectedMetric] = useState<'submissions' | 'risk' | 'bmi'>('submissions');

  // Prepare chart data
  const riskData = [
    { name: 'Low Risk', value: stats.riskDistribution.low, color: RISK_COLORS.low },
    { name: 'Moderate Risk', value: stats.riskDistribution.moderate, color: RISK_COLORS.moderate },
    { name: 'High Risk', value: stats.riskDistribution.high, color: RISK_COLORS.high },
    { name: 'Very High Risk', value: stats.riskDistribution.veryHigh, color: RISK_COLORS['very-high'] },
  ];

  const bmiData = [
    { name: 'Underweight', value: stats.bmiDistribution.underweight, color: BMI_COLORS.underweight },
    { name: 'Normal', value: stats.bmiDistribution.normal, color: BMI_COLORS.normal },
    { name: 'Overweight', value: stats.bmiDistribution.overweight, color: BMI_COLORS.overweight },
    { name: 'Obese', value: stats.bmiDistribution.obese, color: BMI_COLORS.obese },
  ];

  const genderData = [
    { name: 'Male', value: stats.genderDistribution.male, color: '#3b82f6' },
    { name: 'Female', value: stats.genderDistribution.female, color: '#ec4899' },
    { name: 'Unknown', value: stats.genderDistribution.unknown, color: '#6b7280' },
  ];

  return (
    <div className="desktop-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient">
            Health Screening Dashboard
          </h1>
          <p className="text-trust-600 mt-1">
            Monitor and analyze health screening submissions across all outreach locations
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => window.location.href = '/admin/locations'}
            className="btn-secondary flex items-center"
          >
            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
            Manage Locations
          </button>
          <button
            onClick={onViewSubmissions}
            className="btn-secondary flex items-center"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            View Submissions
          </button>
          <button
            onClick={onExportData}
            className="btn-primary flex items-center"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Submissions */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-trust-600">Total Submissions</p>
                <p className="text-3xl font-bold text-trust-900 mt-1">
                  {stats.totalSubmissions.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-health-600 mr-1" />
                  <span className="text-sm text-health-600 font-medium">
                    +{stats.todaySubmissions} today
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Outreach Locations */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-trust-600">Outreach Locations</p>
                <p className="text-3xl font-bold text-trust-900 mt-1">
                  {stats.totalOutreachLocations}
                </p>
                <p className="text-sm text-trust-500 mt-2">
                  Active programs
                </p>
              </div>
              <div className="w-12 h-12 bg-health-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-health-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-trust-600">Avg Risk Score</p>
                <p className="text-3xl font-bold text-trust-900 mt-1">
                  {(typeof stats.averageRiskScore === 'number' ? stats.averageRiskScore.toFixed(1) : '0.0')}
                </p>
                <div className="flex items-center mt-2">
                  {(typeof stats.averageRiskScore === 'number' && stats.averageRiskScore > 4) ? (
                    <>
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-sm text-orange-600 font-medium">High Risk</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-health-600 mr-1" />
                      <span className="text-sm text-health-600 font-medium">Manageable</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-medical-100 rounded-lg flex items-center justify-center">
                <HeartIcon className="w-6 h-6 text-medical-600" />
              </div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-trust-600">This Week</p>
                <p className="text-3xl font-bold text-trust-900 mt-1">
                  {stats.weekSubmissions}
                </p>
                <p className="text-sm text-trust-500 mt-2">
                  {stats.monthSubmissions} this month
                </p>
              </div>
              <div className="w-12 h-12 bg-trust-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-trust-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Risk Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-trust-900">Health Risk Distribution</h3>
            <p className="text-sm text-trust-600">Distribution of health risk levels across all submissions</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value, 'Submissions']}
                  labelFormatter={(label) => `${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {riskData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-trust-600">{item.name}</span>
                  <span className="text-sm font-medium text-trust-900 ml-auto">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BMI Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-trust-900">BMI Distribution</h3>
            <p className="text-sm text-trust-600">AI-estimated BMI categories from submitted photos</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bmiData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [value, 'People']}
                  labelFormatter={(label) => `${label} BMI`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bmiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Age and Gender Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Age Distribution */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-trust-900">Age Distribution</h3>
            <p className="text-sm text-trust-600">Estimated age ranges from AI analysis</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [value, 'People']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  fill="url(#ageGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="ageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-trust-900">Gender Distribution</h3>
            <p className="text-sm text-trust-600">AI-detected gender from photos</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'People']} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2 mt-4">
              {genderData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-trust-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-trust-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Locations */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-trust-900">Top Performing Outreach Locations</h3>
          <p className="text-sm text-trust-600">Locations with the highest submission rates and engagement</p>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-trust-200">
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Submissions</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Avg Risk Score</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.topLocations.map((location, index) => (
                  <tr key={index} className="border-b border-trust-100 hover:bg-trust-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-primary-600">
                            {index + 1}
                          </span>
                        </div>
                        <span className="font-medium text-trust-900">{location.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-trust-900">{location.submissions}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="font-medium text-trust-900 mr-2">
                          {(typeof location.riskScore === 'number' ? location.riskScore.toFixed(1) : '0.0')}
                        </span>
                        {(typeof location.riskScore === 'number' && location.riskScore > 4) ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            High Risk
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-health-100 text-health-800 text-xs rounded-full">
                            Low Risk
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-health-100 text-health-800 text-xs rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-trust-900">Recent Submissions</h3>
          <p className="text-sm text-trust-600">Latest health screening submissions across all locations</p>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-trust-200">
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Risk Level</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">BMI</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Device</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-trust-900">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSubmissions.slice(0, 10).map((submission, index) => (
                  <tr key={index} className="border-b border-trust-100 hover:bg-trust-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-trust-900">
                        {submission.firstName} {submission.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-trust-600">{submission.churchId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        submission.healthRiskLevel === 'Low' ? 'risk-low' :
                        submission.healthRiskLevel === 'Moderate' ? 'risk-moderate' :
                        submission.healthRiskLevel === 'High' ? 'risk-high' : 'risk-very-high'
                      }`}>
                        {submission.healthRiskLevel || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-trust-900">
                        {(typeof submission.estimatedBMI === 'number' ? submission.estimatedBMI.toFixed(1) : 'N/A')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-trust-600">
                        <div>{submission.deviceInfo?.device?.type || 'Unknown'}</div>
                        <div className="text-trust-400">
                          {submission.deviceInfo?.browser?.name || 'Unknown Browser'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-trust-600">
                        {format(new Date(submission.submissionDate), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        submission.followUpStatus === 'Completed' ? 'bg-health-100 text-health-800' :
                        submission.followUpStatus === 'Contacted' ? 'bg-primary-100 text-primary-800' :
                        submission.followUpStatus === 'Scheduled' ? 'bg-medical-100 text-medical-800' :
                        'bg-trust-100 text-trust-800'
                      }`}>
                        {submission.followUpStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SMS Management */}
      {onRefresh && (
        <SMSManagement 
          submissions={stats.recentSubmissions} 
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
} 