// Mesma coisa que o .ps1, para quem tem Node 18+: node tools/baixar-mapas-avalon.mjs [site]
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url"; import path from "node:path";
const base = process.argv[2] || "https://www.albionmaps.com.br";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "imagens", "avalon");
await mkdir(out, { recursive: true });
const idxFile = path.join(out, "index.json"); let idx = {}; try { idx = JSON.parse(await readFile(idxFile, "utf8")); } catch {}
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r; };
const list = await (await get(`${base}/maps?lang=pt`)).text();
const links = [...new Set([...list.matchAll(/\/maps\/(\d+-[A-Za-z0-9\-]+)/g)].map(m => m[1]))];
console.log(links.length + " mapas encontrados.");
let n = 0; const fail = [];
for (const l of links) { n++; const slug = l.replace(/^\d+-/, "").toLowerCase();
  if (idx[slug]) { try { await access(path.join(out, idx[slug])); continue; } catch {} }
  try { const page = await (await get(`${base}/maps/${l}?lang=pt`)).text(); const m = /\/mapsImg\/([^"'\s)?]+\.(webp|png|jpe?g))/.exec(page); if (!m) throw new Error("sem imagem na página");
    const file = `${slug}.${m[2]}`; await writeFile(path.join(out, file), Buffer.from(await (await get(`${base}/mapsImg/${m[1]}`)).arrayBuffer())); idx[slug] = file; console.log(`[${n}/${links.length}] ${slug}`); }
  catch (e) { fail.push(slug); console.log(`[${n}/${links.length}] FALHOU ${slug}: ${e.message}`); }
  if (n % 25 === 0) await writeFile(idxFile, JSON.stringify(idx)); await new Promise(r => setTimeout(r, 400)); }
await writeFile(idxFile, JSON.stringify(idx)); console.log(`Pronto: ${Object.keys(idx).length} imagens em ${out}`); if (fail.length) console.log("Falharam: " + fail.join(", "));
