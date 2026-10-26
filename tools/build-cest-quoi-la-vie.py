# Construit conte-cest-quoi-la-vie.html (les 16 scènes, texte gratuit)
# à partir du texte de François (contes/cest-quoi-la-vie.txt), tel quel — espaces particuliers et retours à la ligne compris.
# REFUSE de construire si le texte source n'est pas exactement le texte vérifié (empreinte SHA-256) ou si le découpage ne le redonne pas à l'identique.
# Vérification : textContent des .conte-text des 16 scènes, joints sans séparateur == texte source (sans le \n final).
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/cest-quoi-la-vie.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023s'
EXPECT = '920c22ba67a328f4b6b103c09bcbc12bb477ec944a1dcea86603118e086ab647'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT:
    sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}). Rien n’a été construit.')
assert raw.endswith('\n')
body = raw[:-1]
D = 'assets/contes/cest-quoi-la-vie'
SC = [
 [('v01a', '"C’est quoi la vie ?"', 'Sur une colline à l’aube, une jeune femme, une sphère de lumière au-dessus de la tête, se demande : c’est quoi la vie ?'),
  ('v01b', 'La vie est un "rythme', 'Un cercle lumineux aux quatre temps : commencer, continuer, terminer, recommencer'),
  ('v01c', 'Ce rythme se répète', 'Des millions de pulsations de lumière font apparaître une main et un arbre')],
 [('v02a', 'Au fond, il n’existe', 'Elle admire une rose : une seule émotion, l’Admiration'),
  ('v02b', 'Toutes les autres émotions', 'Des voiles de couleurs, tous issus d’une même source dorée')],
 [('v03a', 'Tout est un "segment', 'Un sentier de pierres lumineuses : chaque pierre est un segment de jeu'),
  ('v03b', 'Chaque personne joue', 'Plusieurs personnes, chacune sur son propre sentier'),
  ('v03c', 'Le but du jeu', 'Elle recueille un cristal de lumière, la donnée, près d’un sablier')],
 [('v04a', 'Les émotions servent', 'Des vents d’émotions colorés la portent sur son sentier'),
  ('v04b', 'jusqu’à ce qu’on ait acquis', 'Le cristal de lumière entre dans son cœur : elle a acquis ce qu’elle était venue chercher')],
 [('v05a', '"Voici des exemples', 'Cinq fenêtres lumineuses montrent cinq jeux de la vie'),
  ('v05b', '- Une personne joue le jeu d’apprendre à jouer', 'Un jeune homme apprend la guitare'),
  ('v05c', 'Elle acquiert la donnée « je suis', 'La musique jaillit de sa guitare en rubans de lumière'),
  ('v05d', '- Une personne joue le jeu d’élever', 'Une mère élève ses deux enfants'),
  ('v05e', 'Elle acquiert la donnée de l’amour', 'La mère console son enfant dans un cœur de lumière : amour inconditionnel et patience'),
  ('v05f', '- Une personne joue le jeu de construire', 'Un boulanger ouvre sa petite boulangerie'),
  ('v05g', 'Elle acquiert la donnée de la persévérance', 'Le boulanger offre son pain aux villageois : persévérance et valeur créée'),
  ('v05h', '- Une personne joue le jeu de guérir', 'Une femme guérit, une lumière douce dans la poitrine'),
  ('v05i', 'Elle acquiert la donnée de la maîtrise', 'Guérie, elle marche sereine et guide les vents de ses émotions'),
  ('v05j', '- Une personne joue le jeu d’apprendre à écouter', 'Un homme écoute vraiment son amie'),
  ('v05k', 'Elle acquiert la donnée de la vraie', 'Un fil d’or relie leurs cœurs : la vraie connexion humaine')],
 [('v06a', 'Chaque arbre', 'Dans le village, l’arbre, la chaise, la maison et les liens sont reliés à ceux qui les ont créés')],
 [('v07a', 'La vie, c’est ça', 'Du haut de la colline, elle voit chacun jouer son jeu sur son propre chemin'),
  ('v07b', 'Et plus on joue', 'Elle avance légère, portée par les couleurs, sans résistance')],
 [('v08a', 'L’éternité n’est pas', 'Assise sur un banc, elle attend une porte dorée au loin'),
  ('v08b', 'Elle est déjà disponible', 'La lumière de l’éternité est déjà là, entre ses mains')],
 [('v09a', 'La vie est un "jeu", mais', 'La nuit, une constellation immense et immuable : les lois universelles'),
  ('v09b', 'C’est un jeu parce', 'Les mêmes lois brillent dans chaque galaxie et chaque forme de vie')],
 [('v10a', 'Ces lois sont simples', 'Elle dépose quatre galets lumineux près du ruisseau'),
  ('v10b', '- "Pousser"', 'Pousser : ses mains de lumière plantent une graine'),
  ('v10c', '- "Continuer"', 'Continuer : elle arrose le jeune arbre'),
  ('v10d', '- "Terminer"', 'Terminer, laisser aller : une feuille d’automne s’envole'),
  ('v10e', '- "Recommencer"', 'Recommencer : une nouvelle pousse au printemps')],
 [('v11a', 'Tout ce qui existe', 'Fleur, vague, oiseau et lune suivent le même rythme éternel autour d’elle'),
  ('v11b', 'Pour qu’une chose existe', 'Elle pousse de l’énergie : une fontaine de lumière s’élève'),
  ('v11c', 'Une fois poussée', 'La lumière retombe doucement en pluie dorée')],
 [('v12a', 'Le grand piège', 'Un homme s’agrippe à des objets lourds et gris : la structure'),
  ('v12b', 'La vraie compréhension', 'Elle lui montre ce que les choses font : la fonction'),
  ('v12c', 'Quand on arrête', 'Les objets lourds se changent en couleurs : tout change')],
 [('v13a', 'C’est là qu’on découvre', 'La main ouverte, elle reçoit le fruit qui tombe de lui-même')],
 [('v14a', 'Quand on comprend vraiment', 'Elle danse avec les quatre lumières des lois universelles'),
  ('v14b', 'on devient capable', 'Légère et lumineuse, entourée des saisons : éternelle sur terre')],
 [('v15a', 'Le langage lui-même', 'Les pierres lourdes du langage se changent en rubans de lumière'),
  ('v15b', 'On passe du langage', 'Deux amies se parlent en ondes de rythme et de présence')],
 [('v16a', 'La vie, c’est donc', 'Tout le village danse en harmonie sous la lumière des lois'),
  ('v16b', 'Plus on comprend', 'Elle court, libre, parmi les oiseaux, sur son chemin de lumière')],
]
flat = [b for s in SC for b in s]
assert len(SC) == 16
starts = []; pos = 0
for bid, mk, alt in flat:
    i = body.find(mk, pos)
    if i < 0: sys.exit(f'REFUS : repère introuvable pour {bid} : {mk!r}')
    starts.append(i); pos = i + 1
assert starts[0] == 0
chunks = {}
for k, (bid, mk, alt) in enumerate(flat):
    end = starts[k + 1] if k + 1 < len(flat) else len(body)
    chunks[bid] = body[starts[k]:end]
# espace / retour à la ligne en fin de scène → <span class="conte-sep" hidden> (gardé dans le texte, sans effet visuel)
seps = []
for s in SC:
    last = s[-1][0]; t = chunks[last]; st = t.rstrip(' \n')
    seps.append(t[len(st):]); chunks[last] = st
joined = ''.join(''.join(chunks[b[0]] for b in s) + seps[n] for n, s in enumerate(SC))
if joined != body: sys.exit('REFUS : le découpage ne redonne pas le texte à l’identique.')
esc = lambda s: html.escape(s, quote=False)
def img(bid, alt, first, eager):
    return (f'<img class="conte-img{" is-on" if first else ""}" data-beat="{bid}" src="{D}/sm/{bid}.webp?v={V}" '
            f'srcset="{D}/sm/{bid}.webp?v={V} 640w, {D}/{bid}.webp?v={V} 1280w" sizes="(max-width: 760px) 100vw, 760px" '
            f'width="1280" height="720" alt="{html.escape(alt)}" loading="{"eager" if eager else "lazy"}" decoding="async">')
def scene(n, s):
    imgs = '\n            '.join(img(b, a, i == 0, n == 1) for i, (b, m, a) in enumerate(s))
    dots = ('<span class="conte-dots" aria-hidden="true">' + ''.join(f'<i data-beat="{b}"{" class=\"is-on\"" if i == 0 else ""}></i>' for i, (b, m, a) in enumerate(s)) + '</span>') if len(s) > 1 else ''
    text = ''.join(f'<span class="beat" data-beat="{b}">{esc(chunks[b])}</span>' for b, m, a in s)
    sep = f'<span class="conte-sep" hidden>{esc(seps[n - 1])}</span>' if seps[n - 1] else ''
    nxt = '' if n == len(SC) else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    return f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig">
            {imgs}
          {dots}
        </figure>
        <div class="conte-text conte-text--lignes"><p>{text}{sep}</p></div>{nxt}
      </section>'''
out = [scene(n, s) for n, s in enumerate(SC, 1)]
tpl = open('tools/cest-quoi-la-vie.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(len(flat)))
# tout le texte est dans la page, tel quel (chaque passage échappé, dans l'ordre)
pos = 0
for b, m, a in flat:
    k = page.find(esc(chunks[b]), pos)
    if k < 0: sys.exit(f'REFUS : passage {b} absent de la page.')
    pos = k
open('conte-cest-quoi-la-vie.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": len(SC), "images": len(flat), "sha256": h}, sys.stdout, ensure_ascii=False); print()
