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

    // Initialize Opus Decoder (16kHz mono)
    this.decoder = new OpusDecoder({ channels: 1, sampleRate: 16000 });
    await this.decoder.ready;

    this.isReady = true;
    this.nextPlayTime = 0;
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  reset() {
    this.nextPlayTime = 0;
  }

  async playOpusPacket(opusPacket) {
    if (!this.isReady) await this.init();
    this.resume();

    try {
      // Ensure we pass a clean Uint8Array slice with byteOffset = 0 to avoid Wasm memory offset issues
      let packetData;
      if (opusPacket instanceof Uint8Array) {
        packetData = opusPacket.byteOffset === 0 && opusPacket.byteLength === opusPacket.buffer.byteLength
          ? opusPacket
          : opusPacket.slice();
      } else if (opusPacket instanceof ArrayBuffer) {
        packetData = new Uint8Array(opusPacket);
      } else {
        return;
      }

      // Decode Opus packet to PCM Float32Array
      const { channelData, samplesDecoded } = this.decoder.decodeFrame(packetData);

      if (!samplesDecoded || samplesDecoded <= 0) {
        return;
      }

      const pcmData = channelData[0];

      // Create AudioBuffer at 16000 Hz sample rate (matches decoded PCM rate)
      const audioBuffer = this.audioContext.createBuffer(
        1,
        samplesDecoded,
        16000
      );
      audioBuffer.getChannelData(0).set(pcmData);

      // Create AudioBufferSourceNode
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Smooth jitter-buffered scheduling
      const currentTime = this.audioContext.currentTime;
      const JITTER_BUFFER = 0.03; // 30ms jitter buffer

      if (this.nextPlayTime < currentTime || this.nextPlayTime > currentTime + 0.35) {
        this.nextPlayTime = currentTime + JITTER_BUFFER;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.error('Error decoding/playing Opus packet:', err);
    }
  }
}

