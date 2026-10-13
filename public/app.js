import { totals, parseMoney } from './finance.js';
import { config } from './config.js';
import { DemoStore, CloudStore } from './store.js';
import { encryptBackup, decryptBackup, validateBackup } from './backup.js';
import { parseScore, progressPoints } from './progress.js';
const store=config.supabaseUrl && config.supabaseKey ? new CloudStore(config) : new DemoStore();
let state={patients:[],sessions:[],progress:[]},tab='overview',treatment='all',selectedPatient=null,financeMonth=null;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
const today=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const date=s=>new Intl.DateTimeFormat('pt-BR').format(new Date(s+'T12:00:00'));
const patient=id=>state.patients.find(p=>p.id===id);
const kind=s=>s.treatment||'physiotherapy';
const kindName=s=>kind(s)==='pilates'?'Pilates':'Fisioterapia';
const active=()=>state.sessions.filter(s=>!s.deletedAt);
const filtered=()=>active().filter(s=>treatment==='all'||kind(s)===treatment);
const empty=(title,text)=>`<div class="empty"><strong>${title}</strong>${text}</div>`;
async function refresh(){const email=store.email;let next;try{next=await store.load();}catch(err){if(store.cloud&&!store.auth)locked(err.message);throw err;}if(store.cloud&&(!store.auth||email!==store.email))return;state=next;render();$('#sync-status').textContent=store.cloud?'Atualizado às '+new Date().toLocaleTimeString('pt-BR'):'Dados salvos apenas neste navegador';}
function rows(items){return items.map(s=>`<div class="row"><div><strong>${esc(patient(s.patientId)?.name||'Paciente')}</strong><small>${date(s.date)} · ${kindName(s)}</small>${s.description?`<small>${esc(s.description)}</small>`:''}</div><div class="row-actions"><span class="amount">${money(s.value)}</span><span class="tag ${s.paid?'':'pending'}">${s.paid?'Pago':'Pendente'}</span>${store.role==='therapist'?`<button data-evolution="${s.id}">Evolução</button>`:''}<button data-kind="${s.id}">Alterar modalidade</button><button data-payment="${s.id}">${s.paid?'Desmarcar pagamento':'Registrar pagamento'}</button><button class="danger-text" data-delete="${s.id}">Excluir</button></div></div>`).join('');}
function options(value,all=false){return (all?[['all','Todos os atendimentos']]:[]).concat([['physiotherapy','Fisioterapia'],['pilates','Pilates']]).map(([v,n])=>`<option value="${v}" ${v===value?'selected':''}>${n}</option>`).join('');}
function render(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const list=filtered(),t=totals(state.sessions,today().slice(0,7),treatment),add='<button class="primary" data-new-session>Novo atendimento</button>';
 if(tab==='overview')$('#content').innerHTML=`<div class="section-head"><h2>Visão do mês</h2>${add}</div><div class="cards"><div class="card accent"><small>Recebido · atendimentos do mês</small><strong>${money(t.received)}</strong></div><div class="card"><small>A receber · atendimentos do mês</small><strong>${money(t.pending)}</strong></div><div class="card"><small>Atendimentos no mês</small><strong>${t.count}</strong><p>${state.patients.length} pacientes cadastrados</p></div></div><div class="panel"><h2>Últimos atendimentos</h2>${list.length?rows([...list].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)):empty('Nenhum atendimento nesta modalidade','Cadastre um paciente e registre um atendimento.')}</div>`;
 if(tab==='sessions')$('#content').innerHTML=`<div class="section-head"><h2>Atendimentos</h2>${add}</div><div class="panel">${rows([...list].sort((a,b)=>b.date.localeCompare(a.date)))||empty('Nenhum atendimento','Registre a sessão, a modalidade, o valor e a evolução.')}</div>`;
 if(tab==='finance'){$('#content').innerHTML=`<div class="section-head"><h2>Controle financeiro</h2>${add}</div><label>Mês do atendimento<input type="month" id="month" value="${financeMonth||today().slice(0,7)}"></label><div id="finance-details"></div>`;renderFinance($('#month').value);$('#month').onchange=e=>{financeMonth=e.target.value;renderFinance(financeMonth);};}
 if(tab==='patients'){
   if(selectedPatient){renderProfile(selectedPatient);return;}
   $('#content').innerHTML='<div class="section-head"><h2>Seus pacientes</h2><button class="primary" data-new-patient>Novo paciente</button></div><input class="search" id="search" type="search" placeholder="Buscar pelo nome" aria-label="Buscar paciente"><div class="panel" id="patient-list"></div>';
   renderPatients('');$('#search').oninput=e=>renderPatients(e.target.value);
 }
 if(tab!=='patients'){$('#content').insertAdjacentHTML('afterbegin',`<label class="modality-filter">Modalidade<select id="treatment-filter">${options(treatment,true)}</select></label>`);$('#treatment-filter').onchange=e=>{treatment=e.target.value;render();};}
}
function renderPatients(query){const list=state.patients.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));$('#patient-list').innerHTML=list.map(p=>`<div class="row"><div><strong>${esc(p.name)}</strong><small>${esc(p.phone||'Telefone não informado')}</small></div><button data-history="${p.id}">Ver histórico e evolução</button></div>`).join('')||empty('Nenhum paciente encontrado','Use “Novo paciente” para começar.');}
function renderFinance(month){const t=totals(state.sessions,month,treatment);$('#finance-details').innerHTML=`<div class="cards"><div class="card accent"><small>Recebido</small><strong>${money(t.received)}</strong></div><div class="card"><small>Pendente</small><strong>${money(t.pending)}</strong></div><div class="card"><small>Total dos atendimentos</small><strong>${money(t.received+t.pending)}</strong></div></div><div class="panel">${rows(filtered().filter(s=>s.date.startsWith(month)))||empty('Nenhum atendimento neste mês','Valores agrupados pelo mês da sessão. Atendimentos excluídos não entram nos totais.')}</div>`;}
function chart(id){
 const points=progressPoints(id,state).slice(-12);if(!points.length)return empty('Sem notas registradas','Registre uma nota de 0 a 10 para iniciar o gráfico.');
 const x=i=>points.length===1?300:50+i*500/(points.length-1),y=n=>220-n*18;
 return `<p>Condição funcional percebida: 0 = pior condição; 10 = melhor condição. Use o mesmo critério em todos os registros. Não representa uma avaliação clínica automática.</p><svg class="progress-chart" viewBox="0 0 600 265" role="img" aria-label="Gráfico de evolução de zero a dez, últimos ${points.length} registros em ordem cronológica">${[0,2,4,6,8,10].map(n=>`<line x1="45" y1="${y(n)}" x2="565" y2="${y(n)}" stroke="#dce5dd"/><text x="12" y="${y(n)+5}">${n}</text>`).join('')}<polyline points="${points.map((p,i)=>`${x(i)},${y(p.score)}`).join(' ')}" fill="none" stroke="#16685b" stroke-width="3"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.score)}" r="5" fill="#16685b"><title>${esc(date(p.date))}: ${p.score}/10</title></circle>`).join('')}<text x="50" y="253">${date(points[0].date)}</text><text x="550" y="253" text-anchor="end">${date(points.at(-1).date)}</text></svg><p>Últimos ${points.length} registros, em ordem cronológica.</p><div class="score-list">${points.map(p=>`<span>${date(p.date)} · ${p.score}/10 · ${p.source}</span>`).join('')}</div>`;
}
function renderProfile(id){
 const p=patient(id);if(!p){selectedPatient=null;render();return;}
 const records=(state.progress||[]).filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
 const sessions=active().filter(s=>s.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
 $('#content').innerHTML=`<button data-back-patients>← Voltar aos pacientes</button><div class="section-head"><div><h2>${esc(p.name)}</h2><p>${esc(p.phone||'Telefone não informado')}</p></div>${store.role==='therapist'?`<button class="primary" data-new-progress="${id}">Registrar evolução</button>`:''}</div>${store.role==='therapist'?`<div class="panel"><h2>Gráfico de evolução · 0 a 10</h2>${chart(id)}</div><div class="panel"><h2>Evolução do paciente</h2>${records.map(r=>`<div class="detail"><strong>${date(r.date)}${r.score!==null&&r.score!==undefined?` · ${r.score}/10`:''}</strong><pre>${esc(r.notes)}</pre></div>`).join('')||empty('Nenhuma evolução no cadastro','Use “Registrar evolução” para iniciar o acompanhamento.')}</div>`:''}<div class="panel"><h2>Histórico de atendimentos</h2>${sessions.map(s=>`<div class="detail"><strong>${date(s.date)} · ${kindName(s)} · ${money(s.value)} · ${s.paid?'Pago':'Pendente'}</strong>${s.evolutionScore!==null&&s.evolutionScore!==undefined?`<p>Condição funcional: ${s.evolutionScore}/10</p>`:''}${evolutionFields.map(([k,label])=>s.evolution?.[k]?`<p><strong>${label}</strong></p><pre>${esc(s.evolution[k])}</pre>`:'').join('')||'<p>Evolução ainda não preenchida.</p>'}</div>`).join('')||empty('Sem atendimentos','O acompanhamento no cadastro pode começar antes do primeiro atendimento.')}</div>`;
}
function open(title,fields,submit){$('#form-title').textContent=title;$('#fields').innerHTML=fields;$('#error').textContent='';$('#form button[type=submit]').hidden=!submit;$('#form button[type=submit]').textContent='Salvar';$('#form').onsubmit=async e=>{e.preventDefault();const b=$('#form button[type=submit]');b.disabled=true;try{await submit(new FormData(e.target));$('#modal').close();await refresh();}catch(err){$('#error').textContent=err.message;$('#sync-status').textContent=err.message;}finally{b.disabled=false;}};$('#modal').showModal();}
const field=(label,name,value='',type='text',required=false)=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></label>`;
const scoreField=value=>`<label>Nota da condição funcional (0 a 10, opcional)<input name="score" type="number" min="0" max="10" step="0.1" inputmode="decimal" value="${value??''}"></label><p>0 = pior condição; 10 = melhor condição. Deixe vazio se não houver avaliação.</p>`;
const progressFields=()=>field('Data da evolução','date',today(),'date',true)+'<label>Evolução do paciente<textarea name="notes" maxlength="10000" placeholder="Queixa, avaliação, resposta ao tratamento e orientações"></textarea></label>'+scoreField(null);
function progressFrom(f){const score=parseScore(f.get('score')),notes=f.get('notes').trim();if(!notes&&score===null)return null;return {id:crypto.randomUUID(),date:f.get('date'),notes,score};}
function newPatient(){open('Novo paciente',field('Nome completo','name','','text',true)+field('Telefone (opcional)','phone','','tel')+(store.role==='therapist'?'<h3>Evolução inicial (opcional)</h3>'+progressFields():''),async f=>{const name=f.get('name').trim();if(!name)throw new Error('Informe o nome do paciente.');await store.addPatient({id:crypto.randomUUID(),name,phone:f.get('phone').trim()},store.role==='therapist'?progressFrom(f):null);});}
function newProgress(id){open(`Evolução · ${patient(id).name}`,progressFields(),async f=>{const p=progressFrom(f);if(!p)throw new Error('Preencha a evolução ou informe uma nota.');await store.addProgress({...p,patientId:id});});}
function newSession(){if(!state.patients.length){newPatient();return;}open('Novo atendimento',`<label>Paciente<select name="patientId" required>${state.patients.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Modalidade<select name="treatment">${options(treatment==='all'?'physiotherapy':treatment)}</select></label>`+field('Data do atendimento','date',today(),'date',true)+field('Valor (R$)','value','','text',true)+field('Descrição (opcional)','description')+'<label>Pagamento<select name="paid"><option value="no">Pendente</option><option value="yes">Já pago</option></select></label>',async f=>{await store.addSession({id:crypto.randomUUID(),patientId:f.get('patientId'),treatment:f.get('treatment'),date:f.get('date'),value:parseMoney(f.get('value')),description:f.get('description').trim(),paid:f.get('paid')==='yes',evolution:{}});});$('#fields input[name=value]').setAttribute('inputmode','decimal');}
const evolutionFields=[['complaint','Queixa e relato do paciente'],['assessment','Avaliação e achados'],['procedures','Procedimentos e exercícios realizados'],['response','Resposta ao tratamento'],['plan','Plano e orientações para a próxima sessão']];
function evolution(id){const s=state.sessions.find(s=>s.id===id);open(`Evolução · ${patient(s.patientId)?.name}`,`<p>${date(s.date)} · ${kindName(s)} · ${money(s.value)}</p>`+evolutionFields.map(([name,label])=>`<label>${label}<textarea name="${name}" maxlength="10000">${esc(s.evolution?.[name]||'')}</textarea></label>`).join('')+scoreField(s.evolutionScore),async f=>{await store.evolution(s.id,Object.fromEntries(evolutionFields.map(([name])=>[name,f.get(name).trim()])),s.evolutionVersion,parseScore(f.get('score')));});}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){tab=b.dataset.tab;selectedPatient=null;render();}
 if(b.hasAttribute('data-new-patient'))newPatient();if(b.hasAttribute('data-new-session'))newSession();if(b.dataset.evolution)evolution(b.dataset.evolution);
 if(b.dataset.history){tab='patients';selectedPatient=b.dataset.history;render();}
 if(b.hasAttribute('data-back-patients')){selectedPatient=null;render();}
 if(b.dataset.newProgress)newProgress(b.dataset.newProgress);
 if(b.dataset.kind){const s=state.sessions.find(x=>x.id===b.dataset.kind);open('Alterar modalidade',`<p>${esc(patient(s.patientId)?.name)} · ${date(s.date)}</p><label>Modalidade<select name="treatment">${options(kind(s))}</select></label>`,async f=>store.treatment(s.id,f.get('treatment'),s.version));}
 if(b.dataset.delete){const s=state.sessions.find(x=>x.id===b.dataset.delete);open('Excluir atendimento',`<p>Excluir o atendimento de <strong>${esc(patient(s.patientId)?.name)}</strong>, em ${date(s.date)}, de ${money(s.value)} (${s.paid?'pago':'pendente'})?</p><p>Ele sairá dos atendimentos, do gráfico e dos totais financeiros. As informações serão preservadas no banco, mas não há botão para desfazer nesta versão.</p>`,async()=>store.removeSession(s.id,s.version));$('#form button[type=submit]').textContent='Confirmar exclusão';}
 if(b.dataset.payment){const s=state.sessions.find(x=>x.id===b.dataset.payment);b.disabled=true;try{await store.payment(s.id,!s.paid,s.version);await refresh();}catch(err){alert(err.message);}finally{b.disabled=false;}}
});
$('#close').onclick=()=>$('#modal').close();
$('#clear').onclick=async()=>{if(store.cloud)return;if(confirm('Apagar os dados de demonstração deste navegador?')){try{store.storage.removeItem(store.key);await refresh();}catch{alert('Não foi possível apagar os dados.');}}};

function locked(message='') {
  state={patients:[],sessions:[],progress:[]};selectedPatient=null;$('#content').replaceChildren();$('#fields').replaceChildren();$('#modal').close();
  $('#workspace').hidden=true;$('#auth-panel').hidden=false;$('#login-form').hidden=false;$('#password-form').hidden=true;$('#auth-error').textContent=message;
  $('#login-form').reset();$('#password-form').reset();$('.badge').textContent='Acesso protegido';
}
async function unlocked(){
  await refresh();if(!store.auth)return;
  $('#workspace').hidden=false;$('#auth-panel').hidden=true;$('#logout').hidden=false;$('#clear').hidden=true;$('#restore').hidden=store.role!=='therapist';
  $('#account-name').textContent=store.email;$('.badge').textContent='Consultório compartilhado';
  $('#mode-note').textContent='Vocês acessam os mesmos registros com contas individuais. Atualize para ver alterações; a tela também atualiza a cada 30 segundos quando não há formulário aberto.';
  lastActivity=Date.now();
}
let lastActivity=Date.now();
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>lastActivity=Date.now());
$('#logout').onclick=async()=>{const task=store.logout();store.auth=null;locked();try{await task;}catch{};};
$('#login-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('[type=submit]');b.disabled=true;$('#auth-error').textContent='';try{await store.login(f.get('email').trim(),f.get('password'));e.target.reset();await unlocked();}catch(err){locked(err.message);}finally{b.disabled=false;}};
$('#recover').onclick=async()=>{const email=$('#login-form input[name=email]').value.trim();if(!email){$('#auth-error').textContent='Informe seu email para recuperar a senha.';return;}$('#recover').disabled=true;try{await store.recover(email);$('#auth-error').textContent='Se a conta estiver cadastrada e o envio de email estiver configurado, você receberá um link de recuperação.';}catch(err){$('#auth-error').textContent=err.message;}finally{$('#recover').disabled=false;}};
$('#password-form').onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get('password'),b=e.target.querySelector('button');b.disabled=true;try{if(password.length<12)throw new Error('Use pelo menos 12 caracteres.');await store.changePassword(password);e.target.reset();await unlocked();}catch(err){$('#auth-error').textContent=err.message;}finally{b.disabled=false;}};
$('#refresh').onclick=async()=>{const b=$('#refresh');b.disabled=true;try{await refresh();}catch(err){$('#sync-status').textContent=err.message;}finally{b.disabled=false;}};
$('#backup').onclick=()=>open('Backup protegido', '<p>Guarde o arquivo e sua senha em locais seguros. Sem a senha, não será possível recuperar o arquivo. Este backup é manual.</p>'+field('Senha do backup (mínimo 12 caracteres)','password','','password',true)+field('Repita a senha','confirmation','','password',true),async f=>{
  if(f.get('password')!==f.get('confirmation'))throw new Error('As senhas não coincidem.');
  const payload=store.cloud?await store.export():{format:'camila-data-v1',clinicId:null,exportedAt:new Date().toISOString(),...await store.load()};
  validateBackup(payload);const encrypted=await encryptBackup(payload,f.get('password'));
  const blob=new Blob([JSON.stringify(encrypted)],{type:'application/json'});if(blob.size>10*1024*1024)throw new Error('Este backup excede 10 MB. Use o backup do banco de dados no Supabase.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='camila-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
});
$('#restore').onclick=()=>open('Restaurar backup','<p>Adiciona apenas registros que ainda não existem, no mesmo consultório. Registros atuais não serão sobrescritos. Use um backup completo exportado por uma conta com acesso às fichas.</p><label>Arquivo de backup<input type="file" name="file" accept=".json,application/json" required></label>'+field('Senha do backup','password','','password',true),async f=>{
  const file=f.get('file');if(!file || file.size>10*1024*1024)throw new Error('Selecione um backup de até 10 MB.');
  const payload=await decryptBackup(JSON.parse(await file.text()),f.get('password'));
  if(payload.clinicId!==store.clinicId)throw new Error('Este backup pertence a outro consultório ou à demonstração.');
  const result=await store.restore(payload);$('#sync-status').textContent=`Restaurados: ${result.patients} pacientes, ${result.sessions} atendimentos, ${result.evolutions} fichas e ${result.progress||0} registros de evolução do paciente.`;
  alert($('#sync-status').textContent);
});
setInterval(async()=>{
  if(!store.cloud || !store.auth)return;
  if(Date.now()-lastActivity>15*60*1000){store.auth=null;locked('O aplicativo foi bloqueado após 15 minutos sem atividade. Entre novamente.');return;}
  if(document.visibilityState==='visible'&&!$('#modal').open&&!$('#workspace').hidden){try{await refresh();}catch(err){$('#sync-status').textContent=err.message;}}
},30000);
document.addEventListener('visibilitychange',()=>{if(store.cloud&&store.auth&&Date.now()-lastActivity>15*60*1000){store.auth=null;locked('Entre novamente para continuar.');}});
async function initialize(){
  if(!store.cloud){$('#workspace').hidden=false;$('#account-name').textContent='Demonstração local';await refresh();return;}
  locked();const fragment=new URLSearchParams(location.hash.slice(1));
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  if(['recovery','invite'].includes(fragment.get('type'))&&fragment.get('access_token')&&fragment.get('refresh_token')){
    try{store.auth={access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')};await store.identify();$('#login-form').hidden=true;$('#password-form').hidden=false;$('#auth-error').textContent='Defina sua senha para acessar o consultório.';}
    catch(err){store.auth=null;locked(err.message);}
  }
}
initialize().catch(err=>{$('#sync-status').textContent=err.message;});
