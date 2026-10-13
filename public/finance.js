export function totals(sessions, month, treatment='all') {
  const selected = sessions.filter(s => !s.deletedAt && s.date.startsWith(month) && (treatment==='all'||(s.treatment||'physiotherapy')===treatment));
  return { received: selected.filter(s=>s.paid).reduce((n,s)=>n+s.value,0), pending: selected.filter(s=>!s.paid).reduce((n,s)=>n+s.value,0), count:selected.length };
}
export function parseMoney(value) {
  const amount = Number(String(value).trim().replace(',','.'));
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount*100) !== amount*100 && Math.abs(Math.round(amount*100)-amount*100)>0.000001) throw new Error('Informe um valor positivo com até duas casas decimais.');
  const cents=Math.round(amount*100);
  if(!Number.isSafeInteger(cents))throw new Error('Valor acima do limite permitido.');
  return cents;
}
