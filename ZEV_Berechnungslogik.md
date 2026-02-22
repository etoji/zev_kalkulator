# ZEV Baukostenberechnung – Berechnungslogik für Webapp

## 1. Eingabefelder (User Inputs)

### Basisangaben
| Feld | Typ | Beispielwert | Validierung |
|---|---|---|---|
| `objektadresse` | string | "Zelgstrasse 25, Bern" | Pflichtfeld |
| `anzahl_wohnungen` | int | 9 | min: 1 |
| `waermepumpe` | bool | false | ja/nein |
| `emobilitaet` | bool | false | ja/nein |
| `pv_vorhanden` | bool | true | ja/nein |
| `boiler` | bool | false | ja/nein |
| `stromlieferant` | enum | "EWB" | "EWB" \| "BKW" |

### Dienstleistungsmodule (NEU – war vorher hardcoded)
| Feld | Typ | Beispielwert | Validierung |
|---|---|---|---|
| `abrechnungsmodul` | enum | "L" | "L" \| "M" \| "S" |
| `machbarkeit` | bool | true | ja/nein |
| `zev_vertrag` | bool | true | ja/nein |
| `portal` | bool | true | ja/nein – PV & EMS Nutzerportal |
| `internetzugang` | bool | true | ja/nein – für Server |
| `begehung` | bool | true | ja/nein |

### PV-Anlage
| Feld | Typ | Beispielwert | Validierung |
|---|---|---|---|
| `pv_kosten` | float | 31300 | CHF exkl. MWST |
| `foerderung` | float | -11099 | CHF (negativ = Rückvergütung) |
| `peakleistung_kwp` | float | 31.02 | kWp |
| `wechselrichter_kosten` | float | 4000 | CHF (Austausch über 25 J.) |

### Rendite-Annahmen
| Feld | Typ | Beispielwert | Validierung |
|---|---|---|---|
| `eigenverbrauch_anteil` | float | 0.20 | 0.15 – 0.25 |
| `zev_anteil` | float | 0.17 | 0.0 – (1 - eigenverbrauch) |
| `allgemeinstrom_kwh` | int | 2000 | kWh/Jahr |
| `haushaltsverbrauch_kwh` | int | 2500 | kWh/Jahr pro Haushalt |

---

## 2. Preiskatalog (Stammdaten / Config)

```javascript
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
  EWB: {
    strompreis_rp: 33.48,        // Rp./kWh (14.05+13.3+0.29+0.05+0.44+2.86+2.49)
    einspeisung_rp: 10.96,       // Rp./kWh inkl. HKN
    zaehlerkosten_monat: 8.43    // CHF/Monat
  },
  BKW: {
    strompreis_rp: 22.10,
    einspeisung_rp: 9.00,
    zaehlerkosten_monat: 18.91   // 214/12 + 1.081
  }
};
```

---

## 3. Berechnungslogik

### 3.1 Anzahl Zähler
```
anzahl_zaehler = anzahl_wohnungen + 1 (Allgemeinzähler)
                 + (waermepumpe ? 1 : 0)
                 + (emobilitaet ? 1 : 0)
```

### 3.2 Server-Auswahl (automatisch)
```
server_typ = (anzahl_wohnungen <= 15) ? "S" : "M"
```

### 3.3 ZEV Kosten – Einmalig

#### Grundkosten (fix, abhängig von Modulauswahl)
```
grundkosten_einmalig =
    PREISKATALOG.server[server_typ].einmalig        // Server
  + PREISKATALOG.einbau_server.einmalig              // Einbau Server
  + (portal ? PREISKATALOG.portal.einmalig : 0)
  + (internetzugang ? PREISKATALOG.internetzugang.einmalig : 0)
  + (machbarkeit ? PREISKATALOG.machbarkeit.einmalig : 0)
  + (begehung ? PREISKATALOG.begehung.einmalig : 0)
  + (zev_vertrag ? vertrag_kosten() : 0)
```

#### Vertrag-Kosten (dynamisch ab >10 Teilnehmer)
```
vertrag_kosten = PREISKATALOG.vertrag.einmalig_basis
  + max(0, anzahl_wohnungen - PREISKATALOG.vertrag.inkl_tl) * PREISKATALOG.vertrag.zusatz_pro_tl
```

#### Variable Kosten (pro Zähler)
```
kosten_pro_zaehler = PREISKATALOG.zaehler.einmalig_pro_stueck
                   + PREISKATALOG.abrechnungsmodul[modul].einmalig_pro_ne

variable_einmalig = anzahl_zaehler * kosten_pro_zaehler
```

#### Total Einmalig
```
einmalige_kosten = grundkosten_einmalig + variable_einmalig
```

### 3.4 ZEV Kosten – Wiederkehrend (pro Jahr)

#### Grundkosten
```
grundkosten_jaehrlich =
    PREISKATALOG.server[server_typ].jaehrlich
  + (portal ? PREISKATALOG.portal.jaehrlich : 0)
  + (internetzugang ? PREISKATALOG.internetzugang.jaehrlich : 0)
```

#### Variable Kosten
```
anzahl_ne = anzahl_wohnungen + 1  // +1 für Allgemeinzähler

variable_jaehrlich = anzahl_ne * PREISKATALOG.abrechnungsmodul[modul].jaehrlich_pro_ne
```

#### Total Wiederkehrend
```
wiederkehrende_kosten = grundkosten_jaehrlich + variable_jaehrlich
```

---

### 3.5 PV Herstellungskosten (Kalk PV Strom HK)

```
investition_netto = pv_kosten + foerderung     // foerderung ist negativ

stromproduktion_jahr = peakleistung_kwp * 1000  // Richtwert 1000 kWh/kWp

// Betriebskosten über 25 Jahre
unterhaltskosten = investition_netto * 0.015 * 25
lastgangmessung = 10 * 12 * 25                 // CHF 10/Monat × 25 Jahre = 3000
gesamtkosten_25j = investition_netto + unterhaltskosten + wechselrichter_kosten + lastgangmessung

// Produktion über 25 Jahre (mit 80% Degradation)
produktion_25j = stromproduktion_jahr * 25 * 0.8

// Herstellungskosten
hk_pro_kwh = gesamtkosten_25j / produktion_25j          // in CHF
hk_rp = hk_pro_kwh * 100                                 // in Rp.
```

---

### 3.6 Abgeleitete Tarife

```
tarif = TARIFE[stromlieferant]
strompreis = tarif.strompreis_rp           // Rp./kWh
einspeisung = tarif.einspeisung_rp         // Rp./kWh
zev_tarif = round(strompreis * 0.80, 2)   // 80% des Strompreises
zaehlerkosten = tarif.zaehlerkosten_monat  // CHF/Monat
```

---

### 3.7 Rendite OHNE ZEV

```
eigenverbrauch_kwh = stromproduktion_jahr * eigenverbrauch_anteil
einspeisung_kwh = stromproduktion_jahr * (1 - eigenverbrauch_anteil)

// Ertrag = kWh × (Tarif - Herstellkosten) / 100  [Rp. → CHF]
ertrag_eigenverbrauch = eigenverbrauch_kwh * (strompreis - hk_rp) / 100
ertrag_einspeisung = einspeisung_kwh * (einspeisung - hk_rp) / 100

cashflow_ohne_zev = ertrag_eigenverbrauch + ertrag_einspeisung
amortisation_ohne_zev = investition_netto / cashflow_ohne_zev   // Jahre
```

---

### 3.8 Rendite MIT ZEV

```
einspeisungsanteil = 1 - eigenverbrauch_anteil - zev_anteil

eigenverbrauch_kwh = stromproduktion_jahr * eigenverbrauch_anteil
zev_kwh = stromproduktion_jahr * zev_anteil
einspeisung_kwh = stromproduktion_jahr * einspeisungsanteil

ertrag_eigenverbrauch = eigenverbrauch_kwh * (strompreis - hk_rp) / 100
ertrag_zev = zev_kwh * (zev_tarif - hk_rp) / 100
ertrag_einspeisung = einspeisung_kwh * (einspeisung - hk_rp) / 100

cashflow_mit_zev = ertrag_eigenverbrauch + ertrag_zev + ertrag_einspeisung
amortisation_mit_zev = (investition_netto + einmalige_kosten) / cashflow_mit_zev  // Jahre
```

---

### 3.9 Mieter-Ersparnis (pro Haushalt/Jahr)

```
// Einspeisungs-kWh pro Mieter × Tarifvorteil
stromersparnis = (einspeisung_kwh / anzahl_wohnungen) * (strompreis - zev_tarif) / 100

// Wegfall der eigenen Zählerkosten
zaehlerersparnis = zaehlerkosten * 12   // CHF/Jahr

// Abrechnungsgebühr (Kosten des gewählten Moduls)
abrechnungsgebuehr = -PREISKATALOG.abrechnungsmodul[modul].jaehrlich_pro_ne

mieter_ersparnis_total = stromersparnis + zaehlerersparnis + abrechnungsgebuehr
```

---

## 4. Vergleich Original vs. Neue Version

| Aspekt | Original (hardcoded) | Neue Version (dynamisch) |
|---|---|---|
| Abrechnungsmodul | Immer Modul L (84/J.) | Wählbar L/M/S |
| Server | Fix Server S, doppelt gezählt | Auto S/M nach NE-Anzahl, 1× |
| Machbarkeit | Auswahlfeld ohne Funktion | Steuert Kosten |
| ZEV Vertrag | Auswahlfeld ohne Funktion | Steuert Kosten + Staffelung |
| Portal | Immer inkludiert | An/abwählbar |
| Internetzugang | Nicht berücksichtigt | An/abwählbar |
| Begehung | Nicht berücksichtigt | An/abwählbar |
| Wiederk. Kosten | Nur Portal fix | Portal + Server + Internet |

### Kostenvergleich mit Default-Werten (9 WE, alle Module aktiv, Modul L):
| Position | Original | Neue Version | Differenz |
|---|---|---|---|
| Einmalig Grundkosten | 4'750 | 4'500 | -250 (kein doppelter Server) |
| Einmalig Variable | 4'000 | 4'000 | 0 |
| **Einmalig Total** | **8'750** | **8'500** | **-250** |
| Wiederkehrend Grund | 121 | 213 | +92 (Server+Internet nun inkl.) |
| Wiederkehrend Variable | 840 | 840 | 0 |
| **Wiederkehrend Total** | **961** | **1'053** | **+92** |

---

## 5. Webapp-Architektur (Empfehlung)

```
┌─────────────────────────────────────────┐
│  Eingabeformular                        │
│  ├── Basisangaben (Adresse, WE, etc.)   │
│  ├── Stromlieferant (EWB/BKW)           │
│  ├── Modulauswahl (L/M/S + Toggles)     │
│  └── PV-Daten (kWp, Kosten, Förderung)  │
├─────────────────────────────────────────┤
│  Live-Berechnung (reactive)             │
│  ├── ZEV Kosten (einmalig + jährlich)   │
│  ├── PV Herstellungskosten              │
│  ├── Rendite ohne ZEV                   │
│  ├── Rendite mit ZEV                    │
│  └── Mieter-Ersparnis                   │
├─────────────────────────────────────────┤
│  Vergleichs-Dashboard                   │
│  ├── Balkendiagramm: Cashflow Vergleich │
│  ├── Amortisations-Timeline             │
│  └── Kostenaufschlüsselung              │
└─────────────────────────────────────────┘
```
