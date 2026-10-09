// One plain-language line per metric, shared by the overview cards and the report.
export const metricHelp: Record<string, string> = {
  "Purchase price": "What you pay for the property, before closing costs.",
  "Acquisition price": "What you pay for the property, before closing costs.",
  "Initial equity":
    "Cash you put in at closing: price, closing costs, initial CapEx and loan fees, less the loan.",
  "Year 1 NOI":
    "Rent and other income less operating costs. Excludes loan payments, reserves and CapEx.",
  "Going-in cap rate":
    "Year 1 NOI divided by the purchase price: your first-year yield before debt.",
  "Year 1 DSCR":
    "NOI divided by yearly loan payments. Above 1.0x, income covers the loan.",
  "Year 1 cash-on-cash":
    "First-year cash flow after loan payments, reserves and CapEx, divided by the cash you put in. Excludes the sale.",
  "Annual IRR":
    "Your yearly return including the sale, counting when cash goes in and comes out.",
  "Equity multiple": "All cash returned to you divided by all cash you put in.",
  "Net sale proceeds":
    "Cash left from the sale after selling costs and paying off the loan.",
  "Forward NOI":
    "NOI for the year after your hold; the sale price is based on it.",
  "Gross exit value": "Forward NOI divided by the exit cap rate.",
  "Total contributions":
    "All cash you put in, including any extra needed after closing.",
  "Total distributions": "All cash paid out to you, including the sale.",
  "Average annual cash-on-cash":
    "Average yearly operating cash flow divided by the cash invested.",
  "Appreciation after selling costs":
    "Sale value above the purchase price, after selling costs. Not a tax calculation.",
};
