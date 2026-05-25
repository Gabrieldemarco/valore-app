import json
d = json.load(open(r'c:\Users\Usuario\Desktop\agenda-app\agenda-app\psi_result.json'))
cats = d.get('lighthouseResult', {}).get('categories', {})
print('=== LIGHTHOUSE SCORES (Mobile) ===')
for k, v in cats.items():
    print(f'  {v["title"]}: {v["score"]*100:.0f}/100')

audits = d.get('lighthouseResult', {}).get('audits', {})
metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']
print('\n=== CORE WEB VITALS ===')
for m in metrics:
    a = audits.get(m, {})
    print(f'  {a.get("title", m)}: {a.get("displayValue", "N/A")}')

print('\n=== TOP OPPORTUNITIES ===')
opp = [(k, v) for k, v in audits.items() if v.get('details', {}).get('type') == 'opportunity' and v.get('numericValue', 0) > 0]
opp.sort(key=lambda x: x[1].get('numericValue', 0), reverse=True)
for k, v in opp[:8]:
    print(f'  {v.get("title", k)}: -{v.get("numericValue", 0)/1000:.1f}s')
