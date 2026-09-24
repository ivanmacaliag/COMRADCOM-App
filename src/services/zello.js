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
    this.currentStreamId = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`wss://zellowork.io/ws/${this.network}`);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = () => {
          this.onStatus?.('Connected, authenticating...');
          this.ws.send(JSON.stringify({
            command: 'logon', seq: 1, username: this.username,
            password: this.password, channels: ['146.020 Mhz']
          }));
          resolve();
        };
        this.ws.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            this.handleCommand(JSON.parse(event.data));
            return;
          }
          const buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
          if (buffer.byteLength > 9 && new DataView(buffer).getUint8(0) === 0x01) {
            this.onMessage?.(new Uint8Array(buffer, 9));
          }
        };
        this.ws.onerror = (error) => {
          this.onStatus?.('Error connecting to Zello');
          reject(error);
        };
        this.ws.onclose = (event) => this.onStatus?.(`Disconnected (${event.code})`);
      } catch (error) { reject(error); }
    });
  }

  handleCommand(data) {
    if (data.seq === 1) {
      if (data.success) {
        this.onStatus?.('Authenticated');
        this.getChannelStatus('146.020 Mhz');
      } else {
        this.onStatus?.(`Authentication failed${data.error ? `: ${data.error}` : '. Check your username and password.'}`);
      }
    }

    const usersArr = data.users || data.users_list || data.channel?.users;
    const usersCnt = data.users_count !== undefined ? data.users_count : (data.user_count !== undefined ? data.user_count : data.channel?.users_count);

    if (Array.isArray(usersArr)) {
      this.onUsersUpdate?.(usersArr);
    }
    if (typeof usersCnt === 'number') {
      this.onUsersCountUpdate?.(usersCnt);
    }

    const pending = this.pendingRequests.get(data.seq);
    if (pending) {
      this.pendingRequests.delete(data.seq);
      if (data.success) {
        if (usersArr || usersCnt !== undefined) {
          if (Array.isArray(usersArr)) this.onUsersUpdate?.(usersArr);
          if (typeof usersCnt === 'number') this.onUsersCountUpdate?.(usersCnt);
        }
        pending.resolve(data);
      } else {
        pending.reject(new Error(data.error || data.error_message || 'Zello rejected the request.'));
      }
    }
    if (data.command === 'on_error') {
      this.pendingRequests.forEach(({ reject }) => reject(new Error(data.error || 'Zello server error.')));
      this.pendingRequests.clear();
    }
  }

  getChannelStatus(channel = '146.020 Mhz') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      command: 'get_channel_status',
      seq: this.nextSequence++,
      channel
    }));
  }


  startStream(channel) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Zello is not connected.'));
    const seq = this.nextSequence++;
    // 16 kHz, one 20 ms Opus frame per packet. This exactly matches AudioService.
    const command = { command: 'start_stream', seq, channel, type: 'audio', codec: 'opus', codec_header: 'gD4BFA==', packet_duration: 20 };
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        if (this.pendingRequests.delete(seq)) reject(new Error('Zello did not open the radio channel. Check channel access and connection.'));
      }, 8000);
      this.pendingRequests.set(seq, {
        resolve: (data) => { window.clearTimeout(timeoutId); this.currentStreamId = data.stream_id; resolve(data); },
        reject: (error) => { window.clearTimeout(timeoutId); reject(error); }
      });
      this.ws.send(JSON.stringify(command));
    });
  }

  sendAudioChunk(opusPayload) {
    if (!this.currentStreamId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const packet = new ArrayBuffer(9 + opusPayload.byteLength);
    const view = new DataView(packet);
    view.setUint8(0, 0x01);
    view.setUint32(1, this.currentStreamId, false);
    view.setUint32(5, 0, false); // Required zeroes for client-to-server packets.
    new Uint8Array(packet, 9).set(new Uint8Array(opusPayload));
    this.ws.send(packet);
  }

  stopStream() {
    if (!this.currentStreamId) return;
    this.ws?.send(JSON.stringify({ command: 'stop_stream', seq: this.nextSequence++, stream_id: this.currentStreamId, channel: '146.020 Mhz' }));
    this.currentStreamId = null;
  }

  sendLocation({ latitude, longitude, accuracy }) {
    // Disabled: Sending 'send_location' over Zello Channel WebSocket posts a location message 
    // to the channel chat/message history. We keep location tracking internal to the device.
    return false;
  }

  disconnect() {
    this.stopStream();
    this.ws?.close();
  }
}
