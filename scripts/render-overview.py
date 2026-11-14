"""Generate schematic SVG/PNG snapshots from the same JSON scenarios.
These are concept illustrations, not browser screenshots.
"""
import json,html,math
from pathlib import Path
import cairosvg
root=Path(__file__).resolve().parent.parent
D=root/'public/data'
C=json.loads((D/'catalog.json').read_text())
S={s['id']:json.loads((D/'scenarios'/f"{s['id']}.json").read_text()) for s in json.loads((D/'scenario-index.json').read_text())}
col={'bg':'#eceef1','window':'#181a1e','sidebar':'#212329','panel':'#25272e','line':'#383b43','primary':'#7cb9fa','text':'#f4f5f7','muted':'#a1a7b3','faint':'#777f8b'}
parts=[]
def R(x,y,w,h,fill,rad=0,stroke=None,sw=1):
 parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>')
def T(x,y,value,size=13,color=None,bold=False,anchor=None):
 v=html.escape(str(value))
 parts.append(f'<text x="{x}" y="{y}" fill="{color or col["text"]}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{650 if bold else 400}"'+(f' text-anchor="{anchor}"' if anchor else '')+f'>{v}</text>')
def L(x1,y1,x2,y2,c='#383b43'):parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{c}"/>')
def dot(x,y,c='#66d19f'):parts.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{c}"/>')
def start(name,meta):
 parts.clear();parts.append('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="970" viewBox="0 0 1500 970">')
 R(0,0,1500,970,col['bg']);T(56,49,name,28,'#252832',True);T(1445,48,meta,12,'#666b78',False,'end')
 R(54,80,1390,828,col['window'],14)
 R(54,80,264,742,col['sidebar'],14);R(303,80,15,742,col['sidebar'])
 R(318,80,1126,67,'#202228',0);L(318,147,1444,147)
 R(54,822,1390,86,col['panel'],0)
 for x,c in [(79,'#ff635e'),(97,'#ffb846'),(115,'#35bf61')]:dot(x,106,c)
 T(83,163,'ST Reborn',19,bold=True);T(84,183,'UI LAB · functional concept',10,col['muted'])
 L(74,809,1430,809)
 # footer
 R(83,840,46,46,'#304c68',8);T(106,870,'♫',27,col['primary'],True,'middle')
 T(143,855,'FluxFM',14,bold=True);T(143,875,'Sound of Berlin',11,col['muted'])
 R(675,837,44,44,'#e7e9ed',25);T(697,866,'Ⅱ',22,'#24262b',True,'middle')
 T(1080,857,'Downstairs',13,col['text'],True);T(1080,878,'Output  ·  2 streams active',10,col['muted'])
 R(1292,858,100,4,'#505762',2);R(1292,858,36,4,col['primary'],2);dot(1328,860,'#e6edf8');T(1410,868,'25',12,col['muted'])

def side_section(y,title,expanded=True):
 T(84,y,title,10,col['muted'],True);T(291,y,'⌄' if expanded else '›',18,col['muted'],False,'middle');return y+26

def draw_base_sidebar(content):
 R(73,204,229,64,'#29405b',9,stroke='#426482');T(87,222,'NOW PLAYING',9,col['primary'],True);T(87,244,'Downstairs',13,bold=True);T(87,260,'FluxFM · 3 speakers',10,col['muted']);
 y=305;y=side_section(y,'LISTEN');
 for item in ['Radio','Library','Recently played','Spotify']:
  if item=='Radio' and content=='radio':R(70,y-15,232,30,'#274463',7)
  T(92,y+5,item,12,col['text'] if item=='Radio' and content=='radio' else col['muted'],item=='Radio' and content=='radio');y+=40
 L(75,470,298,470);y=498;y=side_section(y,'OUTPUTS')
 for item in ['Kitchen','Office','Terrace','Bedroom']:
  dot(90,y-4);T(104,y,item,12);y+=34
 T(92,677,'Manage all outputs  →',11,col['primary'])
 L(75,714,298,714);y=739;y=side_section(y,'SYSTEM',False)
 T(92,788,'Design Lab',12,col['primary'])

def finish(name):
 parts.append('</svg>');raw='\n'.join(parts)
 svg=root.parent/f'{name}.svg';png=root.parent/f'{name}.png'
 svg.write_text(raw)
 cairosvg.svg2png(bytestring=raw.encode(),write_to=str(png),output_width=1500,output_height=970)
 print(svg, png)

def radio():
 start('ST Reborn · Source first, outputs in context','SCHEMATIC / RADIO · SIDEBAR VARIANT B')
 draw_base_sidebar('radio')
 T(345,125,'Radio',19,bold=True)
 R(930,94,338,38,'#2b2d34',8,stroke=col['line']);T(947,118,'⌕  Station, city or genre',12,col['muted'])
 R(1280,94,126,38,'#2e3037',7);T(1294,118,'☷  Filter',12)
 T(345,196,'Quick presets',22,bold=True);T(345,220,'Keys on Living Room L · Music selected here plays on a chosen output',11,col['muted'])
 x0,y0=345,243
 slots=[('1','1LIVE'),('2','FluxFM'),('3','ffn'),('4','Schwarzwaldradio'),('5','FluxFM Berlin'),('6','NDR Info')]
 for i,(n,title) in enumerate(slots):
  colu=i%3;row=i//3;x=x0+colu*354;y=y0+row*85
  R(x,y,335,72,'#29425d' if n=='2' else col['panel'],9,stroke=col['primary'] if n=='2' else col['line'])
  R(x+12,y+16,37,37,'#394553',7);T(x+30.5,y+42,n,16,bold=True,anchor='middle');T(x+64,y+31,title,13,bold=True)
  if n=='2':T(x+64,y+50,'Playing on Downstairs',10,col['primary'])
 T(345,445,'Discover stations',19,bold=True);T(345,466,'Select a source, then choose one or more compatible outputs.',11,col['muted'])
 R(345,483,735,41,col['panel'],8,stroke=col['line']);T(360,509,'⌕  Search stations',12,col['muted'])
 R(1094,483,150,41,col['panel'],7);T(1111,508,'Discover',12,col['primary'],True)
 R(1248,483,156,41,col['panel'],7);T(1270,508,'Favorites',12,col['muted'])
 rows=['NDR 2','Deutschlandfunk','Radio Hannover','WDR 5','SWR3']
 for i,item in enumerate(rows):
  y=539+i*53
  R(345,y,1058,51,'#23252b',0,stroke='#30343c');R(361,y+8,32,32,'#373b47',6);T(377,y+29,'♫',14,col['primary'],True,'middle');T(409,y+31,item,13);T(1140,y+30,'Play on…',11,col['primary'])
 finish('ST_Reborn_UI_Lab_Radio_Preview')

def many():
 start('ST Reborn · Problem of N — 30 speakers','SCHEMATIC / OUTPUTS & GROUPS')
 draw_base_sidebar('outputs')
 T(345,125,'Outputs & groups',19,bold=True)
 T(345,178,'30 speakers',25,bold=True);T(585,178,'4 stereo pairs',25,bold=True);T(827,178,'3 groups',25,bold=True);T(1056,178,'4 streams',25,bold=True)
 T(345,226,'All outputs    Speakers    Stereo pairs    Groups',13,col['primary'])
 R(1080,199,323,39,col['panel'],7,stroke=col['line']);T(1095,224,'⌕  Find any output',11,col['muted'])
 big=S['many'];d=big['devices'];
 items=[('Ground Floor','GROUP','Playing FluxFM'),('Upper Floor','GROUP','Evening Jazz'),('Office Wing','GROUP','Deutschlandfunk'),('Living Room','PAIR','2 speakers'),('Terrace','PAIR','2 speakers'),('Bedroom','PAIR','2 speakers')]+[(x['name'],'SPEAKER',x['ip']) for x in d[:6]]
 for i,(title,kind,sub) in enumerate(items):
  x=345+(i%3)*355;y=259+(i//3)*126
  R(x,y,333,112,col['panel'],8,stroke=col['line'])
  R(x+13,y+14,35,35,'#35435a',8);T(x+30,y+38,'▣',17,col['primary'],True,'middle')
  T(x+60,y+27,title,13,bold=True);T(x+60,y+46,kind,10,col['muted'])
  L(x+12,y+61,x+321,y+61)
  T(x+17,y+82,sub,11,col['muted']);T(x+265,y+99,'Manage →',11,col['primary'])
 T(345,792,'Sidebar = quick access · Content workspace = complete N-device control',11,col['muted'])
 finish('ST_Reborn_UI_Lab_Outputs_Preview')

radio();many()
