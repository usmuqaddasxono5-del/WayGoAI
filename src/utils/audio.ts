// Audio playback utility for Base64 PCM / MP3 / WAV from Gemini TTS with Browser SpeechSynthesis fallback

let currentAudio: HTMLAudioElement | null = null;

export async function playTtsAudio(base64Data: string): Promise<void> {
  stopTtsAudio();

  try {
    // Decode base64 to binary
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      if (!currentAudio) return resolve();
      currentAudio.onended = () => {
        resolve();
      };
      currentAudio.onerror = (e) => {
        console.error('Audio playback error:', e);
        reject(e);
      };
      currentAudio.play().catch(reject);
    });
  } catch (err) {
    console.error('TTS playback failure:', err);
    throw err;
  }
}

export function playBrowserSpeech(text: string): Promise<void> {
  stopTtsAudio();

  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*_#`[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 400);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'uz-UZ';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available voice if possible
    const voices = window.speechSynthesis.getVoices();
    const uzVoice = voices.find((v) => v.lang.startsWith('uz')) || voices.find((v) => v.lang.startsWith('ru')) || voices[0];
    if (uzVoice) {
      utterance.voice = uzVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function stopTtsAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
