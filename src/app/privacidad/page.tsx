import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacidad — Yellow ERP",
  description:
    "Cómo trata Yellow ERP los datos de tu cuenta, tus documentos y tu información de acceso. Derechos, conservación, seguridad y cookies.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      index="Legal"
      label="Privacidad"
      title="Política de privacidad"
      description="Yellow ERP es una herramienta para registrar la contabilidad de una empresa. Por eso tratamos tus datos con el mismo cuidado con que trataríamos los nuestros: solo para prestar el servicio y cumplir la ley chilena."
      published="25 de noviembre de 2026"
    >
      <LegalSection id="responsable" title="Quién es responsable de tus datos">
        <p>
          El responsable del tratamiento es <strong className="text-foreground">Yellow ERP</strong>. Puedes escribirnos a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>{" "}
          para cualquier consulta sobre esta política o sobre tus datos.
        </p>
      </LegalSection>

      <LegalSection id="datos" title="Qué datos tratamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Datos de la cuenta: nombre, correo electrónico y contraseña guardada como hash.</li>
          <li>Datos de la organización y de las empresas: razón social, RUT y configuración contable.</li>
          <li>Documentos que registras: compras, ventas, gastos, abonos, inventario y sus centros de costo.</li>
          <li>Terceros que aparecen en esos documentos: proveedores, clientes, trabajadores y pagadores.</li>
          <li>Registros de acceso y auditoría: fecha, acción realizada y dirección IP, usados para reconstruir cambios.</li>
          <li>Preferencias de la interfaz, como el tema claro u oscuro y la empresa, colegio u obra activa.</li>
        </ul>
      </LegalSection>

      <LegalSection id="finalidades" title="Para qué los usamos">
        <p>
          Usamos estos datos para prestar el servicio, guardar y ordenar tu información financiera, aplicar los permisos de cada usuario, mantener la trazabilidad de los cambios, responder solicitudes de soporte y cumplir obligaciones legales y tributarias aplicables en Chile.
        </p>
        <p>
          No usamos tus documentos para publicidad ni los vendemos a terceros.
        </p>
      </LegalSection>

      <LegalSection id="compartir" title="Con quién los compartimos">
        <p>
          Solo compartimos la información necesaria con los proveedores que permiten operar el servicio, como el alojamiento de la base de datos y la infraestructura de ejecución. También podemos entregarla cuando una autoridad lo exija por ley. Los usuarios de tu organización ven los datos según el rol y las secciones que tu administrador les asigne.
        </p>
      </LegalSection>

      <LegalSection id="conservacion" title="Cuánto tiempo los conservamos">
        <p>
          Conservamos tus datos mientras la cuenta esté activa y, después de cerrarla, durante los plazos que exija la normativa fiscal y contable chilena. Transcurridos esos plazos, los eliminamos o los dejamos irreversibles para usos estadísticos.
        </p>
      </LegalSection>

      <LegalSection id="derechos" title="Tus derechos">
        <p>
          Puedes pedir acceso, rectificación, eliminación, oposición al tratamiento o portabilidad de tus datos personales. Escríbenos a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>{" "}
          y responderemos la solicitud dentro de los plazos legales. Si los datos están en una cuenta de tu empresa, es posible que el administrador de esa organización deba intervenir.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="Seguridad">
        <p>
          La conexión usa cifrado en tránsito, las contraseñas se guardan con hash, las sesiones son opacas y el acceso a cada sección se valida en el servidor. El segundo factor de autenticación está disponible para quienes administran una cuenta. Ningún sistema es infalible: si detectas un acceso que no reconoces, cambia tu contraseña y avísanos.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies y almacenamiento local">
        <p>
          Usamos una cookie de sesión para mantenerte autenticado, cookies para recordar la empresa, el colegio o la obra activa, y una preferencia local para el tema claro u oscuro. No usamos cookies de publicidad ni de seguimiento de terceros. Puedes limitarlas en tu navegador, aunque algunas partes del servicio dejarán de funcionar.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="Cambios en esta política">
        <p>
          Si hacemos cambios que afecten tus derechos o el uso del servicio, los publicaremos aquí con una fecha nueva. Para consultas sobre esta política, escríbenos a{" "}
          <a href="mailto:contacto@yellow-erp.cl" className="text-primary underline-offset-2 hover:underline">
            contacto@yellow-erp.cl
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
