# Pricing Engine - Dokumentation & Parameter-Guide

## Übersicht

Die tick-basierte Market-Maker Pricing Engine simuliert eine realistische Marktdynamik für Getränkepreise bei eurer Börsensaufen-Webapp. Ausgelegt auf **~40 gleichzeitige Teilnehmer** und **20-40 Orders pro Minute**.

## Architektur

```
Orders (User) 
    ↓
tickOrders (Aggregation mit User-Cap)
    ↓
Pricing Tick (alle 15s)
    ↓
Price Update (Log-Space Math)
    ↓
Bounds & Circuit Breaker
    ↓
drinks.currentPrice
```

---

## Setup & Initialisierung

### 1. Schema deployment
```bash
npx convex dev
```
Das Schema wurde erweitert um:
- `marketState` - globaler Marktzustand & Regime
- `drinkMarketState` - pro-Drink Preis-State
- `tickOrders` - Order-Aggregation für Ticks

### 2. Market State initialisieren

**Einmalig beim ersten Start:**
```typescript
// In Convex Dashboard oder via client:
await convex.mutation(api.pricingTick.initializeMarketState, {})
```

Dies:
- Erstellt globalen Market State (Regime = Normal)
- Initialisiert alle Drinks mit Fundamental-Preisen
- Setzt initiale Log-Preise

### 3. Cron Job läuft automatisch

Die Datei `convex/crons.ts` ist aktiviert → Pricing Tick läuft alle **15 Sekunden** automatisch.

---

## Parameter-Tuning

### 🎯 Core Parameters (in `convex/pricing/types.ts`)

```typescript
DEFAULT_PRICING_CONFIG = {
  tickIntervalSeconds: 15,        // Tick-Frequenz
  beta: 0.04,                     // Mean Reversion Stärke
  lambda: 0.5,                    // Dirichlet Smoothing
  k: 2,                           // tanh Sättigung
  N0: 10,                         // Activity Scaling Threshold
  
  lowerBoundMultiplier: 0.6,      // Min: 60% vom Fundamental
  upperBoundMultiplier: 2.2,      // Max: 220% vom Fundamental
  maxJumpPercent: 0.08,           // Max 8% Sprung pro Tick
  
  maxImpactPerUserPerTick: 2,     // Anti-Manipulation Cap
  
  largeJumpThreshold: 0.05,       // 5% = "großer Sprung"
  consecutiveJumpsForBreaker: 3,  // Nach 3 Sprüngen → Breaker
  volatilityReductionDuration: 60,// 60s Breaker-Dauer
  volatilityReductionFactor: 0.5, // α_eff halbieren
}
```

### 📊 Regime Parameters

```typescript
REGIME_PARAMS = {
  Calm: {
    alphaR: 0.08,              // Schwache Reaktion
    noiseStdDev: 0.002,        // ~0.2% Noise
    minDuration: 300,          // 5 Min
    maxDuration: 600,          // 10 Min
  },
  Normal: {
    alphaR: 0.14,              // Normale Reaktion
    noiseStdDev: 0.005,        // ~0.5% Noise
    minDuration: 300,
    maxDuration: 600,
  },
  Hype: {
    alphaR: 0.20,              // Starke Reaktion
    noiseStdDev: 0.008,        // ~0.8% Noise
    minDuration: 180,          // 3 Min
    maxDuration: 420,          // 7 Min
  },
}
```

---

## 🔧 Anpassung für andere Teilnehmerzahlen

### Bei **20 Teilnehmern** (geringere Aktivität):

```typescript
tickIntervalSeconds: 20,        // Längere Ticks
lambda: 0.8,                    // Stärkere Glättung
N0: 5,                          // Niedrigere Schwelle
maxImpactPerUserPerTick: 3,     // Mehr Impact pro User
```

### Bei **100 Teilnehmern** (hohe Aktivität):

```typescript
tickIntervalSeconds: 10,        // Kürzere Ticks
lambda: 0.3,                    // Weniger Glättung
N0: 20,                         // Höhere Schwelle
maxImpactPerUserPerTick: 1,     // Strikterer User-Cap
```

### Tick-Länge Faustregel:
```
Tick-Intervall ≈ (Erwartete Orders pro Minute) / 3
```
Bei 40 Orders/min → 15s ist optimal.

---

## 🎮 Integration ins Frontend

### Order platzieren mit Pricing-Tracking

```typescript
// In eurem Order-Handler (z.B. Checkout):
await convex.mutation(api.drinks.orderDrink, {
  sessionId: partyId,
  drinkId: drink._id,
  userId: tableNameOrMemberKey,
  quantity: 2,
})
```

Dies recorded automatisch den Impact fürs nächste Pricing-Tick.

### Live-Preis-Updates subscriben

```typescript
// In Component:
const drinks = useQuery(api.drinks.listDrinks)
const marketState = useQuery(api.pricingTick.getMarketState)

// drinks.currentPrice updated alle 15s automatisch
```

### Price History Chart

```typescript
const priceHistory = useQuery(api.pricingTick.getDrinkPriceHistory, {
  drinkId: drink._id,
  limit: 100,
})

// → Array von { price, ts, meta: { regime, demandSignal, ... } }
```

---

## 🛡️ Anti-Manipulation Mechanismen

### 1. **User Impact Cap**
Max. 2 Einheiten pro User/Drink/Tick zählen für Preisimpact.
→ Weitere Orders werden konsumiert, bewegen aber den Preis nicht.

### 2. **Dirichlet Smoothing (λ = 0.5)**
Verhindert, dass ein einziger Kauf den Preis stark bewegt.

### 3. **tanh Sättigung (k = 2)**
Exponentieller Anstieg wird abgeflacht → Pump-and-Dump ineffektiv.

### 4. **Circuit Breaker**
Nach 3 aufeinanderfolgenden großen Sprüngen (>5%):
- α_eff wird für 60s halbiert
- Preis stabilisiert sich automatisch

### 5. **Hard Bounds**
Preis kann nie unter 60% oder über 220% vom Fundamentalpreis fallen.

---

## 📈 Parameter-Effekte

| Parameter | Erhöhen → Effekt | Verringern → Effekt |
|-----------|------------------|---------------------|
| **α_R** | Stärkere Preisreaktion | Stabilere Preise |
| **β** | Schnellere Mean Reversion | Längere Trends |
| **λ** | Geringerer Impact pro Order | Volatilere Preise |
| **k** | Frühere Sättigung | Stärkere Ausschläge |
| **N0** | Volle Reaktion erst bei mehr Orders | Reaktiver bei wenig Aktivität |

---

## 🧪 Testing & Debugging

### Market State überprüfen
```bash
# In Convex Dashboard:
Query: marketState (stateKey = "global")
```

Zeigt:
- Aktuelles Regime
- Tick Count
- Letzter Tick-Timestamp

### Price Snapshots analysieren
```bash
Query: priceSnapshots
Filter: drinkId = [deine-drink-id]
Order: ts desc
```

Jeder Snapshot enthält:
```json
{
  "price": 3.45,
  "ts": 1704398765000,
  "meta": {
    "regime": "Hype",
    "demandSignal": 0.234,
    "alphaEff": 0.18,
    "circuitBreakerActive": false
  }
}
```

### Manuellen Tick triggern (Testing)
```typescript
// Nur für Development:
await convex.mutation(api.pricingTick.executePricingTick, {})
```

---

## 🚀 Performance-Optimierung

### Für Production:

1. **Tick Orders Cleanup**
Alte tickOrders werden automatisch gelöscht (>10 Ticks alt).

2. **Indexierung** (in schema.ts ergänzen):
```typescript
drinkMarketState: defineTable({ ... })
  .index('by_drink', ['drinkId']),
tickOrders: defineTable({ ... })
  .index('by_tick_and_drink', ['tickId', 'drinkId']),
```

3. **Batching bei vielen Drinks**
Wenn >50 Drinks: Pricing in Batches von 20 pro Tick abarbeiten.

---

## 🎯 Empfohlene Fundamental-Preise

Beispiel-Setup für typische Getränke:

```typescript
// Beim Drink-Import setzen:
drinks = [
  { name: "Bier", currentPrice: 2.50, regularPrice: 2.50 },
  { name: "Radler", currentPrice: 2.80, regularPrice: 2.80 },
  { name: "Wein", currentPrice: 3.50, regularPrice: 3.50 },
  { name: "Schnaps", currentPrice: 2.00, regularPrice: 2.00 },
  { name: "Longdrink", currentPrice: 4.50, regularPrice: 4.50 },
  { name: "Softdrink", currentPrice: 2.00, regularPrice: 2.00 },
]
```

`regularPrice` = Fundamental-Preis (F_i) = Attraktor für Mean Reversion.

---

## 🔐 Security Notes

**NICHT im UI exposen:**
- Exakte Tick-Zeitpunkte
- Regime-Wechsel-Logik
- Parameter-Werte (α, β, λ, etc.)
- Circuit Breaker Status

**Im UI zeigen:**
- Aktueller Preis
- Price History (Chart)
- "Markt ist nervös" (optional, bei Hype-Regime)

---

## 🐛 Troubleshooting

### Preise bewegen sich nicht
→ `initializeMarketState` aufrufen
→ Cron Job in Convex Dashboard prüfen

### Zu volatile Preise
→ `lambda` erhöhen (z.B. 0.8)
→ `maxJumpPercent` verringern (z.B. 0.05)

### Zu stabile Preise
→ `alphaR` in allen Regimes erhöhen (+20%)
→ `beta` verringern (z.B. 0.02)

### Circuit Breaker feuert zu oft
→ `largeJumpThreshold` erhöhen (z.B. 0.08)
→ `consecutiveJumpsForBreaker` erhöhen (z.B. 5)

---

## Next Steps

1. ✅ System ist implementiert
2. ⏳ `npx convex dev` laufen lassen
3. ⏳ `initializeMarketState` aufrufen
4. ⏳ Order-Flow im Frontend mit `recordOrderForTick` verbinden
5. ⏳ Price-Chart mit Recharts im UI einbauen

**Optional:**
- Dashboard für Market State Monitoring
- Notification bei Regime-Wechsel
- "Trending Drinks" basierend auf recent volatility
