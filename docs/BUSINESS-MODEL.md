# ScopeGuard Business Model & Monetization Strategy

> [!WARNING]
> **DISCLAIMER:** The financial projections, unit economics, conversion rates, and revenue models contained in this document are **unvalidated hypotheses** for market exploration. ScopeGuard makes no guarantees regarding revenue, profit, customer acquisition cost, or commercial viability.

**Document Date:** October 18, 2026  
**Target Market:** Digital Product Agencies, Software Development Consultancies, Design Studios (B2B SaaS)

---

## 1. Value Proposition & Pricing Hypotheses

Software agencies lose an estimated 10–25% of potential project revenue to informal scope creep—verbal requests on Zoom, "quick additions" in Slack, and awkward invoice negotiations at project completion. 

ScopeGuard transforms unbudgeted scope changes into transparent, client-approved revenue via 1-click mobile approval links.

### Launch Pricing Tiers (Hypotheses)

| Tier | Price (Hypothesis) | Target Audience | Key Feature Limits |
|---|---|---|---|
| **Free Tier** | **₹0 / forever** | Solo freelancers & boutique studios | 1 Active Project<br>Up to 3 Change Requests per month<br>Standard bearer approval links<br>Community support |
| **Pro Tier** | **₹799 / month**<br>*(~$9.99/mo USD)* | Growing software agencies (3–10 devs) | **Unlimited Active Projects**<br>Unlimited Change Requests<br>Multi-currency workspace support (USD, INR, EUR, GBP)<br>Live recalculation impact panels<br>Activity audit history stream |
| **Agency Tier** | **₹1,999 / month**<br>*(~$24.99/mo USD)* | Established consultancies (10–50 team members) | Everything in Pro<br>Role-based access control (Owner, Manager, Member)<br>Team member permission enforcement<br>Exportable CSV/PDF audit trails (Roadmap P1)<br>Custom agency branding & logo on client approval portal |
| **Custom / Enterprise** | Custom annual contract | Large IT services & dev firms (50+ seats) | Custom SLAs<br>SSO / SAML authentication<br>Dedicated onboarding & compliance reporting |

*Note: In the ScopeGuard MVP, payment gateways are not yet connected. Tier limits are presented as display metadata.*

---

## 2. Unit Economics Hypotheses (Year 1 Model)

The following financial estimates represent working hypotheses to be validated through customer discovery and pilot programs:

```
[Freemium Ingestion]
       |
       v (5% Free-to-Paid Conversion)
[Pro Tier: ₹799/mo]  <-- 70% of paid users
       |
       v (20% Expansion / Upgrade)
[Agency Tier: ₹1,999/mo] <-- 30% of paid users
```

### Key Metrics Hypotheses
- **Blended ARPU (Average Revenue Per User - Paid):**
  $$\text{ARPU} = (0.70 \times ₹799) + (0.30 \times ₹1,999) = ₹559.30 + ₹599.70 \approx ₹1,159\text{/month}\quad (\approx \$14.00\text{/mo})$$
- **Target Customer Acquisition Cost (CAC):** $\le ₹3,500$ ($\approx \$42.00$) via organic content marketing, product hunt, agency communities, and word-of-mouth.
- **Payback Period:**
  $$\text{Payback Period} = \frac{\text{CAC}}{\text{ARPU}} = \frac{₹3,500}{₹1,159} \approx 3.0\text{ months}$$
- **Projected Monthly Churn:** $3.5\%$ (common benchmark for B2B agency SaaS).
- **Hypothetical Customer Lifetime Value (LTV):**
  $$\text{LTV} = \frac{\text{ARPU}}{\text{Churn}} = \frac{₹1,159}{0.035} \approx ₹33,114\quad (\approx \$398.00)$$
- **Hypothetical LTV:CAC Ratio:**
  $$\frac{\text{LTV}}{\text{CAC}} = \frac{₹33,114}{₹3,500} \approx 9.46\times\quad \text{(Target Benchmark } \ge 3\times\text{)}$$

---

## 3. Go-To-Market (GTM) Strategy

### Phase 1: Product-Led Organic Adoption (Months 1–3)
- **Built-in Viral Mechanism:** Every proposal sent by an agency introduces an enterprise client to the ScopeGuard approval experience. A subtle footer link on the public approval portal (*"Protected by ScopeGuard"*) drives inbound awareness among client stakeholders who may manage other agencies.
- **Community Seeding:** Publish open-source scope negotiation guides, contract addendum templates, and scope creep calculators in agency subreddits (`r/agency`, `r/freelance`), Product Hunt, and Indie Hackers.

### Phase 2: Direct Agency Founder Outreach (Months 4–6)
- Target technical agency owners and project directors on LinkedIn and Clutch.co.
- Offer free 90-day trials in exchange for customer discovery interviews (per `docs/INTERVIEW-QUESTIONS.md`).

---

## 4. Key Business Risks & Mitigations

1. **Risk: "Clients refuse to click links outside email."**
   - *Mitigation:* The approval portal is zero-friction: mobile-optimized at 360px width, requires 0 account logins, and displays the exact transparent calculation breakdown.
2. **Risk: "Agencies build their own Google Docs or ClickUp form workaround."**
   - *Mitigation:* Focus on the immutable audit trail and version snapshot locking that generic PM tools cannot provide.
3. **Risk: "High churn on completion of projects."**
   - *Mitigation:* Target agencies with continuous retainer and milestone pipelines; price on workspace seats rather than per-project fees.

