import { AuthForm } from "@/components/auth-form";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata={title:"Criar conta"};
export default function Cadastro(){return <><Header/><main className="auth-page"><section className="auth-card auth-card-wide"><p className="eyebrow">Faça parte da S&amp;A</p><h1>Crie sua conta</h1><p className="auth-intro">Cadastre-se para comprar com mais agilidade e acompanhar seus pedidos.</p><AuthForm mode="register"/><p className="auth-switch">Já possui uma conta? <a href="/conta">Entrar</a></p></section></main><Footer/></>}
