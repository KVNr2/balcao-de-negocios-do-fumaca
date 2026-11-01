"""Acrescenta a data/cook.json a chave "e": comidas e poções encantadas (.1 a .3).
Uso: python tools/gerar_cozinha_encantada.py <items.json do ao-bin-dumps>
e[id] = [quantidade do encantador, prefixo do encantador, foco .1, foco .2, foco .3]
A receita encantada é a da .0 mais <quantidade> de T1_FISHSAUCE_LEVELn (comida) ou T1_ALCHEMY_EXTRACT_LEVELn (poção)."""
import json,sys,os
A=sys.argv[1]; P=os.path.join(os.path.dirname(__file__),'..','data','cook.json')
items=json.load(open(A))['items']; cons={it['@uniquename']:it for it in items['consumableitem']}
L=lambda x: x if isinstance(x,list) else ([x] if x else [])
cook=json.load(open(P)); e={}; avisos=[]
for bid,r in cook['r'].items():
    it=cons.get(bid)
    if not it or not it.get('enchantments'): continue
    base=sorted((c['@uniquename'],int(c['@count'])) for c in L(it['craftingrequirements']['craftresource']))
    linha=None; focos=[]
    for en in L(it['enchantments']['enchantment']):
        lv=int(en['@enchantmentlevel']);
        if lv>3: continue
        cr=en['craftingrequirements']; res=[(c['@uniquename'],int(c['@count'])) for c in L(cr['craftresource'])]
        extra=[x for x in res if x not in base]; resto=sorted(x for x in res if x in base)
        if resto!=base or len(extra)!=1 or not extra[0][0].endswith('_LEVEL%d'%lv) or int(cr.get('@amountcrafted',1))!=r[2]: avisos.append(bid); linha=None; break
        pre=extra[0][0].rsplit('_LEVEL',1)[0]
        if linha and (linha[0]!=extra[0][1] or linha[1]!=pre): avisos.append(bid); linha=None; break
        linha=[extra[0][1],pre]; focos.append(int(cr['@craftingfocus']))
    if linha and len(focos)==3: e[bid]=linha+focos
cook['e']=e
for lv,(s,x) in enumerate([("Molho de Peixe Básico","Extratos Arcanos Básicos"),("Molho de Peixe Extravagante","Extratos Arcanos Refinados"),("Molho de Peixe Especial","Extratos Arcanos Puros")],1):
    cook['n']['T1_FISHSAUCE_LEVEL%d'%lv]=s; cook['n']['T1_ALCHEMY_EXTRACT_LEVEL%d'%lv]=x
cook['n'].setdefault('T1_FISHCHOPS','Peixe Picado'); cook['n'].setdefault('T1_SEAWEED','Alga'); cook['n'].setdefault('T1_ALCHEMY_COMMON','Restos de Animais Raros')
json.dump(cook,open(P,'w'),ensure_ascii=False,separators=(',',':'))
print(len(e),'com encantamento; fora (receita diferente do esperado):',avisos)
