import json, re, subprocess, sys
items = json.load(open('toc_items.json'))
txt = subprocess.run(['pdftotext','-layout','DEV_Capstone_Report.pdf','-'],capture_output=True,text=True).stdout
pages = txt.split('\f')
norm = lambda s: re.sub(r'[^a-z0-9]','',s.lower())
res = {}; start = 2   # skip cover + toc (0-based index 2 = page 3)
for title, lvl, key in items:
    found = None
    for i in range(start, len(pages)):
        for line in pages[i].split('\n'):
            if norm(line) == norm(title):
                found = i+1; break
        if found: break
    if found:
        res[key] = found; start = found-1
    else:
        print('NOT FOUND', title)
json.dump(res, open('pages.json','w'))
print('pages total', len([p for p in pages if p.strip()]), res)
