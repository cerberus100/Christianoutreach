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

interface TestingPhase {
  phase: number;
  title: string;
  description: string;
  tests: Array<{
    name: string;
    genes: string[];
    cost: string;
    timeline: string;
    priority: 'High' | 'Medium' | 'Low';
    description: string;
  }>;
  totalCost: string;
  timeframe: string;
}

interface GeneticTestingPortfolioProps {
  submission: HealthSubmission;
  onRecommendationUpdate?: (recommendations: string[]) => void;
}

const GeneticTestingPortfolio: React.FC<GeneticTestingPortfolioProps> = ({ 
  submission, 
  onRecommendationUpdate 
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]));
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  // Calculate risk complexity based on submission data
  const calculateRiskComplexity = () => {
    let complexity = 0;
    
    // Family history factors (max 40 points)
    const familyConditions = Object.values(submission.familyHistory).filter(Boolean).length;
    complexity += familyConditions * 10;
    
    // Symptom factors (max 30 points)
    const symptoms = Object.values(submission.symptoms).filter(Boolean).length;
    complexity += symptoms * 7.5;
    
    // Age factor (max 20 points)
    if (submission.age > 50) complexity += 20;
    else if (submission.age > 35) complexity += 15;
    else complexity += 10;
    
    // Health risk score (max 10 points)
    complexity += submission.healthRiskScore;
    
    return Math.min(complexity, 100);
  };

  const riskComplexity = calculateRiskComplexity();
  
  const getComplexityLevel = () => {
    if (riskComplexity >= 70) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700' };
    if (riskComplexity >= 50) return { level: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const complexity = getComplexityLevel();

  // Generate testing phases based on risk profile
  const generateTestingPhases = (): TestingPhase[] => {
    const phases: TestingPhase[] = [
      {
        phase: 1,
        title: 'Immediate Priority Testing',
        description: 'Essential genetic markers based on your risk profile',
        tests: [
          {
            name: 'APOE Genotyping',
            genes: ['APOE ε2/ε3/ε4'],
            cost: '$200-300',
            timeline: '1-2 weeks',
            priority: 'High',
            description: 'Alzheimer\'s disease risk assessment - critical for dementia family history'
          },
          {
            name: 'Cardiovascular Risk Panel',
            genes: ['LDLR', 'APOB', 'PCSK9', 'LDLRAP1'],
            cost: '$400-600',
            timeline: '2-3 weeks',
            priority: 'High',
            description: 'Genetic variants affecting cholesterol and heart disease risk'
          }
        ],
        totalCost: '$600-900',
        timeframe: '2-3 weeks'
      }
    ];

    // Add diabetes testing if family history present
    if (submission.familyHistory.diabetes) {
      phases[0].tests.push({
        name: 'Diabetes Susceptibility Panel',
        genes: ['HNF1A', 'HNF4A', 'GCK', 'ABCC8', 'KCNJ11'],
        cost: '$350-500',
        timeline: '2-3 weeks',
        priority: 'High',
        description: 'MODY and Type 2 diabetes genetic risk factors'
      });
      phases[0].totalCost = '$950-1,400';
    }

    // Add neuropathy testing if symptoms present
    if (submission.symptoms.nervePain || submission.symptoms.balanceProblems) {
      phases[0].tests.push({
        name: 'Peripheral Neuropathy Panel',
        genes: ['PMP22', 'GJB1', 'MPZ', 'NEFL'],
        cost: '$300-450',
        timeline: '2-3 weeks',
        priority: 'Medium',
        description: 'Hereditary neuropathy genetic markers'
      });
      phases[0].totalCost = '$1,250-1,850';
    }

    // Add Phase 2 for high complexity cases
    if (riskComplexity >= 60) {
      phases.push({
        phase: 2,
        title: 'Comprehensive Analysis (If Phase 1 Positive)',
        description: 'Advanced genetic profiling for complex cases',
        tests: [
          {
            name: 'Neurodegeneration Panel',
            genes: ['PSEN1', 'PSEN2', 'APP', 'GRN', 'C9ORF72', 'MAPT', 'FTD genes'],
            cost: '$800-1,200',
            timeline: '3-4 weeks',
            priority: 'High',
            description: 'Comprehensive early-onset dementia and FTD analysis'
          },
          {
            name: 'Whole Exome Sequencing',
            genes: ['20,000+ protein-coding genes'],
            cost: '$1,500-2,500',
            timeline: '4-6 weeks',
            priority: 'Medium',
            description: 'Complete genetic profile for rare variant discovery'
          },
          {
            name: 'Polygenic Risk Scoring',
            genes: ['100+ variants combined'],
            cost: '$300-500',
            timeline: '1-2 weeks',
            priority: 'Medium',
            description: 'AI-enhanced risk prediction across multiple conditions'
          }
        ],
        totalCost: '$2,600-4,200',
        timeframe: '4-6 weeks'
      });
    }

    // Add Phase 3 for research-level cases
    if (riskComplexity >= 80) {
      phases.push({
        phase: 3,
        title: 'Research & Clinical Trials',
        description: 'Cutting-edge genetic research participation',
        tests: [
          {
            name: 'Multi-omics Analysis',
            genes: ['Genetics + Epigenetics + Metabolomics'],
            cost: 'Research funded',
            timeline: '6-12 weeks',
            priority: 'Low',
            description: 'Comprehensive molecular profiling (research setting)'
          },
          {
            name: 'Family Cascade Testing',
            genes: ['Identified variants in relatives'],
            cost: '$200-400/person',
            timeline: 'Ongoing',
            priority: 'Medium',
            description: 'Testing family members for identified variants'
          }
        ],
        totalCost: 'Variable/Research',
        timeframe: '6+ weeks'
      });
    }

    return phases;
  };

  const testingPhases = generateTestingPhases();

  const togglePhase = (phase: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phase)) {
      newExpanded.delete(phase);
    } else {
      newExpanded.add(phase);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleTest = (testName: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testName)) {
      newSelected.delete(testName);
    } else {
      newSelected.add(testName);
    }
    setSelectedTests(newSelected);
    
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

  const getTotalEstimatedCost = () => {
    return testingPhases.reduce((total, phase) => {
      const costs = phase.totalCost.split('-');
      if (costs.length === 2) {
        const max = parseInt(costs[1].replace(/[^0-9]/g, ''));
        return total + max;
      }
      return total;
    }, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧬 Personalized Genetic Testing Portfolio
        </h2>
        <p className="text-gray-600">
          Tailored recommendations for {submission.name} based on comprehensive risk assessment
        </p>
      </div>

      {/* Risk Complexity Indicator */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Risk Complexity Level</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${complexity.textColor} bg-opacity-20`}>
            {complexity.level} Risk
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full ${complexity.color} transition-all duration-500`}
            style={{ width: `${riskComplexity}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low (0-49%)</span>
          <span>Moderate (50-69%)</span>
          <span>High (70-100%)</span>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Complexity Score: {Math.round(riskComplexity)}% - 
          {riskComplexity >= 70 && ' Comprehensive genetic evaluation strongly recommended'}
          {riskComplexity >= 50 && riskComplexity < 70 && ' Targeted genetic testing recommended'}
          {riskComplexity < 50 && ' Standard screening with selective testing'}
        </p>
      </div>

      {/* Testing Phases */}
      <div className="space-y-4">
        {testingPhases.map((phase) => (
          <div key={phase.phase} className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer flex items-center justify-between hover:from-blue-100 hover:to-indigo-100 transition-colors"
              onClick={() => togglePhase(phase.phase)}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {phase.phase}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{phase.title}</h3>
                  <p className="text-sm text-gray-600">{phase.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{phase.totalCost}</p>
                  <p className="text-xs text-gray-500">{phase.timeframe}</p>
                </div>
                {expandedPhases.has(phase.phase) ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>

            {expandedPhases.has(phase.phase) && (
              <div className="p-4 bg-white">
                <div className="space-y-4">
                  {phase.tests.map((test, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedTests.has(test.name)}
                            onChange={() => toggleTest(test.name)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{test.name}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(test.priority)}`}>
                                {test.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {test.genes.map((gene, geneIndex) => (
                                <span key={geneIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono">
                                  {gene}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <p className="text-sm font-medium text-gray-900">{test.cost}</p>
                          <p className="text-xs text-gray-500">{test.timeline}</p>
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
              ${getTotalEstimatedCost().toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Max Total Investment</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {testingPhases.length}
            </div>
            <div className="text-sm text-gray-600">Testing Phases</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              85%
            </div>
            <div className="text-sm text-gray-600">Insurance Pre-auth Likely</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">💡 Pro Tip:</span>
            <span>Start with Phase 1 testing. Results will guide whether Phase 2+ is needed.</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
            <span className="font-medium">📋 Next Steps:</span>
            <span>Genetic counseling consultation recommended before testing begins.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneticTestingPortfolio; 