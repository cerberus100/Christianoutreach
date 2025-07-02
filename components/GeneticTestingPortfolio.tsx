import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface HealthSubmission {
  id: string;
  name: string;
  age: number;
  gender: string;
  healthRiskScore: number;
  familyHistory: {
    diabetes: boolean;
    hypertension: boolean;
    dementia: boolean;
    heartDisease: boolean;
  };
  symptoms: {
    nervePain: boolean;
    memoryIssues: boolean;
    balanceProblems: boolean;
    visionChanges: boolean;
  };
  estimatedBMI: number;
  bmiCategory: string;
}

interface MedicalRecommendation {
  category: string;
  title: string;
  description: string;
  specialists: Array<{
    type: string;
    reason: string;
    urgency: 'Immediate' | 'Soon' | 'Routine';
    tests: string[];
  }>;
  priority: 'High' | 'Medium' | 'Low';
}

interface HealthAnalysisProps {
  submission: HealthSubmission;
  onRecommendationUpdate?: (recommendations: string[]) => void;
}

const HealthAnalysisPortfolio: React.FC<HealthAnalysisProps> = ({ 
  submission, 
  onRecommendationUpdate 
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['diabetes']));
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());

  // Calculate risk factors and generate medical recommendations
  const generateMedicalRecommendations = (): MedicalRecommendation[] => {
    const recommendations: MedicalRecommendation[] = [];

    // Diabetes-related recommendations
    if (submission.familyHistory.diabetes || submission.healthRiskScore >= 6 || submission.estimatedBMI >= 25) {
      recommendations.push({
        category: 'diabetes',
        title: 'Diabetes Prevention & Management',
        description: 'Based on family history and risk factors, comprehensive diabetes screening is recommended',
        specialists: [
          {
            type: 'Endocrinologist',
            reason: 'Diabetes specialist for comprehensive metabolic evaluation',
            urgency: submission.healthRiskScore >= 8 ? 'Immediate' : 'Soon',
            tests: ['HbA1c', 'Fasting Glucose', 'Oral Glucose Tolerance Test', 'Insulin Levels']
          },
          {
            type: 'Registered Dietitian',
            reason: 'Nutritional counseling for diabetes prevention',
            urgency: 'Soon',
            tests: ['Dietary Assessment', 'Meal Planning', 'Carbohydrate Counting Education']
          }
        ],
        priority: 'High'
      });
    }

    // Cardiovascular recommendations
    if (submission.familyHistory.heartDisease || submission.familyHistory.hypertension || submission.healthRiskScore >= 5) {
      recommendations.push({
        category: 'cardiovascular',
        title: 'Heart Health Assessment',
        description: 'Family history indicates need for comprehensive cardiovascular evaluation',
        specialists: [
          {
            type: 'Cardiologist',
            reason: 'Heart disease risk assessment and prevention',
            urgency: submission.healthRiskScore >= 7 ? 'Soon' : 'Routine',
            tests: ['Lipid Panel', 'Blood Pressure Monitoring', 'ECG', 'Echocardiogram']
          },
          {
            type: 'Primary Care Physician',
            reason: 'Blood pressure management and monitoring',
            urgency: 'Soon',
            tests: ['Blood Pressure Check', 'Cholesterol Screening', 'BMI Assessment']
          }
        ],
        priority: 'High'
      });
    }

    // Neurological recommendations
    if (submission.familyHistory.dementia || submission.symptoms.memoryIssues || submission.symptoms.nervePain) {
      recommendations.push({
        category: 'neurological',
        title: 'Brain Health & Memory Assessment',
        description: 'Neurological evaluation recommended for memory concerns and family history',
        specialists: [
          {
            type: 'Neurologist',
            reason: 'Memory assessment and neurological evaluation',
            urgency: submission.symptoms.memoryIssues ? 'Soon' : 'Routine',
            tests: ['Cognitive Assessment', 'Brain MRI', 'Blood Work for Dementia', 'Memory Testing']
          },
          {
            type: 'Geriatrician',
            reason: 'Comprehensive aging and memory care',
            urgency: 'Routine',
            tests: ['Comprehensive Geriatric Assessment', 'Fall Risk Assessment', 'Medication Review']
          }
        ],
        priority: submission.symptoms.memoryIssues ? 'High' : 'Medium'
      });
    }

    // Nerve/balance issues
    if (submission.symptoms.nervePain || submission.symptoms.balanceProblems) {
      recommendations.push({
        category: 'neurology',
        title: 'Nerve Function & Balance',
        description: 'Neurological symptoms require evaluation for neuropathy and balance disorders',
        specialists: [
          {
            type: 'Neurologist',
            reason: 'Nerve pain and balance problem evaluation',
            urgency: 'Soon',
            tests: ['Nerve Conduction Study', 'EMG', 'Balance Testing', 'Vitamin B12 Levels']
          },
          {
            type: 'Physical Therapist',
            reason: 'Balance and mobility assessment',
            urgency: 'Soon',
            tests: ['Balance Assessment', 'Gait Analysis', 'Fall Risk Evaluation']
          }
        ],
        priority: 'High'
      });
    }

    // Vision concerns
    if (submission.symptoms.visionChanges || submission.familyHistory.diabetes) {
      recommendations.push({
        category: 'vision',
        title: 'Eye Health & Vision Care',
        description: 'Vision changes and diabetes risk require comprehensive eye examination',
        specialists: [
          {
            type: 'Ophthalmologist',
            reason: 'Comprehensive eye examination and diabetic retinopathy screening',
            urgency: submission.symptoms.visionChanges ? 'Soon' : 'Routine',
            tests: ['Dilated Eye Exam', 'Retinal Photography', 'Visual Field Test', 'Glaucoma Screening']
          },
          {
            type: 'Optometrist',
            reason: 'Regular vision screening and glasses prescription',
            urgency: 'Routine',
            tests: ['Vision Test', 'Prescription Update', 'Eye Pressure Check']
          }
        ],
        priority: submission.symptoms.visionChanges ? 'High' : 'Medium'
      });
    }

    return recommendations;
  };

  const medicalRecommendations = generateMedicalRecommendations();

  const toggleSection = (category: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedSections(newExpanded);
  };

  const toggleRecommendation = (recommendation: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(recommendation)) {
      newSelected.delete(recommendation);
    } else {
      newSelected.add(recommendation);
    }
    setSelectedRecommendations(newSelected);
    
    if (onRecommendationUpdate) {
      onRecommendationUpdate(Array.from(newSelected));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate': return 'bg-red-500 text-white';
      case 'Soon': return 'bg-yellow-500 text-white';
      case 'Routine': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskLevel = () => {
    if (submission.healthRiskScore >= 8) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700' };
    if (submission.healthRiskScore >= 6) return { level: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🏥 Medical Recommendations & Doctor Referrals
        </h2>
        <p className="text-gray-600">
          Healthcare guidance for {submission.name} based on risk assessment and symptoms
        </p>
      </div>

      {/* Risk Assessment */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Health Risk Level</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskLevel.textColor} bg-opacity-20`}>
            {riskLevel.level} Risk
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full ${riskLevel.color} transition-all duration-500`}
            style={{ width: `${Math.min(submission.healthRiskScore * 10, 100)}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Risk Score: {submission.healthRiskScore}/10 - 
          {submission.healthRiskScore >= 8 && ' Multiple specialists recommended for comprehensive care'}
          {submission.healthRiskScore >= 6 && submission.healthRiskScore < 8 && ' Several medical evaluations needed'}
          {submission.healthRiskScore < 6 && ' Preventive care and routine screenings recommended'}
        </p>
      </div>

      {/* Medical Recommendations */}
      <div className="space-y-4">
        {medicalRecommendations.map((recommendation) => (
          <div key={recommendation.category} className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer flex items-center justify-between hover:from-blue-100 hover:to-indigo-100 transition-colors"
              onClick={() => toggleSection(recommendation.category)}
            >
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(recommendation.priority)}`}>
                  {recommendation.priority}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                  <p className="text-sm text-gray-600">{recommendation.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {recommendation.specialists.length} Specialist{recommendation.specialists.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {recommendation.specialists.filter(s => s.urgency === 'Immediate').length > 0 ? 'Immediate' : 
                     recommendation.specialists.filter(s => s.urgency === 'Soon').length > 0 ? 'Soon' : 'Routine'}
                  </p>
                </div>
                {expandedSections.has(recommendation.category) ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>

            {expandedSections.has(recommendation.category) && (
              <div className="p-4 bg-white">
                <div className="space-y-4">
                  {recommendation.specialists.map((specialist, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedRecommendations.has(`${recommendation.category}-${specialist.type}`)}
                            onChange={() => toggleRecommendation(`${recommendation.category}-${specialist.type}`)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{specialist.type}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(specialist.urgency)}`}>
                                {specialist.urgency}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{specialist.reason}</p>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700">Recommended Tests/Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {specialist.tests.map((test, testIndex) => (
                                  <span key={testIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {test}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {medicalRecommendations.reduce((total, rec) => total + rec.specialists.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Specialists</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {medicalRecommendations.filter(rec => rec.priority === 'High').length}
            </div>
            <div className="text-sm text-gray-600">High Priority Areas</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {medicalRecommendations.reduce((total, rec) => 
                total + rec.specialists.filter(s => s.urgency === 'Immediate' || s.urgency === 'Soon').length, 0
              )}
            </div>
            <div className="text-sm text-gray-600">Urgent Referrals</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">📋 Next Steps:</span>
            <span>Start with highest priority specialists, then schedule routine follow-ups.</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
            <span className="font-medium">💡 Tip:</span>
            <span>Coordinate care between specialists and share this assessment with each doctor.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthAnalysisPortfolio; 