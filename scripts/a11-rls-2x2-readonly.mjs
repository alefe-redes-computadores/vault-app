#!/usr/bin/env node
/** A11 E2E RLS: two accounts x two persons, synthetic fixtures only; READ-ONLY.
 * Requires six IDs from intentionally seeded test records. No mutation, no service_role, no PII in output.
 */
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY',
 'VAULT_A11_A_EMAIL','VAULT_A11_A_PASSWORD','VAULT_A11_B_EMAIL','VAULT_A11_B_PASSWORD',
 'VAULT_A11_A1_PERSON','VAULT_A11_A2_PERSON','VAULT_A11_B1_PERSON','VAULT_A11_B2_PERSON',
 'VAULT_A11_A1_DOSE','VAULT_A11_A2_DOSE','VAULT_A11_B1_DOSE','VAULT_A11_B2_DOSE'];
function fail(msg){console.error('A11_RLS_2X2_BLOQUEADA | '+msg);process.exitCode=1}
const missing=required.filter(k=>!process.env[k]?.trim());
if(missing.length){fail('Fixture autenticada incompleta: '+missing.map(k=>k.replace(/EMAIL|PASSWORD/, 'CREDENTIAL')).join(', '));}
else{
 const env=process.env;
 const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const clients=[createClient(url,key,options),createClient(url,key,options)];
 try{
  const users=[];
  for(let i=0;i<2;i++){
   const letter=i?'B':'A';
   const {data,error}=await clients[i].auth.signInWithPassword({email:env['VAULT_A11_'+letter+'_EMAIL'],password:env['VAULT_A11_'+letter+'_PASSWORD']});
   assert.ok(!error&&data.user?.id,'Não foi possível autenticar conta fictícia '+letter);
   users.push(data.user.id);
  }
  assert.notEqual(users[0],users[1],'Contas de teste não são independentes');
  let checked=0;
  const ids=[
   [env.VAULT_A11_A1_PERSON,env.VAULT_A11_A2_PERSON],
   [env.VAULT_A11_B1_PERSON,env.VAULT_A11_B2_PERSON],
  ];
  const doses=[
   [env.VAULT_A11_A1_DOSE,env.VAULT_A11_A2_DOSE],
   [env.VAULT_A11_B1_DOSE,env.VAULT_A11_B2_DOSE],
  ];
  assert.equal(new Set(ids.flat()).size,4,'Pessoas fictícias precisam ter IDs distintos');
  assert.equal(new Set(doses.flat()).size,4,'Doses fictícias precisam ter IDs distintos');
  for(let owner=0;owner<2;owner++){
   for(let p=0;p<2;p++){
    const personId=ids[owner][p],doseId=doses[owner][p];
    // Autenticado como titular: o registro fictício PRECISA existir; vazio nunca passa como prova.
    const own=await clients[owner].from('persons').select('id,user_id').eq('id',personId).maybeSingle();
    assert.ok(!own.error&&own.data?.id===personId&&own.data.user_id===users[owner], 'Fixture pessoa própria indisponível');checked++;
    const ownDose=await clients[owner].from('dose_logs').select('id,user_id,person_id').eq('id',doseId).maybeSingle();
    assert.ok(!ownDose.error&&ownDose.data?.id===doseId&&ownDose.data.user_id===users[owner]&&ownDose.data.person_id===personId,
      'Fixture dose própria indisponível');checked++;
    const other=(owner+1)%2;
    const cross=await clients[other].from('persons').select('id').eq('id',personId);
    assert.ok(!cross.error&&Array.isArray(cross.data)&&cross.data.length===0,'RLS pessoas não negou conta diferente');checked++;
    const crossDose=await clients[other].from('dose_logs').select('id').eq('id',doseId);
    assert.ok(!crossDose.error&&Array.isArray(crossDose.data)&&crossDose.data.length===0,'RLS doses não negou conta diferente');checked++;
    const wrongPerson=ids[owner][1-p];
    const sameOwnerWrongPerson=await clients[owner].from('dose_logs').select('id').eq('id',doseId).eq('person_id',wrongPerson);
    assert.ok(!sameOwnerWrongPerson.error&&sameOwnerWrongPerson.data?.length===0,'Filtro por pessoa não isolou a dose');checked++;
   }
  }
  console.log(`A11_RLS_2X2_READONLY_OK | ${checked} provas com fixtures sintéticas; contas/pessoas diferentes; zero escrita`);
 }catch(e){fail('Prova insuficiente ou teste negativo falhou; rever fixtures, políticas e filtros sem expor IDs.');}
 finally{await Promise.all(clients.map(c=>c.auth.signOut({scope:'local'}).catch(()=>{})));}
}
