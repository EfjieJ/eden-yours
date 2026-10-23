# Construit conte-lievre-tortue.html (les 15 scènes, conte gratuit)
# à partir du texte de François (contes/lievre-tortue.txt), tel quel — espaces particuliers et retours à la ligne compris.
# REFUSE de construire si le texte source n'est pas exactement le texte vérifié (empreinte SHA-256) ou si le découpage ne le redonne pas à l'identique.
# Vérification : textContent des .conte-text des 15 scènes, joints sans séparateur == texte source (sans le \n final).
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/lievre-tortue.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023d'
EXPECT = '4d890824188e8f844a1f4a6ca82364f65b7bd3a8d2020c9619e350306572ee56'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT:
    sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}). Rien n’a été construit.')
assert raw.endswith('\n')
body = raw[:-1]
D = 'assets/contes/lievre-tortue'
SC = [
 [('l01a', 'La Fable du Lièvre', 'Le Lièvre nerveux et la Tortue Consciente, lumineuse, à l’orée d’un grand jardin'),
  ('l01b', 'Le Lièvre Réactif ne tenait pas en place.', 'Le Lièvre ne tient pas en place : il sautille, les pattes agitées'),
  ('l01c', 'Pour lui, la vie était une course', 'Le Lièvre court contre son ombre, contre le temps, vers des buts toujours plus loin'),
  ('l01d', 'Il courait pour ne pas mourir', 'Le Lièvre court à travers les heures, le soleil traverse le ciel ; un vide gris dans sa poitrine'),
  ('l01e', 'Il était entièrement prisonnier du film', 'Le Lièvre sursaute au moindre bruit, comme prisonnier d’un décor peint'),
  ('l01f', 'Il croyait que sa valeur', 'Le Lièvre force de tout son corps tendu sur une pente de poussière sans fin')],
 [('l02a', 'Un matin', 'Au matin, à l’orée du grand jardin, le Lièvre croise la Tortue'),
  ('l02b', "Elle marchait d'un pas lent", 'La Tortue marche lentement, le dos droit, parfaitement alignée'),
  ('l02c', 'À vrai dire', 'Autour de la Tortue, les aigrettes et les pétales restent suspendus : le présent semble immobile'),
  ('l02d', 'Elle ne subissait pas le mouvement', 'Devant la Tortue, ses pas de lumière apparaissent un à un, un peu en avant')],
 [('l03a', 'Le Lièvre, la voyant si tranquille', 'Le Lièvre se moque de la Tortue en riant et en la montrant du doigt'),
  ('l03b', '— Où cours-tu', 'Le Lièvre se penche vers la Tortue avec un sourire narquois'),
  ('l03c', 'À ce rythme', 'Le Lièvre montre le long chemin couvert de feuilles mortes'),
  ('l03d', 'Regarde-moi', 'Le Lièvre fait le fier, file en zigzag et attrape les feuilles au vol')],
 [('l04a', "La Tortue s'arrêta.", 'La Tortue s’arrête, paisible ; une mouche passe sans qu’elle s’en offusque'),
  ('l04b', 'car elle appliquait le triptyque', 'Trois galets lumineux devant la Tortue : ne pas évaluer, ne pas juger, ne pas invalider'),
  ('l04c', 'Elle ferma les yeux', 'Les yeux fermés, la Tortue fait sa pause ; la lumière se pose en elle'),
  ('l04d', 'puis regarda le Lièvre', 'Une particule de lumière, d’admiration pure, flotte de la Tortue vers le Lièvre')],
 [('l05a', '— Tu coures dans la sensation', 'La Tortue parle doucement ; autour du Lièvre tourbillonnent les sensations'),
  ('l05b', 'Tu es dans la structure du film', 'Le Lièvre court dans un tableau encadré ; la Tortue le regarde du dehors'),
  ('l05c', 'Moi, je ne cherche pas', 'La Tortue, les yeux fermés, sent avant de voir'),
  ('l05d', 'Mon corps est une antenne', 'Des fils de lumière descendent dans la patte de la Tortue : son corps est une antenne'),
  ('l05e', 'Faisons un jeu', 'Au loin, un petit pont de bois et le puits de l’autre côté')],
 [('l06a', 'Le Lièvre accepta le défi', 'Le Lièvre accepte le défi en riant, sûr de sa force')],
 [('l07a', 'Au signal', 'Au signal, le Lièvre bondit dans un nuage de poussière'),
  ('l07b', 'Il mit toute son énergie', 'Le Lièvre court à toute vitesse, en sueur, tout en tension'),
  ('l07c', 'Mais à force de courir', 'Le Lièvre tourne en rond ; son mental tourne en rond'),
  ('l07d', 'La fatigue arriva.', 'La fatigue arrive : le Lièvre ralentit, la langue pendante')],
 [('l08a', "Voyant qu'il avait", 'Du haut d’une colline, le Lièvre voit la Tortue toute petite, très loin derrière'),
  ('l08b', 'il se dit', 'Le Lièvre s’assoit sous un chêne et bâille'),
  ('l08c', "Mais en s'asseyant", 'Le Lièvre dort d’un sombre oubli dans la brume grise')],
 [('l09a', 'Pendant ce temps', 'Pendant ce temps, la Tortue avance et passe près du Lièvre endormi'),
  ('l09b', 'Sans force, par rappel.', 'La Tortue avance sans force, portée par un doux halo'),
  ('l09c', 'À chaque pas, à chaque souffle', 'À chaque pas, un anneau de lumière : elle revient au oui pur'),
  ('l09d', "Elle n'arrachait rien", 'La Tortue admire une fleur sans la cueillir ; la fleur s’illumine')],
 [('l10a', 'Ses muscles se densifiaient', 'La Tortue, forte et en santé, la lumière dans ses pattes'),
  ('l10b', 'Elle ne raisonnait pas la route', 'La route résonne en la Tortue comme un gong libre : des ondes dorées s’étendent')],
 [('l11a', 'Quand le Lièvre se réveilla', 'Le Lièvre se réveille en sursaut, pris de panique'),
  ('l11b', 'il vit la Tortue', 'La Tortue touche la pierre immobile près du puits'),
  ('l11c', 'Elle avait traversé le pont', 'Le pont traversé sans effort ; la Tortue se repose près du puits')],
 [('l12a', 'Le Lièvre, essoufflé', 'Le Lièvre, épuisé, s’effondre dans l’herbe près du puits'),
  ('l12b', "— C'est impossible", 'Le Lièvre proteste, les pattes en l’air : c’est impossible !'),
  ('l12c', 'Comment as-tu fait', 'Le Lièvre se gratte la tête : comment as-tu fait ?')],
 [('l13a', 'La Tortue sourit', 'La Tortue sourit et murmure'),
  ('l13b', '— Tu as cru', 'Une ligne droite de poussière, d’une pousse verte à une feuille morte : le Lièvre y court'),
  ('l13c', 'Tu as mis ton attention', 'Le Lièvre verse du sable dans un grand sablier : il nourrit le temps'),
  ('l13d', "Moi, j'ai simplement activé", 'La carapace de la Tortue s’illumine et les fleurs s’ouvrent'),
  ('l13e', "Je n'ai jamais commencé", 'La Tortue dans un cercle de lumière sans début ni fin'),
  ('l13f', 'Je suis autour du mouvement', 'Immobile au centre, la Tortue est la Cause : tout le mouvement tourne autour d’elle'),
  ('l13g', 'Regarder et admirer', 'Le regard de la Tortue tisse des fils d’or qui réparent le tissu de la prairie')],
 [('l14a', '------------------------------', 'Au crépuscule, le Lièvre court contre une ombre immense, à bout de souffle'),
  ('l14b', "Mais l'être lucide", 'La Tortue lucide avance, lumineuse, dans l’aube du léger futur')],
 [('l15a', 'Il ne court pas après la vie', 'Au lever du soleil, la Tortue rayonne ; le Lièvre, apaisé, se repose à côté d’elle')],
]
flat = [b for s in SC for b in s]
assert len(SC) == 15
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
tpl = open('tools/lievre-tortue.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(len(flat)))
# tout le texte est dans la page, tel quel (chaque passage échappé, dans l'ordre)
pos = 0
for b, m, a in flat:
    k = page.find(esc(chunks[b]), pos)
    if k < 0: sys.exit(f'REFUS : passage {b} absent de la page.')
    pos = k
open('conte-lievre-tortue.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": len(SC), "images": len(flat), "sha256": h}, sys.stdout, ensure_ascii=False); print()
