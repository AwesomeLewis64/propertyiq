import {
  Card,
  NumberField,
  TextField,
  Toggle,
  Select,
  Metric,
} from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import type { Forecast } from "./types";
import { money, multiple, pct } from "../ui/format";
import { uid } from "./defaults";
export default function ReturnsPanel({
  p,
  set,
  m,
}: { m: Forecast } & ProjectEditor) {
  return (
    <>
      <Card title="Dated equity returns and required return">
        <div className="adv-form">
          <NumberField
            label="Annual required return / NPV discount rate"
            value={p.discount}
            percent
            onChange={(v) => set({ ...p, discount: v })}
          />
          <NumberField
            label="Existing property equity value at forecast start"
            value={p.asOfEquity}
            onChange={(v) => set({ ...p, asOfEquity: v })}
          />
        </div>
        <div className="metrics adv-metrics">
          <Metric
            label="Forecast XIRR"
            value={pct(m.irr)}
            note={m.irrReason ?? "Actual dates; 365-day discounting"}
          />
          <Metric label="Net present value" value={money(m.npv)} />
          <Metric
            label="Since-acquisition XIRR"
            value={pct(m.inceptionIrr)}
            note="Historical flows + future distributions / calls"
          />
          <Metric label="Equity multiple" value={multiple(m.multiple)} />
        </div>
        <p>
          Existing-property forward returns start with entered as-of equity,
          which represents the opportunity cost of continuing to hold.
          Since-acquisition returns use your historical equity flows instead of
          that as-of outflow. Enter all earlier contributions and distributions,
          including the original acquisition contribution.
        </p>
        <h3>Historical equity flows</h3>
        {p.historical.map((f, i) => (
          <div className="adv-inline" key={i}>
            <TextField
              label="Flow date"
              value={f.date}
              type="date"
              onChange={(v) =>
                set({
                  ...p,
                  historical: p.historical.map((x, j) =>
                    i === j ? { ...x, date: v } : x,
                  ),
                })
              }
            />
            <NumberField
              label="Signed amount (contribution negative)"
              value={f.amount}
              onChange={(v) =>
                set({
                  ...p,
                  historical: p.historical.map((x, j) =>
                    i === j ? { ...x, amount: v } : x,
                  ),
                })
              }
            />
            <TextField
              label="Flow note"
              value={f.note}
              onChange={(v) =>
                set({
                  ...p,
                  historical: p.historical.map((x, j) =>
                    i === j ? { ...x, note: v } : x,
                  ),
                })
              }
            />
            <button
              className="button small"
              onClick={() =>
                set({
                  ...p,
                  historical: p.historical.filter((_, j) => i !== j),
                })
              }
            >
              Remove flow
            </button>
          </div>
        ))}
        <button
          className="button"
          onClick={() =>
            set({
              ...p,
              historical: [
                ...p.historical,
                {
                  date:
                    p.acquisitionDate < p.startDate
                      ? p.acquisitionDate
                      : "2025-11-01",
                  amount: -100000,
                  note: "Equity contribution",
                },
              ],
            })
          }
        >
          Add historical flow
        </button>
      </Card>
      <Card
        title="Partners and distribution waterfall"
        note="Pro-rata capital calls; optional noncompounding preferred return, capital return and sponsor promote. No catch-up, clawback or multiple hurdle tiers."
      >
        <Toggle
          label="Apply preferred return and promote waterfall"
          value={p.waterfall.enabled}
          onChange={(v) =>
            set({ ...p, waterfall: { ...p.waterfall, enabled: v } })
          }
        />
        {p.partners.map((v, i) => (
          <div className="adv-inline" key={v.id}>
            <TextField
              label="Partner name"
              value={v.name}
              onChange={(n) =>
                set({
                  ...p,
                  partners: p.partners.map((x, j) =>
                    i === j ? { ...x, name: n } : x,
                  ),
                })
              }
            />
            <NumberField
              label="Ownership / contribution share"
              value={v.share}
              percent
              onChange={(n) =>
                set({
                  ...p,
                  partners: p.partners.map((x, j) =>
                    i === j ? { ...x, share: n } : x,
                  ),
                })
              }
            />
            <button
              className="button small"
              disabled={
                p.partners.length === 1 || v.id === p.waterfall.sponsorId
              }
              onClick={() =>
                set({ ...p, partners: p.partners.filter((_, j) => j !== i) })
              }
            >
              Remove partner
            </button>
          </div>
        ))}
        <button
          className="button small"
          onClick={() =>
            set({
              ...p,
              partners: [
                ...p.partners,
                { id: uid(), name: "New partner", share: 0 },
              ],
            })
          }
        >
          Add partner
        </button>
        {p.waterfall.enabled && (
          <div className="adv-form">
            <NumberField
              label="Annual preferred return on unreturned capital"
              value={p.waterfall.preferred}
              percent
              onChange={(v) =>
                set({ ...p, waterfall: { ...p.waterfall, preferred: v } })
              }
            />
            <NumberField
              label="Sponsor promote on residual cash"
              value={p.waterfall.promote}
              percent
              onChange={(v) =>
                set({ ...p, waterfall: { ...p.waterfall, promote: v } })
              }
            />
            <Select
              label="Sponsor receiving promote"
              value={p.waterfall.sponsorId}
              onChange={(v) =>
                set({ ...p, waterfall: { ...p.waterfall, sponsorId: v } })
              }
              options={p.partners.map((v) => [v.id, v.name])}
            />
            <Toggle
              label="Return capital before paying preferred return"
              value={p.waterfall.returnCapitalFirst}
              onChange={(v) =>
                set({
                  ...p,
                  waterfall: { ...p.waterfall, returnCapitalFirst: v },
                })
              }
            />
          </div>
        )}
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Partner",
                  "Contributed",
                  "Distributed",
                  "Unreturned capital",
                  "Unpaid preferred",
                  "XIRR",
                  "Multiple",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.partners.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{money(v.contributed)}</td>
                  <td>{money(v.distributed)}</td>
                  <td>{money(v.endingCapital)}</td>
                  <td>{money(v.unpaidPref)}</td>
                  <td>{pct(v.irr)}</td>
                  <td>{multiple(v.multiple)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card
        title="User-defined tax scenario"
        note="An estimate from entered rates and basis. It does not determine tax law, permitted depreciation, passive-loss limits or partner tax allocations."
      >
        <Toggle
          label="Calculate illustrative after-tax project returns"
          value={p.tax.enabled}
          onChange={(v) => set({ ...p, tax: { ...p.tax, enabled: v } })}
        />
        {p.tax.enabled && (
          <>
            <div className="adv-form">
              {(
                [
                  [
                    "ordinaryRate",
                    "Ordinary income / development profit rate",
                    true,
                  ],
                  ["capitalRate", "Rental sale capital-gain rate", true],
                  ["recaptureRate", "Depreciation recapture rate", true],
                  [
                    "depreciableBasis",
                    "Maximum forecast depreciation basis",
                    false,
                  ],
                  [
                    "annualDepreciation",
                    "Annual entered depreciation allowance",
                    false,
                  ],
                  [
                    "saleBasis",
                    "Sale tax basis before forecast depreciation",
                    false,
                  ],
                ] as const
              ).map(([k, label, percent]) => (
                <NumberField
                  key={k}
                  label={label}
                  value={p.tax[k]}
                  percent={percent}
                  onChange={(v) => set({ ...p, tax: { ...p.tax, [k]: v } })}
                />
              ))}
              <Toggle
                label="Assume operating tax losses generate immediate offsets"
                value={p.tax.lossOffset}
                onChange={(v) =>
                  set({ ...p, tax: { ...p.tax, lossOffset: v } })
                }
              />
            </div>
            <Metric
              label="Illustrative after-tax XIRR"
              value={pct(m.afterTaxIrr)}
            />
            <p>
              Operating taxable income is NOI less interest and entered
              depreciation. Rental sale gain uses entered sale basis reduced by
              forecast depreciation. Development profit uses a uniform per-unit
              allocation of entered basis. Tax is an investor outflow outside
              project cash, not a forecast of tax payment dates. Prior
              depreciation and capitalized-interest treatment require separate
              tax review.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
