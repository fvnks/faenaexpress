// Perfil de despliegue: el mismo código corre en dos instalaciones.
//
//   standalone  La instalación privada de una empresa (su dominio propio, sin
//               landing: el visitante sin sesión va directo a /login).
//   saas        Yellow ERP (yellow-erp.cl): con landing pública en `/`.
//
// Se define con la variable de entorno DEPLOYMENT_PROFILE; el default es
// standalone para no cambiar el comportamiento de la instalación actual.
export type DeploymentProfile = "standalone" | "saas";

export function deploymentProfile(): DeploymentProfile {
  return process.env.DEPLOYMENT_PROFILE === "saas" ? "saas" : "standalone";
}

export function isSaas(): boolean {
  return deploymentProfile() === "saas";
}
