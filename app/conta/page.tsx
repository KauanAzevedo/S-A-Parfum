import { AccountDashboard } from "@/components/account-dashboard";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata={title:"Minha conta"};
export default function Conta(){return <><Header/><AccountDashboard/><Footer/></>}
