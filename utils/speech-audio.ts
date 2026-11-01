export const SPEECH_RATE = 16000
export const SPEECH_SECONDS = 55
export const SPEECH_MAX_BYTES = 44 + SPEECH_RATE * 2 * SPEECH_SECONDS

/** Box-filter downsampling avoids simply dropping microphone samples. */
export function encodeSpeechWav(chunks: Float32Array[], inputRate: number): ArrayBuffer {
  if (inputRate < SPEECH_RATE) { throw new Error('麦克风采样率不受支持') }
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const input = new Float32Array(length)
  let offset = 0
  for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length }
  const count = Math.min(Math.floor(length * SPEECH_RATE / inputRate), SPEECH_RATE * SPEECH_SECONDS)
  const buffer = new ArrayBuffer(44 + count * 2)
  const view = new DataView(buffer)
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) { view.setUint8(at + i, value.charCodeAt(i)) } }
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE')
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, SPEECH_RATE, true)
  view.setUint32(28, SPEECH_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, count * 2, true)
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * inputRate / SPEECH_RATE)
    const end = Math.min(length, Math.floor((i + 1) * inputRate / SPEECH_RATE))
    let sum = 0
    for (let j = start; j < end; j++) { sum += input[j] }
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    view.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true)
  }
  return buffer
}

/** Accept only the bounded PCM format produced by our recorder. */
export function validSpeechWav(bytes: Uint8Array): boolean {
  if (bytes.length < 44 + 3200 || bytes.length > SPEECH_MAX_BYTES) { return false }
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (at: number, value: string) => [...value].every((c, i) => bytes[at + i] === c.charCodeAt(0))
  return tag(0, 'RIFF') && tag(8, 'WAVE') && tag(12, 'fmt ') && tag(36, 'data')
    && v.getUint32(4, true) === bytes.length - 8 && v.getUint32(16, true) === 16
    && v.getUint16(20, true) === 1 && v.getUint16(22, true) === 1
    && v.getUint32(24, true) === SPEECH_RATE && v.getUint32(28, true) === SPEECH_RATE * 2
    && v.getUint16(32, true) === 2 && v.getUint16(34, true) === 16
    && v.getUint32(40, true) === bytes.length - 44 && (bytes.length - 44) % 2 === 0
}
