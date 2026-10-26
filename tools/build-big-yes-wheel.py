# Construit conte-big-yes-wheel.html (EN) (46 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/big-yes-wheel-en.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/big-yes-wheel-en.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023u'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/byw-segs.json'
EXPECT = 'f18e1c3de3eccabfd46923c350dd0eb91b49ab7e1b769a8e357bc369d021bea0'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
assert raw.startswith('The Big Yes and the Wheel\n\n')
body = raw.split('\n', 2)[2].rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1], [2], [3], [4], [5], [6, 7], [8, 9], [10], [11], [12], [13, 14], [15], [16], [17], [18], [19], [20, 21, 22], [23], [24], [25], [26], [27, 28], [29, 30, 31], [32], [33], [34, 35], [36], [37, 38], [39], [40], [41], [42], [43], [44], [45, 46, 47], [48, 49], [50, 51, 52], [53, 54, 55, 56], [57], [58, 59, 60, 61, 62, 63], [64, 65, 66, 67], [68, 69, 70, 71, 72], [73, 74, 75, 76, 77], [78, 79, 80, 81, 82, 83, 84], [85, 86, 87, 88, 89, 90, 91, 92], [93, 94, 95, 96, 97, 98, 99]]
ALT = ['A great being of golden light decides: the big yes', 'Hands of light set down the first spark of life', 'The plants grow', 'The animals walk, swim and fly', 'The first man looks at his hand that can choose', 'Matter: clay, stone, wood, a potential', 'Matter waits, still', 'The hand touches the clay and gives it a shape', 'The hand, symbol of life', 'The hand touches, takes, places, creates', 'Through the hand, the yes becomes visible on earth', 'The hand stops in front of a round trunk', 'She turns the trunk', 'The wheel is born', 'Wood becomes movement', 'A hand that decides, a look that measures, a yes', 'The same yes, the same hand, the same matter', 'The hand cuts the flint', 'The hand draws the rope: the first bow', 'The stick planted in the earth: the first lever', 'The same hand makes the potential become', 'Signs traced in the clay: writing is born', 'Other hands read the tablet and continue it', 'Counting steps, angles, forces', 'Perfect circles, straight lines', 'Watching the sky, noting what repeats', 'Science is born: measuring, verifying, foreseeing', 'Geometry: the result before the gesture', 'A bridge that holds', 'A wheel that does not break', 'A boat that returns', 'The potential becomes what we decided', 'The hand opens the steam valve', 'The hand closes the circuit', 'The hand stays on the lever', 'A hand on a glowing tablet', 'The hand guides the light that lifts the stone', 'The hand decides to switch on or stop: the big yes', 'The big yes since the first plant', 'He understands mechanics and remains the cause', 'Forgetting: we forget the other’s hand', 'Sinking into the fog', 'Recognizing what the other has done', 'Taking responsibility for one’s own creation', 'Staying on Earth, hand on the lever', 'The wheel turns, the signs remain, the hand is there']
assert len(G) == 46 == len(ALT) and sum(G, []) == list(range(1, 100)) and len(segs) == 99
# position de chaque segment dans le texte
pos, st = 0, []
for s in segs:
    i = body.find(s, pos)
    if i < 0: sys.exit(f'REFUS : segment introuvable : {s[:40]!r}')
    st.append(i); pos = i + len(s)
assert st[0] == 0
starts = [st[g[0] - 1] for g in G] + [len(body)]
chunks = [body[starts[k]:starts[k + 1]] for k in range(46)]
if ''.join(chunks) != body: sys.exit('REFUS : découpage non identique.')
esc = lambda s: html.escape(s, quote=False)
D = 'assets/contes/grand-oui-roue'
out = []
for k, c in enumerate(chunks):
    n = k + 1; b = f'gor{n:02d}'; t = c.rstrip(' \n'); sep = c[len(t):]
    sp = f'<span class="conte-sep" hidden>{esc(sep)}</span>' if sep else ''
    nxt = '' if n == 46 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Next ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/big-yes-wheel.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '46')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-big-yes-wheel.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 46, "images": 46, "sha256": h}, sys.stdout); print()
