"""Regenerate the self-contained JSON scenarios: python3 scripts/generate-fixtures.py"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'public/data'
OUT=ROOT/'scenarios'
OUT.mkdir(parents=True,exist_ok=True)

CATALOG={
 'sources':[
  {'id':'flux','name':'FluxFM','type':'radio','subtitle':'Sound of Berlin','genre':'Alternative','country':'Germany','bitrate':'320 kbit/s','color':'#f2cb38'},
  {'id':'1live','name':'1LIVE','type':'radio','subtitle':'Cologne','genre':'Pop','country':'Germany','bitrate':'320 kbit/s','color':'#67ac59'},
  {'id':'ndrinfo','name':'NDR Info','type':'radio','subtitle':'Hamburg','genre':'News','country':'Germany','bitrate':'128 kbit/s','color':'#3473b8'},
  {'id':'ffn','name':'ffn','type':'radio','subtitle':'Lower Saxony','genre':'Pop','country':'Germany','bitrate':'192 kbit/s','color':'#ba5361'},
  {'id':'sw','name':'Schwarzwaldradio','type':'radio','subtitle':'Regional','genre':'Oldies','country':'Germany','bitrate':'128 kbit/s','color':'#dd8460'},
  {'id':'dl','name':'Deutschlandfunk','type':'radio','subtitle':'News & talk','genre':'Information','country':'Germany','bitrate':'192 kbit/s','color':'#617996'},
  {'id':'ndr2','name':'NDR 2','type':'radio','subtitle':'Northern Germany','genre':'Pop','country':'Germany','bitrate':'128 kbit/s','color':'#3269b9'},
  {'id':'wdr5','name':'WDR 5','type':'radio','subtitle':'Culture','genre':'Culture','country':'Germany','bitrate':'128 kbit/s','color':'#688ba7'},
  {'id':'album1','name':'Evening Jazz','type':'library','kind':'queue','subtitle':'Music Server · 44 tracks','genre':'Jazz','country':'Local','bitrate':'FLAC','color':'#795c9f'},
  {'id':'album2','name':'Quiet Sunday','type':'library','kind':'folder','subtitle':'NAS · 18 tracks','genre':'Ambient','country':'Local','bitrate':'FLAC','color':'#3f8c9a'},
  {'id':'discover','name':'Discover Weekly','type':'spotify','subtitle':'Spotify playlist','genre':'Mixed','country':'Online','bitrate':'Spotify','color':'#198c56'},
  {'id':'focus','name':'Deep Focus','type':'spotify','subtitle':'Spotify playlist','genre':'Electronic','country':'Online','bitrate':'Spotify','color':'#336f65'},
 ],
 'servers':[{'id':'nas','name':'Living Room NAS','address':'192.168.0.20','folders':['Albums','Artists','Jazz','Playlists','Saved Queues']}, {'id':'plex','name':'Media Server','address':'192.168.0.22','folders':['Music Shares','Favorites','Internet Radio','Queues']}],
 'languages':['English','Deutsch','Français','Italiano','Español','Nederlands','Dansk','Svenska','Português','Polski','Suomi','Norsk','العربية']
}

# Explicit sample metadata supports the same filter dimensions as current STR.
for index,item in enumerate(CATALOG['sources']):
 if item['type']=='radio':item.update({'language':'German','codec':'AAC' if item['id']=='ffn' else 'MP3','lastCheckOk':True,'votes':1000-index*70,'clickCount':index*40+80,'hls':False})
CATALOG['sources'] += [
 {'id':'track-demo','name':'Morning Light · demo','type':'library','kind':'track','subtitle':'Living Room NAS · single track','genre':'Jazz','country':'Local','bitrate':'FLAC','color':'#795c9f'},
 {'id':'spotify-album-demo','name':'Sunday Sessions · demo','type':'spotify','kind':'album','subtitle':'Spotify album','genre':'Jazz','country':'Online','bitrate':'Spotify','color':'#198c56'},
 {'id':'native-demo','name':'Saved service station · demo','type':'native','kind':'station','service':'Native service','subtitle':'Source saved on the speaker','genre':'Mixed','country':'Online','bitrate':'Native','color':'#b98260'},

 {'id':'demo-fr','name':'Paris Jazz · demo','type':'radio','subtitle':'Paris','genre':'Jazz','country':'France','language':'French','bitrate':'192 kbit/s','codec':'MP3','lastCheckOk':True,'votes':220,'clickCount':500,'hls':False,'color':'#a775b6'},
 {'id':'demo-uk','name':'London Live · demo','type':'radio','subtitle':'London','genre':'News','country':'United Kingdom','language':'English','bitrate':'128 kbit/s','codec':'UNKNOWN','lastCheckOk':True,'votes':180,'clickCount':220,'hls':True,'color':'#3e85ba'},
 {'id':'demo-opus','name':'Open Wave · demo','type':'radio','subtitle':'Opus stream','genre':'Electronic','country':'Germany','language':'German','bitrate':'128 kbit/s','codec':'OPUS','lastCheckOk':True,'votes':120,'clickCount':80,'hls':False,'color':'#6ca28b'},
 {'id':'demo-offline','name':'Offline station · demo','type':'radio','subtitle':'Last check failed','genre':'Pop','country':'Germany','language':'German','bitrate':'320 kbit/s','codec':'MP3','lastCheckOk':False,'votes':60,'clickCount':40,'hls':False,'color':'#a77d6b'},
]

def device(i,name=None,status='online'):
 return {'id':f'd{i}','name':name or f'Speaker {i:02d}','brand':'Bose','model':'SoundTouch 10' if i%3 else 'SoundTouch 30','hardwareRevision':None,'agentName':'STR','agentVersion':None,
         'capabilities':{'radio':{'codecs':['MP3','AAC','AAC+','AACP','MPEG'],'hls':True},'sound':True,'network':True,'remote':True,'alarms':True,'buttonPresets':{'keyCount':6,'gestures':['single'] if i%4==0 else ['single','double']}},
         'doublePresets':[] if i%4==0 else ['album1','ndr2',None,'discover',None,None], 'ip':f'192.168.0.{100+i}','status':status,
         'firmware':'27.0.6' if i%4 else '26.1.4','firmwareLatest':'27.0.6','firmwareAvailable':i%4==0,'updateProgress':62 if status=='updating' else 0,
         'volume':24+(i%7),'bass':0,'startVolumeEnabled':False,'startVolume':20,'language':'English','network':'Home Network',
         'presets':['1live','flux','ffn','sw','dl','ndrinfo'] if i<=3 else ['flux','ndr2',None,'dl',None,None],
         'alarms':[],'buttonActions':[]}

def sample(ui='listen',n=7):
 return {
 'devices':[device(1,'Living Room L'),device(2,'Living Room R'),device(3,'Kitchen'),device(4,'Office'),device(5,'Terrace L'),device(6,'Terrace R'),device(7,'Bedroom')],
 'pairs':[{'id':'p1','name':'Living Room','memberIds':['d1','d2'],'persistent':True,'volume':24}],
 'groups':[{'id':'g1','name':'Downstairs','memberIds':['p1','d3'],'persistent':True,'volume':25}],
 'sessions':[{'id':'s1','targetId':'g1','sourceId':'flux','status':'playing','volume':25},{'id':'s2','targetId':'d4','sourceId':'ndrinfo','status':'playing','volume':28}],
 'favorites':['flux','ndrinfo','dl'], 'history':['flux','ndrinfo','1live','album1','dl'], 'spotifyConnected':False,
 'selectedOutputId':'g1','selectedSessionId':'s1','selectedSourceId':'flux','selectedDeviceId':'d1','activeView':ui,
 'settings':{'language':'English','appearance':'dark','autoUpdate':True,'telemetry':False,'searchCountry':'Germany','searchLanguage':'All','radioGenre':'All','radioOrder':'votes','radioMinBitrate':0,'radioOnlyWorking':True,'radioOnlyCompatible':True,'radioOutputId':None,'restoreSession':True},
 'ui':{'speakerVariant':'sidebar','density':'standard','sidebarLimit':6,'collapsed':{'listen':False,'outputs':False,'system':True},'radioFiltersPinned':False,'deviceTab':'overview','outputFilter':'all','radioTab':'discover','settingsTab':'general','libraryServer':'nas'},
 'setupCandidates':[{'id':'found1','name':'SoundTouch 10 (new)','brand':'Bose','model':'SoundTouch 10','firmware':'27.0.6','capabilities':device(1)['capabilities'],'ip':'192.168.0.220'}],
 }

scenarios={}
base=sample()
scenarios['home']=base

big=sample('outputs');big['devices']=[device(i, (['Living Room L','Living Room R','Kitchen','Office','Terrace L','Terrace R','Bedroom','Hallway','Guest room','Study','Dining Room','Workshop','Basement','Sauna','Garage','Front Desk','Lobby','Corridor','Conference A','Conference B','Studio','Meeting Room','Warehouse','Patio','Pool','Entrance','Music Room','Reading Room','Server Room','Attic'][i-1])) for i in range(1,31)]
big['pairs']=[{'id':f'p{i}','name':n,'memberIds':[f'd{2*i-1}',f'd{2*i}'],'persistent':True,'volume':25} for i,n in enumerate(['Living Room','Terrace','Bedroom','Guest Room'],1)]
big['groups']=[{'id':'g1','name':'Ground Floor','memberIds':['p1','d9','d11','d12'],'persistent':True,'volume':26}, {'id':'g2','name':'Upper Floor','memberIds':['p3','p4','d10'],'persistent':True,'volume':24}, {'id':'g3','name':'Office Wing','memberIds':['d16','d17','d19','d20'],'persistent':False,'volume':30}]
big['sessions']=[{'id':'s1','targetId':'g1','sourceId':'flux','status':'playing','volume':26},{'id':'s2','targetId':'g2','sourceId':'album1','status':'playing','volume':23},{'id':'s3','targetId':'g3','sourceId':'dl','status':'playing','volume':28},{'id':'s4','targetId':'d28','sourceId':'ndrinfo','status':'paused','volume':20}]
big['ui']['sidebarLimit']=6
scenarios['many']=big

multi=sample('outputs');multi['groups'].append({'id':'g2','name':'Terrace','memberIds':['d5','d6'],'persistent':False,'volume':22})
multi['devices']+=[device(8,'Guest Room'),device(9,'Workshop'),device(10,'Hallway')]
multi['sessions']=[{'id':'s1','targetId':'g1','sourceId':'flux','status':'playing','volume':25},{'id':'s2','targetId':'d4','sourceId':'ndrinfo','status':'playing','volume':20},{'id':'s3','targetId':'g2','sourceId':'album1','status':'playing','volume':34},{'id':'s4','targetId':'d7','sourceId':'discover','status':'paused','volume':18}]
scenarios['multistream']=multi

maint=sample('updates');maint['devices'][3]['status']='updating';maint['devices'][3]['updateProgress']=62;maint['devices'][3]['firmwareAvailable']=True
maint['devices'][4]['status']='offline';maint['devices'][5]['status']='needs_setup';maint['devices'][6]['status']='offline'
maint['sessions']=[maint['sessions'][0]]
scenarios['maintenance']=maint

fresh=sample('setup');fresh.update({'devices':[],'pairs':[],'groups':[],'sessions':[],'selectedOutputId':None,'selectedSessionId':None,'selectedDeviceId':None,'favorites':[],'history':[]})
fresh['setupCandidates']=[{'id':'found1','name':'SoundTouch 10','brand':'Bose','model':'SoundTouch 10','firmware':'27.0.6','capabilities':device(1)['capabilities'],'ip':'192.168.0.220'},{'id':'found2','name':'SoundTouch 30','brand':'Bose','model':'SoundTouch 30','firmware':'27.0.6','capabilities':device(1)['capabilities'],'ip':'192.168.0.221'}]
scenarios['first-run']=fresh

capabilities=sample('outputs')
buttonless=device(11,'Studio Display');buttonless.update({'brand':'Example Audio','model':'Network Display','agentName':None,'firmware':None,'firmwareLatest':None,'firmwareAvailable':False,'presets':[],'doublePresets':[], 'capabilities':{'radio':{'codecs':['MP3','AAC','OPUS','FLAC'],'hls':False},'sound':True,'network':True,'remote':False,'alarms':False}})
compact=device(12,'Desk Compact');compact.update({'brand':'Example Audio','model':'Two-key Speaker','agentName':None,'firmware':None,'firmwareLatest':None,'firmwareAvailable':False,'presets':['flux','dl'],'doublePresets':[], 'capabilities':{'sound':True,'network':False,'remote':False,'alarms':False,'buttonPresets':{'keyCount':2,'gestures':['single']}}})
capabilities.update({'devices':[device(1,'Living Room'),buttonless,compact],'pairs':[],'groups':[], 'sessions':[{'id':'s1','targetId':'d1','sourceId':'flux','status':'playing','volume':25},{'id':'s2','targetId':'d11','sourceId':'album1','status':'playing','volume':22}], 'selectedOutputId':'d1','selectedDeviceId':'d1'})
scenarios['capabilities']=capabilities

indexes=[
 {'id':'home','name':'Everyday use','description':'7 speakers, one stereo pair, an active group and two streams'},
 {'id':'many','name':'Problem of N · 30 speakers','description':'30 devices, multiple pairs and groups: sidebar scalability'},
 {'id':'multistream','name':'Several streams','description':'Four independent playback sessions on different outputs'},
 {'id':'maintenance','name':'Maintenance & errors','description':'Updating, offline, and unconfigured devices'},
 {'id':'capabilities','name':'Device capabilities','description':'Demo brands: two preset layers, no hardware keys, or two single-press keys'},
 {'id':'first-run','name':'First run','description':'No configured speakers; setup flow and empty states'},
]
(ROOT/'catalog.json').write_text(json.dumps(CATALOG,ensure_ascii=False,indent=2)+'\n')
(ROOT/'scenario-index.json').write_text(json.dumps(indexes,ensure_ascii=False,indent=2)+'\n')
for name,scenario in scenarios.items():
 (OUT/f'{name}.json').write_text(json.dumps(scenario,ensure_ascii=False,indent=2)+'\n')
(ROOT/'design-tokens.json').write_text(json.dumps({'accent':'#79b8ff','density':'standard','radius':12,'sidebarWidth':270,'fontSize':14,'appearance':'dark'},indent=2)+'\n')
print(f'Wrote {len(scenarios)} scenarios to {OUT}')
