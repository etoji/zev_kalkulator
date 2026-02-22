const PREISKATALOG = {
    abrechnungsmodul: {
        L: { einmalig_pro_ne: 50, jaehrlich_pro_ne: 84 },
        M: { einmalig_pro_ne: 50, jaehrlich_pro_ne: 36 },
        S: { einmalig_pro_ne: 25, jaehrlich_pro_ne: 24 }
    },
    server: {
        S: { einmalig: 1950, jaehrlich: 48, max_ne: 15 },
        M: { einmalig: 2950, jaehrlich: 120, max_ne: 999 }
    },
    portal: { einmalig: 600, jaehrlich: 121 },
    internetzugang: { einmalig: 400, jaehrlich: 44 },
    einbau_server: { einmalig: 500 },
    zaehler: { einmalig_pro_stueck: 350 },
    vertrag: { einmalig_basis: 500, zusatz_pro_tl: 50, inkl_tl: 10 },
    begehung: { einmalig: 300 },
    machbarkeit: { einmalig: 250 }
};

console.log("=========================================");
console.log("   ZEV KALKULATOR: MANUELLER META-TEST   ");
console.log("=========================================\n");

console.log("Szenario: 10 Wohneinheiten, 20 kWp PV-Anlage");
console.log("Tarif: EWB Bern (Lokal) | Abrechnung: Standard\n");

const we = 10;
const pro = 20000; // 20 kWp * 1000
const off = 45000;
const foe = 7600;

// Tariffs (EWB Lokal)
const sp = 33.06 / 100;
const ev = 12.00 / 100; // Lokal
const zt = 26.45 / 100; // 80%

const pctZev = 20; // 20% to tenants
const pctEigen = 20; // 20% to shared area
const pctEi = 60; // 60% grid feed-in

const modul = 'M';

console.log("--- 1. Investitionskosten PV ---");
const inv = off - foe;
console.log(`Offerte: ${off} CHF`);
console.log(`Abzug Förderung: -${foe} CHF`);
console.log(`=> Netto Investition PV: ${inv} CHF`);

console.log("\n--- 2. PV Unterhalt & Ersatz (Berechnung für 25 Jahre) ---");
const uh25 = inv * 0.015 * 25;
const tk25 = inv + uh25 + 4000 + 3000;
const maintenance_per_year = (tk25 - inv) / 25;
console.log(`Unterhalt 1.5% über 25 Jahre: ${uh25} CHF`);
console.log(`Wechselrichter & Entsorgung (Pauschal 25J): 7000 CHF`);
console.log(`=> Jährliche Rückstellungen für PV-Sicherung: ${maintenance_per_year.toFixed(2)} CHF / Jahr`);

console.log("\n--- 3. ZEV Hardware & Setup (Einmalig) ---");
const anzahlNe = we + 1; // 11 Billing units
const anzahlZaehler = we + 1 + 1; // 12 Zähler (+WP)
const serverTyp = 'S';

const grundkostenEinmalig = PREISKATALOG.server[serverTyp].einmalig + PREISKATALOG.einbau_server.einmalig + PREISKATALOG.portal.einmalig + PREISKATALOG.internetzugang.einmalig;
const variableKostenEinmalig = anzahlZaehler * (PREISKATALOG.zaehler.einmalig_pro_stueck + PREISKATALOG.abrechnungsmodul[modul].einmalig_pro_ne);
const totE = grundkostenEinmalig + variableKostenEinmalig;
console.log(`Server-Hardware, Einbau & Portal Lizenzen: ${grundkostenEinmalig} CHF`);
console.log(`12x Zählerhardware & Modulsetup: ${variableKostenEinmalig} CHF`);
console.log(`=> Total Initialkosten ZEV: ${totE} CHF`);

console.log("\n--- 4. ZEV Betriebskosten (Jährlich) ---");
const grundkostenJaehrlich = PREISKATALOG.server[serverTyp].jaehrlich + PREISKATALOG.portal.jaehrlich + PREISKATALOG.internetzugang.jaehrlich;
const variableKostenJaehrlich = anzahlNe * PREISKATALOG.abrechnungsmodul[modul].jaehrlich_pro_ne;
const totW = grundkostenJaehrlich + variableKostenJaehrlich;
console.log(`11 NE x Abrechnungsgebühr (36 CHF): ${variableKostenJaehrlich} CHF`);
console.log(`Portal, Server-Abo, Internet-Abo: ${grundkostenJaehrlich} CHF`);
console.log(`=> Total ZEV Betriebskosten: ${totW} CHF / Jahr`);

console.log("\n=========================================");
console.log("   ERGEBNIS A: OHNE ZEV");
console.log("=========================================\n");

const no_e_kwh = pro * 0.20;
const no_ei_kwh = pro * 0.80;
const no_e_chf = no_e_kwh * sp;
const no_ei_chf = no_ei_kwh * ev;
const no_cf = no_e_chf + no_ei_chf;
console.log(`+ Eingesparte Allgemeinstromkosten (${no_e_kwh} kWh x 33.06 Rp): ${no_e_chf.toFixed(2)} CHF`);
console.log(`+ Einnahmen Netzeinspeisung (${no_ei_kwh} kWh x 12.00 Rp): ${no_ei_chf.toFixed(2)} CHF`);
console.log("-----------------------------------------");
console.log(`=> Jährlicher Brutto Cashflow: ${no_cf.toFixed(2)} CHF / Jahr`);

const no_amor = inv / no_cf;
console.log(`=> Amortisationszeit (${inv} CHF / Cashflow): ${no_amor.toFixed(1)} Jahre`);

const no_net_yearly = no_cf - maintenance_per_year;
console.log(`=> Reingewinn-Zuwachs jährlich (nach Rückstellungen): ${no_net_yearly.toFixed(2)} CHF`);

const no_total25 = (no_cf * 25) - tk25;
console.log(`\n🏆 GESAMTGEWINN 25 JAHRE (Ohne ZEV): ${(no_cf * 25).toFixed(2)} CHF Einnahmen - ${tk25.toFixed(2)} CHF Lebenszykluskosten = ${no_total25.toFixed(2)} CHF`);


console.log("\n=========================================");
console.log("   ERGEBNIS B: MIT ZEV");
console.log("=========================================\n");

const z_e_kwh = pro * pctEigen / 100;
const z_z_kwh = pro * pctZev / 100;
const z_ei_kwh = pro * pctEi / 100;
const z_e_chf = z_e_kwh * sp;
const z_z_chf = z_z_kwh * zt;
const z_ei_chf = z_ei_kwh * ev;
const z_cf = z_e_chf + z_z_chf + z_ei_chf;

console.log(`+ Eingesparte Allgemeinstromkosten (${z_e_kwh} kWh x 33.06 Rp): ${z_e_chf.toFixed(2)} CHF`);
console.log(`+ Einnahmen Stromverkauf an ZEV Mieter (${z_z_kwh} kWh x 26.45 Rp): ${z_z_chf.toFixed(2)} CHF`);
console.log(`+ Einnahmen restlicher Netzeinspeisung (${z_ei_kwh} kWh x 12.00 Rp): ${z_ei_chf.toFixed(2)} CHF`);
console.log("-----------------------------------------");
console.log(`Summe Einnahmen: ${z_cf.toFixed(2)} CHF / Jahr`);
console.log(`- Abzug ZEV Betriebskosten: -${totW.toFixed(2)} CHF / Jahr`);
console.log("-----------------------------------------");
const zev_op_cashflow = z_cf - totW;
console.log(`=> Jährlicher Netto Cashflow: ${zev_op_cashflow.toFixed(2)} CHF / Jahr`);

const z_amor = (inv + totE) / zev_op_cashflow;
console.log(`=> Amortisationszeit (${inv + totE} CHF / Netto Cashflow): ${z_amor.toFixed(1)} Jahre`);

const zev_net_yearly = zev_op_cashflow - maintenance_per_year;
console.log(`=> Reingewinn-Zuwachs jährlich (nach Rückstellungen): ${zev_net_yearly.toFixed(2)} CHF`);

const zev_total25 = (z_cf * 25) - (tk25 + totE) - (totW * 25);
console.log(`\n🏆 GESAMTGEWINN 25 JAHRE (Mit ZEV): ${(zev_op_cashflow * 25).toFixed(2)} CHF Netto-Einnahmen - ${(tk25 + totE).toFixed(2)} CHF Gesamte Investitionen = ${zev_total25.toFixed(2)} CHF`);

console.log("\n=========================================");
console.log("   FAZIT");
console.log("=========================================\n");
const gain = zev_total25 - no_total25;
if (gain >= 0) {
    console.log(`Das ZEV-Szenario schlägt das Ohne-ZEV-Szenario auf 25 Jahre gerechnet um ${gain.toFixed(2)} CHF.`);
} else {
    console.log(`Ohne ZEV ist auf 25 Jahre gerechnet um ${Math.abs(gain).toFixed(2)} CHF RENTABLER als Mit ZEV.`);
}
