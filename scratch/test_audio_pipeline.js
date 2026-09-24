import { OpusDecoder } from 'opus-decoder';

async function testAudioPipeline() {
  console.log('Testing Opus Decoder Initialization...');
  const decoder = new OpusDecoder({ channels: 1, sampleRate: 16000 });
  await decoder.ready;
  console.log('Opus Decoder is READY.');

  // Test array buffer slicing and offset checks
  const rawBytes = new Uint8Array([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]); // dummy Opus header bytes
  const dummyZelloPacket = new Uint8Array(17);
  dummyZelloPacket.set([0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00], 0); // 9-byte Zello header
  dummyZelloPacket.set(rawBytes, 9);

  const subArray = new Uint8Array(dummyZelloPacket.buffer, 9);
  console.log('subArray byteOffset:', subArray.byteOffset, 'byteLength:', subArray.byteLength);

  // Clean slice verification
  const cleanPacket = subArray.byteOffset === 0 && subArray.byteLength === subArray.buffer.byteLength
    ? subArray
    : subArray.slice();

  console.log('cleanPacket byteOffset:', cleanPacket.byteOffset, 'byteLength:', cleanPacket.byteLength);
  if (cleanPacket.byteOffset === 0 && cleanPacket.byteLength === 8) {
    console.log('SUCCESS: ArrayBuffer slice offset validation PASSED cleanly!');
  } else {
    console.error('FAILED offset check');
  }

  // Test decodeFrame call
  const { channelData, samplesDecoded } = decoder.decodeFrame(cleanPacket);
  console.log('Decoded frame samples:', samplesDecoded, 'channelData length:', channelData?.length);
  console.log('Audio pipeline structural verification COMPLETE.');
}

testAudioPipeline().catch((err) => console.error('Error testing audio pipeline:', err));
