"""Optional asset regeneration: Python + Pillow; no network or paid service."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
font_path=Path('C:/Windows/Fonts/malgun.ttf')
bold_path=Path('C:/Windows/Fonts/malgunbd.ttf')
if not font_path.exists():
    raise SystemExit('기본 이미지는 이미 포함되어 있습니다. 재생성하려면 이 스크립트의 한글 글꼴 경로를 수정하세요.')
def font(n,bold=False):return ImageFont.truetype(str(bold_path if bold else font_path),n)
def wrap(draw,text,f,width):
    lines=[];line=''
    for ch in text:
        if draw.textlength(line+ch,font=f)>width and line:lines.append(line);line=ch
        else:line+=ch
    if line:lines.append(line)
    return lines
def make(path,title,category,size):
    w,h=size;im=Image.new('RGB',size,'#124c42');d=ImageDraw.Draw(im)
    for x in range(0,w,60):d.line((x,0,x,h),fill='#1b5448')
    for y in range(0,h,60):d.line((0,y,w,y),fill='#1b5448')
    d.rounded_rectangle((58,50,194,92),radius=21,fill='#d6ec9a')
    d.text((78,58),'생활의 한 끗',font=font(19,True),fill='#124c42')
    d.text((62,132),category,font=font(24),fill='#c1d8bc')
    titlefont=font(62 if h>700 else 53,True)
    lines=wrap(d,title,titlefont,w-130)
    y=205 if h>700 else 210
    for line in lines:d.text((60,y),line,font=titlefont,fill='#ffffff');y+=92 if h>700 else 79
    if h>700:
        d.rounded_rectangle((60,730,w-60,1030),radius=20,fill='#d6ec9a')
        d.text((98,775),'복잡한 정보는 덜고,',font=font(42,True),fill='#124c42')
        d.text((98,845),'지금 필요한 방법만.',font=font(42,True),fill='#124c42')
        d.text((98,947),'공식 출처와 함께 읽는 생활 가이드',font=font(22),fill='#43674e')
    d.line((60,h-125,w-60,h-125),fill='#53806a',width=2)
    d.text((60,h-97),'한끗생활',font=font(30,True),fill='#d6ec9a')
    d.text((w-400,h-88),'알아두면 달라지는 하루',font=font(22),fill='#c1d8bc')
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path,quality=92)
make(root/'assets/share.png','매일의 생활에, 쓸모 있는 한 끗.','한끗생활 · 생활 가이드',(1200,630))
posts=json.loads((root/'content/articles.json').read_text(encoding='utf-8'))
for p in posts:make(root/'assets/social'/f"{p['slug']}.jpg",p['title'],p['category'],(1080,1350))
print('Created 1 share image and '+str(len(posts))+' Instagram JPEG cards. Network calls: 0.')
