import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

const SIREN_ASSET = require('../../assets/sounds/siren.wav');

class AudioAlertPlayerClass {
  private player: AudioPlayer | null = null;
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
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });

      if (!this.player) {
        this.player = createAudioPlayer(SIREN_ASSET);
      }
      this.player.loop = true;
      this.player.volume = 1.0;
      this.player.seekTo(0);
      this.player.play();
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
    if (this.player) {
      try {
        this.player.pause();
        this.player.seekTo(0);
      } catch {
        // Ignore stop errors (e.g. player already released)
      }
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
