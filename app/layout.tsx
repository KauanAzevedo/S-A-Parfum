import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { SplashScreen } from "@/components/splash-screen";
import "./globals.css";
const cormorant=Cormorant_Garamond({subsets:["latin"],weight:["400","500","600","700"],style:["normal","italic"],variable:"--font-cormorant",display:"swap"});
const montserrat=Montserrat({subsets:["latin"],weight:["400","500","600","700"],variable:"--font-montserrat",display:"swap"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://sa-parfum.vercel.app"),title:{default:"S&A Parfum | Perfumes que marcam presença",template:"%s | S&A Parfum"},description:"Perfumaria premium com fragrâncias importadas e árabes 100% originais.",openGraph:{title:"S&A Parfum",description:"Perfumes que marcam presença.",type:"website",locale:"pt_BR"},twitter:{card:"summary_large_image",title:"S&A Parfum"},icons:{icon:{url:"/logo-sa-dark.png",type:"image/png"},shortcut:"/logo-sa-dark.png",apple:"/logo-sa-dark.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" className={`${cormorant.variable} ${montserrat.variable}`}><body><SplashScreen/>{children}<a className="whatsapp" href="https://wa.me/5500000000000" aria-label="Falar no WhatsApp">WhatsApp</a></body></html>}
