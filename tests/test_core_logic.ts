import { AnomalyDetector } from '../src/services/sensor/AnomalyDetector';
import { ServiceRanker } from '../src/services/directory/ServiceRanker';
import { AITriageEngine } from '../src/services/ai/AITriageEngine';
import { INDIA_EMERGENCY_SERVICES, NATIONAL_HELPLINES } from '../src/data/indiaEmergencyServices';
import { UserLocation } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RESQROUTE-A (v2.0) TEST & VERIFICATION SUITE');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST 1: Anomaly Detector - Highway Crash Collision
  // ----------------------------------------------------
  console.log('--- TEST 1: High-Speed Collision Detection ---');
  const crashHistory = [
    {
      timestamp: Date.now() - 1000,
      accel: { x: 0.1, y: 0.1, z: 1.0, magnitude: 1.0, jerk: 0 },
      gyro: { x: 0.1, y: 0.1, z: 0.1, magnitude: 0.15 },
      speedKmH: 85,
    },
  ];
  const crashCurrent = {
    timestamp: Date.now(),
    accel: { x: 5.0, y: -6.0, z: 8.0, magnitude: 11.18, jerk: 45 },
    gyro: { x: 6.5, y: 8.0, z: 5.0, magnitude: 11.45 },
    speedKmH: 0,
  };

  const crashResult = AnomalyDetector.evaluateFrame(crashCurrent, crashHistory);
  assert(
    crashResult.eventType === 'POSSIBLE_ACCIDENT',
    `Expected POSSIBLE_ACCIDENT, got ${crashResult.eventType}`
  );
  assert(
    crashResult.confidenceScore >= 0.7,
    `Expected confidence >= 0.7, got ${crashResult.confidenceScore}`
  );
  assert(
    crashResult.snapshot.speed_before === 85 && crashResult.snapshot.speed_after === 0,
    'Expected speed drop from 85 to 0 captured in snapshot'
  );

  // ----------------------------------------------------
  // TEST 2: Anomaly Detector - Pothole False Positive Suppression
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Pothole / Rough Road False-Positive Suppression ---');
  AnomalyDetector.resetCooldown();
  const potholeHistory = [
    {
      timestamp: Date.now() - 500,
      accel: { x: 0.1, y: 0.1, z: 1.0, magnitude: 1.0, jerk: 0 },
      gyro: { x: 0.1, y: 0.1, z: 0.1, magnitude: 0.1 },
      speedKmH: 45,
    },
  ];
  const potholeCurrent = {
    timestamp: Date.now(),
    accel: { x: 0.2, y: 0.1, z: 3.5, magnitude: 3.51, jerk: 20 },
    gyro: { x: 0.1, y: 0.2, z: 0.1, magnitude: 0.24 }, // minimal gyro
    speedKmH: 45, // steady speed
  };

  const potholeResult = AnomalyDetector.evaluateFrame(potholeCurrent, potholeHistory);
  assert(
    potholeResult.eventType === 'NO_ANOMALY',
    `Pothole must be suppressed to NO_ANOMALY, got ${potholeResult.eventType}`
  );

  // ----------------------------------------------------
  // TEST 3: Anomaly Detector - Tyre Puncture / Mechanical Drag
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Mechanical Drag / Tyre Blowout Detection ---');
  AnomalyDetector.resetCooldown();
  const punctureHistory = [
    {
      timestamp: Date.now() - 1200,
      accel: { x: 0.1, y: 0.1, z: 1.0, magnitude: 1.0, jerk: 0 },
      gyro: { x: 0.1, y: 0.1, z: 0.1, magnitude: 0.1 },
      speedKmH: 75,
    },
  ];
  const punctureCurrent = {
    timestamp: Date.now(),
    accel: { x: 0.5, y: 0.8, z: 1.2, magnitude: 1.52, jerk: 6 },
    gyro: { x: 0.5, y: 0.6, z: 0.4, magnitude: 0.87 }, // low gyro, no roll
    speedKmH: 20, // sharp drop of 55 km/h
  };

  const punctureResult = AnomalyDetector.evaluateFrame(punctureCurrent, punctureHistory);
  assert(
    punctureResult.eventType === 'POSSIBLE_BREAKDOWN',
    `Expected POSSIBLE_BREAKDOWN, got ${punctureResult.eventType}`
  );

  // ----------------------------------------------------
  // TEST 4: Service Ranker - Weighted Scoring & Categorization
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Service Ranker & Haversine Distance ---');
  const userLocDelhi: UserLocation = {
    latitude: 28.5672,
    longitude: 77.2100, // AIIMS New Delhi
    addressName: 'AIIMS Ring Road, New Delhi',
    regionCode: 'IN-DL',
  };

  const rankedAccident = ServiceRanker.rankServices(
    {
      userLocation: userLocDelhi,
      situationType: 'accident',
    },
    INDIA_EMERGENCY_SERVICES
  );

  assert(rankedAccident.length > 0, 'Ranked accident services list must not be empty');
  assert(
    rankedAccident[0].category === 'hospital' || rankedAccident[0].category === 'ambulance',
    `Top result for accident must be hospital or ambulance, got ${rankedAccident[0].category}`
  );
  assert(
    rankedAccident[0].distanceKm !== undefined && rankedAccident[0].distanceKm <= 5,
    `Top hospital in Delhi should be within 5km of AIIMS, got ${rankedAccident[0].distanceKm}km`
  );

  const rankedPuncture = ServiceRanker.rankServices(
    {
      userLocation: userLocDelhi,
      situationType: 'flat_tyre',
    },
    INDIA_EMERGENCY_SERVICES
  );

  assert(
    rankedPuncture[0].category === 'puncture_repair' || rankedPuncture[0].category === 'towing' || rankedPuncture[0].category === 'mechanic',
    `Top result for flat tyre must be puncture repair/towing/mechanic, got ${rankedPuncture[0].category}`
  );

  // ----------------------------------------------------
  // TEST 5: AI Triage Engine & Clarifying Questions
  // ----------------------------------------------------
  console.log('\n--- TEST 5: AI Triage NLP & Safety Guardrails ---');
  const triageAccident = await AITriageEngine.analyzeEmergencyText(
    'Two cars crashed on the ring road, driver is bleeding and unconscious',
    userLocDelhi,
    'en'
  );

  assert(
    triageAccident.classification.situationType === 'accident',
    `Expected accident triage, got ${triageAccident.classification.situationType}`
  );
  assert(
    triageAccident.classification.urgencyLevel === 'critical',
    `Expected critical urgency, got ${triageAccident.classification.urgencyLevel}`
  );
  assert(
    triageAccident.classification.followUpQuestions !== undefined &&
      triageAccident.classification.followUpQuestions.length <= 2,
    'AI must generate at most 2 clarifying follow-up questions'
  );
  assert(
    triageAccident.classification.firstResponseGuidance.length >= 3,
    'AI must provide clear first-response safety guidance steps'
  );

  // Test Hindi Triage
  const triageHindi = await AITriageEngine.analyzeEmergencyText(
    'हाइवे पर टायर पंचर हो गया है और गाड़ी रुक गई है',
    userLocDelhi,
    'hi'
  );
  assert(
    triageHindi.classification.situationType === 'flat_tyre',
    `Expected flat_tyre for Hindi input, got ${triageHindi.classification.situationType}`
  );

  // ----------------------------------------------------
  // TEST 6: National Helplines & Regional Directory
  // ----------------------------------------------------
  console.log('\n--- TEST 6: National Helplines & Regional Directory ---');
  assert(NATIONAL_HELPLINES.length >= 6, 'Must contain all key Indian national helplines');
  assert(
    NATIONAL_HELPLINES.some((h) => h.code === '112') &&
      NATIONAL_HELPLINES.some((h) => h.code === '108') &&
      NATIONAL_HELPLINES.some((h) => h.code === '1033'),
    'Must include 112, 108, and 1033 NHAI helplines'
  );
  assert(INDIA_EMERGENCY_SERVICES.length >= 15, 'Dataset must include multi-region services');

  console.log('\n======================================================');
  console.log('🎉 ALL TEST SUITES PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
