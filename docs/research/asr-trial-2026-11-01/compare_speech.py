"""Public-audio comparison; Python stdlib + installed curl/ffmpeg, no packages.

Preparation: python3 compare_speech.py prepare
Run: python3 compare_speech.py run
Azure credentials are obtained in memory from az; never persisted.
"""
import concurrent.futures
import hashlib
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent / 'comparison'
AUDIO = ROOT / 'audio'
RAW = ROOT / 'raw'
HOST = 'https://qwen-qwen3-asr.hf.space'


def cmd(args, timeout=90):
    p = subprocess.run(args, capture_output=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError(p.stderr.decode(errors='replace')[:400])
    return p.stdout


def get(url, dest):
    cmd(['curl', '--fail', '-sS', '-L', '--max-time', '45', url, '-o', str(dest)])


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2))


def prepare():
    AUDIO.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(exist_ok=True)
    html = Path('/tmp/xiaoan-kespeech.html').read_text()
    rows = []
    for row in re.findall(r'<tr>(.*?)</tr>', html, re.S):
        paths = re.findall(r'src="(gt/[^"]+)"', row)
        texts = re.findall(r'<td[^>]*>([^<]+)</td>', row)
        if paths and texts:
            rows.append((texts[0].strip(), paths[0]))
    groups = [('chengdu', '/dialect/', '成都西南官話', 3),
              ('zhengzhou', '/dialect/', '鄭州中原官話', 3),
              ('qingdao', '/dialect/', '青島膠遼官話', 3),
              ('zhengzhou', '/mandarin/', '鄭州說話者普通話', 1),
              ('qingdao', '/mandarin/', '青島說話者普通話', 1)]
    samples = []
    for city, mode, label, count in groups:
        selected = [(text, p) for text, p in rows if city in p and mode in p][:count]
        for i, (text, p) in enumerate(selected, 1):
            sid = f'{city}_{"dialect" if "dialect" in mode else "mandarin"}_{i}'
            url = 'https://wen2cheng.github.io/' + p
            dest = AUDIO / (sid + '.wav')
            get(url, dest)
            cmd(['ffmpeg', '-v', 'error', '-i', str(dest), '-ar', '16000', '-ac', '1',
                 '-c:a', 'pcm_s16le', '-y', str(AUDIO / (sid + '_pcm.wav'))])
            # Preserve originals and use explicitly normalized PCM for both engines.
            samples.append(dict(id=sid, group=label, reference=text, source=url,
                                path=f'audio/{sid}_pcm.wav', condition='原始錄音／16kHz PCM',
                                azure_locale='zh-CN', scored=True))
    yue = AUDIO / 'cantonese_source.mp3'
    url = 'https://huggingface.co/FunAudioLLM/SenseVoiceSmall/resolve/main/example/yue.mp3'
    get(url, yue)
    cmd(['ffmpeg', '-v', 'error', '-i', str(yue), '-ar', '16000', '-ac', '1',
         '-c:a', 'pcm_s16le', '-y', str(AUDIO / 'cantonese_pcm.wav')])
    samples.append(dict(id='cantonese', group='粵語', reference=None, source=url,
                        path='audio/cantonese_pcm.wav', condition='原始公開錄音／16kHz PCM',
                        azure_locale='zh-HK', scored=False))
    # Fixed, reproducible degradations. These do not simulate genuine dysarthria.
    for parent in [samples[0], next(s for s in samples if s['id']=='zhengzhou_mandarin_1')]:
        for name, filt in [('quiet', 'volume=0.0316227766'),
                           ('bandlimited', 'highpass=f=400,lowpass=f=1800'),
                           ('noise', None)]:
            sid = parent['id'] + '_' + name
            dest = AUDIO / (sid + '.wav')
            inp = ROOT / parent['path']
            if filt:
                cmd(['ffmpeg', '-v', 'error', '-i', str(inp), '-af', filt, '-y', str(dest)])
            else:
                # mix original + reproducible white noise; SNR measured below, not assumed.
                cmd(['ffmpeg', '-v', 'error', '-i', str(inp), '-f', 'lavfi', '-i',
                     'anoisesrc=color=white:amplitude=0.12:sample_rate=16000:seed=42',
                     '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:normalize=0',
                     '-c:a', 'pcm_s16le', '-y', str(dest)])
            samples.append(dict(parent, id=sid, group='人工退化', parent=parent['id'],
                                path=f'audio/{sid}.wav', condition=name))
    silence = AUDIO / 'silence.wav'
    cmd(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono',
         '-t', '3', '-c:a', 'pcm_s16le', '-y', str(silence)])
    samples.append(dict(id='silence', group='靜音', reference='', source='ffmpeg anullsrc',
                        path='audio/silence.wav', condition='3 秒數位靜音',
                        azure_locale='zh-CN', scored=False))
    for s in samples:
        path = ROOT / s['path']
        s['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        with wave.open(str(path)) as w:
            s['duration_seconds'] = w.getnframes() / w.getframerate()
    save(ROOT / 'manifest.json', samples)
    print('prepared', len(samples), 'clips', round(sum(s['duration_seconds'] for s in samples), 2), 'seconds', flush=True)


def azure(sample, key, locale=None):
    locale = locale or sample['azure_locale']
    url = ('https://japaneast.stt.speech.microsoft.com/speech/recognition/'
           'conversation/cognitiveservices/v1?format=detailed&profanity=raw&language=' + locale)
    body = cmd(['curl', '-sS', '--max-time', '55', url,
                '-H', 'Ocp-Apim-Subscription-Key: ' + key,
                '-H', 'Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000',
                '--data-binary', '@' + str(ROOT / sample['path'])])
    data = json.loads(body)
    texts = data.get('NBest', [])
    text = texts[0].get('Display', '') if texts else data.get('DisplayText', '')
    return dict(text=text, response=data, locale=locale,
                status=data.get('RecognitionStatus', 'api_error'))


def qwen(sample):
    upload = json.loads(cmd(['curl', '--fail', '-sS', '--max-time', '45',
                            HOST + '/gradio_api/upload', '-F', 'files=@' + str(ROOT / sample['path'])]))
    request = dict(data=[dict(path=upload[0], meta={'_type':'gradio.FileData'}), 'Auto', False])
    event = json.loads(cmd(['curl', '--fail', '-sS', '--max-time', '45',
                           HOST + '/gradio_api/call/transcribe', '-H', 'Content-Type: application/json',
                           '--data-binary', json.dumps(request)]))
    sse = cmd(['curl', '--fail', '-sS', '-N', '--max-time', '120',
               HOST + '/gradio_api/call/transcribe/' + event['event_id']], timeout=130).decode()
    (RAW / (sample['id'] + '-qwen.sse')).write_text(sse)
    chunks = re.findall(r'event: complete\s+data: (.*)', sse)
    if not chunks:
        raise RuntimeError('No complete event: ' + sse[-600:])
    data = json.loads(chunks[-1])
    return dict(text=data[1], language=data[0], response=data, status='success')


def run():
    key = cmd(['az', 'cognitiveservices', 'account', 'keys', 'list', '-g', 'xiaoan-pilot-rg',
               '-n', 'xiaoan-speech-trial-jpe-20261101', '--query', 'key1', '-o', 'tsv']).decode().strip()
    samples = json.loads((ROOT / 'manifest.json').read_text())
    def engine(name):
        for s in samples:
            path = RAW / (s['id'] + '-' + name + '.json')
            if path.exists():
                continue
            started = time.monotonic()
            try:
                result = azure(s, key) if name=='azure' else qwen(s)
            except Exception as exc:
                result = dict(status='failed', error=str(exc))
            result.update(sample_id=s['id'], engine=name,
                          wall_seconds=round(time.monotonic()-started, 3))
            save(path, result)
            print(name, s['id'], result['status'], result.get('text', result.get('error','')), flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(engine, ['azure','qwen']))
    # Separate, clearly labelled manual locale tuning; never cherry-pick primary score.
    for s in samples[:3]:
        path = RAW / (s['id'] + '-azure-sichuan.json')
        if not path.exists():
            try:
                save(path, azure(s, key, 'zh-CN-sichuan'))
            except Exception as exc:
                save(path, dict(status='failed', error=str(exc)))


if __name__ == '__main__':
    {'prepare': prepare, 'run': run}[sys.argv[1]]()
