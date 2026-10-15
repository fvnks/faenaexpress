type InventoryAbcProduct = {
  id: string;
  name: string;
  sku: string;
  quantity: string | number;
  avgCost: string | number;
  categoryName?: string | null;
};

export function classifyAbcInventory(
  products: InventoryAbcProduct[],
  saleAmountByProduct: Map<string, number>,
  fromDate: Date,
  now: Date,
) {
  const ranked = products
    .map((product) => ({
      ...product,
      amount: saleAmountByProduct.get(product.id) ?? 0,
      currentStock: Number(product.quantity),
    }))
    .filter((product) => product.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalAmount = ranked.reduce((sum, product) => sum + product.amount, 0);
  let cumulative = 0;
  const rows = ranked.map((product) => {
    cumulative += product.amount;
    const cumulativePercentage = totalAmount > 0 ? Math.round((cumulative / totalAmount) * 1000) / 10 : 0;
    const abc = cumulativePercentage <= 80 ? "A" : cumulativePercentage <= 95 ? "B" : "C";
    return { ...product, cumulativePercentage, abc };
  });

  const summary = {
    A: rows.filter((row) => row.abc === "A"),
    B: rows.filter((row) => row.abc === "B"),
    C: rows.filter((row) => row.abc === "C"),
  };

  return { rows, summary, totalAmount, fromDate, now };
}