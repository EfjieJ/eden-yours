# Construit conte-grand-oui-roue.html (version 2 du texte, 65 images : 45 reprises + 20 nouvelles gor47–gor66, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/grand-oui-roue.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/grand-oui-roue.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023t'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/gor2-segs.json'
EXPECT = '44bd9c747db9220de875215ce6be404a3c996f1edf894a4f329c0c16f0153f19'  # v2 (v1 : c31fa96b…, contes/grand-oui-roue-v1.txt)
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
assert raw.startswith('**Le Grand Oui et la Roue**\n\n')
body = raw.split('\n', 2)[2].rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
OLD_G_UNUSED = None
OLD_ALT = ['Un grand être de lumière dorée décide : le grand oui', 'Des mains de lumière déposent la première étincelle de vie', 'Les plantes poussent', 'Les animaux marchent, nagent, volent', 'Le premier homme regarde sa main qui peut choisir', 'La matière : argile, pierre, bois, un potentiel', 'La matière attend, immobile', 'La main touche l’argile et lui donne une forme', 'La main, symbole de la vie', 'La main touche, prend, pose, crée', 'Par la main, le oui devient visible sur la terre', 'La main s’arrête devant un tronc rond', 'Elle fait tourner le tronc', 'La roue naît', 'Le bois devient mouvement', 'Une main qui décide, un regard qui mesure, un oui', 'Le même oui, la même main, la même matière', 'La main taille le silex', 'La main tend la corde : le premier arc', 'Le bâton planté dans la terre : le premier levier', 'La même main fait devenir le potentiel', 'Des signes tracés dans l’argile : l’écriture naît', 'D’autres mains lisent la tablette et la continuent', 'Compter les pas, les angles, les forces', 'Des cercles parfaits, des lignes droites', 'Observer le ciel, noter ce qui se répète', 'La science naît : mesurer, vérifier, prévoir', 'La géométrie : le résultat avant le geste', 'Un pont qui tient', 'Une roue qui ne casse pas', 'Un bateau qui revient', 'Le potentiel devient ce qu’on a décidé', 'La main ouvre la valve de vapeur', 'La main ferme le circuit', 'La main reste posée sur le levier', 'La main sur une tablette lumineuse', 'La main règle la lumière qui soulève la pierre', 'La main décide d’allumer ou d’arrêter : le grand oui', 'Le grand oui depuis la première plante', 'Il comprend la mécanique et reste cause', 'L’oubli : on oublie la main de l’autre', 'On sombre dans la brume', 'Reconnaître ce que l’autre a fait', 'Assumer sa propre création', 'Rester sur Terre, la main sur le levier', 'La roue tourne, les signes restent, la main est là']
exec(open('/workspace/contes/gor2-plan.py', encoding='utf-8').read())  # P = [(phrases, 'oK'|'NK')], NALT
G = [g for g, _ in P]
IMG = [('gor%02d' % int(src[1:])) if src[0] == 'o' else ('gor%02d' % (46 + int(src[1:]))) for _, src in P]
ALT = [OLD_ALT[int(src[1:]) - 1] if src[0] == 'o' else NALT[src] for _, src in P]
NS = len(G)
assert NS == 65 and len(set(IMG)) == NS and sum(G, []) == list(range(1, len(segs) + 1)) and len(segs) == 138
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
D = 'assets/contes/grand-oui-roue'
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
tpl = open('tools/grand-oui-roue.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(NS))
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-grand-oui-roue.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": NS, "images": NS, "sha256": h}, sys.stdout); print()
