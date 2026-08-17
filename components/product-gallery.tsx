"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useState } from "react";

export function ProductGallery({images,name}:{images:string[];name:string}){
  const[index,setIndex]=useState(0);const current=images[index]||images[0];
  function move(step:number){setIndex(value=>(value+step+images.length)%images.length)}
  return <section className="product-gallery" aria-label={`Fotos de ${name}`}><div className="product-thumbnails">{images.map((image,position)=><button type="button" className={position===index?"active":""} key={`${image}-${position}`} onClick={()=>setIndex(position)} aria-label={`Ver foto ${position+1}`}><img src={image} alt=""/></button>)}</div><div className="product-main-image"><img src={current} alt={`${name} - foto ${index+1}`}/><span><Expand/> {index+1} / {images.length}</span>{images.length>1&&<><button className="gallery-previous" type="button" onClick={()=>move(-1)} aria-label="Foto anterior"><ChevronLeft/></button><button className="gallery-next" type="button" onClick={()=>move(1)} aria-label="Próxima foto"><ChevronRight/></button></>}</div></section>
}
