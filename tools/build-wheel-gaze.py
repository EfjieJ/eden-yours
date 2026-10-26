# Construit conte-wheel-gaze.html (EN) (42 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/wheel-gaze-en.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/wheel-gaze-en.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023s'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/wg-segs.json'
EXPECT = 'ff7e9fdcc454db5f7ccf2606900e5c70e4dceb9fbc20615c827b17d609c3df4a'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
body = raw.rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12,13],[14],[15],[16],[17],[18],[19],[20,21],[22],[23],[24],[25],[26],[27],[28],[29,30],[31],[32],[33],[34],[35],[36],[37],[38,39],[40],[41],[42],[43,44],[45],[46,47],[48]]
ALT = ['A man watches a stone roll', 'He pushes it with his fingertip', 'A golden spiral in the stone: the movement comes from the gesture', 'The path, the ground', 'A trunk cut into slices, an axle', 'The load moves forward', 'The villagers call it the wheel', 'The man smiles: he knows', 'Hand on heart, he says yes', 'Centuries pass', 'The chariot, the mill, the clock', 'Measuring and calculating by hand', 'Fire, light, the crank: one hand, one gesture, one yes', 'Numbers of light rise from a book', 'Threads of light faster than thought', 'The gears of an old clock turn by themselves', 'An open hand lets go of a golden thread', 'A being of light behind the gears', 'The gears execute, the hand creates a flower', 'A silent path of light', 'Two villagers bow to each other', 'Recognizing the potter’s work', 'Painting beside someone else’s fresco', 'A man takes all the credit', 'A village sinking into the mist', 'Two beings of light offer an engraved heart', 'Holding one’s creation with care', 'Keeping watch in the silence', 'An abandoned sculpture fades', 'The sculptor stays, the work lasts', 'The woman stops before the tree', 'Someone else planted it, long ago', 'She looks at it as her own', '“Thank you.”', 'The tree remains', 'The tree no longer disappears', 'A civilization of gardens, without machines', 'Two simple gestures', 'Honouring the other, caring for oneself', 'A bridge of light', 'Creating, looking, saying yes', 'A bright world where nothing sinks']
assert len(G) == 42 == len(ALT) and sum(G, []) == list(range(1, 49)) and len(segs) == 48
# position de chaque segment dans le texte
pos, st = 0, []
for s in segs:
    i = body.find(s, pos)
    if i < 0: sys.exit(f'REFUS : segment introuvable : {s[:40]!r}')
    st.append(i); pos = i + len(s)
assert st[0] == 0
starts = [st[g[0] - 1] for g in G] + [len(body)]
chunks = [body[starts[k]:starts[k + 1]] for k in range(42)]
if ''.join(chunks) != body: sys.exit('REFUS : découpage non identique.')
esc = lambda s: html.escape(s, quote=False)
D = 'assets/contes/roue-regard'
out = []
for k, c in enumerate(chunks):
    n = k + 1; b = f'rr{n:02d}'; t = c.rstrip(' \n'); sep = c[len(t):]
    sp = f'<span class="conte-sep" hidden>{esc(sep)}</span>' if sep else ''
    nxt = '' if n == 42 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Next ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/wheel-gaze.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '42')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-wheel-gaze.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 42, "images": 42, "sha256": h}, sys.stdout); print()
