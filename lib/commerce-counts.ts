export type CommerceCounts={favorites:number;cart:number};

const prefix="sa:commerce-counts:";

function normalize(value:Partial<CommerceCounts>|null|undefined):CommerceCounts{
  return {
    favorites:Math.max(0,Number(value?.favorites)||0),
    cart:Math.max(0,Number(value?.cart)||0),
  };
}

export function readCommerceCounts(userId:string):CommerceCounts|null{
  if(typeof window==="undefined")return null;
  try{
    const stored=window.localStorage.getItem(`${prefix}${userId}`);
    return stored?normalize(JSON.parse(stored)):null;
  }catch{return null}
}

export function writeCommerceCounts(userId:string,counts:CommerceCounts):CommerceCounts{
  const normalized=normalize(counts);
  if(typeof window!=="undefined"){
    try{window.localStorage.setItem(`${prefix}${userId}`,JSON.stringify(normalized))}catch{}
  }
  return normalized;
}
