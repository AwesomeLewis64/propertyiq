# PropertyIQ interface update — 2.2 beta

The supplied concept guides the start page and application: white space, navy actions, blue accents, serif headings and a description/upload entry point. No paid AI API was added.

## Starting an analysis

- Describe a property and select **Analyze property**. Simple local text matching suggests explicitly labeled unit count, rent, purchase price, operating expenses, loan amount and interest rate. Review and edit every figure before creating the project. This does not answer arbitrary questions or verify assumptions.
- **Enter numbers manually** uses the same review form without extracted figures.
- Select one CSV/XLSX file up to 5 MB. Setup carries it into **Workbook imports** for worksheet/column mapping and explicit application. Original files are attached locally through the existing import workflow.
- **Review cash flow**, **Check an asking price** and **Compare financing** lead through setup into monthly cash, break-even or lender comparison. These evaluate entered assumptions; they do not establish market value.
- **Try with sample property** opens fictional eight-unit Maple Court. **Sample report** opens its readable report. First-year rent is $115,200, expenses $42,000 and NOI $73,200, matching the start-page card.
- **Open workspace** resumes saved browser-local projects. The annual model remains accessible through the start-page footer and workspace header.

## Workspace changes

Tools are grouped by task and filterable with **Find a tool**. The shared style covers cards, inputs, tables, reports and charts. Overview assumptions sit under expandable **Property details & model settings**. CSV/notes downloads are grouped under **Export**. **Property report** presents income, capital, dated returns, annual summaries and assumptions on screen; no printing is required.

Navigation saves valid monthly project data before leaving. Invalid/unreadable drafts require correction or a backup. **Create example** identifies fictional presets; **Add your property** leads to the start flow.

## Modeling boundaries

Missing setup amounts start at zero, without inherited fictional renovations, income, budgets or tax basis. Total rent is initially divided evenly among units; import/edit the rent roll for unit-specific values. An entered opening loan starts with 30-year amortization, five-year maturity and zero initial fees. The review screen discloses default exit cap (6.5%), selling costs (2.5%) and required return (10%). Development units remain unavailable, with no scheduled sales, until delivery/sales plans are entered. Review all assumptions before relying on results.

Existing projects and backups are retained. This update adds presentation/setup/report views; it does not revise the financial engine. Read [DECISION_TOOLS.md](DECISION_TOOLS.md) and [EXPANSION.md](EXPANSION.md) for financial limits.

## Limited verification

Four focused checks pass: supplied-description extraction; labeled annual amounts/financing; creation without inherited fictional plans; and sample/report financial consistency. TypeScript checking and the production build pass. A brief browser review covers the start page, editable review, sample report/grouped navigation and phone-width start page with no horizontal overflow. No full financial regression, exhaustive feature/device testing, real Walnut reconciliation or printing was performed.
