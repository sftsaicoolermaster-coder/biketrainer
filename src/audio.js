// Audio and Speech Synthesis Manager for AeroSpin
let soundEnabled = true;
let voiceEnabled = true;
let audioCtx = null;

// Initialize Audio Context on demand (user interaction required)
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const audioManager = {
  setSoundEnabled(enabled) {
    soundEnabled = enabled;
  },

  setVoiceEnabled(enabled) {
    voiceEnabled = enabled;
  },

  // Synthesize a basic beep sound using Web Audio API
  playBeep(frequency = 440, duration = 0.15, type = 'sine') {
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Smooth volume envelope to prevent clicking sounds
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio beep synthesis failed:", e);
    }
  },

  // Synthesize a interval countdown beep
  playCountdown(isStart = false) {
    if (isStart) {
      // High beep for interval start
      this.playBeep(880, 0.4, 'triangle');
    } else {
      // Low beep for countdown steps (3, 2, 1)
      this.playBeep(440, 0.15, 'sine');
    }
  },

  // Speech synthesis for coaching prompts
  speak(text) {
    if (!voiceEnabled) return;
    
    try {
      // Cancel any current speaking to prevent queue lag
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-TW'; // Chinese voice (Taiwan)
      
      // Fallback to English if no matching voice, or adjust rate
      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed:", e);
    }
  }
};
