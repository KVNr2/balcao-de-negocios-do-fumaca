"""Gera data/pesca.json a partir de um clone do ao-bin-dumps (loot.json, items.json, formatted/world.json,
cluster/*_WRL_* e os templates que eles usam). Uso: python tools/gerar_pesca.py <pasta do ao-bin-dumps>
Passo 1: o que sai por fisgada em cada tier, bioma e água (tabelas de sorteio). Passo 2: pontos de pesca, mar e cardumes de cada mapa."""
import sys,os
DUMP=os.path.abspath(sys.argv[1])+"/"; REPO=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/"
TMP=os.path.join(REPO,"tools","_pesca_tmp")+"/"; os.makedirs(TMP,exist_ok=True)
# ---- passo 1 ----
import json
A=DUMP
L=json.load(open(A+'loot.json'))['LootDefinition']['Lootlist']
by={x['@name']:x for x in L}
def lst(x): return x if isinstance(x,list) else ([] if x is None else [x])
def node(n,mult,acc,depth=0):
    """n: dict with Item / LootListReference / OR children. All children (non-OR) are given; OR picks one by weight."""
    for it in lst(n.get('Item')):
        ch=float(it.get('@chance',1)); am=float(it.get('@amount',1))
        acc[it['@type']]=acc.get(it['@type'],0)+mult*ch*am
    for r in lst(n.get('LootListReference')):
        node(by[r['@name']],mult,acc,depth+1)
    for o in lst(n.get('OR')):
        orpick(o,mult,acc,depth+1)
def orpick(o,mult,acc,depth):
    ch=[]
    for it in lst(o.get('Item')): ch.append(('i',it,float(it.get('@weight',1))))
    for r in lst(o.get('LootListReference')): ch.append(('r',r,float(r.get('@weight',1))))
    for oo in lst(o.get('OR')): ch.append(('o',oo,float(oo.get('@weight',1))))
    tot=sum(w for *_,w in ch) or 1
    for k,x,w in ch:
        m=mult*w/tot
        if k=='i':
            acc[x['@type']]=acc.get(x['@type'],0)+m*float(x.get('@chance',1))*float(x.get('@amount',1))
        elif k=='r': node(by[x['@name']],m,acc)
        else:
            # nested OR element: its own children form an OR again
            orpick(x,m,acc,depth+1)
out={}
BI=['FOREST','STEPPE','MOUNTAIN','HIGHLANDS','SWAMP','AVALON','DRAGON_AREA']
for t in range(1,9):
    for b in BI:
        n=f'T{t}_FISHING_ZONE_FRESHWATER_BASE_{b}_LOOT'
        if n in by:
            acc={}; node(by[n],1,acc); out[f'F{b}{t}']=acc
    n=f'T{t}_FISHING_ZONE_OCEAN_BASE_ALL_LOOT'
    if n in by: acc={}; node(by[n],1,acc); out[f'O{t}']=acc
# keep only fish + seaweed, rest grouped
res={}
for k,acc in out.items():
    keep={i:round(v,5) for i,v in acc.items() if ('FISH' in i or i=='T1_SEAWEED') and v>1e-5}
    other=sum(v for i,v in acc.items() if not ('FISH' in i or i=='T1_SEAWEED'))
    res[k]={'f':keep,'o':round(other,5)}
json.dump(res,open(TMP+'loot-pesca.json','w'),separators=(',',':'))
# ---- passo 2: lista dos templates usados pelos mapas ----
import glob,re
refs=set()
for f in glob.glob(A+'cluster/*_WRL_*.cluster.xml'): refs|=set(re.findall(r'ref="([^"]+)"',open(f).read()))
O=['GREEN','RED','DEAD','NONE']; by={}
for p in glob.glob(A+'templates/*/*.template.xml'):
    rel=os.path.relpath(p,A); by.setdefault(os.path.basename(p).replace('.template.xml',''),[]).append(rel)
pick=[sorted(by[r],key=lambda p:O.index(p.split(os.sep)[1]) if p.split(os.sep)[1] in O else 9)[0] for r in refs if r in by]
open(TMP+'tpick.txt','w').write('\n'.join(pick))
import collections
S=TMP; A=DUMP; R=REPO
# templates -> counts
tc={}
for p in open(S+'tpick.txt').read().split():
    n=p.split('/')[-1].replace('.template.xml','')
    t=open(A+p,errors='ignore').read()
    c=collections.Counter(re.findall(r'name="FishingZone_([A-Z_]+)"',t))
    tc[n]=c
zn={z['i']:z for z in json.load(open(R+'data/zones.json'))}
W={w.get('Index'):w.get('UniqueName') for w in json.load(open(A+'formatted/world.json'))}
rows=[]; cmp=[]
for f in glob.glob(A+'cluster/*_WRL_*.cluster.xml'):
    base=os.path.basename(f).replace('.cluster.xml','')
    m=re.match(r'(\d+)_WRL_([A-Z]+)_[A-Z]+_T(\d)_[A-Z]+_(ROY|OUT)(?:_Q(\d))?',base)
    if not m: continue
    i,b,t,r,q=m.group(1),m.group(2),int(m.group(3)),m.group(4),m.group(5)
    if b not in ('FR','SW','MN','HL','ST') or i not in W: continue
    x=open(f).read(); C=collections.Counter()
    for ref in re.findall(r'ref="([^"]+)"',x): C+=tc.get(ref,collections.Counter())
    fw=C['FRESHWATER_SPOT_FISH']; oc=C['OCEAN_BASE_SQUARE']; sw=C['FRESHWATER_SPOT_SWARM']+C['FRESHWATER_SPOT_SMALL_SWARM']+C['OCEAN_SPOT_SWARM']
    if not (fw or oc or sw): continue
    z=zn.get(i,{}); name=W.get(i) or z.get('n') or i
    rows.append([i,name,b,t,r,int(q) if q else None,fw,C['OCEAN_SPOT_SWARM'] if oc else 0,sw])
    cmp.append((z.get('w'),fw,oc,sw))
# avalon roads: tiers 4,6,8
for t in (4,6,8): rows.append(['AVA'+str(t),f'Estradas de Avalon T{t}','AV',t,'AVA',None,1,0,0])
rows.sort(key=lambda r:(r[3],r[1]))
loot=json.load(open(S+'loot-pesca.json'))
# chops + names
items=json.load(open(A+'items.json'))['items']; ch={}
for g in items.values():
    for it in (g if isinstance(g,list) else []):
        if isinstance(it,dict) and it.get('@uniquename')=='T1_FISHCHOPS':
            for rq in it['craftingrequirements']: ch[rq['craftresource']['@uniquename']]=int(rq['@amountcrafted'])
cat=json.load(open(R+'data/catalog.json'))['i']; nm={}
ids=set(ch)|{i for k in loot for i in loot[k]['f']}|{'T1_FISHCHOPS','T1_SEAWEED'}
for r in cat:
    if r[0] in ids: nm[r[0]]=[r[5],r[6]]
miss=[i for i in ids if i not in nm]
print('zones',len(rows),'missing names',miss)
json.dump({'n':nm,'ch':ch,'l':loot,'z':rows},open(R+'data/pesca.json','w'),ensure_ascii=False,separators=(',',':'))
print(os.path.getsize(R+'data/pesca.json'))
print(collections.Counter((a is not None and a>0, fw>0) for a,fw,oc,sw in cmp))
print(sum(1 for r in rows if r[7]>0),'with ocean swarm;', sum(1 for *_,oc,sw in cmp if oc),'with ocean base')
print(rows[:3])
