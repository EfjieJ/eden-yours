# Construit conte-petit-prince.html à partir du texte de François (contes/petit-prince-jeu-infini.txt), tel quel.
# Chaque image (beat) commence à un repère exact du texte ; le texte est découpé à ces repères sans rien changer.
# Vérifie ensuite que le texte de la page (textContent des .conte-text, scènes jointes par une ligne vide) == texte source.
import html, re, sys, json
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/petit-prince-jeu-infini.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023f'
raw = open(SRC, encoding='utf-8').read()
title_line, body = raw.split('\n\n', 1)
assert title_line == '"Le Petit Prince du Jeu Infini"'
TITLE = title_line.strip('"')
body = body.rstrip('\n')
# scènes : liste de (id, repère de début, alt)
SC = [
 [('p01a', 'J’étais tombé en panne', 'Le désert du Sahara à midi ; le narrateur assis seul, sa gourde vide, et très loin une petite silhouette floue sur une dune'),
  ('p01b', 'C’est alors que m’apparut', 'Un petit bonhomme aux cheveux dorés apparaît dans un halo de lumière')],
 [('p02a', 'Il était assis sur une pierre', 'Le Petit Prince assis sur une pierre regarde tranquillement'),
  ('p02b', '« S’il vous plaît… dessinez-moi un jeu »', 'Le Petit Prince demande un jeu ; des formes lumineuses et joueuses flottent au-dessus de ses mains')],
 [('p03a', 'Je fus très surpris.', 'Le narrateur dessine un mouton dans le sable ; le Petit Prince sourit doucement'),
  ('p03b', '« Non. Dessine-moi un jeu', 'Le Petit Prince pose une image de lumière, puis la perçoit : une fleur de lumière apparaît dans le sable'),
  ('p03c', 'Je ne compris pas tout de suite.', 'Les deux amis assis sur le sable chaud, en pleine conversation')],
 [('p04a', 'Le Petit Prince me regarda avec ses yeux graves', 'Les yeux graves du Petit Prince ; une étoile de lumière brille dans sa poitrine : il est cause'),
  ('p04b', 'Il ne commence pas par recevoir le monde.', 'Le Petit Prince pose dans le sable une sphère de lumière : une intention, une image'),
  ('p04c', 'Puis il perçoit ce qu’il a posé.', 'Il perçoit ce qu’il a posé : un jardin de lumière s’ouvre devant lui')],
 [('p05a', 'Je lui demandai :  \n« Mais comment fait-on cela ? »', 'Le Petit Prince marche : l’empreinte de lumière apparaît devant son pied avant qu’il ne le pose'),
  ('p05b', 'La plupart des grandes personnes font l’inverse.', 'Des grandes personnes tournent en rond, tête baissée, comme dans une roue à écureuil ; un écureuil les regarde')],
 [('p06a', 'Je restai silencieux un moment.', 'Le vent du désert soulève des rubans de sable ; le foulard du Petit Prince flotte'),
  ('p06b', '« Pour avoir un jeu, il faut faire un tout petit oubli d’amour.', 'Un cœur de lumière dans les mains du Petit Prince, avec un tout petit point d’ombre'),
  ('p06c', 'Juste assez pour créer un adversaire', 'Des formes de lumière et des formes d’ombre face à face dans le sable : un contraste, un mouvement'),
  ('p06d', 'Mais quand on regarde tout à partir de la fonction', 'Le Petit Prince rit et danse au milieu des formes lumineuses : il joue à volonté')],
 [('p07a', 'Je lui demandai :  \n« Qu’est-ce que la fonction', 'Trois formes de pierre : un corps, un nœud (le problème), une pierre aux vieilles empreintes (le passé)'),
  ('p07b', 'La fonction, c’est ce que cela fait vraiment.', 'Les mêmes formes deviennent transparentes : la lumière montre ce qu’elles font vraiment'),
  ('p07c', 'Nommer la fonction avant la structure', 'Dans la nuit, le Petit Prince lève une petite lanterne : tout s’éclaire')],
 [('p08a', 'Le soleil descendait.', 'Au coucher du soleil, le narrateur offre sa dernière goutte d’eau'),
  ('p08b', 'Il la refusa gentiment et dit :', 'Le Petit Prince refuse gentiment la gourde d’un geste de la main')],
 [('p09a', '« Je n’ai presque plus besoin de boire.', 'Le Petit Prince puise la lumière directement à une source qui jaillit du sable'),
  ('p09b', 'L’admiration est la première molécule d’énergie.', 'Allongé, il admire une petite fleur ; la lumière remplit son cœur comme un réservoir'),
  ('p09c', 'Je postule “mieux en mieux”', 'Autour de lui, le désert s’ajuste : des fleurs, une oasis, des oiseaux')],
 [('p10a', 'Je lui demandai comment il faisait pour rester si léger.', 'Le Petit Prince tient un fil de perles de lumière : chaque instant est un segment'),
  ('p10b', 'À la fin du segment, je remets tout à zéro.', 'La dernière perle se défait en étincelles : tout est remis à zéro'),
  ('p10c', 'Je reste éveillé en mouvement.', 'Le Petit Prince court et saute sur la crête d’une dune, éveillé, en mouvement')],
 [('p11a', 'La nuit tomba sur le désert.', 'La nuit sur le désert ; les étoiles brillent très fort, les deux amis regardent le ciel'),
  ('p11b', '« Les étoiles rient', 'Les étoiles rient ; le Petit Prince rit avec elles, enveloppé d’amour'),
  ('p11c', 'J’ai compris que l’être est cause.', 'La main sur le cœur, le Petit Prince voit avec le cœur : sa lumière éclaire la nuit')],
 [('p12a', 'Je lui demandai :  \n« Et ta rose ? »', 'Le Petit Prince à genoux devant sa rose, parfaite avec ses épines'),
  ('p12b', 'Maintenant je la perçois telle qu’elle est vraiment', 'La rose rayonne une lumière d’amour : une fonction d’amour'),
  ('p12c', 'Je ne la possède plus.', 'Les mains ouvertes, il laisse la rose libre et l’aime simplement')],
 [('p13a', 'Au petit matin', 'Au petit matin, le Petit Prince parle au narrateur ; très loin, une petite silhouette floue sur une dune'),
  ('p13b', '« Tu vas repartir chez les grandes personnes.', 'Une vision : les grandes personnes écoutent l’histoire et une lumière s’éveille en elles'),
  ('p13c', 'Dis-leur de nommer la fonction avant la structure', 'Le Petit Prince marche entouré de la lanterne, des perles, de la fleur admirée et des pas de lumière')],
 [('p14a', 'Je lui promis.', 'Le Petit Prince sourit une dernière fois'),
  ('p14b', 'puis, comme il était venu', 'Le Petit Prince devient lumière et monte doucement vers son étoile')],
 [('p15a', 'Depuis ce jour', 'Des années plus tard, le narrateur regarde le ciel ; une étoile brille plus fort'),
  ('p15b', 'Et je me souviens que nous sommes tous cause.', 'Des gens de tous les âges jouent, conscients et légers, avec des formes de lumière'),
  ('p15c', 'Car ce qui est essentiel est invisible aux yeux.', 'Un cœur de lumière dans les étoiles qui postule, qui admire, qui aime')],
]
# découpe
pos = 0; chunks = {}
flat = [b for s in SC for b in s]
starts = []
for bid, mk, alt in flat:
    i = body.find(mk, pos); assert i >= 0, (bid, mk)
    starts.append(i); pos = i + 1
assert starts[0] == 0
for k, (bid, mk, alt) in enumerate(flat):
    end = starts[k + 1] if k + 1 < len(flat) else len(body)
    chunks[bid] = body[starts[k]:end]
# fin de scène : on retire la ligne vide finale (remise entre les scènes à la vérification)
scene_texts = []
for s in SC:
    last = s[-1][0]
    t = ''.join(chunks[b[0]] for b in s)
    assert t.endswith('\n\n') or s is SC[-1], (last, repr(t[-5:]))
    if s is not SC[-1]:
        chunks[last] = chunks[last][:-2]
    scene_texts.append(''.join(chunks[b[0]] for b in s))
assert '\n\n'.join(scene_texts) == body
esc = lambda s: html.escape(s, quote=False)
def img(bid, alt, first, eager):
    return (f'<img class="conte-img{" is-on" if first else ""}" data-beat="{bid}" src="assets/contes/petit-prince/sm/{bid}.webp" '
            f'srcset="assets/contes/petit-prince/sm/{bid}.webp 640w, assets/contes/petit-prince/{bid}.webp 1280w" sizes="(max-width: 760px) 100vw, 760px" '
            f'width="1280" height="720" alt="{html.escape(alt)}" loading="{"eager" if eager else "lazy"}" decoding="async">')
out = []
for n, s in enumerate(SC, 1):
    imgs = '\n            '.join(img(b, a, i == 0, n == 1) for i, (b, m, a) in enumerate(s))
    dots = ('<span class="conte-dots" aria-hidden="true">' + ''.join(f'<i data-beat="{b}"{" class=\"is-on\"" if i == 0 else ""}></i>' for i, (b, m, a) in enumerate(s)) + '</span>') if len(s) > 1 else ''
    text = ''.join(f'<span class="beat" data-beat="{b}">{esc(chunks[b])}</span>' for b, m, a in s)
    nxt = '' if n == len(SC) else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig">
            {imgs}
          {dots}
        </figure>
        <div class="conte-text conte-text--lignes"><p>{text}</p></div>{nxt}
      </section>''')
tpl = open('tools/petit-prince.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(len(flat)))
open('conte-petit-prince.html', 'w', encoding='utf-8').write(page)
json.dump({"title": TITLE, "scenes": len(SC), "images": len(flat)}, sys.stdout, ensure_ascii=False); print()
