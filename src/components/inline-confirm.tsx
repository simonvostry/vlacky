'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Local confirmation; focus returns to the trigger on No/Escape. */
export function InlineConfirm({children,question,onConfirm,disabled=false,className='ui-button ui-button-danger',label,title}:{children:ReactNode;question:string;onConfirm:()=>void|Promise<void>;disabled?:boolean;className?:string;label?:string;title?:string}) {
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),no=useRef<HTMLButtonElement>(null);
 function close(){setOpen(false);trigger.current?.focus();}
 useEffect(()=>{if(open)no.current?.focus();},[open]);
 useEffect(()=>{
  if(!open)return;
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 return <div ref={root} className="relative inline-flex max-w-full" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close();}}}>
  {open&&<div role="dialog" aria-label={question} className="absolute bottom-full right-0 z-30 mb-2 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-divider bg-surface p-3 text-sm text-foreground shadow-lg">
   <p>{question}</p><div className="mt-3 flex justify-end gap-2"><button type="button" className="ui-button ui-button-danger" disabled={disabled} onClick={()=>{close();void onConfirm();}}>Ano</button><button ref={no} type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={close}>Ne</button></div>
  </div>}
  <button ref={trigger} type="button" aria-label={label} title={open ? undefined : title} className={`${className} ${open ? '[&_.ui-tooltip]:hidden' : ''}`} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{children}</button>
 </div>;
}
