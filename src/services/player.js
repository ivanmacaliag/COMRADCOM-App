import { OpusDecoder } from 'opus-decoder';

export class PlayerService {
  constructor() {
    this.audioContext = null;
    this.decoder = null;
    this.isReady = false;
    this.nextPlayTime = 0;
  }

  async init() {
    if (this.isReady) return;
    
    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    } catch {
      this.audioContext = new AudioContextClass();
    }
    
    // Initialize Decoder
    this.decoder = new OpusDecoder({ channels: 1, sampleRate: 16000 });
    await this.decoder.ready;
    
    this.isReady = true;
    this.nextPlayTime = this.audioContext.currentTime;
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async playOpusPacket(opusPacket) {
    if (!this.isReady) await this.init();
    this.resume();
    
    try {
      // Decode Opus packet to PCM Float32Array
      const { channelData, samplesDecoded } = this.decoder.decodeFrame(opusPacket);
      
      if (!samplesDecoded || samplesDecoded <= 0) {
        return;
      }
      
      const pcmData = channelData[0];
      
      // Create AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, 
        samplesDecoded, 
        16000
      );
      audioBuffer.getChannelData(0).set(pcmData);
      
      // Create Source and schedule playback
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Ensure smooth continuous playback
      const currentTime = this.audioContext.currentTime;
      // Add a slight buffer (50ms) to prevent jitter gaps on network delay
      if (this.nextPlayTime < currentTime || this.nextPlayTime > currentTime + 0.35) {
        this.nextPlayTime = currentTime + 0.05; 
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.error('Error decoding/playing Opus packet:', err);
    }
  }
}
