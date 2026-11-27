import subprocess,sys
base,macro,stability,target=sys.argv[1:]
def read(ref):
 data=subprocess.check_output(['git','ls-tree','-r','-z',ref]);out={}
 for entry in data.split(b'\0'):
  if not entry:continue
  meta,name=entry.split(b'\t',1);out[name]=meta
 return out
b,m,s,t=map(read,(base,macro,stability,target))
a={x for x in b.keys()|m.keys() if b.get(x)!=m.get(x)}
c={x for x in b.keys()|s.keys() if b.get(x)!=s.get(x)}
assert len(a)==100 and len(c)==70,(len(a),len(c))
expected={b'lib/types.ts':b'100644 blob 41c50f1fac242ac45ff94cc25f8cba10fab45f7d',b'scripts/test-vault-stability-360.cjs':b'100644 blob 068f74951b63e00c77dcbd86f8af36d2ab646086'}
assert a&c==expected.keys(),a&c
for name in b.keys()|m.keys()|s.keys()|t.keys():
 want=expected[name] if name in expected else s.get(name) if name in c else m.get(name)
 assert t.get(name)==want,('ZERO_LOST_CODE',name,t.get(name),want)
print('RECONCILIACAO_ARVORE_EXATA_PASS macro=100 stability=70 overlaps=2')
