import { writeFile, mkdir, cp } from 'node:fs/promises';
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (Boolean(url) !== Boolean(key)) throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY juntos.');
if (url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Use a URL HTTPS do projeto Supabase, sem caminhos extras.');
  let publicKey = key.startsWith('sb_publishable_');
  if (!publicKey && key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
  }
  if (!publicKey) throw new Error('Use apenas uma chave publishable ou anon. Chaves secret/service_role são proibidas no navegador.');
}
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await writeFile('dist/config.js', `export const config = ${JSON.stringify({supabaseUrl:url.replace(/\/$/,''),supabaseKey:key})};\n`);
console.log(url ? 'Build com login e banco compartilhado configurados.' : 'Build em modo de demonstração, sem dados reais.');
