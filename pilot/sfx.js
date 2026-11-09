/**
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 * Pilot Sound Engine — Pure Web Audio API Synthesizer
 * Zero network dependencies, zero 404 assets, microsecond latency.
 */

(function(global){
  'use strict';

  class SoundEngine {
    constructor(){
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      try {
        this.muted = localStorage.getItem('aa_pilot_muted') === 'true';
      } catch(e){
        this.muted = false;
      }
    }

    init(){
      if(!this.ctx){
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if(AudioCtx){
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if(this.ctx && this.ctx.state === 'suspended'){
        this.ctx.resume();
      }
    }

    toggleMute(){
      this.muted = !this.muted;
      try {
        localStorage.setItem('aa_pilot_muted', String(this.muted));
      } catch(e){}

      if(this.masterGain && this.ctx){
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.45, now + 0.05);
      }
      return this.muted;
    }

    isMuted(){
      return this.muted;
    }

    _canPlay(){
      if(this.muted) return false;
      if(!this.ctx) this.init();
      return !!this.ctx;
    }

    // Pleasant high-craft espresso tap tone (scales frequency slightly with combo streak)
    playTap(combo = 1){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Base note C5 (523.25Hz), climbing gracefully with combo up to C6 (1046.5Hz)
      const pitchMultiplier = Math.min(2.0, 1.0 + (combo - 1) * 0.06);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(659.25 * pitchMultiplier, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    }

    // Golden Special Reserve target: brilliant two-tone shimmer chord
    playGold(){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const freqs = [659.25, 880.0, 1046.5]; // E5, A5, C6 (radiant A minor/C major shimmer)

      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.025);
        osc.frequency.exponentialRampToValueAtTime(f * 1.03, now + 0.35);

        gain.gain.setValueAtTime(0.001, now + idx * 0.025);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.025 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.025);
        osc.stop(now + 0.46);
      });
    }

    // Decoy pitcher tap: dry wooden bump
    playDecoy(){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    }

    // Burnt bean or hazard penalty: low resonant warning thump
    playHazard(){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, now);
      osc2.frequency.setValueAtTime(233.08, now); // Minor second dissonance (dissonant buzz)

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.29);
      osc2.stop(now + 0.29);
    }

    // Streak celebration: rising triad chime
    playComboStreak(streak){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C major arpeggio
      chord.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);

        gain.gain.setValueAtTime(0.001, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.05 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.26);
      });
    }

    // Game completed / Victory fanfare
    playVictory(){
      if(!this._canPlay()) return;
      const now = this.ctx.currentTime;
      // Stately Madinah brass cadence: F4 -> A4 -> C5 -> F5
      const notes = [349.23, 440.0, 523.25, 698.46];
      notes.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.1);

        const dur = (i === notes.length - 1) ? 0.6 : 0.22;
        gain.gain.setValueAtTime(0.001, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + dur + 0.02);
      });
    }
  }

  global.AASoundEngine = new SoundEngine();
})(window);
