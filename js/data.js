// ══════════════════════════════════════════════════════════════════
// ZEV Kalkulator — Statische Tarifdaten (Stand: 2026)
// ══════════════════════════════════════════════════════════════════
// Quellen:
//   Bezugstarife (sp): ElCom Kat. H4 (5-Zi-Whg, 4'500 kWh/J)
//   Einspeisevergütung (ev): Offizielle Rückliefertarife der Netzbetreiber
//   ZEV-Tarif (zt): 80% des Bezugstarifs (gesetzl. Maximum gemäss StromVG)
//   Zählermiete (zm): Netzbetreiber-Angaben (monatlich)
//
// ev_quelle: Kennzeichnung der Datenquelle für die Einspeisevergütung
//   "offiziell" = direkt von der Webseite des Netzbetreibers
//   "geschätzt" = abgeleitet oder Durchschnittswert
//
// Aktualisierung: Jährlich im September/Oktober, wenn ElCom neue Tarife publiziert
// ══════════════════════════════════════════════════════════════════

const PREISKATALOG = {
  abrechnungsmodul: {
    L: { einmalig_pro_ne: 50, jaehrlich_pro_ne: 84, label: "Voll (halbjährl. PDF + 2 Mahnläufe)" },
    M: { einmalig_pro_ne: 50, jaehrlich_pro_ne: 36, label: "Standard (PDF Versand)" },
    S: { einmalig_pro_ne: 25, jaehrlich_pro_ne: 24, label: "Basis (für Liegenschaftsverwaltung)" }
  },
  server: {
    S: { einmalig: 1950, jaehrlich: 48, max_ne: 15, label: "Solarmanager ≤15 NE" },
    M: { einmalig: 2950, jaehrlich: 120, max_ne: 999, label: "Invisia Server >15 NE" }
  },
  portal:         { einmalig: 600,  jaehrlich: 121 },
  internetzugang: { einmalig: 400,  jaehrlich: 44 },
  einbau_server:  { einmalig: 500 },
  zaehler:        { einmalig_pro_stueck: 350 },
  vertrag:        { einmalig_basis: 500, zusatz_pro_tl: 50, inkl_tl: 10 },
  begehung:       { einmalig: 300 },
  machbarkeit:    { einmalig: 250 }
};

const TARIFE = {
    ewb: {
        tarife: {
            ewb_basis: {
                name: 'EWB Grundversorgung',
                sp: 33.06,         // ElCom H4 2026
                ev: 6.00,          // Gesetzliche Mindestvergütung 2026
                ev_quelle: 'Mindestvergütung',
                zt: 26.45,         // 80% von 33.06
                zm: 7.00
            }
        }
    },
    bkw: {
        tarife: {
            bkw_grund: {
                name: 'BKW Grundversorgung',
                sp: 27.70,         // ElCom H4 2026
                ev: 6.00,          // Gesetzliche Mindestvergütung 2026
                ev_quelle: 'Mindestvergütung',
                zt: 22.16,         // 80% von 27.70
                zm: 6.58
            }
        }
    },
    ckw: {
        tarife: {
            ckw_haushalt: {
                name: 'CKW Haushalt',
                sp: 25.20,         // ElCom H4 2026
                ev: 6.00,          // Gesetzliche Mindestvergütung 2026
                ev_quelle: 'Mindestvergütung',
                zt: 20.16,         // 80% von 25.20
                zm: 6.50
            }
        }
    },
    iwb: {
        tarife: {
            iwb_basis: {
                name: 'IWB Basistarif',
                sp: 37.91,         // ElCom H4 2026
                ev: 6.00,          // Gesetzliche Mindestvergütung 2026
                ev_quelle: 'Mindestvergütung',
                zt: 30.33,         // 80% von 37.91
                zm: 4.86
            }
        }
    }
};

// Mapping von Netzbetreibernamen (lowercase) auf TARIFE-Schlüssel
const OPERATOR_MAP = {
    'energie wasser bern': 'ewb',
    'bkw energie': 'bkw', 'bkw': 'bkw',
    'centralschweizerische kraftwerke': 'ckw', 'ckw ag': 'ckw',
    'industrielle werke basel': 'iwb', 'iwb': 'iwb'
};

const CH_DURCHSCHNITT = {
    sp: 32.14,
    ev: 6.00,           // Gesetzliche Mindestvergütung 2026
    ev_quelle: 'Mindestvergütung',
    zt: 25.71,
    zm: 5.00
};
