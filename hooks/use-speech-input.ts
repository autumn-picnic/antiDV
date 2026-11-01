'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeSpeechWav, SPEECH_SECONDS } from '@/utils/speech-audio'

export default function useSpeechInput(onTranscript: (text: string) => void, resetKey: string, disabled: boolean) {
  const [phase, setPhase] = useState<'idle' | 'permission' | 'recording' | 'transcribing'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(false)
  const permissionReady = useRef(false)
  const held = useRef(false)
  const recording = useRef(false)
  const generation = useRef(0)
  const active = useRef(false)
  const stream = useRef<MediaStream | null>(null)
  const context = useRef<AudioContext | null>(null)
  const node = useRef<AudioWorkletNode | null>(null)
  const source = useRef<MediaStreamAudioSourceNode | null>(null)
  const chunks = useRef<Float32Array[]>([])
  const samples = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const request = useRef<AbortController | null>(null)
  const callback = useRef(onTranscript)
  callback.current = onTranscript

  useEffect(() => {
    let mounted = true
    void navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(result => {
      if (mounted && result.state === 'granted') { permissionReady.current = true }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const release = useCallback(() => {
    recording.current = false
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    if (node.current) { node.current.port.onmessage = null; node.current.disconnect(); node.current = null }
    source.current?.disconnect(); source.current = null
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null
    const current = context.current; context.current = null
    if (current && current.state !== 'closed') { void current.close().catch(() => {}) }
  }, [])

  const cancel = useCallback(() => {
    generation.current++; active.current = false; held.current = false
    request.current?.abort(); request.current = null
    release(); chunks.current = []; samples.current = 0
    setPhase('idle'); setMessage(''); setSeconds(0)
  }, [release])

  useEffect(() => {
    cancel()
    const hide = () => { if (document.hidden) { cancel() } }
    const exit = () => cancel()
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', exit)
    window.addEventListener('xiaoan:quick-exit', exit)
    return () => {
      cancel()
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', exit)
      window.removeEventListener('xiaoan:quick-exit', exit)
    }
  }, [resetKey, cancel])
  useEffect(() => { if (disabled) { cancel() } }, [disabled, cancel])

  const finish = useCallback(async () => {
    held.current = false
    if (!recording.current || !active.current || !context.current) { return }
    if (samples.current < context.current.sampleRate / 10) { cancel(); setMessage('录音太短，请按住麦克风说话。'); return }
    active.current = false
    const token = generation.current
    const rate = context.current.sampleRate
    const audio = chunks.current
    release(); chunks.current = []; samples.current = 0
    setPhase('transcribing'); setMessage('正在转写，请稍候…')
    const abort = new AbortController(); request.current = abort
    const deadline = setTimeout(() => abort.abort(), 45000)
    try {
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'audio/wav' },
        body: encodeSpeechWav(audio, rate), signal: abort.signal, credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) { throw new Error(result.message || '转写失败，请重新录音') }
      if (token !== generation.current) { return }
      if (typeof result.text !== 'string' || !result.text.trim()) { throw new Error('没有听清，请重新录音') }
      callback.current(result.text)
      setMessage('转写已加入输入框，请核对并修改，再点击发送。')
    }
    catch (error) {
      if (token === generation.current) {
        setMessage(abort.signal.aborted ? '转写超时，请重试；输入框文字已保留。' : error instanceof Error ? error.message : '转写失败，请使用文字输入')
      }
    }
    finally {
      clearTimeout(deadline)
      if (token === generation.current) { request.current = null; setPhase('idle') }
    }
  }, [release, cancel])

  const start = async (prepareOnly = false) => {
    if (disabled || active.current || request.current || phase !== 'idle') { return }
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) {
      setMessage('此浏览器暂不支持录音，请使用文字输入或更新浏览器。'); return
    }
    const preparationOnly = prepareOnly || !permissionReady.current
    held.current = true
    setPermissionDenied(false)
    const token = ++generation.current
    active.current = true; setPhase('permission'); setMessage('请允许麦克风权限；取消可停止本次请求。')
    try {
      // Create/resume in the user gesture for Safari and mobile autoplay policies.
      const ctx = new AudioContext(); context.current = ctx
      const resumed = ctx.resume()
      // Invoke directly in the press gesture to request the native browser permission.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false })
      if (token !== generation.current) { mic.getTracks().forEach(track => track.stop()); return }
      await resumed.catch(error => { mic.getTracks().forEach(track => track.stop()); throw error })
      if (token !== generation.current) { mic.getTracks().forEach(track => track.stop()); return }
      if (preparationOnly) {
        permissionReady.current = true
        mic.getTracks().forEach(track => track.stop())
        cancel(); setMessage('麦克风已就绪，请重新按住说话，松开后转写。'); return
      }
      if (!held.current) { mic.getTracks().forEach(track => track.stop()); cancel(); return }
      stream.current = mic
      await ctx.audioWorklet.addModule('/speech-recorder.worklet.js')
      if (token !== generation.current) { return }
      if (!held.current) { cancel(); return }
      recording.current = true
      const recorder = new AudioWorkletNode(ctx, 'speech-recorder')
      node.current = recorder; source.current = ctx.createMediaStreamSource(mic)
      chunks.current = []; samples.current = 0
      recorder.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!active.current || token !== generation.current) { return }
        chunks.current.push(event.data); samples.current += event.data.length
        if (samples.current >= ctx.sampleRate * SPEECH_SECONDS) { void finish() }
      }
      source.current.connect(recorder); recorder.connect(ctx.destination)
      mic.getTracks().forEach(track => { track.onended = () => { if (token === generation.current && active.current) { cancel(); setMessage('录音已中断，请重新录制。') } } })
      setPhase('recording'); setSeconds(0); setMessage('正在录音，松开后转写，核对后手动发送，最多 55 秒。')
      const started = Date.now()
      timer.current = setInterval(() => {
        setSeconds(Math.min(SPEECH_SECONDS, Math.floor((Date.now() - started) / 1000)))
        if (Date.now() - started >= SPEECH_SECONDS * 1000) { void finish() }
      }, 250)
    }
    catch (error) {
      if (token === generation.current) {
        cancel()
        setPermissionDenied(error instanceof DOMException && error.name === 'NotAllowedError')
        setMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? '麦克风权限未开启，请在浏览器设置中允许后重试。' : '无法使用麦克风，请检查设备后重试。')
      }
    }
  }
  return { phase, seconds, message, permissionDenied, start, finish, cancel, active: phase !== 'idle' }
}
