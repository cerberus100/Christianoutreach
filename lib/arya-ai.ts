import axios from 'axios';

export interface AryaAIResponse {
  bmi: {
    value: number;
    range: string;
    category: string;
  };
  age: {
    estimated: number;
    range: string;
  };
  gender: {
    predicted: string;
    confidence: number;
  };
  success: boolean;
  message?: string;
}

export class AryaAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ARYA_AI_API_KEY || '';
    this.baseUrl = process.env.ARYA_AI_BASE_URL || 'https://api.arya.ai';
  }

  async analyzeSelfie(imageBuffer: Buffer, mimeType: string): Promise<AryaAIResponse> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      const response = await axios.post(
        `${this.baseUrl}/face-to-bmi`,
        {
          image: dataUri,
          include_demographics: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // Transform response to our interface
      const data = response.data;
      
      return {
        bmi: {
          value: data.bmi?.value || 0,
          range: data.bmi?.range || 'Unknown',
          category: this.getBMICategory(data.bmi?.value || 0),
        },
        age: {
          estimated: data.age?.estimated || 0,
          range: data.age?.range || 'Unknown',
        },
        gender: {
          predicted: data.gender?.predicted || 'Unknown',
          confidence: data.gender?.confidence || 0,
        },
        success: true,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      console.error('Arya.ai API Error:', errorMessage);
      
      return {
        bmi: { value: 0, range: 'Unknown', category: 'Unknown' },
        age: { estimated: 0, range: 'Unknown' },
        gender: { predicted: 'Unknown', confidence: 0 },
        success: false,
        message: errorMessage,
      };
    }
  }

  private getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  // Health status assessment based on BMI and responses
  assessHealthRisk(
    bmi: number, 
    familyHistoryDiabetes: boolean,
    familyHistoryHighBP: boolean,
    familyHistoryDementia: boolean,
    nerveSymptoms: boolean
  ): {
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
    riskScore: number;
    recommendations: string[];
  } {
    let riskScore = 0;
    const recommendations: string[] = [];

    // BMI risk factors
    if (bmi >= 30) {
      riskScore += 3;
      recommendations.push('Consider weight management programs');
    } else if (bmi >= 25) {
      riskScore += 2;
      recommendations.push('Maintain healthy weight through diet and exercise');
    }

    // Family history risk factors
    if (familyHistoryDiabetes) {
      riskScore += 2;
      recommendations.push('Regular blood glucose monitoring recommended');
    }

    if (familyHistoryHighBP) {
      riskScore += 2;
      recommendations.push('Regular blood pressure monitoring recommended');
    }

    if (familyHistoryDementia) {
      riskScore += 1;
      recommendations.push('Consider cognitive health maintenance activities');
    }

    if (nerveSymptoms) {
      riskScore += 2;
      recommendations.push('Consult healthcare provider about neuropathy symptoms');
    }

    // Determine risk level
    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
    if (riskScore <= 2) riskLevel = 'Low';
    else if (riskScore <= 4) riskLevel = 'Moderate';
    else if (riskScore <= 6) riskLevel = 'High';
    else riskLevel = 'Very High';

    // Add general recommendations
    recommendations.push('Maintain regular physical activity');
    recommendations.push('Follow a balanced, nutritious diet');
    recommendations.push('Schedule regular healthcare checkups');

    return {
      riskLevel,
      riskScore,
      recommendations,
    };
  }
}

export const aryaAI = new AryaAIService(); 