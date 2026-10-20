import json,os,unicodedata
L=json.load(open('data/lyrics-sources.json'))
T=json.load(open('tracks.json')); T=T.get('tracks',T) if isinstance(T,dict) else T
C=json.load(open('data/categories.json'))
M=json.load(open('data/merveilles.json'))
imgs={}
for f in sorted(os.listdir('assets/visuels')):
    if f.endswith('.webp'): imgs[f[:-5]]={"src":"assets/visuels/"+f[:-5]+".webp","sm":"assets/visuels/sm/"+f[:-5]+".webp"}
for k in imgs:
    if k=='lt-l10b':  # image refaite : adresse versionnée pour contourner les caches
        imgs[k]={x:v+"?v=20261020b" for x,v in imgs[k].items()}
for it in M['items']:
    imgs['mv-'+it['id']]={"src":"assets/merveilles/"+it['id']+".webp","sm":"assets/merveilles/sm/"+it['id']+".webp"}
# song prefix -> [(image, keyword exactly as in lyrics)]
# 1re image = la plus propre à la chanson (mot des paroles qui lui est particulier) ; au plus 1 image « générique » (GEN) par chanson
S={
 '51d7f27c':[('vague','cycle'),('graine','Commencer'),('cercle','Continuer'),('oiseau-vol','liberté'),('souffle','respiration')],
 '4db8bded':[('graine','Commencer'),('souffle','respiration'),('cercle','cycle'),('vague','Terminer'),('oiseau-vol','liberté')],
 'a11c8f21':[('vague','cycle'),('graine','Start'),('cercle','Continue'),('oiseau-vol','freedom'),('souffle','breathing')],
 'f95b9e6c':[('joie-eau','la joie pure coule'),('corps-regen','le corps se répare'),('particule','Particule Pure')],
 'f5bf8830':[('mv-hiver-cerf',"l'hiver"),('gong','gong'),('fils-lumiere','tissu originel'),('souffle','le souffle')],
 'b495fcd7':[('mv-hiver-cerf','winter'),('gong','gong'),('fils-lumiere','fabric'),('souffle','the breath')],
 'd34adae3':[('pyramide','la pyramide'),('visages','visages'),('souffle','le souffle'),('coeur','Tum-tum'),('petale','beauté')],
 'f40bcbea':[('mv-jardin-cosmique',"l'univers entier"),('main-fleur','prendre soin'),('foret-marche','tu marches'),('corps-regen','tissus se régénérer'),('coeur','amour')],
 'b51d4773':[('planetes-jumelles','planète jumelle'),('pont-lumiere','ponts de lumière'),('coeur','battement double'),('soleil','Soleil')],
 '6f66fa1b':[('mv-lotus-etre','Source de Vie'),('danse','danse libre'),('mv-arbre-lumiere','un arbre'),('champ','dans la nature'),('corps-regen','se régénère')],
 '8e360ed6':[('rose-planete','sa rose unique'),('renard','renard'),('desert-puits','puits de lumière'),('pont-lumiere','le pont'),('etoiles','les étoiles')],
 '2c8a36c9':[('mains-terre','mes mains dans la terre'),('ruisseau','ruisseau'),('foret-marche','Je marche en forêt'),('champ','champ'),('mv-arbre-lumiere',"l'arbre"),('danse','danser')],
 'c8c1762f':[('main-fleur','main'),('petale','pétale'),('mv-lavande','parfum'),('souffle','respirer')],
 '702aaf9e':[('voile-tombe','le voile est tombé'),('tisserand','tisserands'),('danse','je danse'),('aube','Terre')],
 'a5ba4262':[('pilier-lumiere','pillar of light'),('vent','wind'),('foret-marche','walk mindfully'),('onde','wave')],
 'd8d9dfd9':[('plume','weighs nothing'),('instruments','music'),('coeur','Love'),('particule','particle')],
 '0d719cb9':[('poumon-foret','grand poumon'),('cercle','cercle sans fin'),('souffle','souffle')],
 '283895e4':[('atelier','atelier'),('cycle-saisons','Recommencer'),('foret-marche','marche'),('cercle','rythme'),('danse','danse')],
 'e4a2c1d5':[('pomme','la pomme'),('visages',"présence de l'autre"),('cycle-saisons','On naît, on grandit'),('main-fleur','geste'),('mv-etres-bulles','lumières en mouvement')],
 '4d1bff83':[('pomme','apple'),('visages','presence of the other'),('cycle-saisons','we grow'),('main-fleur','gesture'),('mv-etres-bulles','moving lights')],
 'ca876051':[('flamme','la même flamme'),('chemin-lumiere','illumine le chemin'),('coeur','poitrine'),('champ','le champ')],
 'ea749cc4':[('tisserand','tisserands'),('fils-lumiere','fils'),('motif-fleurs','motif')],
 'da8977c3':[('instruments','violon'),('visages','un sourire'),('main-fleur','un geste')],
 '9f072abb':[('oiseau-vol',"L'oiseau"),('tisserand','tisserand'),('cycle-saisons','naît, croît et meurt'),('silence-lac','silence')],
 '603767be':[('tambourin','Tambourin'),('vent','le vent'),('danse','danse'),('flamme','ma flamme')],
 # paroles récupérées sur la page publique Suno (studio-api …/api/clip/<id>, champ metadata.prompt)
 'dead13bb':[('bulle-hydrogene',"bulle d'hydrogène"),('foret-marche','se promène'),('particule','Particule Pure')],
 'ad12c762':[('doigt-eau','le doigt'),('fleche-vent','la flèche'),('verre-eau',"bois de l'eau"),('souffle','Respirer')],
 '5535b9e6':[('enfant-champ',"L'enfant"),('instruments','Le corps est un instrument'),('cycle-saisons','Naître, croître, mourir'),('souffle','le souffle')],
 'a0b2b33d':[('boussole-mousse','boussole'),('galaxie','les galaxies'),('fils-lumiere','le fil'),('silence-lac','Trente secondes de silence')],
 'b0eb0f76':[('boussole-mousse','compass'),('galaxie','galaxies'),('fils-lumiere','The Thread'),('silence-lac','seconds of silence')],
 '2c1321b1':[('montagnes-brume','les montagnes'),('mv-foret-doree','les arbres'),('cercle','micro-cycles'),('souffle','Respire calmement')],
 'e9a0dfac':[('mv-foret-doree','les arbres'),('montagnes-brume','les montagnes'),('corps-regen','régénération'),('cercle','micro-cycles')],
 '18a2266c':[('montagnes-brume','mountains'),('mv-foret-doree','trees'),('cercle','micro-cycles'),('souffle','Breathe calmly')],
 '04441f4e':[('chien-balle','chien'),('pieds-mousse','tes pieds touchent le sol'),('mv-cascade-lumiere','la source de vie'),('souffle','le souffle')],
 'd2d61703':[('chien-balle','dog'),('pieds-mousse','feet touch the ground'),('mv-cascade-lumiere','source of life'),('souffle','the breath')],
 'bd31373d':[('pieds-mousse','feet touch the ground'),('chien-balle','dog'),('mv-cascade-lumiere','source of life'),('souffle','the breath')],
 '3fa852e8':[('plante-lumiere','une plante'),('oiseau-vol','un oiseau'),('mv-arbre-lumiere','un arbre'),('corps-regen','régénération')],
 '2a9f903f':[('neige-marcheur','marche dans la neige'),('fleur-bleue','une pétale bleu'),('mv-lavande','parfum'),('main-fleur','Il lève la main')],
 '6d91a0bb':[('centre-pierres','au centre'),('atelier','artisan de la vie'),('corps-regen','Mes tissus se régénèrent'),('visages','reconnaître celle des autres')],
 '4f9514ec':[('vague-couleurs','color'),('vague','like waves'),('atelier','craftsmen'),('danse','sacred dances')],
 'c188685c':[('atelier','craftsmen'),('vague-couleurs','color'),('danse','Sacred Dance'),('vague','like waves')],
 'a4b34a64':[('rocher-ocean',"l'océan"),('pion-mousse','pas le pion'),('pont-lumiere','Le pont apparaît'),('aube','Éternel sur la Terre')],
 '7599f004':[('racines','la racine'),('galaxie','les galaxies'),('tisserand','le tisserand'),('soleil',"l'éclat des cieux")],
 '4ec00297':[('chevre-rocher','Blanchette'),('loup-lune','le loup'),('paquerette','une pâquerette'),('flamme','un feu de camp invisible'),('etoiles','sous les étoiles')],
 '50647605':[('prince-pierre','Petit Prince'),('rose-planete','Ma rose'),('perles-lumiere','Je segmente ma vie'),('desert-puits','désert'),('etoiles','Les étoiles rient')],
 'ec618190':[('chaperon-rouge','chaperon écarlate'),('loup-doux','le loup'),('fiole-eau','fiole'),('grand-mere-lumiere','grand-mère'),('etoiles','sous les étoiles')],
 '2d3b8f95':[('danse-sans-costume','On danse sans costume'),('chaise-assise','je m’assois dessus'),('lumiere-voir','je vois'),('costume-tombe','le costume tombe'),('point-de-vue','points de vue')],
 'e2f896d7':[('mv-foret-bleue','la forêt entière'),('pilier-lumiere','une antenne'),('fleur-bleue','Avant la fleur'),('souffle','un souffle qui danse')],
}
# Mode « en ordre, réparti sur la chanson » : une image par passage des paroles, dans l'ordre, chacune à partir de son repère
# exact (texte des paroles Suno). Le moment « at » (secondes) est estimé : intro + (position du repère dans les paroles /
# longueur des paroles) × (durée − intro − fin). js/song-visuals.js suit ces moments au lieu de faire tourner les images.
SEQ={
 # La Tortue Consciente : les paroles sont la fable mot pour mot → une image par passage, celles de la page du conte (conte-lievre-tortue.html)
 'da1439f7':{'intro':8,'outro':10,'items':[
  ('lt-l01a','La Fable du Lièvre'),
  ('lt-l01b','Le Lièvre Réactif ne tenait pas en place.'),
  ('lt-l01c','Pour lui, la vie était une course'),
  ('lt-l01d','Il courait pour ne pas mourir'),
  ('lt-l01e','Il était entièrement prisonnier du film'),
  ('lt-l01f','Il croyait que sa valeur'),
  ('lt-l02a','Un matin'),
  ('lt-l02b',"Elle marchait d'un pas lent"),
  ('lt-l02c','À vrai dire'),
  ('lt-l02d','Elle ne subissait pas le mouvement'),
  ('lt-l03a','Le Lièvre, la voyant si tranquille'),
  ('lt-l03b','— Où cours-tu'),
  ('lt-l03c','À ce rythme'),
  ('lt-l03d','Regarde-moi'),
  ('lt-l04a',"La Tortue s'arrêta."),
  ('lt-l04b','car elle appliquait le triptyque'),
  ('lt-l04c','Elle ferma les yeux'),
  ('lt-l04d','puis regarda le Lièvre'),
  ('lt-l05a','— Tu coures dans la sensation'),
  ('lt-l05b','Tu es dans la structure du film'),
  ('lt-l05c','Moi, je ne cherche pas'),
  ('lt-l05d','Mon corps est une antenne'),
  ('lt-l05e','Faisons un jeu'),
  ('lt-l06a','Le Lièvre accepta le défi'),
  ('lt-l07a','Au signal'),
  ('lt-l07b','Il mit toute son énergie'),
  ('lt-l07c','Mais à force de courir'),
  ('lt-l07d','La fatigue arriva.'),
  ('lt-l08a',"Voyant qu'il avait"),
  ('lt-l08b','il se dit'),
  ('lt-l08c',"Mais en s'asseyant"),
  ('lt-l09a','Pendant ce temps'),
  ('lt-l09b','Sans force, par rappel.'),
  ('lt-l09c','À chaque pas, à chaque souffle'),
  ('lt-l09d',"Elle n'arrachait rien"),
  ('lt-l10a','Ses muscles se densifiaient'),
  ('lt-l10b','Elle ne raisonnait pas la route'),
  ('lt-l11a','Quand le Lièvre se réveilla'),
  ('lt-l11b','il vit la Tortue'),
  ('lt-l11c','Elle avait traversé le pont'),
  ('lt-l12a','Le Lièvre, essoufflé'),
  ('lt-l12b',"— C'est impossible"),
  ('lt-l12c','Comment as-tu fait'),
  ('lt-l13a','La Tortue sourit'),
  ('lt-l13b','— Tu as cru'),
  ('lt-l13c','Tu as mis ton attention'),
  ('lt-l13d',"Moi, j'ai simplement activé"),
  ('lt-l13e',"Je n'ai jamais commencé"),
  ('lt-l13f','Je suis autour du mouvement'),
  ('lt-l13g','Regarder et admirer'),
  ('lt-l14a','------------------------------'),
  ('lt-l14b',"Mais l'être lucide"),
  ('lt-l15a','Il ne court pas après la vie'),
 ]},
 '031de4f9':{'intro':6,'outro':8,'items':[
  ('app-appendices','Les appendices du corps'),
  ('app-structures','Ce sont des "structures de perception"'),
  ('app-postule','En d’autres termes'),
  ('app-outils','- Les appendices "les bras'),
  ('app-repondent','- Ils ne créent pas le mouvement'),
  ('app-marche','C’est pour ça que quand tu marches'),
  ('app-jambe','Tu postules « la jambe avance »'),
  ('app-zero','Tu utilises presque zéro énergie'),
  ('app-corps','C’est la même chose pour tout le corps'),
  ('app-bouche','- La bouche n’est pas faite'),
  ('app-yeux','- Les yeux ne « voient » pas'),
  ('app-oreilles','- Les oreilles'),
  ('app-amont','L’être spirituel est toujours en amont.'),
  ('app-jouer','Le corps "et tous ses appendices" est en aval'),
  ('app-postule','C’est pour ça que quand tu es vraiment dans la cause'),
  ('app-marche','- Marcher avec très peu d’énergie'),
  ('app-parole','- Parler avec beaucoup de précision'),
  ('app-agir','- Agir sans effort inutile'),
  ('app-servir','Parce que tu n’es plus en train de « forcer »'),
 ]},
}
GEN={'souffle','silence-lac','onde','particule','etoiles','aube','soleil','mv-etres-bulles'}
CAT={
 'axiomes':['particule','silence-lac','etoiles','aube'],
 'sensibilite':['onde','souffle','mv-lac-cerisiers','plume'],
 'corps-antenne':['pilier-lumiere','foret-marche','vent','mv-arbre-lumiere'],
 'regeneration':['corps-regen','mv-cascade-lumiere','graine','joie-eau'],
 'nous':['visages','pont-lumiere','mv-etres-bulles','flamme'],
 'admiration':['rose-planete','mv-aurore-lac','petale','mv-jardin-cosmique'],
 'jeu':['danse','champ','mv-collines-arcenciel','tambourin'],
}
def norm(s): return unicodedata.normalize('NFC',s).replace('’',"'").lower()
songs={}; nl=0; nc=0
for t in T:
    i=t['id']; p=i[:8]; ly=(L.get(i) or {}).get('lyrics') or ''
    if p in SEQ:
        q=SEQ[p]; assert ly, (t['title'],'no lyrics'); dur=float(t.get('duration') or 0); assert dur>30, t['title']
        body=ly.strip(); lead=len(ly)-len(ly.lstrip()); pos=0; out=[]
        for im,mk in q['items']:
            assert im in imgs, im
            i=ly.find(mk,pos); assert i>=0,(t['title'],'repère introuvable',mk); pos=i+1
            at=q['intro']+(i-lead)/len(body)*(dur-q['intro']-q['outro'])
            out.append({"img":im,"kw":mk,"at":round(at,1)})
        assert out[0]['at']<=q['intro']+0.1
        songs[t['id']]={"title":t['title'],"lang":t['lang'],"by":"lyrics","order":"timed","images":out}; nl+=1
        continue
    if p in S:
        assert ly, (t['title'],'no lyrics')
        out=[]
        for im,kw in S[p]:
            assert im in imgs, im
            ok = norm(kw) in norm(ly) or (kw=='Tambourin' and 'tambourin' in norm(t['title']))
            assert ok, (t['title'],kw)
            out.append({"img":im,"kw":kw} if norm(kw) in norm(ly) else {"img":im,"kw":kw,"from":"title"})
        assert sum(1 for o in out if o['img'] in GEN)<=1, (t['title'],'trop d images generiques')
        assert out[0]['img'] not in GEN, (t['title'],'1re image generique')
        songs[i]={"title":t['title'],"lang":t['lang'],"by":"lyrics","images":out}; nl+=1
    else:
        cat=(C['tracks'].get(i) or {}).get('primary')
        assert cat in CAT,(t['title'],cat)
        songs[i]={"title":t['title'],"lang":t['lang'],"by":"category","category":cat,"images":[{"img":x} for x in CAT[cat]]}; nc+=1
used=set(x['img'] for s in songs.values() for x in s['images'])|set(x for v in CAT.values() for x in v)
unused=[k for k in imgs if k not in used and not k.startswith('mv-')]
print('lyrics',nl,'category',nc,'unused new',unused)
json.dump({"about":"Images liées aux paroles (data/lyrics-sources.json) : pour chaque chanson, 3 à 6 images et le mot des paroles qui les justifie (kw). 1re image = la plus propre à la chanson ; au plus une image générique par chanson. Chanson inconnue : images d’une catégorie. Généré par build-visuals.py — les mots-clés sont vérifiés présents dans les paroles.","images":imgs,"categories":CAT,"songs":songs},open('data/song-visuals.json','w'),ensure_ascii=False,indent=1)
