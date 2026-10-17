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
S={
 '51d7f27c':[('souffle','respiration'),('graine','Commencer'),('vague','cycle'),('cercle','Continuer'),('oiseau-vol','liberté')],
 '4db8bded':[('graine','Commencer'),('souffle','respiration'),('cercle','cycle'),('vague','Terminer'),('oiseau-vol','liberté')],
 'a11c8f21':[('souffle','breathing'),('graine','Start'),('vague','cycle'),('cercle','Continue'),('oiseau-vol','freedom')],
 'f95b9e6c':[('particule','Particule Pure'),('silence-lac','silencieux'),('aube','Lumière éternelle'),('corps-regen','le corps se répare'),('joie-eau','la joie pure coule')],
 'f5bf8830':[('souffle','le souffle'),('mv-hiver-cerf',"l'hiver"),('silence-lac','Le Témoin immobile'),('onde','vibration'),('soleil','éclat des cieux')],
 'b495fcd7':[('souffle','the breath'),('mv-hiver-cerf','winter'),('silence-lac','motionless Witness'),('onde','vibration'),('soleil','brightness of the heavens')],
 'd34adae3':[('visages','visages'),('souffle','le souffle'),('pyramide','la pyramide'),('coeur','Tum-tum'),('petale','beauté')],
 'f40bcbea':[('foret-marche','tu marches'),('main-fleur','prendre soin'),('mv-jardin-cosmique',"l’univers entier"),('corps-regen','tissus se régénérer'),('coeur','amour')],
 'b51d4773':[('soleil','Soleil'),('planetes-jumelles','planète jumelle'),('pont-lumiere','ponts de lumière'),('coeur','battement double')],
 '6f66fa1b':[('danse','danse libre'),('mv-arbre-lumiere','un arbre'),('champ','dans la nature'),('corps-regen','se régénère'),('mv-lotus-etre','Source de Vie')],
 '8e360ed6':[('rose-planete','sa rose unique'),('etoiles','les étoiles'),('renard','renard'),('desert-puits','puits de lumière'),('pont-lumiere','le pont')],
 '2c8a36c9':[('foret-marche','Je marche en forêt'),('mains-terre','mes mains dans la terre'),('ruisseau','ruisseau'),('champ','champ'),('mv-arbre-lumiere',"l’arbre"),('danse','danser')],
 'c8c1762f':[('main-fleur','main'),('petale','pétale'),('souffle','respirer'),('mv-lavande','parfum')],
 '702aaf9e':[('voile-tombe','le voile est tombé'),('tisserand','tisserands'),('aube','Terre'),('danse','je danse'),('soleil','la Lumière qui crée')],
 'a5ba4262':[('pilier-lumiere','pillar of light'),('onde','wave'),('vent','wind'),('foret-marche','walk mindfully'),('soleil','brightness of the heavens')],
 'd8d9dfd9':[('particule','particle'),('plume','weighs nothing'),('onde','vibration'),('coeur','Love'),('instruments','music')],
 '0d719cb9':[('poumon-foret','grand poumon'),('souffle','souffle'),('cercle','cercle sans fin'),('etoiles','étoiles'),('mv-etres-bulles','être de lumière')],
 '283895e4':[('cycle-saisons','Recommencer'),('atelier','atelier'),('foret-marche','marche'),('cercle','rythme'),('danse','danse')],
 'e4a2c1d5':[('pomme','la pomme'),('visages',"présence de l'autre"),('cycle-saisons','On naît, on grandit'),('mv-etres-bulles','lumières en mouvement'),('main-fleur','geste')],
 '4d1bff83':[('pomme','apple'),('visages','presence of the other'),('cycle-saisons','we grow'),('mv-etres-bulles','moving lights'),('main-fleur','gesture')],
 'ca876051':[('flamme','la même flamme'),('chemin-lumiere','illumine le chemin'),('coeur','poitrine'),('champ','le champ'),('silence-lac','silence')],
 'ea749cc4':[('tisserand','tisserands'),('fils-lumiere','fils'),('motif-fleurs','motif')],
 'da8977c3':[('instruments','violon'),('visages','un sourire'),('main-fleur','un geste')],
 '9f072abb':[('oiseau-vol',"L’oiseau"),('tisserand','tisserand'),('silence-lac','silence'),('cycle-saisons','naît, croît et meurt')],
 '603767be':[('tambourin','Tambourin'),('vent','le vent'),('danse','danse'),('flamme','ma flamme'),('soleil','lumière')],
}
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
        songs[i]={"title":t['title'],"lang":t['lang'],"by":"lyrics","images":out}; nl+=1
    else:
        cat=(C['tracks'].get(i) or {}).get('primary')
        assert cat in CAT,(t['title'],cat)
        songs[i]={"title":t['title'],"lang":t['lang'],"by":"category","category":cat,"images":[{"img":x} for x in CAT[cat]]}; nc+=1
used=set(x['img'] for s in songs.values() for x in s['images'])|set(x for v in CAT.values() for x in v)
unused=[k for k in imgs if k not in used and not k.startswith('mv-')]
print('lyrics',nl,'category',nc,'unused new',unused)
json.dump({"about":"Images liées aux paroles (data/lyrics-sources.json) : pour chaque chanson, 3 à 6 images et le mot des paroles qui les justifie (kw). Sans paroles : images de sa catégorie (data/categories.json). Généré par build-visuals.py — les mots-clés sont vérifiés présents dans les paroles.","images":imgs,"categories":CAT,"songs":songs},open('data/song-visuals.json','w'),ensure_ascii=False,indent=1)
