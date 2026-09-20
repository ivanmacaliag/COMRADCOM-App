import Recorder from 'opus-recorder';

export class AudioService {
  constructor() {
    this.recorder = null;
    this.onAudioData = null;
    this.isRecording = false;
  }

  async startRecording() {
    try {
      this.isRecording = true;
      // Using opus-recorder to encode mic audio directly to raw Opus packets (not ogg)
      this.recorder = new Recorder({
        encoderPath: '/encoderWorker.min.js',
        encoderSampleRate: 16000,
        originalSampleRateOverride: 16000,
        streamPages: true, // We want raw opus packets as they are generated
        encoderApplication: 2048, // Voice
        encoderFrameSize: 20, // 20ms frames
        maxFramesPerPage: 1, // one 20 ms frame per page for low-latency PTT
        leaveStreamOpen: true
      });

      this.recorder.ondataavailable = (oggPage) => {
        if (!this.isRecording) return;
        // opus-recorder emits Ogg pages. Zello needs the raw Opus packets inside
        // those pages, not the Ogg container/header bytes.
        extractOpusPackets(oggPage).forEach((packet) => this.onAudioData?.(packet));
      };

      await this.recorder.start();
    } catch (err) {
      console.error('Error accessing microphone', err);
      throw err;
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.recorder) {
      this.recorder.stop();
    }
  }
}

function extractOpusPackets(page) {
  const bytes = page instanceof Uint8Array ? page : new Uint8Array(page);
  if (bytes.length < 27 || String.fromCharCode(...bytes.slice(0, 4)) !== 'OggS') return [];
  const segments = bytes[26];
  if (bytes.length < 27 + segments) return [];
  const lacing = bytes.slice(27, 27 + segments);
  let offset = 27 + segments;
  const packets = [];
  let packetParts = [];
  for (const length of lacing) {
    if (offset + length > bytes.length) return [];
    packetParts.push(bytes.slice(offset, offset + length));
    offset += length;
    if (length < 255) {
      const size = packetParts.reduce((total, part) => total + part.length, 0);
      const packet = new Uint8Array(size);
      let position = 0;
      packetParts.forEach((part) => { packet.set(part, position); position += part.length; });
      packetParts = [];
      const prefix = String.fromCharCode(...packet.slice(0, 8));
      if (prefix !== 'OpusHead' && prefix !== 'OpusTags') packets.push(packet.buffer);
    }
  }
  return packets;
}
