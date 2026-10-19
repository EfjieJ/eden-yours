import json,os,unicodedata
L=json.load(open('data/lyrics-sources.json'))
T=json.load(open('tracks.json')); T=T.get('tracks',T) if isinstance(T,dict) else T
C=json.load(open('data/categories.json'))
M=json.load(open('data/merveilles.json'))
imgs={}
for f in sorted(os.listdir('assets/visuels')):
    if f.endswith('.webp'): imgs[f[:-5]]={"src":"assets/visuels/"+f[:-5]+".webp","sm":"assets/visuels/sm/"+f[:-5]+".webp"}
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
