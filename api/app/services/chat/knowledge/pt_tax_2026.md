# Portuguese IRS Optimization Knowledge Base (2025/2026)

Reference for the mr-ducky chat brain. Numbers reflect IRS to be filed in 2026 (income year 2025) and OE 2026 changes affecting income year 2026 onward. Source URLs at the bottom of each section. The full official codex is the **CIRS** on portaldasfinancas.gov.pt.

---

## 1. Deduções à Coleta (deductions from tax owed)

These reduce the actual IRS *due*, not just the taxable base. They're aggregated and capped by a global ceiling that scales with rendimento coletável: no cap below ~€8,059; tapered formula between €8,059 and €83,696; hard cap above €83,696.

### 1.1 Despesas gerais familiares (Art. 78-B CIRS)
- **What**: catch-all for invoices "com NIF" that don't fit a specialised category (groceries, clothes, fuel, utilities, etc.).
- **Rate / cap**: 35% of qualifying expenses, capped at **€250 per taxpayer**. Single-parent families: 45%, capped at **€335**.
- **How**: invoices auto-flow into Portal das Finanças via e-fatura when the NIF is on the receipt.
- **Where**: Anexo H, quadro 6 (auto-populated from e-fatura).

### 1.2 Saúde (health) — Art. 78-C
- **What**: medical/dental services, medicines (IVA 6%), health insurance premiums, exempt or reduced-IVA medical goods. Items at the standard 23% IVA rate need a medical prescription to qualify.
- **Rate / cap**: **15%**, max **€1,000** per agregado.
- **Where**: Anexo H, quadro 6 (auto from e-fatura, sector "Saúde").

### 1.3 Educação e formação — Art. 78-D
- **What**: tuition (creche to university), school books (only at "Educação"-sector merchants), tutoring, training, **rendas de estudante deslocado** (student housing rent when studying away from home town).
- **Rate / cap**: **30%**, base cap **€800** per agregado, can rise to **€1,000** if the surplus comes from student-housing rent (capped at €400/year per student, contract must mention "estudante deslocado", student under 25, school > 50 km from family residence). Extra **+10%** majoration (cap €1,000) if the school is in the interior or Regiões Autónomas.
- **Where**: Anexo H, quadro 6.

### 1.4 Habitação — Art. 78-E
Two parallel mechanisms; you only get one for the same dwelling.
- **Juros de crédito habitação (mortgage interest)**: **15%** of interest paid. **Only contracts signed up to 31 Dec 2011**. Cap **€296**, raised to up to €450 for low-income households (€450 if rendimento coletável ≤ 1st bracket; sliding €296–€450 between 1st bracket and €30,000). **Refinancing/transfer to another bank kills eligibility** (AT treats it as a new contract).
- **Rendas de habitação permanente (rent)**: **15%** of rent paid for permanent residence. Cap **€700** for income year 2025 (filed 2026), rising to **€900 in 2026** and **€1,000 in 2027** per OE 2026. Sliding scale up to €900 for low-income households. Contract must be registered with AT.
- **Where**: Anexo H, quadro 7 (mortgage interest) and quadro 6 (rent, sector "Habitação - Rendas").

### 1.5 Lares (nursing homes) — Art. 84
- **What**: domiciliary care, nursing homes for the taxpayer, ascendants, collaterals up to 3rd degree, dependents with disabilities. Beneficiary's income must be ≤ minimum wage.
- **Rate / cap**: **25%**, max **€403.75** per agregado.
- **Where**: Anexo H, quadro 6-C.

### 1.6 Pensões de alimentos (alimony) — Art. 83-A
- **What**: court-ordered or homologated alimony.
- **Rate / cap**: **20% with NO cap** (very valuable when applicable).
- **Where**: Anexo H, quadro 6-A.

### 1.7 PPR (Plano Poupança Reforma) — EBF Art. 21
- **What**: contributions to a personal retirement plan.
- **Rate / cap (per taxpayer, age band)**:
  - **< 35 anos**: 20% deduction, max €400 → invest up to **€2,000**
  - **35–50**: 20%, max €350 → up to €1,750
  - **> 50**: 20%, max €300 → up to €1,500
- Age is fixed on **1 January** of contribution year. No deduction if you're already retired.
- **Lock-up / withdrawal**: full tax benefit only at retirement (≥60), permanent disability, long-term unemployment, serious illness, or to pay primary-residence mortgage. Then payouts are taxed at **8% liberatória** on the gain. Early withdrawal outside legal cases = pay back deductions plus 10% penalty per year held.
- **Where**: Anexo H, quadro 6-B, código 601 (or 602 for PPR Reforma post-60).

### 1.8 Donativos — EBF Art. 62 ff.
- **What**: gifts to recognised IPSS, NGOs, religious institutions, public museums, foundations.
- **Rate / cap**: **25%** of donation, capped at **15% of the IRS coleta** (effectively unlimited for normal taxpayers). Cultural/social donations get a **+30% majoration** (so €1,000 counts as €1,300, deducting €325). State-related donations have no coleta cap.
- **Where**: Anexo H, quadro 6-B (autorização automática if registered).

### 1.9 IVA suportado em faturas — Art. 78-F (the "sector" deductions)
- **Rates**:
  - **Restauração e alojamento**: 15% of IVA paid
  - **Cabeleireiros, institutos de beleza**: 15%
  - **Veterinários (serviços e medicamentos)**: 35% (medicamentos sujeitos a receita: 22.5%)
  - **Oficinas / reparação de viaturas e motos**: 15%
  - **Ginásios e atividades desportivas**: 30% (new, OE2025/26)
  - **Passes mensais e bilhetes de transportes públicos**: 100% of IVA paid
  - **Cultura (livros, teatro, concertos, museus, monumentos, bibliotecas)**: 15% — **new in OE 2026**
- **Combined cap**: **€250 per agregado** for the sum of these sector IVA deductions (transports/passes have own slot but globally capped within the same €250 envelope).
- **Where**: e-fatura (Portal das Finanças → "Despesas para Deduções à Coleta") — must validate the sector by **2 March 2026** (ordinary deadline 28 Feb, extended when weekend).

### 1.10 Reabilitação urbana de imóveis — EBF Art. 71
- **What**: works on properties in ARU (Áreas de Reabilitação Urbana) or NRAU buildings.
- **Rate / cap**: **30%**, max **€500** per agregado. Requires municipal certification.
- **Where**: Anexo H, quadro 6-B, código 607.

Sources for §1: [PwC Guia Fiscal IRS 2026](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html), [Doutor Finanças deduções](https://www.doutorfinancas.pt/impostos/irs/quais-os-valores-maximos-de-deducoes-fiscais/), [Portal das Finanças Art. 78-F](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78f.aspx), [Idealista IRS 2026](https://www.idealista.pt/news/financas/fiscalidade/2026/02/24/74061-despesas-dedutiveis-em-irs-tudo-o-que-precisas-de-saber).

---

## 2. IRS Jovem (2026 rules)

The flagship benefit for anyone 18–35.

- **Eligibility**: between **18 and 35 years old (inclusive)** at 31 Dec of the income year. Must not be claimed as a dependent on someone else's IRS. Must have rendimentos de **Categoria A (dependent work)** or **Categoria B (self-employed)**. **Education/diploma requirement was scrapped** in the 2025 reform — any young worker qualifies regardless of academic level.
- **Duration**: up to **10 years** or until the year you turn 35, whichever comes first.
- **Exemption schedule** (% of category A/B income exempt):
  - **Year 1**: 100%
  - **Years 2–4**: 75%
  - **Years 5–7**: 50%
  - **Years 8–10**: 25%
- **Income cap**: exemption applies to income up to **55× IAS = €29,542.15** in 2026 (IAS 2026 = €537.13). Income above the cap is taxed normally.
- **Note**: years don't have to be consecutive but the count starts from the first year of qualifying income.
- **How to claim**: in 2026 it's **integrated into IRS Automático** — pre-filled. For manual: Anexo A, quadro 4F (Cat. A) or Anexo B (Cat. B), and tick the IRS Jovem option. Employees can also opt-in at the employer so retenção na fonte already reflects the benefit (form via Portal das Finanças or HR).
- **Cannot combine with**: NHR (Residente Não Habitual) or the regime for ex-residentes.

Sources: [DECO PROteste IRS Jovem](https://www.deco.proteste.pt/dinheiro/impostos/dicas/irs-jovem-como-funciona), [OCC Guia Prático IRS Jovem](https://www.occ.pt/sites/default/files/public/2025-02/Guia_Pratico_IRS_J6fevCa.pdf), [gov.pt Pedir o IRS Jovem](https://www.gov.pt/servicos/pedir-o-irs-jovem), [Doutor Finanças IRS Jovem 2026](https://www.doutorfinancas.pt/impostos/irs/irs-jovem-2026-quanto-vai-receber/).

---

## 3. Government Helper Programmes ("Ajudas")

### 3.1 Porta 65 Jovem (rent subsidy)
- **What**: IHRU monthly cash subsidy that pays part of a young tenant's rent.
- **Eligibility**: 18–35 (single) or one partner up to 37 if the other is ≤35. Rendimento mensal corrigido ≤ 4× SMN (€3,680 in 2026). Rendimento coletável anual ≤ 6th IRS bracket (~€43,090). Lease registered with AT, no other property owned/rented as primary residence, no close kinship to landlord.
- **Amount**: pays **30%–50% of the rent** depending on income bracket; average payout ~**€275/month**.
- **Duration**: 12 months, renewable up to **5 years total** (re-application required).
- **Where**: candidaturas online at [portaldahabitacao.pt](https://www.portaldahabitacao.pt/) in periodic openings.

### 3.2 Apoio Extraordinário à Renda
- **What**: monthly cash support to bridge the gap between effective rent burden and a 35% taxa de esforço.
- **Eligibility**: lease registered with AT for primary residence, household income ≤ 6th IRS bracket, taxa de esforço ≥ 35%.
- **Amount**: up to **€200/month**; difference between actual taxa de esforço and 35%.
- **Duration**: up to **5 years**. Active in 2026.
- **Where**: portaldahabitacao.pt.

### 3.3 Bonificação de juros no crédito habitação
- **Status**: the temporary regime under DL 20-B/2023 **expired 31 Dec 2024 and was not renewed**.
- Still in force in 2026: bank obligation to **renegotiate variable-rate mortgages** when taxa de esforço rises significantly (DL 80-A/2022); **suspended early-repayment commission** for variable-rate housing credit; for under-35 first-home buyers — **IMT and Imposto do Selo total exemption up to €330,539** (partial up to €660,982); **public guarantee** of up to 15% of property value (max property €450k).

### 3.4 Subsídio de alimentação em cartão (meal allowance via card)
- **What**: tax-free allowance, much higher cap than cash payment.
- **2026 caps**: **€10.46/day on card** vs **€6.15/day in cash** is exempt from IRS and Segurança Social. Anything above is taxed and contributory.
- **Practical**: a worker on €10.46/day × 22 days = €230.12/month tax-free in card vs only €135.30 in cash. Net gain ~€1,138/year for a typical worker.

### 3.5 Trabalhador-estudante & dependent students
- **Estatuto trabalhador-estudante** gives flexible work hours, justified absences for exams, paid study leave — managed via labour law, not direct IRS savings.
- **Dependent students with income**: IRS exemption up to **5× IAS (~€2,685.65/year)** if they remain dependents and the school is registered. Must declare the school on Portal das Finanças by **15 February** each year.

Sources: [Doutor Finanças Porta 65 / Porta 65+](https://www.doutorfinancas.pt/vida-e-familia/habitacao/porta-65-jovem-e-porta-65-o-que-esta-em-vigor-em-2026/), [Portal da Habitação Apoio Renda](https://www.portaldahabitacao.pt/apoio-extraordin%C3%A1rio-%C3%A0-renda), [Coverflex subsídio alimentação 2026](https://www.coverflex.com/pt/blog/subsidio-de-alimentacao), [Comparaja bonificação juros](https://www.comparaja.pt/blog/bonificacao-de-juros).

---

## 4. Practical "Easy Wins" (chatbot prompts)

1. **Always ask for the invoice "com NIF"**. Even small purchases — they aggregate into despesas gerais familiares (35% × up to €714 spent = full €250 cap).
2. **Validate pending invoices on e-fatura by end of February** (2 March 2026 for FY2025). Unvalidated invoices in restauração, alojamento, veterinários, oficinas, cabeleireiros, ginásios, transportes default to despesas gerais and lose the higher-rate IVA deduction.
3. **Compare IRS Automático vs Manual**: the automatic version skips rent, education abroad, lares, quotas profissionais, conjunta vs separada simulation, englobamento. Manual usually wins as soon as you have ≥1 of those.
4. **Tributação conjunta vs separada**: conjunta is better when one partner has very low or no income (rendimento split by 2 lowers the bracket); separada often better when both earn similar amounts in low/medium brackets and one has heavy specific deductions. Always simulate both. Default if no choice exercised by 30 June = separada.
5. **Mínimo de existência** (Art. 70 CIRS): in 2026 the income exemption floor is **€12,880** (= 14× SMN of €920). If your annual income is below this you owe zero IRS regardless of withholdings — file to recover.
6. **Englobamento for capital income**: opt to englobar dividends/juros (otherwise taxed at 28% liberatória) when your marginal IRS rate would be lower than 28%. Rule of thumb for FY2025: rendimento coletável ≤ ~€22,306 → englobar wins. Also useful to deduct mais-valias losses against gains over the next 5 years (englobamento becomes mandatory if you want to use prior-year losses).
7. **PPR top-up before 31 December**: under-35s investing €2,000 reclaim €400 — a guaranteed 20% return on the deduction alone, before market gains. Don't lock more than the dedutible cap unless you specifically want long-term tax-deferred growth.
8. **Check sector classification** of every pending invoice — the difference between "Saúde" (15% × up to €1,000) and "Despesas Gerais" (35% × up to €250) for a €1,000 medical bill is roughly €60 of refund.
9. **Register your lease with AT** and ensure landlord declares it — without registration, the rent doesn't qualify for the 15% deduction nor for the apoio à renda or Porta 65.
10. **Open the meal allowance in card form**, not cash, if your employer offers the option — pure tax arbitrage of ~€1k/year at the current cap.

---

## 5. Recent Changes (OE 2026 highlights)

- **IRS brackets**: automatic 3.51% inflation adjustment + **−0.3 pp on rates of brackets 2 through 5**. New tabelas de retenção published Jan 2026.
- **Mínimo de existência → €12,880**, aligned with new SMN €920×14.
- **Rent deduction cap raised**: €700 (FY2025) → **€900 (FY2026)** → €1,000 (FY2027).
- **IRS Jovem** rules locked in: 100/75/50/25 schedule, 10-year window, 55× IAS cap (€29,542 in 2026). Now pre-populated in IRS Automático.
- **Cultural IVA deduction added**: 15% of IVA on books, theatre, concerts, dance shows, museums, monuments, libraries (within the global €250 cap envelope alongside other sector IVA).
- **IMT Jovem ceiling** raised: full exemption up to **€330,539**, partial up to €660,982 (for first-home purchase under 35).
- **6% IVA on construction** of dwellings priced ≤ €648k for sale or ≤ €2,300/month for rent.
- **Mais-valias on property sale exempt** if reinvested in another property let at moderate rents.
- **Subsídio de refeição em cartão isento até €10.46/dia** (was €10.20 in 2025).
- **No renewal of bonificação temporária de juros**; only legacy renegotiation rules and IMT/IS exemptions remain for housing relief.
- **Despesas de educação no interior**: +10% majoration of education expenses (cap €1,000) was confirmed.

Sources: [CGD novidades IRS 2026](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/novidades-IRS.aspx), [Santander IRS 2026](https://www.santander.pt/salto/irs-2026), [PwC OE2026 IRS](https://www.pwc.pt/pt/pwcinforfisco/orcamentoestado/irs-e-seguranca-social.html), [APIT OE2026](https://apit.pt/2026/01/10/oe2026-principais-alteracoes/), [Acasados financiamentos OE2026 habitação](https://acasadosfinanciamentos.pt/orcamento-do-estado-2026-o-que-muda-na-habitacao-em-portugal/).

---

## 6. Top 10 Easy Wins for a Young Adult (TL;DR for chatbot)

1. **Activate IRS Jovem** at your employer — 100% exempt year 1, up to €29,542 (saves several thousand €).
2. **Choose meal allowance in card** form — €10.46/day tax-free vs €6.15 in cash (~€1,000/year more net).
3. **Always give your NIF** at the till — every euro of invoice fills the despesas gerais bucket (€714 spent = €250 deduction).
4. **Validate e-fatura by 28 Feb** each year — assigns each invoice to its high-rate sector (especially restauração, ginásio, transportes, veterinário).
5. **Buy a monthly transport pass** — 100% of the IVA is deductible.
6. **Open a PPR before 31 Dec, contribute €2,000 if <35** — instant €400 deduction (20% return), only blocks for retirement.
7. **Register your lease with AT** and claim **15% rent up to €900** in 2026.
8. **Apply to Porta 65 Jovem** if you rent and earn under the threshold — average €275/month.
9. **Apply to Apoio Extraordinário à Renda** if your rent exceeds 35% of income — up to €200/month for 5 years.
10. **Reject IRS Automático and simulate manual + tributação conjunta + englobamento** every March — typically uncovers €100–€500 of missed reembolso.

---

## Sources

- [DECO PROteste — IRS Jovem 2026](https://www.deco.proteste.pt/dinheiro/impostos/dicas/irs-jovem-como-funciona)
- [Doutor Finanças — Porta 65 Jovem e Porta 65+ 2026](https://www.doutorfinancas.pt/vida-e-familia/habitacao/porta-65-jovem-e-porta-65-o-que-esta-em-vigor-em-2026/)
- [Doutor Finanças — IRS Jovem 2026](https://www.doutorfinancas.pt/impostos/irs/irs-jovem-2026-quanto-vai-receber/)
- [Doutor Finanças — Valores máximos das deduções fiscais](https://www.doutorfinancas.pt/impostos/irs/quais-os-valores-maximos-de-deducoes-fiscais/)
- [Doutor Finanças — IRS automático: quando recusar](https://www.doutorfinancas.pt/impostos/irs/irs-automatico-quando-deve-recusar-e-entregar-declaracao-manualmente/)
- [Doutor Finanças — Englobamento](https://www.doutorfinancas.pt/impostos/irs/englobamento-de-rendimentos-no-irs-quando-compensa/)
- [Doutor Finanças — Encargos com reabilitação](https://www.doutorfinancas.pt/impostos/irs/encargos-com-a-reabilitacao-de-imoveis-no-irs/)
- [Doutor Finanças — Pensão de alimentos no IRS](https://www.doutorfinancas.pt/impostos/irs/pensao-de-alimentos-no-irs-englobar-ou-nao/)
- [PwC — Guia Fiscal IRS 2026](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html)
- [PwC — IRS e Segurança Social no OE 2026](https://www.pwc.pt/pt/pwcinforfisco/orcamentoestado/irs-e-seguranca-social.html)
- [Portal das Finanças — Art. 78-F (IVA em faturas)](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78f.aspx)
- [Portal das Finanças — Art. 84 Encargos com lares](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs84.aspx)
- [Portal das Finanças — IRS Automático](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Rendimentos/Declaracao/IRS_automatico/Paginas/default.aspx)
- [Portal da Habitação — Apoio Extraordinário à Renda](https://www.portaldahabitacao.pt/apoio-extraordin%C3%A1rio-%C3%A0-renda)
- [gov.pt — Pedir o IRS Jovem](https://www.gov.pt/servicos/pedir-o-irs-jovem)
- [gov.pt — Candidatar-se ao Porta 65-Jovem](https://www2.gov.pt/servicos/candidatar-se-ao-porta-65-jovem)
- [OCC — Guia Prático IRS Jovem](https://www.occ.pt/sites/default/files/public/2025-02/Guia_Pratico_IRS_J6fevCa.pdf)
- [OCC — Essencial IRS 2026](https://www.occ.pt/sites/default/files/public/2026-03/Essencial_IRS2026_DIG_final.pdf)
- [Idealista — Despesas dedutíveis em IRS 2026](https://www.idealista.pt/news/financas/fiscalidade/2026/02/24/74061-despesas-dedutiveis-em-irs-tudo-o-que-precisas-de-saber)
- [Idealista — Crédito habitação dedução IRS 2025](https://www.idealista.pt/news/imobiliario/habitacao/2025/04/01/68808-credito-habitacao-como-deduzir-as-despesas-no-irs-de-2025)
- [Coverflex — IRS Jovem 2026](https://www.coverflex.com/pt/blog/irs-jovem)
- [Coverflex — Subsídio de alimentação 2026](https://www.coverflex.com/pt/blog/subsidio-de-alimentacao)
- [CGD — Donativos no IRS](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/deduzir-donativos-no-IRS.aspx)
- [CGD — Mínimo de existência](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/minimo-de-existencia.aspx)
- [CGD — Novidades IRS 2026](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/novidades-IRS.aspx)
- [CGD — IRS conjunto vs separado](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/declaracao-irs-conjunta-separada.aspx)
- [Santander — IRS 2026 novidades](https://www.santander.pt/salto/irs-2026)
- [Santander — Despesas dedutíveis IRS](https://www.santander.pt/salto/despesas-dedutiveis-irs)
- [Santander — Despesas habitação IRS](https://www.santander.pt/salto/despesas-habitacao-irs)
- [APIT — OE2026 alterações](https://apit.pt/2026/01/10/oe2026-principais-alteracoes/)
- [Comparaja — PPR IRS](https://www.comparaja.pt/blog/ppr-irs)
- [Comparaja — Bonificação de juros](https://www.comparaja.pt/blog/bonificacao-de-juros)
- [Acasa — OE 2026 habitação](https://acasadosfinanciamentos.pt/orcamento-do-estado-2026-o-que-muda-na-habitacao-em-portugal/)
- [ECO — Despesas que pode abater ao IRS](https://eco.sapo.pt/descodificador/descodificador-que-despesas-posso-abater-ao-irs-e-quanto-posso-descontar-saiba-tudo-em-11-respostas/)
- [Edenred — Subsídio de refeição 2026](https://www.edenred.pt/novidades/beneficios-sociais/subsidio-de-refeicao-2026-quais-os-valores-a-considerar/)
