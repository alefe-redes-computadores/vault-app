"use client";
import {Suspense} from "react";
import {VitalScreen} from "@/components/vital/VitalScreen";
export default function Page(){return <Suspense fallback={<p role="status">Carregando Vital…</p>}><VitalScreen area="training"/></Suspense>;}
