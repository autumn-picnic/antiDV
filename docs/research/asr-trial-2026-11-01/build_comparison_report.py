"""Build a standalone report with embedded test recordings. No dependencies."""
import base64
import hashlib
import html
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent / 'comparison'


def normal(text):
    return ''.join(c for c in unicodedata.normalize('NFKC', text)
                   if unicodedata.category(c)[0] in 'LN')


def distance(a, b):
    previous = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        row = [i]
        for j, y in enumerate(b, 1):
            row.append(min(row[-1]+1, previous[j]+1, previous[j-1]+(x != y)))
        previous = row
    return previous[-1]


def inline(text):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)', r'<a href="\2">\1</a>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)


def markdown(text):
    parts = []
    table = False
    for line in text.splitlines():
        if line.startswith('|'):
            if not table:
                parts.append('<div class="table-scroll"><table>')
                table = True
            if re.fullmatch(r'[| :\-]+', line):
                continue
            parts.append('<tr>' + ''.join('<td>'+inline(c.strip())+'</td>'
                                         for c in line.strip('|').split('|')) + '</tr>')
            continue
        if table:
            parts.append('</table></div>')
            table = False
        if line.startswith('# '):
            parts.append('<h1>'+inline(line[2:])+'</h1>')
        elif line.startswith('## '):
            parts.append('<h2>'+inline(line[3:])+'</h2>')
        elif line.strip():
            parts.append('<p>'+inline(line)+'</p>')
    if table:
        parts.append('</table></div>')
    return '\n'.join(parts)


def build():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    summary = defaultdict(lambda: {'clips':0, 'errors':0, 'characters':0})
    details = []
    cards = []
    for sample in manifest:
        sid = sample['id']
        wav = (ROOT / sample['path']).read_bytes()
        assert hashlib.sha256(wav).hexdigest() == sample['sha256']
        results = {}
        result_html = []
        for engine, label in [('azure','Azure Speech · 日本東'), ('qwen','Qwen3-ASR-1.7B · 官方 demo')]:
            result = json.loads((ROOT / 'raw' / (sid+'-'+engine+'.json')).read_text())
            success = result['status'].lower() == 'success'
            score = None
            if success and sample['scored']:
                ref, hyp = normal(sample['reference']), normal(result['text'])
                errors = distance(ref, hyp)
                score = {'errors':errors, 'characters':len(ref), 'cer':errors/len(ref)}
                group = summary[(engine,sample['group'])]
                group['clips'] += 1
                group['errors'] += errors
                group['characters'] += len(ref)
            results[engine] = dict(result, score=score)
            value = result.get('text','') if success else '未取得轉寫：'+result.get('error',result['status'])
            if success and not value:
                value = '（空字串）'
            badge = f'字錯 {score["errors"]}/{score["characters"]} · CER {score["cer"]:.2%}' if score else ('未評 CER' if success else '服務失敗／不計 CER')
            result_html.append(f'<div class="result"><b>{label}</b><p>{html.escape(value)}</p><small>{html.escape(badge)}</small></div>')
        extra = ROOT / 'raw' / (sid+'-azure-sichuan.json')
        if extra.exists():
            result = json.loads(extra.read_text())
            result_html.append('<p class="muted">另選四川 locale：'+html.escape(result.get('text',result.get('status','')))+'</p>')
        reference = sample['reference'] if sample['reference'] is not None else '未取得獨立逐字標準稿；本段僅供收聽與定性比較'
        uri = 'data:audio/wav;base64,' + base64.b64encode(wav).decode()
        cards.append(f'''<article id="{sid}"><h3>{html.escape(sid)} · {html.escape(sample['group'])}</h3>
<p>{html.escape(sample['condition'])} · {sample['duration_seconds']:.2f} 秒</p>
<audio controls preload="none" src="{uri}"></audio>
<p><b>參考原文：</b>{html.escape(reference)}</p><div class="results">{''.join(result_html)}</div>
<p class="muted">音訊 SHA-256：<code>{sample['sha256']}</code></p>
<a href="{html.escape(sample['source'],quote=True)}">原始來源／處理依據</a></article>'''
                     if sample['source'].startswith('https:') else
                     f'<article id="{sid}"><h3>靜音</h3><audio controls preload="none" src="{uri}"></audio>{"".join(result_html)}</article>')
        details.append(dict(sample=sample, results=results))
    metrics = {f'{engine}/{group}':dict(value, cer=value['errors']/value['characters'])
               for (engine,group),value in summary.items()}
    (ROOT / 'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
    (ROOT / 'results.json').write_text(json.dumps(details,ensure_ascii=False,indent=2))
    body = markdown((ROOT / 'REPORT.md').read_text())
    out = '''<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>小安語音實測 · Azure Speech × Qwen</title>
<style>body{font:16px/1.8 system-ui,sans-serif;color:#243238;background:#faf9f6;margin:0}main{max-width:1040px;margin:auto;padding:28px 22px}h1{font-size:30px;line-height:1.4}h2{margin-top:42px;border-bottom:1px solid #ddd;padding-bottom:8px}h3{font-size:18px}a{color:#276c73}article{background:white;border:1px solid #ddd;border-radius:10px;padding:22px;margin:20px 0}audio{width:100%;max-width:650px}.results{display:grid;grid-template-columns:1fr 1fr;gap:16px}.result{background:#f3f6f5;padding:14px;border-radius:6px}.result p{white-space:pre-wrap;overflow-wrap:anywhere}small,.muted{color:#596971;font-size:13px}code{overflow-wrap:anywhere}table{border-collapse:collapse;min-width:600px;width:100%}td{border:1px solid #ddd;padding:9px}tr:first-child{font-weight:600;background:#edf3f0}.table-scroll{overflow:auto}nav{padding:14px;background:#edf3f0}p{overflow-wrap:anywhere}@media(max-width:650px){.results{grid-template-columns:1fr}main{padding:18px 14px}}</style>
<main><nav>離線單檔報告 · 錄音已嵌入檔案，可直接播放 · <a href="#clips">跳到 19 段錄音與輸出</a></nav>'''
    out += body + '<h2 id="clips">逐段錄音與實際輸出</h2>' + '\n'.join(cards) + '</main></html>'
    (ROOT / 'report.html').write_text(out)
    print(json.dumps(metrics,ensure_ascii=False,indent=2))
    print('embedded recordings:',len(cards),'report bytes:',len(out.encode()))


if __name__ == '__main__':
    build()
