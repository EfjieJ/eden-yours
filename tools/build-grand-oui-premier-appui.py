# Construit conte-grand-oui-premier-appui.html (69 images, texte gratuit, vidéo muette, chanson « bientôt ») à partir de contes/grand-oui-premier-appui.txt, tel quel.
# REFUSE si l empreinte SHA-256 diffère ou si le découpage ne redonne pas le texte à l identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/grand-oui-premier-appui.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023u'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/gopa-segs.json'
EXPECT = '974bdfea826a998387c89413792349206c0f72131b913501927a43eaaa44a6a4'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
assert raw.startswith('**Le Grand Oui et le Premier Appui**\n\n')
body = raw.split('\n', 2)[2].rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
exec(open('/workspace/contes/gopa-plan.py', encoding='utf-8').read())  # P = [(phrases, src)], ALT
G = [g for g, _ in P]
IMG = ['gopa%02d' % (k + 1) for k in range(len(P))]
NS = len(G)
assert NS == 69 and len(set(IMG)) == NS and sum(G, []) == list(range(1, len(segs) + 1)) and len(segs) == 108
# position de chaque segment dans le texte
pos, st = 0, []
for s in segs:
    i = body.find(s, pos)
    if i < 0: sys.exit(f'REFUS : segment introuvable : {s[:40]!r}')
    st.append(i); pos = i + len(s)
assert st[0] == 0
starts = [st[g[0] - 1] for g in G] + [len(body)]
chunks = [body[starts[k]:starts[k + 1]] for k in range(NS)]
if ''.join(chunks) != body: sys.exit('REFUS : découpage non identique.')
esc = lambda s: html.escape(s, quote=False)
D = 'assets/contes/grand-oui-premier-appui'
out = []
for k, c in enumerate(chunks):
    n = k + 1; b = IMG[k]; t = c.rstrip(' \n'); sep = c[len(t):]
    sp = f'<span class="conte-sep" hidden>{esc(sep)}</span>' if sep else ''
    nxt = '' if n == NS else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/grand-oui-premier-appui.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(NS))
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-grand-oui-premier-appui.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": NS, "images": NS, "sha256": h}, sys.stdout); print()
