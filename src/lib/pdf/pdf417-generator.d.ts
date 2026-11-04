// pdf417-generator es CommonJS y expone { PDF417, HUB3 } sin archivos de
// declaración. Se tipa sin `any` para cumplir `no-explicit-any`.
declare module "pdf417-generator" {
  interface Pdf417Canvas {
    width: number;
    height: number;
    getContext: () => {
      scale: (...args: unknown[]) => void;
      fillStyle: string;
      fillRect: (x: number, y: number, w: number, h: number) => void;
    };
  }
  const PDF417: {
    draw(code: string, canvas: Pdf417Canvas, ...rest: unknown[]): void;
  };
  const HUB3: unknown;
  export { PDF417, HUB3 };
  export default { PDF417, HUB3 };
}
