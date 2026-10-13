"""Teste móvel com Auth/REST simulados; não substitui validação no Supabase real."""
import json
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

clinic='20000000-0000-4000-8000-000000000001'
data={'patients':[], 'sessions':[], 'evolutions':[], 'patient_progress':[]}
def api(route):
    req=route.request; path=urlparse(req.url).path; query=parse_qs(urlparse(req.url).query)
    body=json.loads(req.post_data or '{}'); result={}; status=200
    if path.endswith('/token'):
        result={'access_token':body.get('email','test-only'),'refresh_token':'test-refresh'}
    elif path.endswith('/user'): result={'id':req.headers.get('authorization','Bearer unknown')[7:],'email':req.headers.get('authorization','')[7:]}
    elif path.endswith('/rpc/create_patient'):
        patient=body['patient'];patient['clinic_id']=patient.pop('clinicId');data['patients'].append(patient);result=patient['id']
        if body.get('initial'):
            record=body['initial'];record.update({'patient_id':patient['id'],'clinic_id':clinic});data['patient_progress'].append(record)
    elif path.endswith('/logout'): status=204
    elif 'clinic_members' in path: result=[{'clinic_id':clinic,'role':'therapist'}]
    elif path.endswith('/rpc/export_backup'):
        result={'format':'camila-data-v1','clinicId':clinic,'patients':data['patients'],'sessions':[{'id':s['id'],'patientId':s['patient_id'],'date':s['date'],'value':s['value'],'paid':s['paid'],'description':s['description'],'evolution':next((e['notes'] for e in data['evolutions'] if e['session_id']==s['id']),{})} for s in data['sessions']]}
    else:
        table=path.rsplit('/',1)[1]
        if req.method=='GET': result=data[table]
        elif req.method=='POST':
            body.setdefault('id',body.get('session_id'));body['version']=1;data[table].append(body);result=[body]
        elif req.method=='PATCH':
            result=[]
            for item in data[table]:
                id_field='session_id' if table=='evolutions' else 'id'
                if 'eq.'+item[id_field]==query.get(id_field,[''])[0] and 'eq.'+str(item['version'])==query.get('version',[''])[0]:
                    item.update(body);item['version']+=1;result.append(item)
    route.fulfill(status=status,content_type='application/json',body='' if status==204 else json.dumps(result),headers={'Access-Control-Allow-Origin':'*'})

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    errors=[]
    def device(email):
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
        context.route('**/config.js',lambda r:r.fulfill(content_type='text/javascript',body='export const config='+json.dumps({'supabaseUrl':'https://test.supabase.co','supabaseKey':'public-test-key'})+';'))
        context.route('https://test.supabase.co/**',api)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:3000')
        expect(page.locator('#workspace')).to_be_hidden()
        page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Senha',exact=True).fill('Senha de teste')
        page.get_by_role('button',name='Entrar',exact=True).click();expect(page.locator('#workspace')).to_be_visible()
        return page
    a=device('camila@example.com');b=device('lucas@example.com')
    a.get_by_role('button',name='Pacientes',exact=True).click();a.get_by_role('button',name='Novo paciente',exact=True).click()
    a.get_by_label('Nome completo').fill('Paciente compartilhado')
    a.get_by_label('Evolução do paciente',exact=True).fill('Evolução inicial compartilhada')
    a.get_by_label('Nota da condição funcional (0 a 10, opcional)',exact=True).fill('0')
    a.get_by_role('button',name='Salvar',exact=True).click()
    expect(a.locator('#content').get_by_text('Paciente compartilhado',exact=True)).to_be_visible()
    a.get_by_role('button',name='Atendimentos',exact=True).click();a.get_by_role('button',name='Novo atendimento',exact=True).click()
    a.get_by_label('Valor (R$)').fill('120,50');a.get_by_role('button',name='Salvar',exact=True).click()
    expect(a.locator('#content').get_by_text('Pendente',exact=True)).to_be_visible()
    a.get_by_role('button',name='Evolução',exact=True).click();a.get_by_label('Queixa e relato do paciente').fill('Nota inicial fictícia');a.get_by_role('button',name='Salvar',exact=True).click()
    expect(a.locator('#modal')).not_to_be_visible()
    b.get_by_role('button',name='Atualizar registros',exact=True).click();b.get_by_role('button',name='Pacientes',exact=True).click()
    b.get_by_role('button',name='Ver histórico e evolução',exact=True).click()
    expect(b.get_by_text('Evolução inicial compartilhada',exact=True)).to_be_visible()
    expect(b.locator('svg.progress-chart circle')).to_have_count(1)
    b.get_by_role('button',name='Atendimentos',exact=True).click()
    expect(b.locator('#content').get_by_text('Paciente compartilhado',exact=True)).to_be_visible()
    b.get_by_role('button',name='Registrar pagamento',exact=True).click();expect(b.locator('#content').get_by_text('Pago',exact=True)).to_be_visible()
    a.get_by_role('button',name='Evolução',exact=True).click()
    b.get_by_role('button',name='Evolução',exact=True).click();b.get_by_label('Queixa e relato do paciente').fill('Alterada no segundo aparelho');b.get_by_role('button',name='Salvar',exact=True).click();expect(b.locator('#modal')).not_to_be_visible()
    a.get_by_label('Queixa e relato do paciente').fill('Alteração obsoleta');a.get_by_role('button',name='Salvar',exact=True).click()
    expect(a.locator('#error')).to_contain_text('outro aparelho');assert data['evolutions'][0]['notes']['complaint']=='Alterada no segundo aparelho'
    a.get_by_role('button',name='Fechar',exact=True).click()
    a.get_by_role('button',name='Baixar backup protegido',exact=True).click()
    a.get_by_label('Senha do backup (mínimo 12 caracteres)',exact=True).fill('Backup de teste seguro');a.get_by_label('Repita a senha',exact=True).fill('Backup de teste seguro')
    with a.expect_download() as download:
        a.get_by_role('button',name='Salvar',exact=True).click()
    download.value.save_as('/tmp/camila-backup-test.json')
    encrypted=json.load(open('/tmp/camila-backup-test.json'));assert encrypted['format']=='camila-encrypted-v1';assert 'Paciente compartilhado' not in json.dumps(encrypted)
    expect(a.locator('#modal')).not_to_be_visible()
    a.get_by_role('button',name='Sair',exact=True).click();expect(a.locator('#workspace')).to_be_hidden();assert not a.locator('#content').inner_text()
    assert a.evaluate('localStorage.length')==0
    assert not errors,errors
    print('PASS: login, dois aparelhos compartilhados, conflito de edição, backup cifrado e saída sem cache clínico (API simulada).')
    browser.close()
