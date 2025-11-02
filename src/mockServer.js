
export function createMockServer() {
  const store = {
    companies: [
      { id: "c1", name: "Sumaiya Tech" },
      { id: "c2", name: "Fathima Holdings" },
    ],
    accounts: {
      c1: [
        { id: "a1", name: "Sumaiya - Account 1", stocks: ["GOOG", "TSLA", "AMZN"] },
        { id: "a2", name: "Sumaiya - Account 2", stocks: ["META", "NVDA"] },
      ],
      c2: [
        { id: "b1", name: "Fathima - Account 1", stocks: ["TSLA", "NVDA"] },
        { id: "b2", name: "Fathima - Account 2", stocks: ["GOOG", "AMZN", "META"] },
      ],
    },
    accountData: {},
  };

  function randomPrice(base = 100) {
    return +(base + Math.random() * base).toFixed(2);
  }

  function initAccountData() {
    Object.values(store.accounts).flat().forEach((acc) => {
      const data = acc.stocks.map((ticker) => ({
        ticker,
        price: randomPrice(100),
        change: 0,
        updatedAt: Date.now(),
      }));
      store.accountData[acc.id] = { stocks: data };
    });
  }

  initAccountData();

  // update prices every second
  setInterval(() => {
    Object.keys(store.accountData).forEach((accId) => {
      const acc = store.accountData[accId];
      acc.stocks.forEach((s) => {
        const delta = (Math.random() - 0.5) * (s.price * 0.02);
        const newPrice = Math.max(0.01, +(s.price + delta).toFixed(2));
        s.change = +((newPrice - s.price).toFixed(2));
        s.price = newPrice;
        s.updatedAt = Date.now();
      });
    });
  }, 1000);

  async function apiFetch(path) {
    await new Promise((r) => setTimeout(r, 120));
    const url = new URL(path, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "companies") {
      if (parts.length === 1) return { status: 200, json: () => store.companies };
      const companyId = parts[1];
      if (parts[2] === "accounts")
        return { status: 200, json: () => store.accounts[companyId] || [] };
    }

    if (parts[0] === "accounts") {
      const accountId = parts[1];
      if (parts[2] === "data")
        return { status: 200, json: () => store.accountData[accountId] || { stocks: [] } };
    }

    return { status: 404, json: () => ({ error: "not found" }) };
  }

  window.__mockApi = { apiFetch };
}

if (!window.__mockApi) createMockServer();
