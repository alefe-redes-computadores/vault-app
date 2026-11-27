"use client";
import {useEffect} from 'react';
/** Single layout-viewport authority. No permanent frame loop or polling. */
export function VaultAdaptiveFooterR03(){
  useEffect(()=>{
    const foundShell=document.querySelector<HTMLElement>('.vault-app-shell-r03');
    if(!foundShell)return;
    const shell:HTMLElement=foundShell;
    const property='--vault-footer-obstruction-r03';
    const marker='data-vault-footer-r03';
    let frame=0,deadline=0,observed:HTMLElement[]=[];
    const transitions=new Map<EventTarget,Set<string>>();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
    function relevant(target:EventTarget|null){
      return target instanceof Element && observed.some(n=>target===n||target.contains(n));
    }
    function measure(){
      frame=0;
      const nav=shell.querySelector<HTMLElement>('nav.vault-bottom-nav');
      const fab=nav?.querySelector<HTMLElement>('button.absolute, [data-vault-home-compose] > button');
      const nodes=[nav,fab].filter((v):v is HTMLElement=>!!v);
      if(nodes.length!==observed.length||nodes.some((n,i)=>observed[i]!==n)){
        observer?.disconnect();for(const n of nodes)observer?.observe(n);observed=nodes;
        for(const target of transitions.keys())if(!relevant(target))transitions.delete(target);
      }
      const height=document.documentElement.clientHeight,width=document.documentElement.clientWidth;
      const tops=nodes.flatMap(n=>{
        const style=getComputedStyle(n),r=n.getBoundingClientRect();
        if(style.visibility!=='visible'||r.width<=0||r.height<=0||r.bottom<=0||r.top>=height||r.right<=0||r.left>=width)return [];
        // Opacity is not inherited; an invisible ancestor also hides the FAB.
        for(let parent:HTMLElement|null=n;parent;parent=parent.parentElement){
          const css=getComputedStyle(parent);if(css.display==='none'||Number(css.opacity)===0)return [];
        }
        return [r.top];
      });
      const reserve=tops.length?Math.max(0,Math.min(height,height-Math.min(...tops))):0;
      const value=`${Math.ceil(reserve)}px`;
      if(shell.style.getPropertyValue(property)!==value)shell.style.setProperty(property,value);
      const ready=shell.querySelector('.vault-adaptive-tail')!==null;
      if(ready&&shell.getAttribute(marker)!=='ready')shell.setAttribute(marker,'ready');
      else if(!ready&&shell.hasAttribute(marker))shell.removeAttribute(marker);
      if(transitions.size&&performance.now()<deadline)schedule();
      else transitions.clear();
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
    function transition(event:Event){
      if(!relevant(event.target))return;
      const e=event as TransitionEvent;
      if(!/^(transform|translate|scale|opacity|visibility|display|top|bottom|height|width|padding.*|margin.*|inset.*)$/.test(e.propertyName))return;
      if(e.type==='transitionrun'||e.type==='transitionstart'){
        const keys=transitions.get(e.target!)??new Set<string>();keys.add(e.propertyName);transitions.set(e.target!,keys);
        // Bounded animation sampling, cancelled on end/cancel/unmount; not idle polling.
        deadline=performance.now()+5000;
      }else{const keys=transitions.get(e.target!);keys?.delete(e.propertyName);if(!keys?.size)transitions.delete(e.target!);}
      schedule();
    }
    const mutation=new MutationObserver(records=>{
      if(records.some(r=>{
        if(r.type==='childList'){
          // Clinical list mutations do not change the footer or route contract.
          if(relevant(r.target)&&r.target!==shell&&r.target instanceof Element&&r.target.closest('nav.vault-bottom-nav'))return true;
          return [...Array.from(r.addedNodes),...Array.from(r.removedNodes)].some(node=>node instanceof Element&&
            (node.matches('.vault-adaptive-tail,nav.vault-bottom-nav')||node.querySelector('.vault-adaptive-tail,nav.vault-bottom-nav')!==null));
        }
        const target=r.target;
        // Our CSS variable is the only style write to shell; never feed it back.
        if(target===shell&&r.attributeName==='style'){
          const withoutOwn=(value:string)=>value.replace(/--vault-footer-obstruction-r03\s*:[^;]*(?:;|$)/g,'').trim();
          if(withoutOwn(r.oldValue??'')===withoutOwn(shell.getAttribute('style')??''))return false;
        }
        if(relevant(target))return true;
        return r.attributeName==='class'&&target instanceof Element&&
          (target.matches('.vault-adaptive-tail,nav.vault-bottom-nav,nav.vault-bottom-nav button')||/\bvault-adaptive-tail\b/.test(r.oldValue??'')||/\bvault-bottom-nav\b/.test(r.oldValue??''));
      }))schedule();
    });
    const attrs={attributes:true,attributeFilter:['class','style','hidden'],attributeOldValue:true};
    mutation.observe(shell,{...attrs,childList:true,subtree:true});
    mutation.observe(document.body,attrs);mutation.observe(document.documentElement,attrs);
    const events=['transitionrun','transitionstart','transitionend','transitioncancel'];
    for(const event of events)document.addEventListener(event,transition,true);
    window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);schedule();
    return()=>{if(frame)cancelAnimationFrame(frame);transitions.clear();observer?.disconnect();mutation.disconnect();for(const event of events)document.removeEventListener(event,transition,true);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);shell.removeAttribute(marker);shell.style.removeProperty(property);};
  },[]);
  return null;
}
