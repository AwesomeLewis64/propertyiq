import type { Assumptions, Model } from "../finance/types";
export function csvText(rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    const raw = v === null ? "" : String(v);
    const safe =
      typeof v === "string" && /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
export function download(
  name: string,
  text: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function projectionCsv(a: Assumptions, m: Model): string {
  const header = [
    "Year",
    "Scheduled residential rent",
    "Vacancy loss",
    "Credit loss",
    "Concessions",
    "Other income",
    "EGI",
    "Taxes",
    "Insurance",
    "Repairs",
    "Utilities",
    "Payroll",
    "Administration",
    "Marketing",
    "Other expenses",
    "Management",
    "Operating expenses",
    "NOI",
    "Debt service",
    "Interest",
    "Principal",
    "Reserves",
    "Annual CapEx",
    "Operating equity cash",
    "Sale proceeds",
    "Total equity cash",
    "Loan balance",
  ];
  const rows: (string | number | null)[][] = [
    header,
    [0, ...Array(header.length - 3).fill(null), -m.initialEquity, m.loan],
  ];
  for (const y of m.years)
    rows.push([
      y.year,
      y.grossRent,
      -y.vacancyLoss,
      -y.creditLoss,
      -y.concessions,
      y.otherIncome,
      y.egi,
      -y.expenses.taxes,
      -y.expenses.insurance,
      -y.expenses.repairs,
      -y.expenses.utilities,
      -y.expenses.payroll,
      -y.expenses.administration,
      -y.expenses.marketing,
      -y.expenses.other,
      -y.management,
      -y.opex,
      y.noi,
      y.debt ? -y.debt.service : null,
      y.debt?.interest ?? null,
      y.debt?.principal ?? null,
      -y.reserves,
      -y.capex,
      y.year <= a.hold ? y.operatingCash : null,
      y.year === a.hold ? m.netSale : 0,
      y.equityCash,
      y.debt?.balance ?? null,
    ]);
  return csvText(rows);
}
export function debtCsv(m: Model): string {
  return csvText([
    [
      "Month",
      "Opening principal",
      "Regular payment",
      "Interest",
      "Principal paid",
      "Closing principal",
    ],
    ...m.months.map((r) => [
      r.month,
      r.opening,
      r.payment,
      r.interest,
      r.principal,
      r.balance,
    ]),
  ]);
}
