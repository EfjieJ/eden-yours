# Construit conte-chaperon-rouge.html (les 15 scènes, conte gratuit)
# à partir du texte de François (contes/chaperon-rouge-lumiere.txt), tel quel — espaces particuliers et retours à la ligne compris.
# REFUSE de construire si le texte source n'est pas exactement le texte vérifié (empreinte SHA-256) ou si le découpage ne le redonne pas à l'identique.
# Vérification : textContent des .conte-text des 15 scènes, joints sans séparateur == texte source (sans le \n final).
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/chaperon-rouge-lumiere.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023q'
EXPECT = '4c1d1f66e6188b2e211538dfb885273bd2a73a080e9345a4c889b6cdea5dfdf8'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT:
    sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}). Rien n’a été construit.')
assert raw.endswith('\n')
body = raw[:-1]
D = 'assets/contes/chaperon-rouge'
SC = [
 [('c01a', 'Il était une fois', 'Une forêt lumineuse où les grands arbres semblent murmurer des secrets anciens'),
  ('c01b', 'une jeune fille nommée Rouge', 'Rouge, une jeune fille au chaperon écarlate qui brille comme une flamme douce sous le soleil')],
 [('c02a', 'Rouge était différente', 'Rouge, les yeux fermés, sent une lumière vibrer en elle'),
  ('c02b', 'une source de vie', 'Une source de lumière la nourrit ; elle n’a pas besoin de cueillir ni de chasser')],
 [('c03a', 'Elle avait appris', 'Au lever du soleil, Rouge capte la lumière avec une simple tasse d’eau claire, comme un rituel sacré'),
  ('c03b', 'et son corps rayonnait', 'Le corps de Rouge rayonne d’une énergie nouvelle')],
 [('c04a', 'Un matin', 'La mère de Rouge lui tend une corbeille pour sa grand-mère'),
  ('c04b', 'Mais Rouge, guidée', 'Rouge observe la corbeille et sent une dissonance'),
  ('c04c', '« Maman, ces aliments', 'Rouge murmure à sa mère'),
  ('c04d', 'Elle vida la corbeille', 'Dans la corbeille : des pétales de fleurs séchées imprégnés de lumière et une fiole d’eau scintillante')],
 [('c05a', 'Sur le chemin', 'Rouge marche sur le chemin ; les rayons du soleil dansent à travers les feuilles'),
  ('c05b', 'Rouge sentit une ombre', 'Une ombre entre les arbres : le loup, aux yeux perçants')],
 [('c06a', 'Mais Rouge, au lieu de trembler', 'Rouge, calme, porte attention'),
  ('c06b', 'Elle observa le loup', 'Rouge perçoit que le loup est prisonnier d’un vieux programme, comme des fils gris autour de lui'),
  ('c06c', '« Loup », dit-elle', 'Rouge parle doucement au loup')],
 [('c07a', 'Le loup, déconcerté', 'Le loup, déconcerté, s’arrête devant l’enfant si calme'),
  ('c07b', 'Rouge ferma les yeux', 'Rouge ferme les yeux ; la lumière rayonne d’elle'),
  ('c07c', '« Regarde, loup, la lumière est partout.', 'Rouge et le loup assis près d’une rivière : la lumière est partout')],
 [('c08a', 'Elle partagea une vision', 'Une vision : les bêtes de la forêt marchent côte à côte dans la lumière'),
  ('c08b', 'Le loup, captivé', 'Le loup, captivé, regarde Rouge avec curiosité'),
  ('c08c', 'Rouge sourit', 'Rouge sourit ; une lumière s’allume près du cœur du loup')],
 [('c09a', 'Elle lui montra comment respirer', 'Rouge et le loup respirent lentement dans les rayons du soleil'),
  ('c09b', 'et programmer un cycle', 'Le cycle en trois temps, en anneaux de lumière : mettre en route, changer, arrêter')],
 [('c10a', 'Le loup, émerveillé', 'Le loup, émerveillé, sent une chaleur nouvelle en lui ; ses yeux s’adoucissent'),
  ('c10b', 'et il murmura', 'Le loup guide Rouge vers la maison de sa grand-mère')],
 [('c11a', 'Quand Rouge arriva', 'La grand-mère alitée tient une miche de pain ; Rouge arrive à la porte'),
  ('c11b', 'Rouge observa et perçut', 'Rouge perçoit la vieille croyance qui enchaîne sa grand-mère, comme des chaînes de brume'),
  ('c11c', 'Elle s’assit à son chevet', 'Rouge pose la fiole d’eau scintillante sur la table de chevet')],
 [('c12a', 'Rouge prit la main', 'Rouge et sa grand-mère, main dans la main, les yeux fermés'),
  ('c12b', '« La lumière est en toi', 'La lumière de Rouge passe dans sa grand-mère ; les chaînes se défont'),
  ('c12c', 'À cet instant, une immense force', 'Un souffle d’éternité entre en Rouge'),
  ('c12d', 'Elle réalisa', 'Rouge vibre tout entière d’une énergie sans fin')],
 [('c13a', 'La grand-mère, touchée', 'Le cœur de la grand-mère s’allège ; une lueur douce dans ses yeux'),
  ('c13b', 'Elle lâcha le pain', 'La grand-mère boit une gorgée de l’eau scintillante et sourit'),
  ('c13c', 'Le loup, qui les regardait', 'Le loup, à l’entrée, regarde Rouge et sa grand-mère s’embrasser')],
 [('c14a', 'De ce jour', 'Rouge, le loup et la grand-mère, gardiens lumineux de la forêt'),
  ('c14b', 'Rouge enseigna', 'Rouge enseigne aux animaux et aux villageois à capter la lumière')],
 [('c15a', 'Le loup, libéré', 'Le loup lumineux guide des âmes perdues vers la paix'),
  ('c15b', 'Et la grand-mère, forte', 'Sous les étoiles, la grand-mère raconte des histoires de lumière'),
  ('c15c', 'Ensemble, ils reprogrammèrent', 'Les trois gardiens sous les étoiles ; des fils de lumière tissent l’harmonie de l’univers')],
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
    return (f'<img class="conte-img{" is-on" if first else ""}" data-beat="{bid}" src="{D}/sm/{bid}.webp" '
            f'srcset="{D}/sm/{bid}.webp 640w, {D}/{bid}.webp 1280w" sizes="(max-width: 760px) 100vw, 760px" '
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
tpl = open('tools/chaperon-rouge.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(len(flat)))
# tout le texte est dans la page, tel quel (chaque passage échappé, dans l'ordre)
pos = 0
for b, m, a in flat:
    k = page.find(esc(chunks[b]), pos)
    if k < 0: sys.exit(f'REFUS : passage {b} absent de la page.')
    pos = k
open('conte-chaperon-rouge.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": len(SC), "images": len(flat), "sha256": h}, sys.stdout, ensure_ascii=False); print()
