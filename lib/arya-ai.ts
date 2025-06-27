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
    // Use the provided API key or fallback to environment variable
    this.apiKey = process.env.ARYA_AI_API_KEY || '9973adccf0603e95f42ae7bf4bd8a018';
    this.baseUrl = 'https://ping.arya.ai/api/v1';
  }

  async analyzeSelfie(imageBuffer: Buffer, _mimeType: string): Promise<AryaAIResponse> {
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Generate unique request ID
      const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const requestBody = {
        req_id: reqId,
        doc_base64: base64Image,
        doc_type: 'image'
      };

      const response = await axios.post(
        `${this.baseUrl}/face-to-bmi`,
        requestBody,
        {
          headers: {
            'token': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // Handle Arya.ai response format
      const responseData = response.data;
      
      if (!responseData.success) {
        throw new Error(responseData.error_message || 'API request failed');
      }

      // Parse the data field which contains the BMI analysis
      const analysisData = responseData.data;
      
      // Extract BMI, age, and gender from the analysis data
      // Note: The actual structure of 'data' field may vary, adjust as needed
      const bmiValue = analysisData?.bmi || analysisData?.estimated_bmi || 0;
      const estimatedAge = analysisData?.age || analysisData?.estimated_age || 0;
      const predictedGender = analysisData?.gender || analysisData?.predicted_gender || 'Unknown';
      const genderConfidence = analysisData?.gender_confidence || 0;

      return {
        bmi: {
          value: bmiValue,
          range: this.getBMIRange(bmiValue),
          category: this.getBMICategory(bmiValue),
        },
        age: {
          estimated: estimatedAge,
          range: this.getAgeRange(estimatedAge),
        },
        gender: {
          predicted: predictedGender,
          confidence: genderConfidence,
        },
        success: true,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      console.error('Arya.ai API Error:', errorMessage);
      
      // Return fallback response
      return {
        bmi: { value: 25, range: '20-30', category: 'Normal weight' },
        age: { estimated: 35, range: '30-40' },
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

  private getBMIRange(bmi: number): string {
    if (bmi < 18.5) return '< 18.5';
    if (bmi < 25) return '18.5-24.9';
    if (bmi < 30) return '25-29.9';
    return '≥ 30';
  }

  private getAgeRange(age: number): string {
    const lowerBound = Math.floor(age / 10) * 10;
    const upperBound = lowerBound + 9;
    return `${lowerBound}-${upperBound}`;
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