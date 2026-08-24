import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";

const BUCKET = "product-images";
const MAX_SIZE = 4 * 1024 * 1024;
const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

function hasValidImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value);
  if (type === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  return false;
}

export async function POST(request:Request){
  const admin=await authenticatedAdmin(request);
  if(!admin)return NextResponse.json({error:"Não autorizado."},{status:403});
  const form=await request.formData();
  const files=form.getAll("images").filter((value):value is File=>value instanceof File&&value.size>0);
  if(!files.length||files.length>8)return NextResponse.json({error:"Selecione de 1 a 8 imagens."},{status:400});
  if(files.some(file=>!extensions[file.type]))return NextResponse.json({error:"Use somente imagens JPG, PNG ou WebP."},{status:400});
  if(files.some(file=>file.size>MAX_SIZE))return NextResponse.json({error:"Cada imagem deve ter no máximo 4 MB."},{status:400});

  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return NextResponse.json({error:"Armazenamento de imagens indisponível."},{status:503});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:bucket}=await supabase.storage.getBucket(BUCKET);
  if(!bucket){
    const {error:createError}=await supabase.storage.createBucket(BUCKET,{public:true,allowedMimeTypes:Object.keys(extensions),fileSizeLimit:MAX_SIZE});
    if(createError&&!createError.message.toLowerCase().includes("already"))return NextResponse.json({error:"Não foi possível preparar o armazenamento."},{status:500});
  }
  const urls:string[]=[];
  for(const file of files){
    const content=await file.arrayBuffer();
    if(!hasValidImageSignature(new Uint8Array(content).slice(0,16),file.type))return NextResponse.json({error:`O arquivo ${file.name} não é uma imagem válida.`},{status:400});
    const path=`perfumes/${Date.now()}-${randomUUID()}.${extensions[file.type]}`;
    const {error}=await supabase.storage.from(BUCKET).upload(path,content,{contentType:file.type,cacheControl:"31536000",upsert:false});
    if(error)return NextResponse.json({error:"Não foi possível enviar todas as imagens."},{status:500});
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return NextResponse.json({urls});
}
