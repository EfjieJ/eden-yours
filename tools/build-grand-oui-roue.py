# Construit conte-grand-oui-roue.html (46 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/grand-oui-roue.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/grand-oui-roue.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023q'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/gor-segs.json'
EXPECT = 'c31fa96b20ee5e4758ab086c8661028329a030061109beda03e793ce28625e6d'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
assert raw.startswith('**Le Grand Oui et la Roue**\n\n')
body = raw.split('\n', 2)[2].rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1], [2], [3], [4], [5], [6, 7], [8, 9], [10], [11], [12], [13, 14], [15], [16], [17], [18], [19], [20, 21, 22], [23], [24], [25], [26], [27, 28], [29, 30, 31], [32], [33], [34, 35], [36], [37, 38], [39], [40], [41], [42], [43], [44], [45, 46, 47], [48, 49], [50, 51, 52], [53, 54, 55, 56], [57], [58, 59, 60, 61, 62, 63], [64, 65, 66, 67], [68, 69, 70, 71, 72], [73, 74, 75, 76, 77], [78, 79, 80, 81, 82, 83, 84], [85, 86, 87, 88, 89, 90, 91, 92], [93, 94, 95, 96, 97, 98, 99]]
ALT = ['Un grand être de lumière dorée décide : le grand oui', 'Des mains de lumière déposent la première étincelle de vie', 'Les plantes poussent', 'Les animaux marchent, nagent, volent', 'Le premier homme regarde sa main qui peut choisir', 'La matière : argile, pierre, bois, un potentiel', 'La matière attend, immobile', 'La main touche l’argile et lui donne une forme', 'La main, symbole de la vie', 'La main touche, prend, pose, crée', 'Par la main, le oui devient visible sur la terre', 'La main s’arrête devant un tronc rond', 'Elle fait tourner le tronc', 'La roue naît', 'Le bois devient mouvement', 'Une main qui décide, un regard qui mesure, un oui', 'Le même oui, la même main, la même matière', 'La main taille le silex', 'La main tend la corde : le premier arc', 'Le bâton planté dans la terre : le premier levier', 'La même main fait devenir le potentiel', 'Des signes tracés dans l’argile : l’écriture naît', 'D’autres mains lisent la tablette et la continuent', 'Compter les pas, les angles, les forces', 'Des cercles parfaits, des lignes droites', 'Observer le ciel, noter ce qui se répète', 'La science naît : mesurer, vérifier, prévoir', 'La géométrie : le résultat avant le geste', 'Un pont qui tient', 'Une roue qui ne casse pas', 'Un bateau qui revient', 'Le potentiel devient ce qu’on a décidé', 'La main ouvre la valve de vapeur', 'La main ferme le circuit', 'La main reste posée sur le levier', 'La main sur une tablette lumineuse', 'La main règle la lumière qui soulève la pierre', 'La main décide d’allumer ou d’arrêter : le grand oui', 'Le grand oui depuis la première plante', 'Il comprend la mécanique et reste cause', 'L’oubli : on oublie la main de l’autre', 'On sombre dans la brume', 'Reconnaître ce que l’autre a fait', 'Assumer sa propre création', 'Rester sur Terre, la main sur le levier', 'La roue tourne, les signes restent, la main est là']
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
    nxt = '' if n == 46 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/grand-oui-roue.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '46')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-grand-oui-roue.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 46, "images": 46, "sha256": h}, sys.stdout); print()
