import json, os, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2])) if os.path.exists(sys.argv[2]) else {}
for k, v in a.items():
    if k not in b or v[1] > b[k][1]: b[k] = v
json.dump(b, open(sys.argv[2], "w"), separators=(",", ":"))
