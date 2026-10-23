# Construit conte-maelle-chaine.html (49 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/maelle-chaine.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/maelle-chaine.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023e'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/maelle-segs.json'
EXPECT = 'c80d688f1ef2992c69eca6c396a7cff3149bb13d6c076e49756b5866041de816'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
body = raw.rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13,14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24],[25],[26],[27],[28],[29,30],[31],[32,33],[34],[35],[36],[37,38],[39],[40],[41],[42,43],[44],[45],[46,47],[48],[49],[50,51],[52],[53,54],[55,56,57],[58],[59]]
ALT = ['Un monde ancien tenu par la chaîne alimentaire', 'Des plantes nourrissent des herbivores', 'Des herbivores et des carnivores', 'Les humains au-dessus de la chaîne', '« C’est la nature », disait-on', 'Maëlle arrête la viande', 'La peur dans le regard d’un animal', 'Maëlle plante un jardin', 'Maëlle ne tue plus rien', 'Maëlle a faim', 'La faim change, la main sur le cœur', 'Maëlle se sent plus légère', 'Maëlle parle à ses voisins', 'Les voisins se moquent', 'Un voisin essaie une semaine', 'Son corps se régénère', 'Il continue', 'D’autres suivent', 'Un marché sans viande, plein de fleurs', 'Un abattoir fermé, couvert de lierre', 'Les animaux sont relâchés', 'Des animaux restent près de Maëlle', 'D’autres partent au coucher du soleil', 'Personne ne les poursuit', 'La chaîne se défait chez les humains', 'Puis plus bas', 'Des oiseaux près des insectes, sans chasser', 'On regarde les oiseaux, ils restent', 'Un chat s’arrête en plein geste', 'Le chat et la souris se regardent', 'Chacun s’en va de son côté', 'Des plantes sans poison', 'Un jardin que personne n’arrache', 'Cultiver par plaisir', 'Un océan calme', 'Un grand poisson près des petits', 'Les petits poissons sortent du corail', 'La mer, lieu de passage', 'Une place de village sans décret', 'La chaîne se défait lentement', 'Un repas de fruits, de légumes et de graines', 'Maëlle a peu faim', 'Le corps nourri de ce qu’il crée', 'L’attention, le oui', 'Une respiration large', 'Un enfant pose une question à Maëlle', 'Maëlle lui répond', 'La chaîne au repos, intacte', 'Un monde où la chaîne n’est plus nécessaire']
assert len(G) == 49 == len(ALT) and sum(G, []) == list(range(1, 60)) and len(segs) == 59
# position de chaque segment dans le texte
pos, st = 0, []
for s in segs:
    i = body.find(s, pos)
    if i < 0: sys.exit(f'REFUS : segment introuvable : {s[:40]!r}')
    st.append(i); pos = i + len(s)
assert st[0] == 0
starts = [st[g[0] - 1] for g in G] + [len(body)]
chunks = [body[starts[k]:starts[k + 1]] for k in range(49)]
if ''.join(chunks) != body: sys.exit('REFUS : découpage non identique.')
esc = lambda s: html.escape(s, quote=False)
D = 'assets/contes/maelle-chaine'
out = []
for k, c in enumerate(chunks):
    n = k + 1; b = f'mc{n:02d}'; t = c.rstrip(' \n'); sep = c[len(t):]
    sp = f'<span class="conte-sep" hidden>{esc(sep)}</span>' if sep else ''
    nxt = '' if n == 49 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/maelle-chaine.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '49')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-maelle-chaine.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 49, "images": 49, "sha256": h}, sys.stdout); print()
