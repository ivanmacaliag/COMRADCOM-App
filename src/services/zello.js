export class ZelloService {
  constructor(network, username, password) {
    this.network = network;
    this.username = username;
    this.password = password;
    this.ws = null;
    this.onMessage = null;
    this.onStatus = null;
    this.nextSequence = 2;
    this.pendingRequests = new Map();
    this.pendingAudio = [];
    this.openingStreamSeq = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://zellowork.io/ws/${this.network}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          if (this.onStatus) this.onStatus('Connected, authenticating...');
          this.authenticate();
        };

        this.ws.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            console.log('WS Message:', data);
            this.handleCommand(data);
          } else {
            // Binary audio data
            let buffer;
            if (event.data instanceof Blob) {
              buffer = await event.data.arrayBuffer();
            } else {
              buffer = event.data;
            }
            
            const view = new DataView(buffer);
            let headerSize = 8;
            // Server to client audio packets usually start with 0x01
            if (view.byteLength > 0 && view.getUint8(0) === 1) {
              headerSize = 9;
            }

            if (buffer.byteLength > headerSize) {
              const payload = new Uint8Array(buffer, headerSize);
              if (this.onMessage) this.onMessage(payload);
            }
          }
        };

        this.ws.onerror = (error) => {
          console.error("Zello WS Error", error);
          if (this.onStatus) this.onStatus('Error connecting to Zello');
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WS Closed:', event.code, event.reason);
          if (this.onStatus) this.onStatus('Disconnected (' + event.code + ')');
        };

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  authenticate() {
    // Send logon command based on Zello API Spec
    // TODO: Hash password / Token logic as required by Zello API
    const logonCmd = {
      command: 'logon',
      seq: 1,
      username: this.username,
      password: this.password,
      channels: ['146.020 Mhz']
    };
    this.ws.send(JSON.stringify(logonCmd));
  }

  handleCommand(data) {
    console.log('Received command:', data);
    // Sequence 1 is our logon command
    if (data.seq === 1) {
      if (data.success) {
        if (this.onStatus) this.onStatus('Authenticated');
      } else if (this.onStatus) {
        this.onStatus(`Authentication failed${data.error ? `: ${data.error}` : '. Check your username and password.'}`);
      }
    }
    const pending = this.pendingRequests.get(data.seq);
    if (pending) {
      this.pendingRequests.delete(data.seq);
      if (data.success) pending.resolve(data);
      else pending.reject(new Error(data.error || data.error_message || 'Zello rejected the request.'));
    }
    if (data.command === 'on_error') {
      this.pendingRequests.forEach(({ reject }) => reject(new Error(data.error || 'Zello server error.')));
      this.pendingRequests.clear();
    }
  }

  sendLocation({ latitude, longitude, accuracy }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({
      command: 'send_location',
      seq: this.nextSequence++,
      latitude,
      longitude,
      accuracy
    }));
    return true;
  }

  startStream(channel) {
    this.packetId = 0;
    const seq = this.nextSequence++;
    this.openingStreamSeq = seq;
    this.pendingAudio = [];
    // Command to start an outgoing audio stream
    // codec_header for 16000Hz, 1 frame/packet, 20ms frame size: [128, 62, 1, 20] -> gD4BFA==
    const startCmd = {
      command: 'start_stream',
      seq,
      channel,
      type: 'audio',
      codec: 'opus',
      codec_header: 'gD4BFA==', 
      packet_duration: 20
    };
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Zello is not connected.'));
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq);
          reject(new Error('Zello did not open the radio channel. Check channel access and connection.'));
        }
      }, 8000);
      this.pendingRequests.set(seq, {
        resolve: (data) => {
          window.clearTimeout(timeoutId);
          this.openingStreamSeq = null;
          this.currentStreamId = data.stream_id;
          this.pendingAudio.forEach((packet) => this.sendAudioChunk(packet));
          this.pendingAudio = [];
          resolve(data);
        },
        reject: (error) => { window.clearTimeout(timeoutId); reject(error); }
      });
      this.ws.send(JSON.stringify(startCmd));
    });
  }

  sendAudioChunk(opusPayload) {
    if (!this.currentStreamId && this.openingStreamSeq) {
      // Preserve only the start of a transmission while the server approves it.
      // A short queue prevents an audible one-second catch-up burst on receivers.
      this.pendingAudio.push(opusPayload);
      if (this.pendingAudio.length > 12) this.pendingAudio.shift();
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentStreamId) {
      this.packetId++;
      
      // Zello Channel API: type (0x01) + stream ID + packet ID in network byte order.
      // Packets need monotonically increasing IDs; reusing zero makes receivers
      // treat live audio as duplicate/out-of-order data, causing robotic playback.
      const headerLength = 9;
      const buffer = new ArrayBuffer(headerLength + opusPayload.byteLength);
      const view = new DataView(buffer);
      
      view.setUint8(0, 0x01);
      view.setUint32(1, this.currentStreamId, false);
      view.setUint32(5, this.packetId, false);
      
      // Write Opus Payload
      const payloadView = new Uint8Array(buffer, headerLength);
      payloadView.set(new Uint8Array(opusPayload));
      
      this.ws.send(buffer);
    }
  }

  stopStream() {
    if (this.openingStreamSeq) {
      const pending = this.pendingRequests.get(this.openingStreamSeq);
      if (pending) {
        this.pendingRequests.delete(this.openingStreamSeq);
        pending.reject(new Error('Transmission cancelled.'));
      }
      this.openingStreamSeq = null;
      this.pendingAudio = [];
    }
    if (!this.currentStreamId) return;
    const stopCmd = {
      command: 'stop_stream',
      seq: this.nextSequence++,
      stream_id: this.currentStreamId,
      channel: '146.020 Mhz'
    };
    this.ws.send(JSON.stringify(stopCmd));
    this.currentStreamId = null;
    this.packetId = 0;
  }

  disconnect() {
    this.stopStream();
    if (this.ws) {
      this.ws.close();
    }
  }
}
