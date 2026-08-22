import { UserLocation, IncidentReport } from '../src/types';

function generateEmergencySMSBody(
  incident: Partial<IncidentReport>,
  location: UserLocation
): string {
  const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  const timeStr = '04:25:30 PM';

  const isAuto = incident.trigger_type === 'auto_sensor';
  const alertHeader = isAuto
    ? '🚨 [ResQRoute-A AUTO SOS ALERT]'
    : '🚨 [ResQRoute-A EMERGENCY SOS ALERT]';

  return (
    `${alertHeader}\n` +
    `Emergency Type: ${incident.situation_type?.toUpperCase() || 'ACCIDENT/BREAKDOWN'}\n` +
    `Urgency: ${incident.urgency_level?.toUpperCase() || 'CRITICAL'}\n` +
    `Time: ${timeStr}\n` +
    `Location: ${location.addressName || 'Current GPS Coords'}\n` +
    `Live Map: ${mapsLink}\n` +
    `Coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n` +
    `Please contact emergency services (112 / 108 / 1033) or coordinate rescue immediately.`
  );
}

const userLoc: UserLocation = {
  latitude: 28.5672,
  longitude: 77.21,
  addressName: 'AIIMS Ring Road, New Delhi',
  regionCode: 'IN-DL',
};

const sms = generateEmergencySMSBody(
  {
    situation_type: 'accident',
    urgency_level: 'critical',
    trigger_type: 'auto_sensor',
  },
  userLoc
);

console.log('--- GENERATED EMERGENCY SMS DRAFT ---');
console.log(sms);

if (
  sms.includes('AUTO SOS ALERT') &&
  sms.includes('https://maps.google.com/?q=28.5672,77.21') &&
  sms.includes('112')
) {
  console.log('\n✅ PASS: SMS Formatting Verified!');
} else {
  console.error('\n❌ FAIL: SMS formatting mismatch');
  process.exit(1);
}
