# Construit conte-lysa-actuel.html (48 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/lysa-actuel.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/lysa-actuel.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023n'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/lysa-segs.json'
EXPECT = '39744069b9cad7c7ecaab13f0d607324dbe23dcfe635e8fb0cde10bc3bf7252c'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
body = raw.rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1],[2],[3],[4],[5,6,7],[8],[9],[10,11],[12],[13],[14],[15],[16],[17,18],[19,20],[21,22],[23,24],[25,26],[27,28],[29],[30],[31],[32],[33],[34],[35],[36],[37,38],[39],[40],[41],[42],[43],[44,45],[46],[47],[48],[49],[50],[51],[52,53],[54],[55,56],[57,58],[59,60],[61],[62],[63]]
ALT = ['Des gens marchent en cercle dans un monde ancien','Le cercle de la vie : naître, grandir, vieillir, mourir','Un repas inquiet, manger pour ne pas mourir','Un renard poursuit un lapin, un chasseur au loin','Une fresque de la chaîne alimentaire : « C’est la vie »','Lysa, petite fille, s’arrête au milieu du chemin','Un oiseau qui vole, un chêne qui reste','Lysa murmure sa question','Personne ne répond','Lysa reste immobile, sans juger','Une lumière s’allume en elle','La sphère dorée, l’être de lumière, l’a créée','Lysa tient une petite sphère : l’Actuel','Lysa à trois âges, qui grandit','Lysa adulte parle aux villageois','Un ruban doré qui marche','La sphère projette un corps','Un homme tient une pomme, les plantes fleurissent','Les villageois se moquent d’elle','Les villageois l’imitent','Un sablier : la pause','Tout le monde dit oui','Une femme, antenne de lumière accordée','Un bras qui se régénère dans la lumière','Un genou qui guérit doucement','Les rides s’effacent dans le reflet d’un étang','Des aînés sans âge','Un chapeau et une baguette posés : une décision','Lumière et ombre : la cause et l’effet','Une chaîne se défait en papillons','Un chasseur pose son arc près d’un faon','L’énergie vient de l’intérieur','Pousser, revenir, dupliquer, recréer','Une respiration collective','Les animaux n’ont plus peur','Les épines deviennent des fleurs','Une charrue abandonnée dans un pré','Créer de la beauté','Un pique-nique joyeux','Une vieille histoire racontée près du feu','Un grand arbre et de longues vies','Un départ serein dans une sphère de lumière','Une seule source, de multiples formes','Le manteau de la vieillesse suspendu comme un costume','Une ville qui se souvient','Lysa s’arrête un matin','Lysa dit oui','Le monde enlacé par la lumière']
assert len(G) == 48 == len(ALT) and sum(G, []) == list(range(1, 64)) and len(segs) == 63
# position de chaque segment dans le texte
pos, st = 0, []
for s in segs:
    i = body.find(s, pos)
    if i < 0: sys.exit(f'REFUS : segment introuvable : {s[:40]!r}')
    st.append(i); pos = i + len(s)
assert st[0] == 0
starts = [st[g[0] - 1] for g in G] + [len(body)]
chunks = [body[starts[k]:starts[k + 1]] for k in range(48)]
if ''.join(chunks) != body: sys.exit('REFUS : découpage non identique.')
esc = lambda s: html.escape(s, quote=False)
D = 'assets/contes/lysa-actuel'
out = []
for k, c in enumerate(chunks):
    n = k + 1; b = f'la{n:02d}'; t = c.rstrip(' \n'); sep = c[len(t):]
    sp = f'<span class="conte-sep" hidden>{esc(sep)}</span>' if sep else ''
    nxt = '' if n == 48 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/lysa-actuel.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '48')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-lysa-actuel.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 48, "images": 48, "sha256": h}, sys.stdout); print()
