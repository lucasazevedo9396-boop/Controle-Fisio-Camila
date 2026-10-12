import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('public');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url,'http://localhost').pathname));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    const content = await readFile(path);
    res.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}).end(content);
  } catch { res.writeHead(404).end('Não encontrado'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Aplicativo iniciado na porta ' + (process.env.PORT || 3000)));
