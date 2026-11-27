'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {macro02DeviceAuthorityR5} from '@/lib/sync/macro02-device-r5';
import type {DeviceModeR5} from '@/lib/dose-premium/cutover-device-authority-r5';
export function useMacro02ModeR5(enabled=true):DeviceModeR5{
 const {user}=useAuth(),uid=user?.id;
 const [mode,setMode]=useState<{uid:string;mode:DeviceModeR5}|null>(null);
 useEffect(()=>{
  if(!uid||!enabled){setMode(null);return;}let live=true,seq=0;
  const refresh=()=>{const own=++seq;void macro02DeviceAuthorityR5().resolve(uid).then(r=>{if(live&&own===seq)setMode({uid,mode:r.mode});},()=>{if(live&&own===seq)setMode({uid,mode:'hold'});});};
  const invalidate=()=>{setMode(null);refresh();};
  refresh();for(const e of ['online','offline','pageshow','vault:macro02-device'])window.addEventListener(e,invalidate);
  document.addEventListener('visibilitychange',invalidate);
  return ()=>{live=false;for(const e of ['online','offline','pageshow','vault:macro02-device'])window.removeEventListener(e,invalidate);document.removeEventListener('visibilitychange',invalidate);};
 },[uid,enabled]);
 return enabled&&mode&&mode.uid===uid?mode.mode:'hold';
}
