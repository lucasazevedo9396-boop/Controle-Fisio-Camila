import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, parseMoney } from './public/finance.js';
test('valores por sessão são armazenados em centavos',()=>{assert.equal(parseMoney('120,50'),12050);assert.equal(parseMoney('0.29'),29);for(const x of ['abc','0','-1','1.234','Infinity'])assert.throws(()=>parseMoney(x));});
test('resumo separa pagos, pendentes e mês da sessão',()=>{assert.deepEqual(totals([{date:'2026-10-02',value:12050,paid:true},{date:'2026-10-03',value:8000,paid:false},{date:'2026-09-03',value:5000,paid:true}],'2026-10'),{received:12050,pending:8000,count:2});});
