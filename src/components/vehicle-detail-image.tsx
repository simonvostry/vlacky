'use client';

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import VehicleImage from '@/components/vehicle-image';
import enhancedImages from '@/lib/enhanced-vehicle-images.json';
import zoomImages from '@/lib/zoom-vehicle-images.json';
import { imageZoomScale } from '@/lib/image-zoom';

type Asset = {src:string;width:number;height:number};
type Point = {x:number;y:number;clientX:number;clientY:number};
const enhanced: Record<string,string> = enhancedImages;
const zoom: Record<string,Asset> = zoomImages;

export function VehicleDetailImage(props: {src:string;alt:string;width:number;height:number;center?:boolean;responsive?:boolean}) {
  // Reset image loading and pointer state when navigating between vehicle images.
  return <DetailImage key={props.src} {...props} />;
}
function DetailImage({src,alt,width,height,center=false,responsive=true}: {src:string;alt:string;width:number;height:number;center?:boolean;responsive?:boolean}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const touchInteraction = useRef(false);
  const [base,setBase] = useState<Asset|null>(null);
  const [asset,setAsset] = useState<Asset|null>(null);
  const [requested,setRequested] = useState(false);
  const [point,setPoint] = useState<Point|null>(null);
  const [display,setDisplay] = useState({width:0,height:0,dpr:1});
  const [finePointer,setFinePointer] = useState(false);
  const preview = enhanced[src] ?? src;
  const candidate = zoom[src];

  useEffect(()=>{
    const node=wrapper.current;
    if(!node)return;
    const media=window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const measure=()=>{
      const rect=node.getBoundingClientRect();
      setDisplay({width:rect.width,height:rect.height,dpr:window.devicePixelRatio || 1});
      setFinePointer(media.matches);
      setPoint(null);
    };
    const observer=new ResizeObserver(measure);
    observer.observe(node);
    measure();
    window.addEventListener('resize',measure);
    // Scrolling (including a wagon's local scroller) dismisses a stale floating lens.
    const dismiss=()=>setPoint(null);
    window.addEventListener('scroll',dismiss,true);
    window.addEventListener('blur',dismiss);
    media.addEventListener('change',measure);
    return ()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('blur',dismiss);media.removeEventListener('change',measure);};
  },[]);

  useEffect(()=>{
    if(!requested || !candidate)return;
    let cancelled=false;
    const image=new window.Image();
    image.onload=()=>{if(!cancelled)setAsset({src:candidate.src,width:image.naturalWidth,height:image.naturalHeight});};
    // A missing detail derivative falls back to the successfully loaded preview.
    image.onerror=()=>{if(!cancelled)setAsset(base);};
    image.src=candidate.src;
    return ()=>{cancelled=true;};
  },[requested,candidate,base]);

  const available=asset ?? candidate ?? base;
  const canZoom=!!available && imageZoomScale(available.width,available.height,display.width,display.height,display.dpr)>1.01;
  const loaded=asset ?? base;
  const scale=loaded ? imageZoomScale(loaded.width,loaded.height,display.width,display.height,display.dpr) : 1;
  const active=!!point && !!loaded && scale>1.01;
  function move(event: PointerEvent<HTMLDivElement>) {
    if(event.pointerType!=='mouse' || !finePointer || !canZoom)return;
    const rect=event.currentTarget.getBoundingClientRect();
    setRequested(true);
    setDisplay({width:rect.width,height:rect.height,dpr:window.devicePixelRatio || 1});
    setPoint({x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)),clientX:event.clientX,clientY:event.clientY});
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    touchInteraction.current=false;
    if(event.key==='Escape'){setPoint(null);return;}
    if(!canZoom)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key)){
      event.preventDefault();setRequested(true);
      const rect=event.currentTarget.getBoundingClientRect();
      setDisplay({width:rect.width,height:rect.height,dpr:window.devicePixelRatio || 1});
      setPoint(p=>{
        const x=Math.max(0,Math.min(1,(p?.x ?? .5)+(event.key==='ArrowRight' ? .08 : event.key==='ArrowLeft' ? -.08 : 0)));
        const y=Math.max(0,Math.min(1,(p?.y ?? .5)+(event.key==='ArrowDown' ? .1 : event.key==='ArrowUp' ? -.1 : 0)));
        return {x,y,clientX:rect.left+x*rect.width,clientY:rect.top+y*rect.height};
      });
    }
  }
  const lensWidth=typeof window==='undefined' ? 280 : Math.min(280,window.innerWidth-24);
  const lensHeight=typeof window==='undefined' ? 180 : Math.min(180,window.innerHeight-24);
  const clientX=point?.clientX ?? 0;
  const clientY=point?.clientY ?? 0;
  const lensLeft=typeof window==='undefined' ? 0 : Math.max(12,Math.min(window.innerWidth-lensWidth-12,clientX+lensWidth+28<window.innerWidth ? clientX+18 : clientX-lensWidth-18));
  const lensTop=typeof window==='undefined' ? 0 : Math.max(12,Math.min(window.innerHeight-lensHeight-12,clientY+lensHeight+28<window.innerHeight ? clientY+18 : clientY-lensHeight-18));
  return <div ref={wrapper} data-vehicle-zoom className={`block rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-focus ${center ? 'mx-auto' : ''}`}
    style={{width:responsive ? `min(100%, ${width}px)` : width,cursor:canZoom && finePointer ? 'crosshair' : undefined}}
    role="group" aria-label={alt} aria-describedby={canZoom ? descriptionId : undefined} tabIndex={canZoom ? 0 : undefined}
    onPointerDown={event=>{touchInteraction.current=event.pointerType==='touch';if(touchInteraction.current)setPoint(null);}}
    onPointerEnter={move} onPointerMove={move} onPointerLeave={()=>setPoint(null)} onPointerCancel={()=>setPoint(null)}
    onFocus={event=>{if(canZoom && !touchInteraction.current){const rect=event.currentTarget.getBoundingClientRect();setRequested(true);setPoint({x:.5,y:.5,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2});}}} onBlur={()=>setPoint(null)} onKeyDown={keyboard}>
    <VehicleImage unoptimized src={src} alt={alt} width={width} height={height} className="block" style={{width:'100%',height:'auto'}}
      onLoad={event=>setBase({src:event.currentTarget.currentSrc || preview,width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})} />
    {canZoom && <span id={descriptionId} className="sr-only">Detail obrázku zobrazíte najetím myši nebo zaměřením klávesou Tab. Šipkami posunete zvětšení, Escape jej zavře.</span>}
    {active && loaded && point && createPortal(<div data-zoom-lens aria-hidden="true" className="pointer-events-none fixed z-50 overflow-hidden rounded-lg border border-control bg-surface shadow-lg"
      style={{left:lensLeft,top:lensTop,width:lensWidth,height:lensHeight,
        backgroundImage:`url(${JSON.stringify(loaded.src)})`,backgroundRepeat:'no-repeat',
        backgroundSize:`${display.width*scale}px ${display.height*scale}px`,
        backgroundPosition:`${lensWidth/2-point.x*display.width*scale}px ${lensHeight/2-point.y*display.height*scale}px`}} /> ,document.body)}
  </div>;
}
