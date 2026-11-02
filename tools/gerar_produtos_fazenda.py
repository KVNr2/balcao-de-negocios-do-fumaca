"""Acrescenta a data/cook.json a chave "f": produtos de fazenda feitos de um só ingrediente
(pão, farinha, manteiga, álcool e carne do açougue), para a opção "Faço" e para a carne criada na ilha.
f[id] = [ingrediente, quantidade, quanto sai]. Ex.: T6_MEAT = [T6_FARM_SHEEP_GROWN, 1, 18] (um carneiro adulto dá 18 de carne).
Uso: python tools/gerar_produtos_fazenda.py <items.json do ao-bin-dumps>"""
import json,sys,os
A=sys.argv[1]; P=os.path.join(os.path.dirname(__file__),'..','data','cook.json')
items=json.load(open(A))['items']; cook=json.load(open(P)); f={}
usados={i for r in cook['r'].values() for i,_ in r[5]}
for x in items['simpleitem']:
    if x.get('@shopsubcategory1')!='farmingproducts' or not x.get('craftingrequirements'): continue
    cr=x['craftingrequirements']; cr=cr[0] if isinstance(cr,list) else cr; res=cr.get('craftresource')
    if isinstance(res,list) or not res: continue
    f[x['@uniquename']]=[res['@uniquename'],int(res['@count']),int(cr.get('@amountcrafted',1))]
cook['f']=f
json.dump(cook,open(P,'w'),ensure_ascii=False,separators=(',',':'))
print(len(f),'produtos;', 'usados nas receitas:',sorted(i for i in f if i in usados))
