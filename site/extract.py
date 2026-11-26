"""List translatable units of index.src.html that have no ru/en translation yet."""
import json, os, sys
from bs4 import BeautifulSoup
sys.path.insert(0, os.path.dirname(__file__))
from i18n_core import units
HERE = os.path.dirname(os.path.abspath(__file__))
soup = BeautifulSoup(open(os.path.join(HERE, 'index.src.html'), encoding='utf-8').read(), 'html.parser')
tr = json.load(open(os.path.join(HERE, 'i18n.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'i18n.json')) else {}
seen, todo = set(), []
for kind, node, key in units(soup):
    if key in seen: continue
    seen.add(key)
    if key not in tr: todo.append(key)
json.dump(todo, open(os.path.join(HERE, 'todo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'units: {len(seen)}, missing: {len(todo)}')
