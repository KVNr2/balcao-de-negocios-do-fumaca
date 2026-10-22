// Mesma coisa que o .ps1, para quem tem Node 18+: node tools/baixar-mapas-avalon.mjs
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url"; import path from "node:path";
const base = process.argv[2] || "https://www.albionmaps.com.br";
const lista = process.argv[3] || "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/data/avalon.json";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "imagens", "avalon");
await mkdir(out, { recursive: true });
const idxFile = path.join(out, "index.json"); let idx = {}; try { idx = JSON.parse(await readFile(idxFile, "utf8")); } catch {}
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r; };
const mapas = await (await get(lista)).json(); console.log(mapas.length + " mapas na lista.");
let n = 0; const fail = [];
for (const m of mapas) { n++; const slug = m.n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-");
  if (idx[slug]) { try { await access(path.join(out, idx[slug])); continue; } catch {} }
  try { const file = `${slug}.webp`; await writeFile(path.join(out, file), Buffer.from(await (await get(`${base}/mapsImg/${encodeURIComponent(m.n)}.webp?v=99999`)).arrayBuffer())); idx[slug] = file; console.log(`[${n}/${mapas.length}] ${m.n}`); }
  catch (e) { fail.push(m.n); console.log(`[${n}/${mapas.length}] FALHOU ${m.n}: ${e.message}`); }
  if (n % 25 === 0) await writeFile(idxFile, JSON.stringify(idx)); await new Promise(r => setTimeout(r, 300)); }
await writeFile(idxFile, JSON.stringify(idx)); console.log(`Pronto: ${Object.keys(idx).length} imagens em ${out}`); if (fail.length) console.log("Sem imagem: " + fail.join(", "));
