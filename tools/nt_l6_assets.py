import numpy as np, glob
from PIL import Image, ImageFilter
A='/home/box/agent-data/agents/edd5a63a-83d0-41d6-a71c-2cc04dd4f347/assets/'
def ld(p): return np.asarray(Image.open(glob.glob(A+p+'*')[0]).convert('RGB'),np.float32)
O='assets/nouvelle-terre/'
Image.fromarray(ld('80a2da85').astype(np.uint8)).save(O+'nt-l6-backdrop.webp',quality=80,method=6)
def save(rgb,a,name,maxh=None):
    ys,xs=np.where(a>8); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    im=Image.fromarray(np.dstack([np.clip(rgb,0,255),a]).astype(np.uint8)[y0:y1,x0:x1],'RGBA')
    if maxh and im.height>maxh: im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    im.save(O+name,quality=88,method=6); print(name,im.size)
# people
def key(img):
    r,g,b=img[...,0],img[...,1],img[...,2]; sp=g-np.maximum(r,b)
    a=1-np.clip((sp-25)/45,0,1)
    a=np.asarray(Image.fromarray((a*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6)),np.float32)
    out=img.copy(); out[...,1]=np.minimum(g,np.maximum(r,b)*1.02+2)
    return out,a
def split(img,name,n,maxh):
    rgb,a=key(img); col=(a>60).sum(0); on=col>3; segs=[]; i=0
    while i<len(on):
        if on[i]:
            j=i
            while j<len(on) and on[j]: j+=1
            segs.append((i,j)); i=j
        else: i+=1
    segs=[s for s in segs if s[1]-s[0]>15]
    # merge tiny gaps until n segments
    while len(segs)>n:
        gaps=[segs[k+1][0]-segs[k][1] for k in range(len(segs)-1)]; k=int(np.argmin(gaps)); segs[k]=(segs[k][0],segs[k+1][1]); del segs[k+1]
    print(name,len(segs),segs)
    for k,(x0,x1) in enumerate(segs):
        aa=np.zeros_like(a); aa[:,max(0,x0-2):x1+2]=a[:,max(0,x0-2):x1+2]
        save(rgb,aa,f'{name}{k}.webp',maxh)
split(ld('db86322c'),'nt-p',3,260)
split(ld('9010b336'),'nt-t',10,200)
img=ld('9010b336'); rgb,a=key(img); col=(a>60).sum(0)
C=[175,281,350,450,556,656,750,838,944,1050]
cuts=[60]+[ (C[i]+C[i+1])//2-12+int(np.argmin(col[(C[i]+C[i+1])//2-12:(C[i]+C[i+1])//2+12])) for i in range(9)]+[1180]
print(cuts)
for k in range(10):
    aa=np.zeros_like(a); aa[:,cuts[k]:cuts[k+1]]=a[:,cuts[k]:cuts[k+1]]; save(rgb,aa,f'nt-t{k}.webp',200)
