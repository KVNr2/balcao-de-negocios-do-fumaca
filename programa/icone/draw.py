from PIL import Image, ImageDraw, ImageFilter
import math
S=1024
def make(simple=False):
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    c=S//2
    # medalhão escuro com anel dourado
    d.ellipse((24,24,S-24,S-24),fill=(224,176,80,255))
    d.ellipse((64,64,S-64,S-64),fill=(22,27,42,255))
    # brilho suave
    g=Image.new('RGBA',(S,S),(0,0,0,0)); gd=ImageDraw.Draw(g)
    gd.ellipse((c-300,c-300,c+300,c+300),fill=(70,90,140,90)); g=g.filter(ImageFilter.GaussianBlur(120))
    mask=Image.new('L',(S,S),0); ImageDraw.Draw(mask).ellipse((64,64,S-64,S-64),fill=255)
    im.paste(Image.composite(g,Image.new('RGBA',(S,S),(0,0,0,0)),mask),(0,0),Image.composite(g,Image.new('RGBA',(S,S),(0,0,0,0)),mask))
    d=ImageDraw.Draw(im)
    gold=(236,190,95,255)
    # nós do destino: um central e seis ao redor, ligados em estrela
    R=300; pts=[(c+R*math.cos(math.radians(a-90)),c+R*math.sin(math.radians(a-90))) for a in range(0,360,60)]
    lw=60 if simple else 34
    for p in pts: d.line([(c,c),p],fill=gold,width=lw)
    if not simple:
        for i in range(6): d.line([pts[i],pts[(i+1)%6]],fill=(236,190,95,150),width=20)
    for p in pts:
        if simple: d.ellipse((p[0]-85,p[1]-85,p[0]+85,p[1]+85),fill=gold)
        else: d.ellipse((p[0]-62,p[1]-62,p[0]+62,p[1]+62),fill=(22,27,42,255),outline=gold,width=26)
    d.ellipse((c-(150 if simple else 105),c-(150 if simple else 105),c+(150 if simple else 105),c+(150 if simple else 105)),fill=gold)
    if not simple: d.ellipse((c-52,c-52,c+52,c+52),fill=(22,27,42,255))
    return im
big=make(); big.save('icon_1024.png')
small=make(True)
for n in (16,24,32,48,64,128,256):
    (small if n<=24 else big).resize((n,n),Image.LANCZOS).save(f'icon{n}.png')

# prévia lado a lado
prev=Image.new('RGBA',(520,300),(30,30,34,255))
prev.paste(big.resize((256,256),Image.LANCZOS),(10,22),big.resize((256,256),Image.LANCZOS))
x=290
for n in (48,32,24,16):
    im=Image.open(f'icon{n}.png'); prev.paste(im,(x,120),im); x+=n+14
prev.save('preview.png')
