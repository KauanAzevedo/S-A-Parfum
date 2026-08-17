import {Footer} from "./footer";
import {Header} from "./header";

export function PolicyPage({title,intro,children}:{title:string;intro?:string;children:React.ReactNode}){
  return <><Header/><main className="policy-page"><div className="container-site"><p className="eyebrow">Última atualização: 16 de agosto de 2026</p><h1>{title}</h1>{intro&&<p className="policy-intro">{intro}</p>}<article>{children}</article><p className="policy-contact"><b>Precisa falar conosco?</b><br/>Envie sua solicitação para <a href="mailto:contato@saparfum.com.br">contato@saparfum.com.br</a>, informando seu nome e, quando houver, o número do pedido.</p></div></main><Footer/></>;
}
