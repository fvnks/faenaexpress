import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

const footerLinks = [
    { label: "Compras", href: "/facturas/compras" },
    { label: "Ventas", href: "/facturas/ventas" },
    { label: "Gastos", href: "/facturas/gastos" },
    { label: "Banco", href: "/facturas/banco" },
    { label: "Reportes", href: "/facturas/reportes" },
    { label: "Catálogos", href: "/facturas/catalogos" },
    { label: "Contacto", href: "/contacto" },
    { label: "Importar", href: "/facturas/importar" },
]

export default function Footer() {
    return (
        <footer className="dark bg-background">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 md:py-24 py-8">
                <div className="flex flex-col gap-16">
                    <div className="flex flex-col gap-12">
                        <div className='grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both'>
                            <div className="col-span-12 md:col-span-3">
                                <p className='w-full text-foreground'>
                                    Mantente actualizado con las últimas novedades, promociones y ofertas exclusivas de Yellow ERP.
                                </p>
                            </div>
                            <div className="md:col-span-1" />
                            <div className="col-span-12 md:col-span-8">
                                <div className='flex flex-col lg:flex-row gap-5 lg:gap-10'>
                                    <form className='flex gap-2 flex-1'>
                                        <Input
                                            required
                                            type="email"
                                            name="email"
                                            placeholder="tu correo electrónico"
                                            className="rounded-full h-full py-2 text-white"
                                        />
                                        <Button type='submit' className='h-auto py-2 px-4 rounded-full cursor-pointer font-medium hover:bg-primary/80'>
                                            Suscribirme
                                        </Button>
                                    </form>
                                    <p className='text-sm flex-1 text-foreground'>
                                        Al suscribirte, aceptas recibir nuestros correos promocionales. Puedes darte de baja en cualquier momento.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Separator />
                    </div>
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-7 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
                            <h2 className="sm:text-5xl text-3xl font-medium mb-6 text-foreground">
                                Begin your path to success, contact us today.
                            </h2>
                            <Button className="py-3.5 px-6 rounded-full bg-primary hover:bg-primary/80 h-auto">
                                Contactar
                            </Button>
                        </div>
                        <div className="md:col-span-1" />
                        <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
                            <div className="flex flex-col gap-4">
                                {footerLinks.slice(0, 4).map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="block text-base text-muted-foreground hover:text-primary"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 ease-in-out fill-mode-both">
                            <div className="flex flex-col gap-4">
                                {footerLinks.slice(4, 8).map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="block text-base text-muted-foreground hover:text-primary"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-12">
                        <Separator />
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-in-out fill-mode-both">
                                ©2026 Yellow ERP. Todos los derechos reservados.
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
                                <Link href="/terminos" className="hover:text-primary transition-colors">Términos</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
