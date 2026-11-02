import type { DocumentTreeNode } from "@/lib/sales";
import { formatCLP, formatDate } from "@/lib/money";
import { cardClass } from "@/lib/ui";

/** Tipo de relación visual entre nodos */
type RelationLabel = {
  text: string;
  color: "blue" | "green" | "orange" | "gray";
};

function relationLabel(type: DocumentTreeNode["relationType"]): RelationLabel {
  switch (type) {
    case "root":
      return { text: "Documento", color: "blue" };
    case "creditNote":
      return { text: "Nota de crédito", color: "blue" };
    case "debitNote":
      return { text: "Nota de débito", color: "orange" };
    case "adjustedDocument":
      return { text: "Documento ajustado", color: "gray" };
  }
}

/** Nodo individual del árbol */
function DocumentNode({
  node,
  depth = 0,
}: {
  node: DocumentTreeNode;
  depth?: number;
}) {
  const label = relationLabel(node.relationType);

  return (
    <div className="flex items-start gap-2">
      {/* Línea vertical de conexión para nodos no raíz */}
      {depth > 0 && (
        <div className="h-full w-1 border-l border-dashed border-gray-300 mx-1">
          {node.children.length > 0 && (
            <div className="absolute -left-1 h-full w-1 border-b border-dashed border-gray-300" />
          )}
        </div>
      )}

      {/* Contenido del nodo */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-xs font-medium border border-transparent">
            {label.text}
          </span>
          {node.documentNumber && (
            <span className="text-sm font-semibold truncate">
              {node.documentNumber}
            </span>
          )}
          {node.documentType && node.documentType !== node.relationType && (
            <span className="text-xs text-muted-foreground">
              ({node.documentType})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-sm text-muted-foreground">
            {formatDate(node.date)}
          </span>
          <span className="tabular text-sm font-medium">
            {formatCLP(node.totalAmount)}
          </span>
          <span className={`text-xs text-${getStatusColor(node.status)}`}>
            {node.status}
          </span>
        </div>
      </div>

      {/* Hijos */}
      {node.children.length > 0 && (
        <div className="ml-6 flex flex-col gap-2">
          {node.children.map((child) => (
            <DocumentNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "muted-foreground";
    case "PARTIAL":
      return "accent";
    case "OVERDUE":
      return "danger";
    case "CANCELLED":
      return "danger";
    default:
      return "muted-foreground";
  }
}

/** Árbol de historial de documentos relacionados (notas de crédito/débito). */
export default function DocumentHistoryTree({
  tree,
}: {
  tree: DocumentTreeNode | null;
}) {
  if (!tree) return null;

  return (
    <div className={cardClass + " p-4 mt-4"}>
      <h2 className="font-semibold">Historial de documentos relacionados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Las notas de crédito y débito que ajustan este documento y los
        documentos que ellas mismas ajustan.
      </p>
      <div className="mt-4">
        <DocumentNode node={tree} />
      </div>
    </div>
  );
}
