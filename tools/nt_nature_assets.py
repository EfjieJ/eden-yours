# Bâtis la Nouvelle Terre — version nature/esprit : fonds sans robots
import numpy as np
from PIL import Image, ImageFilter
D='/workspace/nat/'; O='/workspace/eden-lumiere/assets/nouvelle-terre/'
CX,CY,R=848,290,226
b=Image.open(D+'b15.jpg').convert('RGB'); a=np.asarray(b,np.float32)
b.save(O+'nt-final.webp',quality=86,method=6)
Image.open(D+'b6.jpg').convert('RGB').save(O+'nt-l6-backdrop.webp',quality=86,method=6)
H,W=a.shape[:2]; yy,xx=np.mgrid[0:H,0:W]; d=np.hypot(xx-CX,yy-CY)
m=np.clip((R+60-d)/45,0,1)[...,None]
lum=(a*[0.3,0.59,0.11]).sum(-1,keepdims=True)
dorm=lum*0.62*np.array([0.92,0.95,1.08])+a*0.06
Image.fromarray(np.clip(a*(1-m)+dorm*m,0,255).astype(np.uint8)).save(O+'nt-start.webp',quality=86,method=6)
# terre : océans/continents de l'ancienne texture + racines dorées et arbres de la nouvelle planète
S=2*R; crop=a[CY-R:CY+R,CX-R:CX+R]
r,g,bb=crop[...,0],crop[...,1],crop[...,2]; L=crop.mean(-1)
gold=np.clip(((r-bb)-40)/50,0,1)*np.clip((L-110)/60,0,1)
green=np.clip(((g-bb)-10)/30,0,1)*np.clip((g-r+10)/30,0,1)*0.6
k=np.clip(gold+green,0,1); k=np.asarray(Image.fromarray((k*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)),np.float32)[...,None]/255
rs=np.random.RandomState(4); n=Image.fromarray((rs.rand(S//16,S//16)*255).astype(np.uint8)).resize((S,S),Image.BICUBIC).filter(ImageFilter.GaussianBlur(14))
n=np.asarray(n,np.float32)/255; land=np.clip((n-0.5)/0.06,0,1)
land=np.maximum(land,np.asarray(Image.fromarray((green/0.6*255).clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)),np.float32)/255*1.5).clip(0,1)[...,None]
ocean=np.array([30,96,182.])*(0.6+L[...,None]/200); grass=crop*np.array([0.75,1.05,0.7])+np.array([10,30,5.])
base=ocean*(1-land)+grass*land; rgb=crop*k+(base*0.8+crop*0.2)*(1-k)
yy2,xx2=np.mgrid[0:S,0:S]; al=np.clip((R-6-np.hypot(xx2-R,yy2-R))/14,0,1)*255
Image.fromarray(np.dstack([np.clip(rgb,0,255),al]).astype(np.uint8),'RGBA').save(O+'nt-earth.webp',quality=86,method=6)
c=b.crop((210,0,1230,720)).resize((480,339),Image.LANCZOS); c.save('/workspace/eden-lumiere/assets/home/card-nouvelle-terre.webp',quality=84,method=6)
