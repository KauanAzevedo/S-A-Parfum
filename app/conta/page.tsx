import { AuthForm } from "@/components/auth-form";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata={title:"Entrar na conta"};
export default function Conta(){return <><Header/><main className="auth-page"><section className="auth-card"><p className="eyebrow">Bem-vindo de volta</p><h1>Entre na sua conta</h1><p className="auth-intro">Acompanhe seus pedidos e tenha uma experiência personalizada.</p><AuthForm mode="login"/><p className="auth-switch">Ainda não possui cadastro? <a href="/cadastro">Criar conta</a></p></section></main><Footer/></>}
