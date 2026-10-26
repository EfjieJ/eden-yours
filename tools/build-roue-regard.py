# Construit conte-roue-regard.html (42 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/roue-respect.txt), tel quel. REFUSE si l'empreinte SHA-256 diffère
# ou si le découpage ne redonne pas le texte à l'identique.
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/roue-respect.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023v'
SEGS = sys.argv[3] if len(sys.argv) > 3 else '/workspace/contes/rr-segs.json'
EXPECT = '3e1cdc522f4a288461c55593ec0e5145071c4772408b5e140a70606f0f605184'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
body = raw.rstrip('\n')
segs = json.load(open(SEGS, encoding='utf-8'))
G = [[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12,13],[14],[15],[16],[17],[18],[19],[20,21],[22],[23],[24],[25],[26],[27],[28],[29,30],[31],[32],[33],[34],[35],[36],[37],[38,39],[40],[41],[42],[43,44],[45],[46,47],[48]]
ALT = ['Un homme regarde une pierre rouler', 'Il pousse la pierre du doigt', 'Une spirale dorée dans la pierre : le mouvement vient du geste', 'Le chemin, le terrain', 'Un tronc taillé en rondelles, un essieu', 'La charge avance', 'Les villageois appellent ça la roue', 'L’homme sourit : il sait', 'La main sur le cœur, il dit oui', 'Les siècles passent', 'Le char, le moulin, l’horloge', 'Mesurer et calculer à la main', 'Le feu, la lumière, la manivelle : une main, un geste, un oui', 'Des nombres de lumière s’élèvent d’un livre', 'Des fils de lumière plus rapides que la pensée', 'Les engrenages d’une vieille horloge tournent seuls', 'Une main ouverte lâche un fil doré', 'Un être de lumière derrière les engrenages', 'Les engrenages exécutent, la main crée une fleur', 'Un chemin de lumière silencieux', 'Deux villageois s’inclinent l’un devant l’autre', 'Reconnaître l’œuvre de la potière', 'Peindre à côté de la fresque d’un autre', 'Un homme s’attribue tout le mérite', 'Un village qui sombre dans la brume', 'Deux êtres de lumière offrent un cœur gravé', 'Tenir sa création avec soin', 'Veiller dans le silence', 'Une sculpture abandonnée s’efface', 'Le sculpteur reste, l’œuvre dure', 'La femme s’arrête devant l’arbre', 'Quelqu’un d’autre l’a planté, il y a longtemps', 'Elle le regarde comme le sien', '« Merci. »', 'L’arbre reste', 'L’arbre ne disparaît plus', 'Une civilisation de jardins, sans machines', 'Deux gestes simples', 'Honorer l’autre, prendre soin de soi', 'Un pont de lumière', 'Créer, regarder, dire oui', 'Un monde lumineux où rien ne sombre']
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
    nxt = '' if n == 42 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span>{sp}</p></div>{nxt}
      </section>''')
tpl = open('tools/roue-regard.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '42')
p = 0
for c in chunks:
    k = page.find(esc(c.rstrip(' \n')), p)
    if k < 0: sys.exit('REFUS : passage absent de la page.')
    p = k
open('conte-roue-regard.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 42, "images": 42, "sha256": h}, sys.stdout); print()
