"use client";
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {createCanonicalVitalRuntime} from '@/lib/vital-runtime/canonical';
import type {Scope} from '@/lib/vital/model';
export function useVitalRuntime(){const {user,loading:authLoading}=useAuth();const {activePersonId,loading:personLoading}=useActivePersonId();const scope=useMemo<Scope|null>(()=>user?.id&&activePersonId&&!authLoading&&!personLoading?{user_id:user.id,person_id:activePersonId}:null,[user?.id,activePersonId,authLoading,personLoading]);const active=useRef<Scope|null>(null);useLayoutEffect(()=>{active.current=scope;return()=>{active.current=null;};},[scope]);const runtime=useMemo(()=>createCanonicalVitalRuntime(()=>active.current),[]);return {...runtime,scope,loading:authLoading||personLoading};}
