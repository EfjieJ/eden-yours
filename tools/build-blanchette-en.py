#!/usr/bin/env python3
"""Build conte-blanchette-en.html (EN twin of conte-blanchette.html) from the FR page + /workspace/contes/blanchette-en.json."""
import json, re, sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
d = json.load(open("/workspace/contes/blanchette-en.json"))
fr = open(f"{ROOT}/conte-blanchette.html", encoding="utf-8").read()
en_ref = open(f"{ROOT}/conte-big-yes-first-support.html", encoding="utf-8").read()
TITLE = "Monsieur Seguin’s Seventh Goat and the Light"
DESC = "An illustrated tale by François: Blanchette, Monsieur Seguin’s seventh goat, feeds on light and teaches the wolf to do the same."
BASE = "https://efjiej.github.io/eden-yours/"
out = fr
# beats and alts
for k, v in d["beats"].items():
    out, n = re.subn(r'(<span class="beat" data-beat="%s">)(.*?)(</span>)' % k, lambda m: m.group(1) + v + m.group(3), out, flags=re.S)
    assert n == 1, k
for k, v in d["alts"].items():
    out, n = re.subn(r'(<img class="conte-img[^"]*" data-beat="%s"[^>]*? alt=")[^"]*(")' % k, lambda m: m.group(1) + v + m.group(2), out)
    assert n == 1, k
# head
head_end = out.index("</head>")
head = out[:head_end]
head = head.replace('<html lang="fr">', '<html lang="en">')
head = re.sub(r"<title>.*?</title>", f"<title>{TITLE} — Illustrated tale — Eden Yours</title>", head)
head = re.sub(r'(name="description" content=")[^"]*', r"\g<1>" + DESC, head)
head = head.replace(f'<link rel="canonical" href="{BASE}conte-blanchette.html">',
  f'<link rel="alternate" hreflang="fr" href="{BASE}conte-blanchette.html">\n  <link rel="alternate" hreflang="en" href="{BASE}conte-blanchette-en.html">\n  <link rel="canonical" href="{BASE}conte-blanchette-en.html">')
head = head.replace('content="fr_CA">\n  <meta property="og:locale:alternate" content="en_US">', 'content="en_US">\n  <meta property="og:locale:alternate" content="fr_CA">')
head = head.replace(f'og:url" content="{BASE}conte-blanchette.html"', f'og:url" content="{BASE}conte-blanchette-en.html"')
head = re.sub(r'((?:og|twitter):title" content=")[^"]*', r"\g<1>" + TITLE + " — Illustrated tale — Eden Yours", head)
head = re.sub(r'((?:og|twitter):description" content=")[^"]*', r"\g<1>" + DESC, head)
head = head.replace("Eden Yours — Écoute en continu. Ça régénère. 29 chansons · Casse-tête · Blind test", "Eden Yours — Listen continuously. It regenerates. 29 songs · Puzzle · Blind test")
body = out[head_end:]
# body tag + nav from the EN reference page
body = body.replace('<body class="page-conte" data-no-song-visuals>',
  '<body class="page-conte" data-conte-lang="en" data-conte-pair="conte-blanchette.html" data-no-song-visuals data-conte-song="none">')
s, e = en_ref.index('<header class="site-nav">'), en_ref.index("</header>") + len("</header>")
nav = en_ref[s:e].replace('class="en-only active"', 'class="en-only"')
bs, be = body.index('<header class="site-nav">'), body.index("</header>") + len("</header>")
body = body[:bs] + nav + body[be:]
# hero
hs, he = body.index('<section class="conte-hero">'), body.index("</section>", body.index('<section class="conte-hero">')) + len("</section>")
hero = f'''<section class="conte-hero">
      <div class="container conte-narrow">
        <nav class="conte-lang-pick" aria-label="Language of this tale"><a href="conte-blanchette.html?lang=fr" hreflang="fr" lang="fr">🇫🇷 Français</a><a href="conte-blanchette-en.html?lang=en" hreflang="en" lang="en" aria-current="page">🇬🇧 English</a></nav>
        <p class="eyebrow">Illustrated tale · Eden Yours</p>
        <h1>{TITLE}</h1>
        <p class="conte-lead">A tale by François, in 35 pictures. Scroll or tap “Next”: the pictures follow each sentence and appear gently.</p>
      </div>
    </section>
    <section class="conte-chanson" id="la-chanson" aria-labelledby="chanson-titre">
      <div class="container conte-narrow">
        <h2 id="chanson-titre">The song</h2>
        <div class="conte-chanson-slot" data-suno-slot><p class="conte-bientot">Coming soon — the song of this tale is on its way.</p></div>
      </div>
    </section>'''
body = body[:hs] + hero + body[he:]
body = body.replace('data-i18n="conte.next">Suite ▾', 'data-i18n="conte.next">Next ▾')
# end section
es, ee = body.index('<section class="conte-end">'), body.index("</section>", body.index('<section class="conte-end">')) + len("</section>")
end = '''<section class="conte-end">
        <p class="conte-fin">The End</p>
        <p class="conte-closing">“With a little light, she changed a wolf’s heart.”</p>
        <p class="conte-invite"><a href="https://paypal.me/Francjul" target="_blank" rel="noopener noreferrer">If this tale touches you, you can support the creation of the next one.</a></p>
      </section>'''
body = body[:es] + end + body[ee:]
# gift + footer from the EN reference
gs, ge = en_ref.index('<aside class="gift"'), en_ref.index("</footer>") + len("</footer>")
gift = en_ref[gs:ge].replace("Illustrated tale: The Big Yes and the First Support", "Illustrated tale: " + TITLE)
bgs, bge = body.index('<aside class="gift"'), body.index("</footer>") + len("</footer>")
body = body[:bgs] + gift + body[bge:]
open(f"{ROOT}/conte-blanchette-en.html", "w", encoding="utf-8").write(head + body)
# plain text
with open("/workspace/contes/blanchette-en.txt", "w", encoding="utf-8") as f:
    f.write(TITLE + "\n\n" + "\n".join(d["beats"].values()) + "\n")
print("ok")
