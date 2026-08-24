"use client";

import {ChevronDown} from "lucide-react";
import {useEffect,useRef,useState} from "react";

type Option={value:string;label:string};

function FilterMenu({name,value,onChange,options}:{name:string;value:string;onChange:(value:string)=>void;options:Option[]}){
  const details=useRef<HTMLDetailsElement>(null);
  const selected=options.find(option=>option.value===value)||options[0];
  useEffect(()=>{
    const closeOutside=(event:PointerEvent)=>{if(details.current&&!details.current.contains(event.target as Node))details.current.removeAttribute("open")};
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")details.current?.removeAttribute("open")};
    document.addEventListener("pointerdown",closeOutside);document.addEventListener("keydown",closeOnEscape);
    return()=>{document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",closeOnEscape)};
  },[]);
  return <details className="catalog-filter-menu" ref={details}>
    <summary>{selected.label}<ChevronDown/></summary>
    <div role="listbox" aria-label={name==="genero"?"Selecionar gênero":name==="marca"?"Selecionar marca":"Selecionar ordenação"}>
      {options.map(option=><button type="button" role="option" aria-selected={option.value===value} className={option.value===value?"selected":""} key={option.value} onClick={()=>{onChange(option.value);details.current?.removeAttribute("open")}}>{option.label}</button>)}
    </div>
    <input type="hidden" name={name} value={value}/>
  </details>;
}

export function CatalogFilters({search,gender,brand,order,brands,family,characteristic,maxPrice,availability}:{search:string;gender:string;brand:string;order:string;brands:string[];family:string;characteristic:string;maxPrice:number;availability:string}){
  const[genderValue,setGenderValue]=useState(gender);const[brandValue,setBrandValue]=useState(brand);const[orderValue,setOrderValue]=useState(order||"destaques");
  const genders=[{value:"",label:"Todos os gêneros"},{value:"Feminino",label:"Femininos"},{value:"Masculino",label:"Masculinos"},{value:"Unissex",label:"Unissex"}];
  const brandOptions=[{value:"",label:"Todas as marcas"},...brands.map(value=>({value,label:value}))];
  const orderOptions=[{value:"destaques",label:"Mais relevantes"},{value:"mais-vendidos",label:"Mais vendidos"},{value:"menor-preco",label:"Menor preço"},{value:"maior-preco",label:"Maior preço"},{value:"recentes",label:"Novidades"},{value:"melhor-avaliados",label:"Melhor avaliados"}];
  return <form className="catalog-tools catalog-tools-smart" action="/perfumes"><div className="filters"><input name="busca" defaultValue={search} placeholder="Nome, marca, notas ou estilo"/><FilterMenu name="genero" value={genderValue} onChange={setGenderValue} options={genders}/><FilterMenu name="marca" value={brandValue} onChange={setBrandValue} options={brandOptions}/><input name="familia" defaultValue={family} placeholder="Família olfativa"/><input name="caracteristica" defaultValue={characteristic} placeholder="Característica"/><input name="precoMax" type="number" min="0" defaultValue={maxPrice||""} placeholder="Preço máximo"/><select name="disponibilidade" defaultValue={availability}><option value="">Disponibilidade</option><option value="estoque">Em estoque</option></select></div><FilterMenu name="ordem" value={orderValue} onChange={setOrderValue} options={orderOptions}/><button>Filtrar</button></form>;
}
