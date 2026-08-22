import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class AudioAlertPlayerClass {
  private soundObject: Audio.Sound | null = null;
  private isPlaying = false;
  private webAudioCtx: any = null;
  private webOscillator: any = null;

  public async startAlarm() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (Platform.OS === 'web') {
      try {
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.webAudioCtx = new AudioContextClass();
          this.playWebSiren();
        }
      } catch (e) {
        console.warn('Web audio not allowed or failed:', e);
      }
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Synthetic high-frequency tone burst
      // If no local mp3 asset, fallback safely
    } catch (err) {
      console.warn('Native audio alert init failed:', err);
    }
  }

  private playWebSiren() {
    if (!this.isPlaying || !this.webAudioCtx) return;

    try {
      const osc = this.webAudioCtx.createOscillator();
      const gain = this.webAudioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.webAudioCtx.currentTime); // 880 Hz
      osc.frequency.exponentialRampToValueAtTime(
        1760,
        this.webAudioCtx.currentTime + 0.4
      );

      gain.gain.setValueAtTime(0.3, this.webAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.webAudioCtx.currentTime + 0.4
      );

      osc.connect(gain);
      gain.connect(this.webAudioCtx.destination);

      osc.start();
      osc.stop(this.webAudioCtx.currentTime + 0.4);

      setTimeout(() => {
        if (this.isPlaying) this.playWebSiren();
      }, 500);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.soundObject) {
      this.soundObject.stopAsync().catch(() => {});
      this.soundObject.unloadAsync().catch(() => {});
      this.soundObject = null;
    }
    if (this.webAudioCtx) {
      try {
        this.webAudioCtx.close();
      } catch {}
      this.webAudioCtx = null;
    }
  }
}

export const AudioAlertPlayer = new AudioAlertPlayerClass();
