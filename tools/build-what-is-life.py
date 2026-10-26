# Construit conte-what-is-life.html (EN, 16 scènes, texte gratuit ; réutilise les 46 images de cest-quoi-la-vie)
# à partir du texte de François (contes/what-is-life-en.txt), tel quel — espaces particuliers et retours à la ligne compris.
# REFUSE de construire si le texte source n'est pas exactement le texte vérifié (empreinte SHA-256) ou si le découpage ne le redonne pas à l'identique.
# Vérification : textContent des .conte-text des 16 scènes, joints sans séparateur == texte source (sans le \n final).
import html, sys, json, hashlib
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/what-is-life-en.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023u'
EXPECT = 'e647f0dc0d9bb40d900963bf4f76aaa9245408942fdc21d46ff96ccc2f824348'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT:
    sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}). Rien n’a été construit.')
assert raw.endswith('\n')
body = raw[:-1]
D = 'assets/contes/cest-quoi-la-vie'
SC = [
 [('v01a', '"What is life?"', 'On a hill at dawn, a young woman with a sphere of light above her head wonders: what is life?'),
  ('v01b', 'Life is an "eternal', 'A luminous circle in four beats: start, continue, finish, start again'),
  ('v01c', 'This rhythm repeats', 'Millions of pulses of light make a hand and a tree appear')],
 [('v02a', 'There is only one emotion', 'She admires a rose: one single emotion, Admiration'),
  ('v02b', 'All other emotions', 'Veils of colour, all flowing from the same golden source')],
 [('v03a', 'Everything is a "game', 'A path of glowing stepping stones: each stone is a game segment'),
  ('v03b', 'Each person plays', 'Several people, each on their own path'),
  ('v03c', 'The goal of the game', 'She gathers a crystal of light, the data, next to an hourglass')],
 [('v04a', 'Emotions are simply', 'Coloured winds of emotion carry her along her path'),
  ('v04b', 'until we have acquired', 'The crystal of light enters her heart: she has acquired what she came for')],
 [('v05a', '"Here are some', 'Five glowing windows show five games of life'),
  ('v05b', 'A person plays the game of learning to play', 'A young man learns the guitar'),
  ('v05c', 'She acquires the data "I am', 'Music flows from his guitar in ribbons of light'),
  ('v05d', 'A person plays the game of raising', 'A mother raises her two children'),
  ('v05e', 'It acquires the gift', 'The mother comforts her child inside a heart of light: unconditional love and patience'),
  ('v05f', 'A person plays the game of building', 'A baker opens his little bakery'),
  ('v05g', 'It acquires the data of perseverance', 'The baker shares his bread with the villagers: perseverance and value created'),
  ('v05h', 'A person plays the game of healing', 'A woman heals, a soft light in her chest'),
  ('v05i', 'She acquires the data of controlling', 'Healed, she walks serenely and guides the winds of her emotions'),
  ('v05j', 'A person plays the game of learning to really', 'A man truly listens to his friend'),
  ('v05k', 'It acquires the data of the true', 'A golden thread links their hearts: true human connection')],
 [('v06a', 'Every tree', 'In the village, the tree, the chair, the house and the bonds are linked to those who made them')],
 [('v07a', "That's what life is", 'From the hilltop she sees everyone playing their game on their own path'),
  ('v07b', 'And the more you play', 'She moves lightly, carried by colours, without resistance')],
 [('v08a', 'Eternity is not', 'Sitting on a bench, she waits for a golden door far away'),
  ('v08b', "It's already available", 'The light of eternity is already here, in her hands')],
 [('v09a', 'Life is a "game,"', 'At night, an immense unchanging constellation: the universal laws'),
  ('v09b', "It's a game because", 'The same laws shine in every galaxy and every form of life')],
 [('v10a', 'These laws are simple', 'She lays four glowing pebbles by the stream'),
  ('v10b', '- "Push"', 'Push: her hands of light plant a seed'),
  ('v10c', '- "Continue"', 'Continue: she waters the young tree'),
  ('v10d', '- "Finish"', 'Finish, let go: an autumn leaf flies away'),
  ('v10e', '- "Restart"', 'Restart: a new sprout in spring')],
 [('v11a', 'Everything that exists', 'Flower, wave, bird and moon follow the same eternal rhythm around her'),
  ('v11b', 'For something to exist', 'She pushes energy: a fountain of light rises'),
  ('v11c', 'Once pushed', 'The light falls gently back down in a golden rain')],
 [('v12a', 'The great trap', 'A man clings to heavy grey objects: structure'),
  ('v12b', 'True understanding', 'She shows him what things do: function'),
  ('v12c', 'When we stop paying', 'The heavy objects turn into colours: everything changes')],
 [('v13a', "That's when we discover", 'With an open hand she receives the fruit that falls by itself')],
 [('v14a', 'When we really understand', 'She dances with the four lights of the universal laws'),
  ('v14b', 'we become able', 'Light and luminous, surrounded by the seasons: eternal on earth')],
 [('v15a', 'Language itself', 'The heavy stones of language turn into ribbons of light'),
  ('v15b', "We're moving", 'Two friends talk in waves of rhythm and presence')],
 [('v16a', 'So life is learning', 'The whole village dances in harmony under the light of the laws'),
  ('v16b', 'The more we understand', 'She runs free among the birds on her path of light')],
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
    nxt = '' if n == len(SC) else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Next ▾</button>'
    return f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig">
            {imgs}
          {dots}
        </figure>
        <div class="conte-text conte-text--lignes"><p>{text}{sep}</p></div>{nxt}
      </section>'''
out = [scene(n, s) for n, s in enumerate(SC, 1)]
tpl = open('tools/what-is-life.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(len(flat)))
# tout le texte est dans la page, tel quel (chaque passage échappé, dans l'ordre)
pos = 0
for b, m, a in flat:
    k = page.find(esc(chunks[b]), pos)
    if k < 0: sys.exit(f'REFUS : passage {b} absent de la page.')
    pos = k
open('conte-what-is-life.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": len(SC), "images": len(flat), "sha256": h}, sys.stdout, ensure_ascii=False); print()
