export const SIPS = [
  {
    id: "SIP-1",
    name: "Block Trade",
    lore: "Large orders can fill off the public book so they move the market less.",
    live: "The x-ray shows the public book only. Block flow is not in this feed.",
  },
  {
    id: "SIP-2",
    name: "Position Yield",
    lore: "A share of protocol fees can go to qualifying open positions.",
    live: "Open interest on each node is live. Yield payouts are not on the public market API.",
  },
  {
    id: "SIP-3",
    name: "DUSD Native Yield",
    lore: "Platform trading fees can grow the native yield of DUSD, the margin and pricing asset.",
    live: "Pipe thickness is 24h volume (fee activity), not vault TVL.",
  },
  {
    id: "SIP-4",
    name: "Block Options",
    lore: "An exit intent can become an on-chain option-like right on an existing position.",
    live: "Options inventory is not published here. This layer is protocol anatomy.",
  },
  {
    id: "SIP-5",
    name: "Universal Markets",
    lore: "Anyone can list a market. Reward Vault backs makers. Shield Vault covers losses before ADL.",
    live: "These modules are live listings. No vault balances — this is not a vault explorer.",
  },
];
