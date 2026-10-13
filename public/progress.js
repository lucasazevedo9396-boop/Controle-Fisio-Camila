export function parseScore(value) {
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const score=Number(String(value).replace(',','.'));
  if(!Number.isFinite(score)||score<0||score>10||Math.abs(score*10-Math.round(score*10))>0.000001)throw new Error('Informe uma nota de 0 a 10, com no máximo uma casa decimal.');
  return score;
}
export function progressPoints(patientId,state) {
  return [...(state.progress||[]).filter(p=>p.patientId===patientId).map(p=>({date:p.date,score:p.score,source:'Registro do paciente'})),...state.sessions.filter(s=>s.patientId===patientId&&!s.deletedAt).map(s=>({date:s.date,score:s.evolutionScore,source:(s.treatment||'physiotherapy')==='pilates'?'Pilates':'Fisioterapia'}))]
    .filter(p=>typeof p.score==='number'&&Number.isFinite(p.score)&&p.score>=0&&p.score<=10).sort((a,b)=>a.date.localeCompare(b.date));
}
