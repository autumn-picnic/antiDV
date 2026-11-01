/* Microphone samples only; never route microphone audio to the speakers. */
class SpeechRecorder extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const channel = inputs[0]?.[0]
    if (channel) { this.port.postMessage(channel.slice()) }
    for (const output of outputs) {
      for (const samples of output) { samples.fill(0) }
    }
    return true
  }
}
registerProcessor('speech-recorder', SpeechRecorder)
