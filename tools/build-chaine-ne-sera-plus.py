# Construit conte-chaine-ne-sera-plus.html (40 images, texte gratuit, vidéo muette, section chanson « bientôt »)
# à partir du texte de François (contes/chaine-ne-sera-plus.txt), mot pour mot, avec son balisage rendu
# (### → intertitres, **…** → gras, « - » → liste, --- → séparateur). REFUSE si l'empreinte SHA-256 diffère
# ou si le texte visible de la page ne redonne pas le texte source (balises retirées) à l'identique.
import html, sys, json, hashlib, re
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/contes/chaine-ne-sera-plus.txt'
V = sys.argv[2] if len(sys.argv) > 2 else '20261023r'
EXPECT = '99a664c4fe82783b30eb734ddedb7358a60b9bf73941ec883a979f9e26365e37'
raw = open(SRC, encoding='utf-8').read()
h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
if h != EXPECT: sys.exit(f'REFUS : le texte source diffère du texte vérifié ({h}).')
segs = []  # (texte, type, n° de ligne, hr avant)
hr = False
for ln, line in enumerate(raw.split('\n')):
    l = line.rstrip()
    if not l.strip(): continue
    if l.strip() == '---': hr = True; continue
    if l.startswith('### '): segs.append((l[4:].strip(), 'h', ln, hr)); hr = False; continue
    li = l.startswith('- ')
    t = (l[2:] if li else l).strip()
    bold = t.startswith('**') and t.endswith('**')
    t = t.replace('**', '')   # gras rendu ; l'astérisque double isolé après « meurt » est retiré
    for k, p in enumerate(re.split(r'(?<=\.)\s+(?=[^\s»])', t)):
        segs.append((p, 'li' if li else 'b' if bold else 'p', ln, hr and k == 0)); hr = False
G = [[1],[2],[3],[4],[5,6],[7,8],[9],[10],[11],[12],[13,14],[15],[16],[17],[18],[19,20],[21],[22,23],[24],[25],[26,27],[28],[29],[30,31],[32],[33],[34],[35,36],[37],[38],[39,40],[41],[42],[43],[44],[45],[46,47],[48],[49],[50]]
ALT = ['Une chaîne de lianes sur un paysage à l’aube', 'Un livre et une baguette posés : rien de magique', 'Un homme lève les yeux vers sa sphère de lumière', 'Des pierres de gué qui montent, étape par étape', 'Un homme inquiet près de la clôture, sa sphère pâlie', 'Un renard anxieux et un lapin', 'Un livre ouvert d’où poussent des fleurs, sans loi écrite', 'L’homme se regarde dans un miroir, la sphère derrière lui', 'Un bol vide et un nuage d’inquiétude', 'Un faucon au-dessus des blés, des souris cachées', 'L’homme s’arrête, les yeux fermés, un sablier', 'Il pose le bouclier et le sac de survie', 'La sphère d’or tisse son corps de fils de lumière', 'Il passe près du pommier, les mains libres', 'Le nuage de peur se dissout', 'Une femme serre ses sacs de provisions', 'La lumière revient de la source dans son corps', 'Des villageois, de petits bols, calmes et stables', 'Un vieil homme se redresse, un flacon fermé sur le rebord', 'Il façonne un vase, l’énergie du geste de créer', 'Un loup et une biche endormis côte à côte', 'Un portail ouvert, sans serrure ni gardien', 'Une chouette tranquille regarde une souris', 'Un chat s’arrête devant la souris', 'La souris ne fuit plus', 'Le chat et la souris côte à côte', 'Le chat et la souris endormis au soleil', 'Des villageois, la main sur le cœur', 'La lumière se propage aux fermes, aux forêts, aux plantes', 'Un hérisson, un renard et un églantier', 'L’homme goûte une pêche en pique-nique', 'Dans un hamac, nourri de lumière', 'Des enfants échangent des fruits en riant', 'Il pose le joug près d’un sac vide', 'La chaîne de lianes, intacte', 'La chaîne devenue arche fleurie', 'Une chaîne tendue sous un ciel gris', 'La chaîne se dénoue en fils de lumière', 'Un homme ordinaire qui arrose son jardin', 'De l’ombre à la lumière, sous la sphère']
assert len(G) == 40 == len(ALT) and sum(G, []) == list(range(1, 51)) and len(segs) == 50, len(segs)
esc = lambda s: html.escape(s, quote=False)
def render(group):
    items = [segs[i - 1] for i in group]
    out, ul = [], []
    lines = []
    for t, k, ln, hrb in items:
        if lines and lines[-1][2] == ln: lines[-1][0].append(t)
        else: lines.append(([t], k, ln, hrb))
    for parts, k, ln, hrb in lines:
        txt = esc(' '.join(parts))
        if k != 'li' and ul: out.append('<ul>' + ''.join(ul) + '</ul>'); ul = []
        if hrb: out.append('<hr class="conte-hr">')
        if k == 'h': out.append(f'<h3 class="conte-h">{txt}</h3>')
        elif k == 'li': ul.append(f'<li>{txt}</li>')
        elif k == 'b': out.append(f'<p><strong>{txt}</strong></p>')
        else: out.append(f'<p>{txt}</p>')
    if ul: out.append('<ul>' + ''.join(ul) + '</ul>')
    return ''.join(out)
D = 'assets/contes/chaine-ne-sera-plus'
out = []
for k, g in enumerate(G):
    n = k + 1; b = f'np{n:02d}'
    nxt = '' if n == 40 else '\n        <button type="button" class="btn btn-ghost conte-next" data-i18n="conte.next">Suite ▾</button>'
    out.append(f'''      <section class="conte-scene" id="scene-{n}" data-scene="{n}">
        <figure class="conte-fig conte-fig--carre">
            <img class="conte-img is-on" data-beat="{b}" src="{D}/sm/{b}.webp?v={V}" srcset="{D}/sm/{b}.webp?v={V} 640w, {D}/{b}.webp?v={V} 1024w" sizes="(max-width: 760px) 100vw, 760px" width="1024" height="1024" alt="{html.escape(ALT[k])}" loading="{"eager" if n == 1 else "lazy"}" decoding="async">
        </figure>
        <div class="conte-text conte-text--md">{render(g)}</div>{nxt}
      </section>''')
# vérification : le texte visible (balises retirées) = le texte source sans balisage
plain = ' '.join(s[0] for s in segs)
src_plain = ' '.join(re.sub(r'^(### |- )', '', l.strip()).replace('**', '') for l in raw.split('\n') if l.strip() and l.strip() != '---')
src_plain = re.sub(r'\s+', ' ', src_plain).strip()
vis = re.sub(r'\s+', ' ', ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', o.split('<div class="conte-text conte-text--md">')[1].split('</div>')[0])) for o in out)).strip()
if not (plain == src_plain == vis): sys.exit('REFUS : texte visible différent du texte source.')
tpl = open('tools/chaine-ne-sera-plus.tpl.html', encoding='utf-8').read()
page = tpl.replace('{{SCENES}}', '\n'.join(out)).replace('{{V}}', V).replace('{{NIMG}}', '40')
open('conte-chaine-ne-sera-plus.html', 'w', encoding='utf-8').write(page)
json.dump({"scenes": 40, "images": 40, "segments": 50, "sha256": h}, sys.stdout); print()
