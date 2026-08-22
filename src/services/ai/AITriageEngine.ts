import {
  AIChatMessage,
  EmergencyService,
  ServiceCategory,
  SituationType,
  UrgencyLevel,
  UserLocation,
} from '../../types';
import { ServiceRanker } from '../directory/ServiceRanker';

export interface AIClassificationResult {
  situationType: SituationType;
  urgencyLevel: UrgencyLevel;
  confidenceScore: number;
  serviceCategory: ServiceCategory;
  aiSummary: string;
  firstResponseGuidance: string[];
  followUpQuestions?: string[];
  isInsufficientData: boolean;
}

export class AITriageEngine {
  /**
   * Process natural language emergency description with intelligent triage & safety guardrails
   */
  public static async analyzeEmergencyText(
    inputText: string,
    location: UserLocation,
    language: 'en' | 'hi' = 'en'
  ): Promise<{
    message: AIChatMessage;
    classification: AIClassificationResult;
  }> {
    const textLower = inputText.toLowerCase();

    // 1. Check for Accident / Crash / Fall keywords
    const isAccident =
      textLower.includes('accident') ||
      textLower.includes('crash') ||
      textLower.includes('collision') ||
      textLower.includes('hit') ||
      textLower.includes('rollover') ||
      textLower.includes('blood') ||
      textLower.includes('injured') ||
      textLower.includes('unconscious') ||
      textLower.includes('bleeding') ||
      textLower.includes('दुर्घटना') ||
      textLower.includes('चोट') ||
      textLower.includes('टक्कर');

    // 2. Check for Medical Emergency
    const isMedical =
      textLower.includes('chest pain') ||
      textLower.includes('breathing') ||
      textLower.includes('heart attack') ||
      textLower.includes('fainted') ||
      textLower.includes('stroke') ||
      textLower.includes('बेहोश') ||
      textLower.includes('सांस');

    // 3. Check for Flat Tyre / Puncture
    const isTyre =
      textLower.includes('tyre') ||
      textLower.includes('tire') ||
      textLower.includes('puncture') ||
      textLower.includes('flat') ||
      textLower.includes('burst') ||
      textLower.includes('पंचर') ||
      textLower.includes('टायर');

    // 4. Check for Breakdown / Mechanical
    const isBreakdown =
      textLower.includes('breakdown') ||
      textLower.includes('engine') ||
      textLower.includes('smoke') ||
      textLower.includes('towing') ||
      textLower.includes('tow') ||
      textLower.includes('stuck') ||
      textLower.includes('battery') ||
      textLower.includes('start') ||
      textLower.includes('खराब') ||
      textLower.includes('टोइंग');

    // 5. Check for Fuel Out
    const isFuel =
      textLower.includes('fuel') ||
      textLower.includes('petrol') ||
      textLower.includes('diesel') ||
      textLower.includes('gas') ||
      textLower.includes('empty tank') ||
      textLower.includes('पेट्रोल') ||
      textLower.includes('डीजल');

    let situationType: SituationType = 'other';
    let urgencyLevel: UrgencyLevel = 'moderate';
    let serviceCategory: ServiceCategory = 'police';
    let confidenceScore = 0.85;
    let isInsufficientData = false;
    let aiSummary = '';
    let guidance: string[] = [];
    let followUpQuestions: string[] = [];

    if (isAccident) {
      situationType = 'accident';
      urgencyLevel = 'critical';
      serviceCategory = 'hospital';
      confidenceScore = 0.94;
      aiSummary =
        language === 'hi'
          ? 'संभावित सड़क दुर्घटना की पहचान हुई है। तत्काल चिकित्सा व आपातकालीन सहायता प्राथमिकता पर है।'
          : 'Possible road collision reported. Critical medical and emergency trauma response prioritized.';
      guidance =
        language === 'hi'
          ? [
              '1. सुरक्षित दूरी पर वाहन रोकें और हैजर्ड लाइट्स (फ्लैशर्स) ऑन करें।',
              '2. यदि कोई घायल है, तो गर्दन को हिलाए बिना स्थिर रखें।',
              '3. राष्ट्रीय आपातकालीन नंबर 112 या 108 पर तत्काल कॉल करें।',
              '4. आने वाले ट्रैफिक की दिशा में चेतावनी त्रिकोण (ट्रायंगल) रखें।',
            ]
          : [
              '1. Turn on vehicle hazard lights immediately and move to safety if possible.',
              '2. Check for injuries. Do not move severely injured persons unless in direct fire/traffic danger.',
              '3. Call National Emergency 112 or 108 Ambulance immediately.',
              '4. Place warning reflective triangle 50 meters behind your vehicle on highways.',
            ];
      followUpQuestions =
        language === 'hi'
          ? ['क्या कोई व्यक्ति गंभीर रूप से घायल है?', 'कितने वाहन या यात्री शामिल हैं?']
          : ['Is anyone severely injured or unconscious?', 'How many vehicles or passengers are involved?'];
    } else if (isMedical) {
      situationType = 'medical';
      urgencyLevel = 'critical';
      serviceCategory = 'ambulance';
      confidenceScore = 0.95;
      aiSummary =
        language === 'hi'
          ? 'गंभीर चिकित्सीय आपातकाल की पहचान हुई है। 108 एम्बुलेंस और निकटतम अस्पताल अनुशंसित हैं।'
          : 'Critical medical emergency identified. 108 ALS Ambulance and trauma care prioritized.';
      guidance =
        language === 'hi'
          ? [
              '1. मरीज को आरामदायक स्थिति में बैठाएं/लेटाएं।',
              '2. तंग कपड़े ढीले करें और ताजी हवा आने दें।',
              '3. 108 या 112 पर कॉल करके लाइव लोकेशन शेयर करें।',
            ]
          : [
              '1. Keep patient calm, seated, or resting in recovery position.',
              '2. Loosen tight clothing and ensure unobstructed airway.',
              '3. Connect immediately with 108 Ambulance or nearest emergency center.',
            ];
      followUpQuestions =
        language === 'hi'
          ? ['क्या मरीज होश में है और सांस ले रहा है?', 'क्या मरीज को पहले से कोई दिल या अन्य बीमारी है?']
          : ['Is the patient conscious and breathing?', 'Does the patient have prior cardiac or medical history?'];
    } else if (isTyre) {
      situationType = 'flat_tyre';
      urgencyLevel = 'moderate';
      serviceCategory = 'puncture_repair';
      confidenceScore = 0.92;
      aiSummary =
        language === 'hi'
          ? 'टायर पंचर / बर्स्ट की स्थिति। निकटतम मोबाइल पंचर रिपेयर और मैकेनिक अनुशंसित हैं।'
          : 'Tyre puncture or flat reported. Nearby mobile tyre repair and puncture assistance prioritized.';
      guidance =
        language === 'hi'
          ? [
              '1. वाहन को सड़क के बाईं ओर (शोल्डर) सुरक्षित समतल स्थान पर पार्क करें।',
              '2. हैजर्ड लाइट्स चालू करें और हैंडब्रेक लगाएं।',
              '3. यदि हाईवे पर हैं, तो वाहन के पीछे खड़े न रहें, रेलिंग के पार सुरक्षित प्रतीक्षा करें।',
            ]
          : [
              '1. Pull vehicle completely onto the left shoulder on flat, level ground.',
              '2. Engage hazard lights and set the parking brake firmly.',
              '3. If on an expressway (NHAI), stand behind the highway barrier while waiting for help.',
            ];
      followUpQuestions =
        language === 'hi'
          ? ['क्या आपके पास स्पेयर स्टेपनी और जैक उपलब्ध है?', 'क्या आप किसी एक्सप्रेसवे / हाईवे पर हैं?']
          : ['Do you have a spare wheel and jack?', 'Are you located on a high-speed expressway/highway?'];
    } else if (isBreakdown) {
      situationType = 'breakdown';
      urgencyLevel = 'high';
      serviceCategory = 'towing';
      confidenceScore = 0.9;
      aiSummary =
        language === 'hi'
          ? 'वाहन ब्रेकडाउन की स्थिति। 24x7 टोइंग क्रेन एवं ऑन-स्पॉट मैकेनिक अनुशंसित हैं।'
          : 'Vehicle mechanical breakdown reported. 24x7 flatbed towing and roadside assistance prioritized.';
      guidance =
        language === 'hi'
          ? [
              '1. बोनट या हैजर्ड लाइट खोलकर अन्य चालकों को सचेत करें।',
              '2. राष्ट्रीय राजमार्ग पर एनएचएआई हेल्पलाइन 1033 पर निशुल्क सहायता मांग सकते हैं।',
              '3. नीचे दी गई सूची से निकटतम टोइंग ऑपरेटर को कॉल करें।',
            ]
          : [
              '1. Switch on emergency hazard flashers and pop the hood.',
              '2. If on a National Highway, dial NHAI 1033 for free breakdown escort/towing.',
              '3. Select the highest ranked flatbed towing service below.',
            ];
      followUpQuestions =
        language === 'hi'
          ? ['क्या गाड़ी का इंजन स्टार्ट हो रहा है?', 'क्या धुआं या असामान्य आवाज आ रही है?']
          : ['Is the vehicle completely immobile?', 'Is there smoke or severe fluid leakage?'];
    } else if (isFuel) {
      situationType = 'fuel_out';
      urgencyLevel = 'moderate';
      serviceCategory = 'fuel';
      confidenceScore = 0.88;
      aiSummary =
        language === 'hi'
          ? 'ईंधन समाप्त होने की स्थिति। निकटतम पेट्रोल पंप व आपातकालीन फ्यूल डिलीवरी सेवा।'
          : 'Fuel shortage / empty tank. Nearest 24x7 petrol pumps and roadside fuel delivery listed.';
      guidance =
        language === 'hi'
          ? [
              '1. वाहन को सुरक्षित किनारे रोकें ताकि मुख्य सड़क अवरुद्ध न हो।',
              '2. निकटतम पेट्रोल पंप का मार्ग देखें या रोडसाइड असिस्टेंस को संपर्क करें।',
            ]
          : [
              '1. Coast vehicle safely to the road shoulder out of traffic flow.',
              '2. Check below for nearest fuel stations or request on-spot emergency fuel delivery.',
            ];
    } else {
      isInsufficientData = true;
      confidenceScore = 0.45;
      aiSummary =
        language === 'hi'
          ? 'अधूरी जानकारी। कृपया स्पष्ट करें कि क्या कोई दुर्घटना, ब्रेकडाउन, या चिकित्सीय आपातकाल है।'
          : 'Insufficient data provided. Please specify if this is an accident, mechanical breakdown, medical issue, or puncture.';
      guidance = [
        'Call 112 immediately for any urgent life-safety emergency.',
        'Describe your emergency clearly with landmarks.',
      ];
      followUpQuestions = [
        'Are you in physical danger or experiencing a medical crisis?',
        'Can your vehicle be safely driven to the side of the road?',
      ];
    }

    const classification: AIClassificationResult = {
      situationType,
      urgencyLevel,
      confidenceScore,
      serviceCategory,
      aiSummary,
      firstResponseGuidance: guidance,
      followUpQuestions,
      isInsufficientData,
    };

    // Rank services matching this triage result
    const recommendedServices = ServiceRanker.rankServices({
      userLocation: location,
      situationType,
      categoryFilter: serviceCategory,
      maxDistanceKm: 75,
    }).slice(0, 3);

    const botMessage: AIChatMessage = {
      id: `ai_${Date.now()}`,
      sender: 'assistant',
      text: aiSummary,
      timestamp: Date.now(),
      categorySuggestion: serviceCategory,
      followUpOptions: followUpQuestions,
      isSafetyGuidance: true,
      recommendedServices,
      extractedFacts: {
        hazardLevel: urgencyLevel,
        injuries: isAccident || isMedical,
      },
    };

    return { message: botMessage, classification };
  }
}
