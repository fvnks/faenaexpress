import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Términos de uso — Yellow ERP",
  description:
    "Condiciones para usar Yellow ERP: cuentas, planes y facturación, contenido del usuario, disponibilidad, responsabilidad y ley aplicable.",
};

export default function TerminosPage() {
  return (
    <LegalPage
      index="Legal"
      label="Términos"
      title="Términos de uso"
      description="Estas condiciones rigen el uso de Yellow ERP. Al crear una cuenta o seguir usándola, aceptas este acuerdo. Si representas a una empresa, confirmas que tienes autoridad para aceptarlo."
      published="25 de noviembre de 2026"
    >
      <LegalSection id="servicio" title="El servicio">
        <p>
          Yellow ERP es una aplicación para registrar compras, ventas, gastos, inventario, nómina y otras operaciones de una empresa, con montos en pesos chilenos e IVA 19 %. Puede incluir los módulos Contratados por tu organización: Facturas, Colegios, Punto de Venta y Obras.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" title="Tu cuenta y seguridad">
        <p>
          Eres responsable de mantener tus credenciales en secreto y de revisar la actividad de tu cuenta. Las acciones que se realicen con tu sesión se consideran tuyas. Si otra persona debe administrar tu organización, crea una cuenta propia para ella en vez de compartir la tuya. Puedes activar el segundo factor de autenticación desde tu perfil.
        </p>
      </LegalSection>

      <LegalSection id="planes" title="Planes y facturación">
        <p>
          Algunas funciones se ofrecen mediante planes con límites de uso. El plan se asocia a la organización, no a una persona, y se gestiona desde la consola de administración o desde la sección de facturación. Las suscripciones de pago se facturan según lo acordado con Yellow ERP; la falta de pago puede suspender el acceso previo aviso.
        </p>
      </LegalSection>

      <LegalSection id="contenido" title="Tus datos y tu contenido">
        <p>
          La información que registras sigue siendo tuya. Nos otorgas una licencia limitada para alojarla, procesarla y mostrarla con el único fin de prestar el servicio y cumplir la ley. No la usamos para entrenar modelos ni para fines publicitarios.
        </p>
      </LegalSection>

      <LegalSection id="uso" title="Uso permitido">
        <p>
          Debes usar el servicio de forma lícita y respetar la privacidad de las personas cuyos datos registras. No está permitido intentar acceder a cuentas ajenas, evadir los controles de acceso, saturar la infraestructura ni introducir código malicioso.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidad" title="Disponibilidad y soporte">
        <p>
          Buscamos mantener el servicio disponible de forma continua, pero pueden ocurrir interrupciones por mantención, fallas de proveedores o causas fuera de nuestro control. El soporte se canaliza por{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="responsabilidad" title="Responsabilidad">
        <p>
          Yellow ERP es una herramienta de apoyo para tu gestión. La revisión de la información contable, el cálculo de impuestos y las decisiones financieras son responsabilidad del usuario y de sus asesores. En la medida permitida por la ley, Yellow ERP no responde por lucro cesante ni por daños derivados del uso indebido del servicio.
        </p>
      </LegalSection>

      <LegalSection id="ley" title="Ley aplicable">
        <p>
          Estos términos se rigen por la legislación chilena. Las controversias se someten a los tribunales de Santiago, sin perjuicio de los derechos irrenunciables que la ley otorgue al usuario.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="Cambios en estos términos">
        <p>
          Podemos actualizar estas condiciones cuando el servicio cambie o lo exija la ley. Publicaremos la versión vigente en esta página con su fecha de actualización. Si tienes dudas, escríbenos a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
