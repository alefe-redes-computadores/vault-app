/** Offline visual references. No sensor connection or clinical capability is inferred. */
export type WatchShape = 'round' | 'square' | 'ultra' | 'band';
export type WatchModel = { id:string; brand:string; name:string; shape:WatchShape };
export const WATCH_MODELS: readonly WatchModel[] = [
 ...['Galaxy Watch4','Galaxy Watch5','Galaxy Watch6','Galaxy Watch6 Classic','Galaxy Watch7'].map((name,i)=>({id:`samsung-round-${i}`,brand:'Samsung',name,shape:'round' as const})),
 {id:'samsung-ultra',brand:'Samsung',name:'Galaxy Watch Ultra',shape:'ultra'},
 {id:'samsung-watch8',brand:'Samsung',name:'Galaxy Watch8',shape:'ultra'},
 {id:'samsung-watch8-classic',brand:'Samsung',name:'Galaxy Watch8 Classic',shape:'ultra'},
 {id:'samsung-fit3',brand:'Samsung',name:'Galaxy Fit3',shape:'band'},
 ...['Apple Watch SE','Apple Watch SE 3','Apple Watch Series 9','Apple Watch Series 10','Apple Watch Series 12'].map((name,i)=>({id:`apple-series-${i}`,brand:'Apple',name,shape:'square' as const})),
 ...['Apple Watch Ultra','Apple Watch Ultra 2','Apple Watch Ultra 3','Apple Watch Ultra 4'].map((name,i)=>({id:`apple-ultra-${i}`,brand:'Apple',name,shape:'square' as const})),
 ...['Xiaomi Smart Band 9','Xiaomi Smart Band 10'].map((name,i)=>({id:`xiaomi-band-${i}`,brand:'Xiaomi',name,shape:'band' as const})),
 ...['Redmi Watch 4','Redmi Watch 5','Redmi Watch 6'].map((name,i)=>({id:`redmi-watch-${i}`,brand:'Xiaomi',name,shape:'square' as const})),
];
export const WATCH_BRANDS = ['Samsung','Apple','Xiaomi','Amazfit','Garmin','Huawei','Fitbit','Outra marca'] as const;
const normalized = (value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
// Exact names only: custom nicknames never silently identify a model.
export function watchModelByName(name:string) { const value=normalized(name);return WATCH_MODELS.find(m=>normalized(m.name)===value||normalized(`${m.brand} ${m.name}`)===value); }
export function watchModelsForBrand(brand:string) { return WATCH_MODELS.filter(m=>m.brand===brand).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true})); }
