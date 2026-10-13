export class DemoStore {
  constructor(storage=localStorage) { this.storage=storage; this.key='camila-fisio-demo-v1'; this.role='therapist'; this.cloud=false; }
  async load() { const s=JSON.parse(this.storage.getItem(this.key) || '{"patients":[],"sessions":[]}'); return {patients:s.patients,sessions:s.sessions,progress:s.progress||[]}; }
  async change(fn) { const state=await this.load(); fn(state); this.storage.setItem(this.key,JSON.stringify(state)); }
  async addPatient(p,initial) { await this.change(s=>{s.patients.push(p);if(initial)s.progress.push({...initial,patientId:p.id});}); }
  async addProgress(p) {await this.change(s=>s.progress.push(p));}
  async removeSession(id) {await this.change(s=>{s.sessions.find(x=>x.id===id).deletedAt=new Date().toISOString();});}
  async treatment(id,treatment) {await this.change(s=>{s.sessions.find(x=>x.id===id).treatment=treatment;});}
  async addSession(p) { await this.change(s=>s.sessions.push(p)); }
  async payment(id,paid) { await this.change(s=>{s.sessions.find(x=>x.id===id).paid=paid;}); }
  async evolution(id,evolution,version,score=null) { await this.change(s=>{Object.assign(s.sessions.find(x=>x.id===id),{evolution,evolutionScore:score,updatedAt:new Date().toISOString()});}); }
}

export class CloudStore {
  constructor(config,fetcher=fetch) { this.url=config.supabaseUrl; this.key=config.supabaseKey; this.fetch=fetcher.bind(globalThis); this.cloud=true; this.auth=null; }
  async request(path,{method='GET',body,prefer,authenticated=true,retry=true}={}) {
    if(authenticated && !this.auth) throw new Error('Entre novamente para continuar.');
    const headers={apikey:this.key,'Content-Type':'application/json'};
    if(authenticated) headers.Authorization='Bearer '+this.auth.access_token;
    if(prefer) headers.Prefer=prefer;
    const r=await this.fetch(this.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    if(r.status===401 && authenticated && retry && this.auth?.refresh_token){
      const previous=this.auth;
      this.refreshing ||= this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.auth.refresh_token},authenticated:false}).then(a=>{if(this.auth!==previous)throw new Error('Sessão encerrada. Entre novamente.');this.auth=a;}).finally(()=>this.refreshing=null);
      await this.refreshing; return this.request(path,{method,body,prefer,authenticated,retry:false});
    }
    if(!r.ok){if(r.status===401){this.auth=null;throw new Error('Sessão expirada. Entre novamente.');}if(r.status===403)throw new Error('Sua conta não tem permissão para esta operação.');throw new Error('Não foi possível concluir a operação. Verifique sua conexão e a configuração do Supabase.');}
    return r.status===204?null:r.json();
  }
  async identify() {
    const user=await this.request('/auth/v1/user');
    const memberships=await this.request('/rest/v1/clinic_members?select=clinic_id,role&user_id=eq.'+encodeURIComponent(user.id));
    if(memberships.length!==1) {this.auth=null;throw new Error('Esta conta ainda não foi vinculada ao consultório.');}
    this.clinicId=memberships[0].clinic_id;this.role=memberships[0].role;this.email=user.email;
  }
  async login(email,password) { this.auth=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},authenticated:false});await this.identify(); }
  async logout(){try {if(this.auth)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.auth=null;this.clinicId=null;}}
  async recover(email){await this.request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/'),{method:'POST',body:{email},authenticated:false});}
  async changePassword(password){await this.request('/auth/v1/user',{method:'PUT',body:{password}});}
  async list(table) {
    const all=[];
    for(let offset=0;;offset+=500){const rows=await this.request(`/rest/v1/${table}?select=*&clinic_id=eq.${this.clinicId}&order=id&limit=500&offset=${offset}`);all.push(...rows);if(rows.length<500)return all;}
  }
  async load(){
    const [patients,sessions,evolutions,progress]=await Promise.all([this.list('patients'),this.list('sessions'),this.role==='therapist'?this.list('evolutions'):Promise.resolve([]),this.role==='therapist'?this.list('patient_progress'):Promise.resolve([])]);
    return {patients:patients.map(p=>({id:p.id,name:p.name,phone:p.phone})),progress:progress.map(p=>({id:p.id,patientId:p.patient_id,date:p.date,notes:p.notes,score:p.score})),sessions:sessions.map(s=>({id:s.id,patientId:s.patient_id,date:s.date,value:s.value,description:s.description,paid:s.paid,treatment:s.treatment||'physiotherapy',deletedAt:s.deleted_at,version:s.version,evolution:evolutions.find(e=>e.session_id===s.id)?.notes || {},evolutionScore:evolutions.find(e=>e.session_id===s.id)?.score ?? null,evolutionVersion:evolutions.find(e=>e.session_id===s.id)?.version ?? null}))};
  }
  async insert(table,body){return this.request('/rest/v1/'+table,{method:'POST',body:{...body,clinic_id:this.clinicId},prefer:'return=representation'});}
  async addPatient(p,initial){await this.request('/rest/v1/rpc/create_patient',{method:'POST',body:{patient:{...p,clinicId:this.clinicId},initial:initial||null}});}
  async addProgress(p){await this.insert('patient_progress',{id:p.id,patient_id:p.patientId,date:p.date,notes:p.notes,score:p.score});}
  async addSession(s){await this.insert('sessions',{id:s.id,patient_id:s.patientId,date:s.date,value:s.value,paid:s.paid,description:s.description,treatment:s.treatment||'physiotherapy'});}
  async removeSession(id,version){const rows=await this.request(`/rest/v1/sessions?id=eq.${id}&clinic_id=eq.${this.clinicId}&version=eq.${version}&deleted_at=is.null`,{method:'PATCH',body:{deleted_at:new Date().toISOString()},prefer:'return=representation'});if(!rows.length)throw new Error('Este atendimento mudou em outro aparelho. Atualize antes de excluir.');}
  async treatment(id,treatment,version){const rows=await this.request(`/rest/v1/sessions?id=eq.${id}&clinic_id=eq.${this.clinicId}&version=eq.${version}&deleted_at=is.null`,{method:'PATCH',body:{treatment},prefer:'return=representation'});if(!rows.length)throw new Error('Este atendimento mudou em outro aparelho. Atualize antes de alterar.');}
  async payment(id,paid,version){const rows=await this.request(`/rest/v1/sessions?id=eq.${id}&clinic_id=eq.${this.clinicId}&version=eq.${version}`,{method:'PATCH',body:{paid},prefer:'return=representation'});if(!rows.length)throw new Error('Este atendimento mudou em outro aparelho. Atualize os registros e tente novamente.');}
  async evolution(id,notes,version,score=null){
    if(version===null){await this.insert('evolutions',{session_id:id,notes,score});return;}
    const rows=await this.request(`/rest/v1/evolutions?session_id=eq.${id}&clinic_id=eq.${this.clinicId}&version=eq.${version}`,{method:'PATCH',body:{notes,score},prefer:'return=representation'});
    if(!rows.length)throw new Error('Esta ficha mudou em outro aparelho. Atualize os registros antes de editar novamente.');
  }
  async restore(payload){return this.request('/rest/v1/rpc/restore_backup',{method:'POST',body:{backup:payload}});}
  async export(){return this.request('/rest/v1/rpc/export_backup',{method:'POST',body:{}});}
}
