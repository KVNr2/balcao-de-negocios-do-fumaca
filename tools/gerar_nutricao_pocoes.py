"""Preenche a nutrição das poções em data/cook.json (r[id][4]), usada na taxa da estação.
O jogo não traz @nutrition nas poções. Estimativa: soma da nutrição dos ingredientes da receita ÷ poções por fornada
× 1,09 do T3 em diante (nas comidas comuns a soma fica 8% a 9% abaixo da nutrição real do T3 para cima, e igual no T1 e T2).
Ingrediente sem nutrição no jogo (ingrediente raro de alquimia) entra como zero.
Uso: python tools/gerar_nutricao_pocoes.py <items.json do ao-bin-dumps>"""
import json,sys,os
A=sys.argv[1]; P=os.path.join(os.path.dirname(__file__),'..','data','cook.json')
items=json.load(open(A))['items']; todos={}
for v in items.values():
    for x in (v if isinstance(v,list) else []):
        if isinstance(x,dict) and '@uniquename' in x: todos[x['@uniquename']]=x
cook=json.load(open(P)); n=0
for bid,r in cook['r'].items():
    if r[1]!='p': continue
    s=sum(int(todos.get(i,{}).get('@nutrition',0))*c for i,c in r[5])
    if s>0: r[4]=round(s/r[2]*(1.09 if int(bid[1])>=3 else 1)); n+=1
json.dump(cook,open(P,'w'),ensure_ascii=False,separators=(',',':'))
print(n,'poções com nutrição estimada')
