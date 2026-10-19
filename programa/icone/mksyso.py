import struct,sys
sizes=[256,48,32,24,16]
pngs=[open(f'icon{n}.png','rb').read() for n in sizes]
def align(b,n=4): return b+b'\0'*((-len(b))%n)
# layout
n=len(pngs)
def rdir(entries): # entries: list of (id, offset, isdir)
    h=struct.pack('<IIHHHH',0,0,0,0,0,len(entries))
    for i,o,d in entries: h+=struct.pack('<II',i,(o|0x80000000) if d else o)
    return h
# offsets
root_sz=16+8*2
ricon_sz=16+8*n
lang_sz=16+8
rgrp_sz=16+8
off=0
root_off=0; off+=root_sz
ricon_off=off; off+=ricon_sz
ricon_lang=[]
for i in range(n): ricon_lang.append(off); off+=lang_sz
rgrp_off=off; off+=rgrp_sz
rgrp_lang=off; off+=lang_sz
de_off=off  # data entries: n icons + 1 group
off+=16*(n+1)
grp=struct.pack('<HHH',0,1,n)
for i,(s,p) in enumerate(zip(sizes,pngs)):
    grp+=struct.pack('<BBBBHHIH',0 if s>=256 else s,0 if s>=256 else s,0,0,1,32,len(p),i+1)
datas=[align(p) for p in pngs]+[align(grp)]
data_off=[]
cur=off
for d in datas: data_off.append(cur); cur+=len(d)
total=cur
sec=bytearray()
sec+=rdir([(3,ricon_off,True),(14,rgrp_off,True)])
sec+=rdir([(i+1,ricon_lang[i],True) for i in range(n)])
for i in range(n): sec+=rdir([(0x409,de_off+16*i,False)])
sec+=rdir([(1,rgrp_lang,True)])
sec+=rdir([(0x409,de_off+16*n,False)])
relocs=[]
raw_sizes=[len(p) for p in pngs]+[len(grp)]
for i in range(n+1):
    relocs.append(de_off+16*i)  # OffsetToData field
    sec+=struct.pack('<IIII',data_off[i],raw_sizes[i],0,0)
for d in datas: sec+=d
assert len(sec)==total,(len(sec),total)
# COFF
raw_ptr=20+40
reloc_ptr=raw_ptr+len(sec)
sym_ptr=reloc_ptr+10*len(relocs)
coff=struct.pack('<HHIIIHH',0x8664,1,0,sym_ptr,1,0,0)
coff+=struct.pack('<8sIIIIIIHHI',b'.rsrc\0\0\0',0,0,len(sec),raw_ptr,reloc_ptr,0,len(relocs),0,0xC0000040)
coff+=bytes(sec)
for r in relocs: coff+=struct.pack('<IIH',r,0,3)
coff+=struct.pack('<8sIhHBB',b'.rsrc\0\0\0',0,1,0,3,0)
coff+=struct.pack('<I',4)  # string table size
open(sys.argv[1],'wb').write(coff)
print(len(coff))
