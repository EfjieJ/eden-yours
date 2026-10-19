#!/usr/bin/env python3
"""Construit chanson-grand-poumon.html : paroles de « Le Grand Poumon » (data/lyrics-sources.json, telles quelles)
+ une image par ligne (assets/chansons/grand-poumon/gNN.webp) + minutage approximatif (222,8 s)."""
import json, html, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SID = "0d719cb9-cd9e-4bf8-bc1e-3ee90dbe2345"
lyr = json.load(open(ROOT / "data/lyrics-sources.json"))[SID]["lyrics"]
V = "20261018f"
# image + texte alternatif pour chaque ligne (ordre des paroles ; les reprises réutilisent la même image)
IMG = {
 "Inspire...": ("g01", "Une forêt en forme de poumons, à l’aube, inspire un ruisseau de lumière dorée"),
 "Expire...": ("g02", "L’arbre-poumon expire une brume de lumière argentée vers les étoiles"),
 "Je pousse une image devant moi,": ("g03", "Un être de lumière dans sa bulle pousse devant lui une sphère où une image apparaît"),
 "Elle prend forme, elle prend vie, elle prend voix.": ("g04", "La sphère s’ouvre comme une fleur : un petit monde vivant y naît, des oiseaux s’envolent, des ondes de chant s’en échappent"),
 "Tout ce que j'envoie revient vers moi,": ("g05", "Un ruban de lumière part de l’être de lumière et revient vers lui en boucle au-dessus du lac"),
 "C'est la loi, c'est mon souffle, c'est mon choix.": ("g06", "Un être de lumière, la main sur le cœur, à la croisée de deux chemins, entouré de cercles de lumière"),
 "Personne ne peut pousser sans fin,": ("g07", "Une vague de lumière atteint sa crête et commence à se reposer ; un être de lumière dans sa bulle adoucit son geste"),
 "Le monde aussi a besoin de lâcher la main.": ("g08", "Une grande main de lumière s’ouvre au-dessus de la Terre et laisse s’envoler des pétales"),
 "J'inspire, et je crée,": ("g09", "Un être de lumière inspire, son cœur s’illumine, et fleurs, arbre et ruisseaux de lumière naissent autour de lui"),
 "J'expire, et je laisse aller.": ("g10", "Un être de lumière expire et laisse s’envoler graines de pissenlit, feuilles et papillons"),
 "Rien ne meurt, tout revient,": ("g11", "Le cercle de la vie en lumière : la feuille devient graine, la graine pousse, l’arbre fleurit"),
 "Le souffle est un cercle sans fin.": ("g12", "Une boucle de souffle lumineux sans fin au-dessus d’un lac miroir étoilé"),
 "Je suis le grand poumon,": ("g13", "Une immense forêt en forme de poumons sur la montagne, illuminée de l’intérieur, et un être de lumière qui s’y fond"),
 "L'univers respire en mon nom.": ("g14", "L’univers respire : deux poumons faits d’étoiles et de nébuleuses, un être de lumière au centre"),
 "Ce corps que tu vois n'est qu'un morceau,": ("g15", "Un petit corps de feuilles dans un pré, et derrière lui un immense être de lumière qui monte jusqu’au ciel"),
 "Le reste de moi respire plus haut.": ("g16", "Au-dessus des nuages, un être de lumière respire en aurores dorées, relié par un fil de lumière à la petite silhouette en bas"),
 "Au-delà des étoiles, hors du temps,": ("g17", "Un être de lumière flotte dans sa bulle au-delà des galaxies, hors du temps"),
 "Je pousse, je tire, et le monde est vivant.": ("g18", "Un être de lumière pousse et tire des vagues de souffle doré ; en bas le monde s’anime : rivières, oiseaux, cerfs, fleurs"),
 "Je ne subis pas, je suis la cause,": ("g19", "Un être de lumière debout au milieu de la tempête ; le vent passe autour de sa bulle et sa lumière apaise tout"),
 "C'est de moi que le souffle se pose.": ("g20", "Le souffle doré d’un être de lumière se pose doucement comme une plume sur le lac et le pré"),
 "Et chaque être de lumière, en ce moment,": ("g21", "Des êtres de lumière dans leurs bulles partout sur les montagnes, la mer et le ciel, reliés par des fils d’or"),
 "Respire avec moi, exactement.": ("g22", "Un cercle d’êtres de lumière dans une clairière au clair de lune respire d’un même souffle"),
 "Nous inspirons, nous créons,": ("g23", "Des êtres de lumière inspirent ensemble et un jardin lumineux fleurit autour d’eux"),
 "Nous expirons, nous libérons.": ("g24", "Des êtres de lumière expirent ensemble et libèrent des colombes et des lanternes de lumière"),
 "Un seul souffle, un seul cœur,": ("g25", "Des êtres de lumière reliés à un seul grand cœur lumineux"),
 "Le grand poumon, c'est nous, en lumière.": ("g26", "Deux grands poumons faits d’une multitude d’êtres de lumière dans leurs bulles, au-dessus de la forêt"),
 "Je suis la cause.": ("g27", "Un être de lumière dans un pré, d’où partent des cercles de lumière dorée"),
 "Je suis le souffle.": ("g28", "Un être de lumière se fond dans un souffle de lumière qui passe sur la forêt-poumon au coucher du soleil"),
}
# sections
secs = []
for block in lyr.strip().split("\n\n"):
    ls = block.strip().split("\n")
    m = re.match(r"^\[(.+)\]$", ls[0])
    secs.append((m.group(1), [l for l in ls[1:] if l.strip()]))
# minutage approximatif (pas de minutage public) : 60 BPM, ~4,6 s par ligne + instrumentaux
LINE = 4.6
GAP_BEFORE = {"Intro": 10.0, "Couplet 1": 4.0, "Couplet 2": 8.0, "Pont": 12.0, "Outro": 6.0}
t = 0.0; times = []
for name, ls in secs:
    t += GAP_BEFORE.get(name, 0.0)
    for l in ls:
        times.append(round(t, 1)); t += LINE
assert t <= 222.8, t
n = 0; scenes_html = []; used = set()
for si, (name, ls) in enumerate(secs, 1):
    imgs = []; spans = []; dots = []
    for li, l in enumerate(ls):
        n += 1; bid = f"l{n:02d}"
        g, alt = IMG[l]; used.add(g)
        on = " is-on" if li == 0 else ""
        load = "eager" if si == 1 else "lazy"
        imgs.append(f'            <img class="conte-img{on}" data-beat="{bid}" src="assets/chansons/grand-poumon/sm/{g}.webp" srcset="assets/chansons/grand-poumon/sm/{g}.webp 640w, assets/chansons/grand-poumon/{g}.webp 1280w" sizes="(max-width: 760px) 100vw, 760px" width="1280" height="720" alt="{html.escape(alt)}" loading="{load}" decoding="async">')
        dots.append(f'<i data-beat="{bid}"{" class=\"is-on\"" if li == 0 else ""}></i>')
        spans.append(f'<span class="beat gp-line" data-beat="{bid}" data-t="{times[n-1]}">{html.escape(l, quote=False)}</span>')
    nxt = '' if si == len(secs) else '\n        <button type="button" class="btn btn-ghost conte-next">Suite ▾</button>'
    scenes_html.append(f'''      <section class="conte-scene" id="scene-{si}" data-scene="{si}">
        <figure class="conte-fig">
{chr(10).join(imgs)}
          <span class="conte-dots" aria-hidden="true">{"".join(dots)}</span>
        </figure>
        <div class="conte-text">
          <p class="gp-tag">{html.escape(name)}</p>
          <p>{"<br>".join(spans)}</p>
        </div>{nxt}
      </section>''')
tpl = (ROOT / "tools/grand-poumon.tpl.html").read_text()
out = tpl.replace("{{SCENES}}", "\n".join(scenes_html)).replace("{{V}}", V).replace("{{NIMG}}", str(len(used)))
(ROOT / "chanson-grand-poumon.html").write_text(out)
print("lignes", n, "images", len(used), "fin", round(t, 1))
