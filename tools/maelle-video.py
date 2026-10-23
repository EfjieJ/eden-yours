import json,subprocess,sys,os
segs=json.load(open('/workspace/contes/maelle-segs.json'))
G=[[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13,14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24],[25],[26],[27],[28],[29,30],[31],[32,33],[34],[35],[36],[37,38],[39],[40],[41],[42,43],[44],[45],[46,47],[48],[49],[50,51],[52],[53,54],[55,56,57],[58],[59]]
assert sorted(sum(G,[]))==list(range(1,60)) and len(G)==49
T=0.8; FPS=30; INTRO=1.5
def rt(s): return max(2.4, len(s)/14.0+1.0)
timing=[];cur=0.0;caps=[]
for gi,g in enumerate(G):
  st=cur
  for si in g:
    d=rt(segs[si-1]); 
    if gi==0 and si==g[0]: d+=INTRO
    caps.append((cur+(INTRO if gi==0 and si==g[0] else 0),cur+d,segs[si-1],si)); cur+=d
  timing.append({'img':'mc%02d'%(gi+1),'start':round(st,2),'end':round(cur,2),'sentences':g})
END=cur+2.0; timing[-1]['end']=round(END,2)
json.dump({'total':round(END,2),'images':timing,'captions':[{'start':round(a,2),'end':round(b,2),'n':n,'text':t} for a,b,t,n in caps]},open('/workspace/videos/maelle-chaine-timings.json','w'),ensure_ascii=False,indent=1)
def ts(x): h=int(x//3600);m=int(x%3600//60);s=x%60;return f"{h}:{m:02d}:{s:05.2f}"
def build(W,H,name):
  B='/workspace/contes/maelle-build/'+name; os.makedirs(B,exist_ok=True)
  S=1080 if W<H else 900
  y=200 if W<H else 40
  clips=[]
  for i,t in enumerate(timing):
    d=t['end']-t['start']+(T if i<len(timing)-1 else 0)
    n=int(round(d*FPS)); out=f'{B}/c{i:02d}.mp4'; clips.append((out,d))
    if os.path.exists(out): continue
    zin = i%2==0
    z = f"'1.0+0.10*on/{n}'" if zin else f"'1.10-0.10*on/{n}'"
    px = ["iw/2-(iw/zoom/2)","iw/2-(iw/zoom/2)+20*on/%d"%n,"iw/2-(iw/zoom/2)-20*on/%d"%n][i%3]
    fc=(f"[0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.12[bg];"
        f"[0]scale=2000:2000,zoompan=z={z}:x='{px}':y='ih/2-(ih/zoom/2)':d={n}:s={S}x{S}:fps={FPS}[fg];"
        f"[bg]loop=-1:1,fps={FPS}[bgl];[bgl][fg]overlay=(W-w)/2:{y}:shortest=1,format=yuv420p")
    subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-i',f'/workspace/contes/maelle-img/{t["img"]}.jpg','-filter_complex',fc,'-t',f'{d:.3f}','-r',str(FPS),'-c:v','libx264','-preset','veryfast','-crf','20',out],check=True)
  # xfade chain
  inp=[];fc='';prev='[0]';off=0
  for i,(c,d) in enumerate(clips): inp+=['-i',c]
  for i in range(1,len(clips)):
    off+=clips[i-1][1]-T
    fc+=f"{prev}[{i}]xfade=transition=fade:duration={T}:offset={off:.3f}[x{i}];"; prev=f'[x{i}]'
  # ASS
  fs=58 if W<H else 50; mv=170 if W<H else 50
  ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Lora,{fs},&H00FFFFFF,&H00FFFFFF,&H00301A10,&H96000000,1,0,0,0,100,100,0,0,1,3,2,2,70,70,{mv},1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
  for a,b,t,n in caps: ass+=f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\fad(250,250)}}{t}\n"
  open(f'{B}/caps.ass','w').write(ass)
  fc+=f"{prev}ass={B}/caps.ass[v]"
  out=f'/workspace/videos/{name}.mp4'
  subprocess.run(['ffmpeg','-y','-loglevel','error']+inp+['-filter_complex',fc,'-map','[v]','-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',out],check=True)
  print(out)
build(int(sys.argv[1]),int(sys.argv[2]),sys.argv[3])
