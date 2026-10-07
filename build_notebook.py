"""Convert analysis.py (cells separated by '# %%') into an executed Jupyter notebook."""
import re, sys, nbformat
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell
from nbclient import NotebookClient

src = open('analysis.py', encoding='utf-8').read()
parts = re.split(r'(?m)^# %%(.*)$', src)
nb = new_notebook()
for header, body in zip(parts[1::2], parts[2::2]):
    body = body.strip('\n')
    if '[markdown]' in header:
        text = '\n'.join(l[2:] if l.startswith('# ') else l.lstrip('#') for l in body.split('\n'))
        nb.cells.append(new_markdown_cell(text))
    else:
        c = new_code_cell(body)
        m = re.search(r'id=(\w+)', header)
        if m: c.metadata['cell_id'] = m.group(1)
        nb.cells.append(c)
nb.metadata['kernelspec'] = {'name': 'python3', 'display_name': 'Python 3', 'language': 'python'}
NotebookClient(nb, timeout=600, kernel_name='python3', resources={'metadata': {'path': '.'}}).execute()
nbformat.write(nb, 'DEV_Capstone_Penguins.ipynb')
print('Notebook executed:', len(nb.cells), 'cells')
