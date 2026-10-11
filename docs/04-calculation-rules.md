# ScopeGuard - Domain Calculation & Financial Rules

---

## 1. Monetary Precision & Storage Standard

### Principle: Absolute Integer Representation
Floating-point data types (`FLOAT`, `DOUBLE PRECISION`, JavaScript `number` division without rounding) inevitably introduce precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In commercial contracts, fractional penny drift causes invoice disputes.

- **Storage Standard:** All monetary amounts are stored as **integer minor units** in the database (`integer` / `bigint` in PostgreSQL).
- **Currencies & Minor Unit Exponents:**
  - `INR`: Stored in **paise** ($1\text{ INR} = 100\text{ paise}$).
  - `USD`: Stored in **cents** ($1\text{ USD} = 100\text{ cents}$).
  - `EUR`: Stored in **cents** ($1\text{ EUR} = 100\text{ cents}$).
  - `GBP`: Stored in **pence** ($1\text{ GBP} = 100\text{ pence}$).
- **Database CHECK Constraint:** All currency columns must enforce `CHECK (amount_minor >= 0)`.

---

## 2. Pricing Formulas & Rounding Rules

### A. Hourly Pricing Calculation
When a change request utilizes hourly pricing, the estimate is computed from estimated hours and the hourly rate.

$$\text{cost\_minor} = \text{round}(\text{hours} \times \text{rate\_minor})$$

#### Rounding Method: Deterministic Half-Up
To ensure parity between server actions, database generated columns, and unit tests, ScopeGuard implements **half-up rounding** (fractions of $0.5$ or greater round up to the next integer minor unit):

```typescript
// lib/domain/money.ts
export function calculateHourlyCost(hours: number, rateMinor: number): number {
  if (hours < 0 || rateMinor < 0) {
    throw new Error("Hours and rate must be non-negative");
  }
  return Math.floor(hours * rateMinor + 0.5);
}
```

#### Worked Examples

* **Worked Example 1 (Standard):**
  - Input: $12.5\text{ hours}$ at $₹1,500.00/\text{hr}$
  - Rate in Minor Units: $150,000\text{ paise}$
  - Multiplication: $12.5 \times 150,000 = 1,875,000.0\text{ paise}$
  - Result: **$1,875,000\text{ paise}$** (Formatted: **₹18,750.00**)

* **Worked Example 2 (Fractional Cent Boundary):**
  - Input: $3.33\text{ hours}$ at $\$85.50/\text{hr}$
  - Rate in Minor Units: $8,550\text{ cents}$
  - Multiplication: $3.33 \times 8,550 = 28,471.5\text{ cents}$
  - Half-Up Rounding: $\lfloor 28,471.5 + 0.5 \rfloor = 28,472\text{ cents}$
  - Result: **$28,472\text{ cents}$** (Formatted: **$284.72**)

* **Worked Example 3 (Zero Case):**
  - Input: $0.0\text{ hours}$ at $\$120.00/\text{hr}$
  - Result: **$0\text{ cents}$** (Formatted: **$0.00**)

---

### B. Fixed Charge Parsing
For fixed-fee change requests, users enter a decimal string (e.g. `"2500.00"`). To eliminate floating-point parsing errors, conversion to minor units uses string tokenization:

```typescript
// lib/domain/money.ts
export function parseDecimalToMinor(amountStr: string): number {
  const sanitized = amountStr.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    throw new Error("Invalid currency decimal format");
  }
  const [whole, decimal = ""] = sanitized.split(".");
  const paddedDecimal = (decimal + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(paddedDecimal, 10);
}
```

---

## 3. Project Rollup & Impact Formulas

### A. Source of Truth
Project financial totals **must never be aggregated from mutable rows in `change_requests`**. 
Approved figures aggregate strictly from frozen rows in `change_request_versions` that have a corresponding record in `approvals` where `decision = 'approved'`.

```text
               ┌───────────────────────┐
               │    change_requests    │ (Mutable draft working row)
               └───────────────────────┘
                           │
             [On Publish: Snapshot created]
                           │
                           ▼
               ┌───────────────────────┐
               │change_request_versions│ (Immutable frozen JSONB payload)
               └───────────────────────┘
                           │
             [On Client Approve: Record inserted]
                           │
                           ▼
               ┌───────────────────────┐
               │       approvals       │ (UNIQUE per version_id)
               └───────────────────────┘
                           │
             [Rollup Query evaluates ONLY this junction]
```

### B. Rollup Math

1. **Original Contract Budget:**
   $$\text{original\_budget\_minor} = \text{projects.budget\_minor}$$

2. **Approved Additional Charges:**
   $$\text{approved\_extra\_minor} = \sum_{v \in \text{approved\_versions}} v.\text{cost\_minor}$$

3. **Revised Total Estimated Budget:**
   $$\text{revised\_budget\_minor} = \text{original\_budget\_minor} + \text{approved\_extra\_minor}$$

4. **Pending Estimates (Display Only - Clearly Marked "Unapproved"):**
   $$\text{pending\_extra\_minor} = \sum_{r \in \text{pending\_requests}} r.\text{cost\_minor}$$

---

## 4. Revised Deadline Calculation

When multiple change requests are approved, each may propose an extended completion date.

### The Rule
The project’s revised deadline equals the latest `proposed_deadline` among all approved version snapshots, falling back to the project’s original contractual deadline if no approved requests propose a later date:

$$\text{revised\_deadline} = \max(\{\text{original\_deadline}\} \cup \{v.\text{proposed\_deadline} \mid v \in \text{approved\_versions} \land v.\text{proposed\_deadline} \ne \text{null}\})$$

#### Timeline Delta Days
$$\Delta\text{days} = \text{daysBetween}(\text{revised\_deadline}, \text{original\_deadline})$$

*If $\text{revised\_deadline} \le \text{original\_deadline}$, $\Delta\text{days} = 0$.*

---

## 5. Preventing Double Counting

ScopeGuard guarantees that no approved change request can ever be double counted in metrics:

1. **Database Relational Constraint:**
   `approvals` enforces `UNIQUE(version_id)`. A proposal version can never have more than one approval record.
2. **Terminal State Lockdown:**
   Once a request reaches `status = 'approved'`, database triggers block any updates to the request or version records.
3. **Single Version per Decision:**
   When a proposal is revised from $v_1$ to $v_2$, $v_1$ is never approved because its token was revoked. Only $v_2$ can be approved.
4. **Distinct Request Association:**
   Each approved version snapshot is uniquely mapped to its parent `change_request_id`. Rollups group by `change_request_id` to guarantee a 1:1 rollup mapping.

---

## 6. Multi-Currency Handling

### Prohibition of Mixed-Currency Aggregation
Projects in an agency workspace may operate in distinct currencies (e.g., Client A in `INR`, Client B in `USD`).
- **Strict Rule:** Currency values are **never** summed or converted across currencies without an explicit foreign exchange rate engine.
- **Project Boundary:** All change requests for a project strictly inherit the project’s base currency.
- **Dashboard Grouping:** Workspace-level metrics are computed and displayed grouped by currency:

```typescript
export interface CurrencyMetricRollup {
  currency: string;
  originalBudgetMinor: number;
  approvedExtraMinor: number;
  revisedBudgetMinor: number;
  activeProjectCount: number;
}

// Result represented as an array of currency rollups:
// [
//   { currency: "INR", approvedExtraMinor: 1875000, ... }, // ₹18,750.00
//   { currency: "USD", approvedExtraMinor: 45000,   ... }, // $450.00
// ]
```
The agency dashboard renders one card/line per currency rather than displaying a misleading single sum.
