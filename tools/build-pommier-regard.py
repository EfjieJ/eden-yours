# Construit conte-pommier-regard.html (27 scènes, 27 images) à partir de tools/roue-regard.tpl.html adapté.
import html, re
V = '20261031p'
S = [
("Au bord d’un chemin, il y a un vieux pommier.", "Un vieux pommier au bord d’un chemin"),
("Il est là depuis si longtemps que personne ne se souvient de qui l’a planté.", "Les saisons passent autour du pommier"),
("Le pommier ne s’est jamais vu. Il n’a pas d’yeux pour regarder son tronc, ni de miroir pour compter ses branches.", "Une flaque au pied du tronc ne reflète que le ciel"),
("Mais chaque automne, des passants s’arrêtent et croquent dans ses pommes.", "Des passants croquent des pommes sous l’arbre"),
("Et dans leurs yeux, à ce moment-là, le pommier se voit.", "Le pommier se reflète dans un œil"),
("Il se voit dans le sourire d’une femme fatiguée.", "Une femme fatiguée sourit, une pomme à la main"),
("Il se voit dans la joie d’un vieil homme qui se souvient de son enfance.", "Un vieil homme croque une pomme et se souvient"),
("Il se voit dans le pas plus léger d’un voyageur qui repart.", "Un voyageur repart d’un pas léger"),
("Le pommier ne reçoit rien en retour, et il ne manque de rien. Car c’est lui qui donne : il est cause, jamais effet.", "Les pommes tombent dans des mains ouvertes"),
("Un jour, un orage casse une de ses branches.", "Un orage casse une branche"),
("Le vent lui souffle : « Tu vois, tu subis. » Le pommier répond : « Je subis seulement si j’oublie que c’est moi qui donne. »", "Le vent tourne, une lumière calme reste au cœur de l’arbre"),
("Et il fait une fleur, juste à côté de la branche cassée.", "Une fleur s’ouvre près de la branche cassée"),
("Un matin de septembre, une enfant arrive sur le chemin.", "Une enfant marche vers le pommier"),
("Elle cueille une pomme, la croque, et lève les yeux vers l’arbre.", "L’enfant croque une pomme et lève les yeux"),
("Elle demande : « Pommier, où es-tu vraiment ? Dans ton tronc ? Dans tes racines ? Dans tes feuilles ? »", "L’enfant pose la main sur l’écorce et demande"),
("Le pommier sourit.", "Le pommier sourit dans la lumière"),
("Il n’a jamais été dans son tronc. Le tronc, c’est seulement l’endroit d’où il regarde.", "Un être de lumière, juste hors du tronc, regarde"),
("Il est dans le regard de l’enfant, qui brille en ce moment.", "Le pommier brille dans les yeux de l’enfant"),
("Il est dans la pomme, qui devient sa force à elle.", "L’enfant court, pleine de la force de la pomme"),
("Il est dans le chemin, que tant de pas ont dessiné jusqu’à lui.", "Des pas lumineux sur le chemin"),
("Il est cause, partout à la fois. Et il n’a jamais oublié.", "Des fils dorés relient l’arbre à tout ce qu’il touche"),
("L’enfant ne l’entend pas avec ses oreilles, mais elle le sent. Le soir, elle offre la moitié de sa pomme à son petit frère.", "L’enfant offre la pomme à son petit frère"),
("Et dans les yeux du petit frère, le pommier se voit encore.", "Le pommier brille dans les yeux du petit frère"),
("Il peut créer autant de pommes qu’il veut : donner ne le vide jamais. Il parle avec chaque personne qui passe, et la conversation ne finit jamais.", "La nuit, l’arbre relié aux maisons lointaines"),
("On croit souvent que la vie éternelle vient après. Le pommier sait qu’elle est ici, maintenant, à chaque pomme offerte. Quand tu donnes sans oublier qui donne, tu es déjà éternel.", "Sous l’arbre, on s’offre des pommes"),
("Un jour, peut-être, le vieux tronc tombera. Mais le pommier ne tombera pas, parce qu’il n’a jamais été dans le bois.", "Le tronc couché, la lumière de l’arbre demeure"),
("Il sera dans les mains de l’enfant, le jour où elle plantera un pépin au bord d’un autre chemin.", "L’enfant plante un pépin au bord d’un autre chemin"),
]
N = len(S); esc = lambda s: html.escape(s, quote=False); D = 'assets/contes/pommier-regard'
out = []
for k, (t, alt) in enumerate(S):
    n = k + 1; b = f'pr{n:02d}'
    nxt = '' if n == N else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(alt)}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--lignes"><p><span class="beat is-on" data-beat="{b}">{esc(t)}</span></p></div>{nxt}
      </section>''')
tpl = open('tools/roue-regard.tpl.html', encoding='utf-8').read()
DESC = 'Un conte de François : un vieux pommier ne se voit que dans les yeux de ceux qui croquent ses pommes. Nous sommes cause, jamais effet — sauf quand on oublie.'
p = tpl
p = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{DESC}">', p)
p = re.sub(r'(property="og:description"|name="twitter:description") content="[^"]*"', lambda m: f'{m.group(1)} content="{DESC}"', p)
p = p.replace('La roue et le regard', 'Le pommier et le regard')
p = p.replace('conte-roue-regard.html', 'conte-pommier-regard.html').replace('roue-regard/rr01.webp', 'pommier-regard/pr01.webp')
p = re.sub(r'\s*<link rel="alternate" hreflang="(fr|en)"[^>]*>', '', p)
p = p.replace('<meta property="og:locale:alternate" content="en_US">\n  ', '')
p = re.sub(r'data-conte-pair="[^"]*" data-no-song-visuals data-conte-song="[^"]*" data-conte-song-title="[^"]*"', 'data-no-song-visuals data-conte-song="none"', p)
p = re.sub(r'<nav class="conte-lang-pick".*?</nav>', '<nav class="conte-lang-pick" aria-label="Langue de ce conte"><a href="conte-pommier-regard.html?lang=fr" hreflang="fr" lang="fr" aria-current="page">🇫🇷 Français</a></nav>', p, flags=re.S)
p = re.sub(r'<p class="conte-lead">.*?</p>', '<p class="conte-lead">Un conte de François, en {{NIMG}} images. Fais défiler et touche « Suite » : chaque image suit sa phrase.</p>', p, flags=re.S)
p = re.sub(r'\s*<figure class="conte-video">.*?</figure>', '', p, flags=re.S)
p = re.sub(r'\s*<section class="conte-chanson".*?</section>', '', p, flags=re.S)
p = p.replace('« Rien ne sombre. »', '« Tu n’es pas dans ton tronc. Tu es dans ce que tu donnes. »')
# nav : ajoute le lien après La roue et le regard (actif ici)
p = p.replace('<a href="conte-pommier-regard.html" class="fr-only active" lang="fr">Conte : Le pommier et le regard</a>',
  '<a href="conte-roue-regard.html" class="fr-only" lang="fr">Conte : La roue et le regard</a>\n          <a href="conte-pommier-regard.html" class="fr-only active" lang="fr">Conte : Le pommier et le regard</a>')
p = p.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', str(N))
assert 'wheel-gaze' not in p.split('<main')[1] and p.count('conte-roue-regard.html') == 1
open('conte-pommier-regard.html', 'w', encoding='utf-8').write(p)
open('/workspace/pommier-src/texte.txt', 'w', encoding='utf-8').write('\n'.join(t for t, _ in S) + '\n')
print(N, 'scènes')
