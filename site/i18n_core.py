"""Shared helpers for the multilingual build (unit extraction, transliteration)."""
import re
from bs4 import BeautifulSoup, NavigableString, Comment, Tag

INLINE = {'b', 'strong', 'em', 'i', 'small', 'br', 'span', 'a', 'sup', 'sub', 'code', 'abbr', 'u'}
SKIP = {'script', 'style', 'svg', 'noscript', 'template'}
ATTRS = ('alt', 'placeholder', 'aria-label', 'title', 'data-consult')
HAS_LETTER = re.compile(r'[A-Za-zʻʼ‘’Ѐ-ӿ]')

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

def skip_el(el):
    while el is not None and isinstance(el, Tag):
        if el.name in SKIP or el.has_attr('data-noi18n'):
            return True
        el = el.parent
    return False

def is_inline_only(el):
    for d in el.descendants:
        if isinstance(d, Tag) and d.name not in INLINE:
            return False
    return True

def has_text(el):
    return any(isinstance(d, NavigableString) and not isinstance(d, Comment) and HAS_LETTER.search(d) for d in el.descendants)

def units(soup):
    """Yield (kind, node, key). kind: 'el' (replace innerHTML), 'txt' (replace a lone text node), 'attr'."""
    body = soup.body
    def walk(el):
        if skip_el(el):
            return
        if el is not body and el.name not in INLINE and is_inline_only(el) and has_text(el):
            yield ('el', el, norm(el.decode_contents()))
            return
        for ch in list(el.children):
            if isinstance(ch, Comment):
                continue
            if isinstance(ch, NavigableString):
                if HAS_LETTER.search(ch) and not skip_el(el):
                    yield ('txt', ch, norm(str(ch)))
            elif isinstance(ch, Tag):
                if ch.name in INLINE and is_inline_only(ch) and has_text(ch) and not skip_el(ch):
                    yield ('el', ch, norm(ch.decode_contents()))
                else:
                    yield from walk(ch)
    yield from walk(body)
    for el in soup.find_all(True):
        if skip_el(el):
            continue
        for a in ATTRS:
            if el.has_attr(a) and HAS_LETTER.search(el[a]):
                yield ('attr', (el, a), norm(el[a]))
    for m in soup.find_all('meta'):
        if m.get('name') == 'description' or m.get('property') in ('og:title', 'og:description'):
            yield ('attr', (m, 'content'), norm(m['content']))
    if soup.title:
        yield ('el', soup.title, norm(soup.title.decode_contents()))

# ---- Uzbek: current Latin -> improved alphabet (O‘→Ö, G‘→Ğ, Sh→Ş, Ch→Ç) ----
APOS = "[‘’ʻʼ'`]"
KEEP = {  # English / brand words that must not be transliterated
 'scratch', 'english','school','international','speaking','listening','reading','writing','language','teacher','teachers','research','technology',
 'friendship','lunchtime','lunch','change','challenge','check','children','each','much','such','which','teach','coach','search','chat',
 'show','shop','fresh','wish','flash','dashboard','bachelor','scholarship','champion','chess','chemistry','physics','machine','english,',
 'environment','information','placement','partner','instructor','coding','engineering','learning','thinking','king','spring','string',
 'morning','evening','meeting','training','marketing','branding','ranking','hashtag','push','rush','marsh','ship','sharp','share',
 'principles','statistics','mathematics','computer','science','calculus','advanced','college','board','digital','olympiad','olympiads',
 'partnership','nexted','nextgen','iron','irn','ielts','sat','ap','it','zis','zafar','telegram','instagram','youtube','click','target','mock','grade',
 'lesson','afternoon','snack','pre-school','preschool','foundation','victory','curious','algorithm','confident','teamwork','discover',
 'debug','grateful','knowledge','future','code','dream','developed','master','rights','reserved','all','by','qualified','extremely',
 'well','very','possibly','recommendation','no','hello','how','was','your','day','it','amazing','we','spoke','with','professor','from',
 'canada','real','python','html','math','r&w','ideas','innovation','cambridge','harrow','louis','schilder','mr','iron','ashgabat',
}

def _case(src, repl):
    return repl.upper() if src.isupper() else (repl[0].upper() + repl[1:] if src[0].isupper() else repl)

def _translit_part(w):
    w = re.sub(r'([Oo])' + APOS, lambda m: 'Ö' if m.group(1) == 'O' else 'ö', w)
    w = re.sub(r'([Gg])' + APOS, lambda m: 'Ğ' if m.group(1) == 'G' else 'ğ', w)
    w = re.sub(r'(?i)sh', lambda m: 'Ş' if m.group(0) == 'SH' else _case(m.group(0), 'ş'), w)
    w = re.sub(r'(?i)ch', lambda m: 'Ç' if m.group(0) == 'CH' else _case(m.group(0), 'ç'), w)
    return w

def translit_word(w):
    """Transliterate one token; English/brand stems (optionally with Uzbek suffixes like School'dan) stay intact."""
    out = []
    for part in w.split('-'):
        base = re.split(APOS, part, maxsplit=1)[0].lower()
        if base in KEEP and not (len(base) == 1 and base in 'og'):
            out.append(part)
        else:
            out.append(_translit_part(part))
    return '-'.join(out)

TOKEN = re.compile(r"[A-Za-zʻʼ‘’'`\-&]+")

def to_new_alphabet(text):
    if not text:
        return text
    # protect URLs, handles and emails
    parts = re.split(r'(https?://\S+|@[A-Za-z0-9_]+|\S+@\S+|\{\w+\})', text)
    out = []
    for i, p in enumerate(parts):
        out.append(p if i % 2 else TOKEN.sub(lambda m: translit_word(m.group(0)), p))
    return ''.join(out)
