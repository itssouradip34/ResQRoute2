// Flip to false before any real device testing with real trusted contacts.
export const TEST_MODE = true;

// Your own numbers — all emergency SMS/WhatsApp sends get rerouted here
// while TEST_MODE is on, no matter what's saved in Trusted Contacts.
export const TEST_PHONE_NUMBERS = [
  '7319250207',
  '7908408696',
  '9073729204',
];

// Fake numbers that mimic 112/108 layout without dialing anything real.
export const TEST_HELPLINE_OVERRIDE: Record<string, string> = {
  '112': '7319250207',
  '108': '7908408696',
  '1033': '9073729204',
};