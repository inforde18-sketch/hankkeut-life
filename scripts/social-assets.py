"""Render the site's original graphic system. Pillow only; no network or paid API."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
regular = Path('C:/Windows/Fonts/malgun.ttf')
bold = Path('C:/Windows/Fonts/malgunbd.ttf')
if not regular.exists():
    raise SystemExit('Pre-rendered images are included. Regeneration needs Malgun Gothic.')
GREEN, LIME, WHITE, MUTED, CORAL = '#124c42', '#d5ec92', '#f5f6eb', '#c1d8bc', '#ff9b78'

def font(n, heavy=False):
    return ImageFont.truetype(str(bold if heavy else regular), n)

def fitted(lines, maximum, width):
    for n in range(maximum, 25, -1):
        f = font(n, True)
        if all(f.getlength(line) <= width for line in lines):
            return f, n
    raise ValueError('Thumbnail text does not fit')

def icon(draw, art, x, y, size):
    """Original line art, without actual screenshots or working QR codes."""
    def p(a,b): return (round(x+a*size/200),round(y+b*size/200))
    def box(a,b,c,d): return (*p(a,b),*p(c,d))
    lw=max(3,round(size/26))
    draw.ellipse(box(0,0,200,200),fill='#225d50')
    if art=='storage':
        draw.rounded_rectangle(box(52,22,148,177),radius=round(size/16),outline=LIME,width=lw)
        draw.line((p(82,37),p(118,37)),fill=LIME,width=lw)
        draw.rounded_rectangle(box(68,62,132,122),radius=4,fill=LIME)
        draw.ellipse(box(79,73,94,88),fill=GREEN)
        draw.polygon([p(69,116),p(95,90),p(111,105),p(132,82),p(132,122),p(69,122)],fill=GREEN)
        draw.line((p(84,157),p(116,157)),fill=LIME,width=lw)
    elif art=='qr':
        for a,b in [(43,43),(113,43),(43,113)]:
            draw.rectangle(box(a,b,a+43,b+43),outline=LIME,width=lw)
        for a,b in [(115,115),(142,115),(115,142),(143,144),(91,94)]:
            draw.rectangle(box(a,b,a+12,b+12),fill=LIME)
    elif art=='password':
        draw.arc(box(66,34,134,114),180,360,fill=LIME,width=lw)
        draw.rounded_rectangle(box(43,86,157,164),radius=round(size/20),outline=LIME,width=lw)
        for a in [66,94,122]: draw.ellipse(box(a,118,a+13,131),fill=LIME)
    elif art=='shield':
        draw.polygon([p(100,26),p(159,51),p(150,119),p(127,153),p(100,176),p(73,153),p(50,119),p(41,51)],outline=LIME,width=lw)
        draw.line([p(70,99),p(92,121),p(134,76)],fill=LIME,width=lw)
    else:
        draw.rounded_rectangle(box(31,47,169,155),radius=8,outline=LIME,width=lw)
        draw.line((p(31,76),p(169,76)),fill=LIME,width=lw)
        for a in [47,62,77]: draw.ellipse(box(a,59,a+5,64),fill=LIME)
        draw.arc(box(72,88,130,139),30,300,fill=LIME,width=lw)

def make(post, shape):
    portrait=shape=='portrait'
    w,h=(1080,1350) if portrait else (1200,630)
    im=Image.new('RGB',(w,h),GREEN);d=ImageDraw.Draw(im)
    for x in range(0,w,90):d.line((x,0,x,h),fill='#195347')
    for y in range(0,h,90):d.line((0,y,w,y),fill='#195347')
    pad=68 if portrait else 60
    d.text((pad,48 if portrait else 28),'한끗생활',font=font(31 if portrait else 26,True),fill=LIME)
    label=post.get('thumbnailTag',post['category'])
    tagfont=font(24 if portrait else 20,True)
    tw=d.textlength(label,font=tagfont)+42
    ty=150 if portrait else 103
    d.rounded_rectangle((pad,ty,pad+tw,ty+(49 if portrait else 42)),radius=21,fill=LIME)
    d.text((pad+21,ty+7),label,font=tagfont,fill=GREEN)
    lines=post.get('thumbnailLines',[post['title']])
    textwidth=w-pad*2 if portrait else 855
    f,n=fitted(lines,116 if portrait else 91,textwidth)
    y=280 if portrait else 189
    for i,line in enumerate(lines):
        d.text((pad,y),line,font=f,fill=WHITE if i==0 else LIME,stroke_width=1)
        y+=n+36 if portrait else n+21
    if portrait:
        icon(d,post['art'],736,690,260)
        d.text((pad,724),'먼저 확인하고,',font=font(43,True),fill=WHITE)
        d.text((pad,795),'그다음 바꾸세요.',font=font(43,True),fill=WHITE)
        caption=post.get('thumbnailCaption',post['takeaway'])
        cf,_=fitted([caption],34,w-pad*2-60)
        d.rounded_rectangle((pad,1040,w-pad,1168),radius=24,fill='#204d42')
        d.rectangle((pad,1068,pad+6,1138),fill=CORAL)
        d.text((pad+28,1080),caption,font=cf,fill=WHITE)
        d.line((pad,1232,w-pad,1232),fill='#56816c',width=2)
        d.text((pad,1260),'확인 순서와 공식 출처는 본문에',font=font(26),fill=MUTED)
    else:
        icon(d,post['art'],931,225,210)
        caption=post.get('thumbnailCaption',post['takeaway'])
        cf,_=fitted([caption],31,w-pad*2-30)
        d.line((pad,482,w-pad,482),fill='#56816c',width=2)
        d.rectangle((pad,519,pad+6,564),fill=CORAL)
        d.text((pad+24,521),caption,font=cf,fill=WHITE)
    return im

posts=json.loads((root/'content/articles.json').read_text(encoding='utf-8'))
posts+=json.loads((root/'content/queue.json').read_text(encoding='utf-8'))
target=root/'assets/social';target.mkdir(exist_ok=True,parents=True)
for post in posts:
    make(post,'portrait').save(target/(post['slug']+'.jpg'),quality=94,optimize=True)
    make(post,'landscape').save(target/('preview-'+post['slug']+'.jpg'),quality=94,optimize=True)
print(f'Created {len(posts)} portrait cards + {len(posts)} link previews. Network calls: 0.')
