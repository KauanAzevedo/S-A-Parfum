import {CheckoutForm} from "@/components/checkout-form";
import {Footer} from "@/components/footer";
import {Header} from "@/components/header";

export default function Checkout(){return <><Header/><main className="checkout"><div className="container-site"><p className="eyebrow">Compra segura</p><h1>Finalizar compra</h1><CheckoutForm/></div></main><Footer/></>}
