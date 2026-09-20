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
        leaveStreamOpen: true
      });

      this.recorder.ondataavailable = (opusPacket) => {
        if (!this.isRecording) return;
        if (this.onAudioData) {
          // Send the typed array buffer to Zello service
          this.onAudioData(opusPacket.buffer);
        }
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
