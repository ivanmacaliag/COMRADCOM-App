export class ZelloService {
  constructor(network, username, password) {
    this.network = network;
    this.username = username;
    this.password = password;
    this.ws = null;
    this.onMessage = null;
    this.onStatus = null;
    this.nextSequence = 3;
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
    // Sequence 2 is our start_stream command
    if (data.seq === 2 && data.success) {
      this.currentStreamId = data.stream_id;
    }
  }

  sendLocation({ latitude, longitude, accuracy }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({
      command: 'send_location',
      seq: this.nextSequence++,
      channel: '146.020 Mhz',
      latitude,
      longitude,
      accuracy
    }));
    return true;
  }

  startStream(channel) {
    this.packetId = 0;
    // Command to start an outgoing audio stream
    // codec_header for 16000Hz, 1 frame/packet, 20ms frame size: [128, 62, 1, 20] -> gD4BFA==
    const startCmd = {
      command: 'start_stream',
      seq: 2,
      type: 'audio',
      req_target: {
        type: 'channel',
        name: channel
      },
      codec: 'opus',
      codec_header: 'gD4BFA==', 
      packet_duration: 20
    };
    this.ws.send(JSON.stringify(startCmd));
  }

  sendAudioChunk(opusPayload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentStreamId) {
      this.packetId++;
      
      // Zello requires a 9-byte or 8-byte header depending on the exact spec version
      // Standard is: Stream ID (4 bytes LE) + Packet ID (4 bytes LE) + Payload
      const headerLength = 8; 
      const buffer = new ArrayBuffer(headerLength + opusPayload.byteLength);
      const view = new DataView(buffer);
      
      // Write Stream ID (32-bit Little Endian)
      view.setUint32(0, this.currentStreamId, true);
      
      // Write Packet ID (32-bit Little Endian)
      view.setUint32(4, this.packetId, true);
      
      // Write Opus Payload
      const payloadView = new Uint8Array(buffer, headerLength);
      payloadView.set(new Uint8Array(opusPayload));
      
      this.ws.send(buffer);
    }
  }

  stopStream() {
    if (!this.currentStreamId) return;
    const stopCmd = {
      command: 'stop_stream',
      seq: 3,
      stream_id: this.currentStreamId
    };
    this.ws.send(JSON.stringify(stopCmd));
    this.currentStreamId = null;
    this.packetId = 0;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
