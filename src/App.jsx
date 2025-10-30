import React, { useEffect, useState, useRef } from "react";

/**
 * Stock Broker Client Web Dashboard (single-file React app)
 * - Uses an in-browser mock API (Mirage-like) to serve companies, accounts and live-updating stock data.
 * - Uses polling (every 1s) to simulate live price updates from the API (no hardcoded values in UI — data comes from API endpoints).
 * - Responsive layout using Tailwind CSS utility classes.
 *
 * How to run:
 * 1) Create a new React project (Vite or Create React App).
 * 2) Add Tailwind CSS to the project (or include Tailwind CDN for quick demo).
 * 3) Replace App.jsx with this file and run `npm run dev`.
 *
 * Notes:
 * - The mock server is contained in createMockServer(); it's the "API" — the app calls fetch() to get data.
 * - Stock prices are updated on the mock server every second; the client polls the account-data endpoint every second.
 */

// -------------------- Mock Server --------------------
function createMockServer() {
  // In-memory data store (acts like a backend DB). This is the API data — not hardcoded in the UI.
  const store = {
    companies: [
      { id: "c1", name: "Atlas Tech" },
      { id: "c2", name: "Nebula Holdings" },
    ],
    accounts: {
      // companyId -> accounts
      c1: [
        { id: "a1", name: "Atlas - Account 1", stocks: ["GOOG", "TSLA", "AMZN"] },
        { id: "a2", name: "Atlas - Account 2", stocks: ["META", "NVDA", "AAPL"] },
      ],
      c2: [
        { id: "b1", name: "Nebula - Account 1", stocks: ["TSLA", "AAPL", "NVDA"] },
        { id: "b2", name: "Nebula - Account 2", stocks: ["GOOG", "AMZN", "META"] },
      ],
    },
    // accountId -> stock data
    accountData: {},
  };

  // Initialize random stock prices per account
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

  // Simulate background server process updating prices every 1s
  setInterval(() => {
    Object.keys(store.accountData).forEach((accId) => {
      const acc = store.accountData[accId];
      acc.stocks.forEach((s) => {
        // random walk
        const delta = (Math.random() - 0.5) * (s.price * 0.02); // up to ±1% random
        const newPrice = Math.max(0.01, +(s.price + delta).toFixed(2));
        s.change = +((newPrice - s.price).toFixed(2));
        s.price = newPrice;
        s.updatedAt = Date.now();
      });
    });
  }, 1000);

  // Expose simple fetch-style endpoints via a tiny wrapper. Real app uses window.fetch; here we implement a helper.
  async function apiFetch(path, opts = {}) {
    // tiny delay to simulate network
    await new Promise((r) => setTimeout(r, 120));
    const url = new URL(path, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "companies") {
      if (parts.length === 1) return { status: 200, json: () => store.companies };
      // /companies/:id/accounts
      const companyId = parts[1];
      if (parts[2] === "accounts") return { status: 200, json: () => store.accounts[companyId] || [] };
    }

    if (parts[0] === "accounts") {
      // /accounts/:id/data
      const accountId = parts[1];
      if (parts[2] === "data") return { status: 200, json: () => store.accountData[accountId] || { stocks: [] } };
    }

    return { status: 404, json: () => ({ error: "not found" }) };
  }

  // Provide global endpoints by hijacking window.__mockApiFetch (app uses this helper instead of real fetch)
  window.__mockApi = { apiFetch };
}

// ensure mock server is created once
if (!window.__mockApi) createMockServer();

// -------------------- React App --------------------
export default function StockBrokerDashboard() {
  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accountData, setAccountData] = useState({ stocks: [] });
  const pollingRef = useRef(null);

  // Helper: call the mock API
  async function callApi(path) {
    const res = await window.__mockApi.apiFetch(path);
    if (res.status >= 200 && res.status < 300) return res.json();
    throw new Error("API error");
  }

  useEffect(() => {
    // load companies on mount
    callApi("/companies").then(setCompanies).catch(console.error);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    // when company changes, load accounts
    if (!selectedCompany) return setAccounts([]);
    callApi(`/companies/${selectedCompany}/accounts`).then((a) => {
      setAccounts(a || []);
      // auto-select first account if present
      if (a && a.length > 0) setSelectedAccount(a[0].id);
    });
  }, [selectedCompany]);

  useEffect(() => {
    // start polling account data every 1s
    if (!selectedAccount) return setAccountData({ stocks: [] });
    // clear previous
    if (pollingRef.current) clearInterval(pollingRef.current);

    async function fetchOnce() {
      try {
        const d = await callApi(`/accounts/${selectedAccount}/data`);
        setAccountData(d);
      } catch (e) {
        console.error(e);
      }
    }

    fetchOnce();
    pollingRef.current = setInterval(fetchOnce, 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedAccount]);

  function handleLogin(e) {
    e.preventDefault();
    if (!email) return alert("please enter email");
    // simple validation, then mark logged in
    setLoggedIn(true);
    // set default company if not set
    if (!selectedCompany && companies.length > 0) setSelectedCompany(companies[0].id);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Stock Broker Client Dashboard</h1>
          <div className="text-sm text-slate-600">Mock demo · live-updates (polling)</div>
        </header>

        {!loggedIn ? (
          <div className="bg-white shadow rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold mb-3">Login</h2>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="w-full bg-blue-600 text-white py-2 rounded">Sign in</button>
            </form>
            <p className="mt-3 text-xs text-slate-500">Use any email. This creates a session for demo.</p>
          </div>
        ) : (
          <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <section className="col-span-1 md:col-span-1">
              <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm text-slate-500">Logged in as</div>
                    <div className="font-medium">{email}</div>
                  </div>
                  <button
                    className="text-sm text-red-600"
                    onClick={() => {
                      setLoggedIn(false);
                      setEmail("");
                      setSelectedAccount("");
                      setSelectedCompany("");
                    }}
                  >
                    Sign out
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm text-slate-600">Company</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">-- choose company --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <label className="block text-sm text-slate-600">Account</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    <option value="">-- choose account --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-4 text-xs text-slate-500">Tip: open another browser window and sign in as another user to see asynchronous updates independently (each session polls the API).</div>
                </div>
              </div>

              <div className="mt-4 bg-white shadow rounded-lg p-4">
                <h3 className="font-semibold mb-2">Subscriptions</h3>
                <p className="text-sm text-slate-600">Subscribed tickers for selected account:</p>
                <div className="mt-2 space-y-2">
                  {accountData.stocks.length === 0 && <div className="text-sm text-slate-500">No account selected</div>}
                  {accountData.stocks.map((s) => (
                    <div key={s.ticker} className="flex items-center justify-between">
                      <div className="font-medium">{s.ticker}</div>
                      <div className="text-right">
                        <div className="text-sm">${s.price.toFixed(2)}</div>
                        <div className={`text-xs ${s.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="col-span-2">
              <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Live Prices</h2>
                  <div className="text-xs text-slate-500">Auto-updates every second</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="text-left text-slate-500 text-sm">
                        <th className="py-2">Ticker</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Change</th>
                        <th className="py-2">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountData.stocks.map((s) => (
                        <tr key={s.ticker} className="border-t">
                          <td className="py-3 font-medium">{s.ticker}</td>
                          <td className="py-3">${s.price.toFixed(2)}</td>
                          <td className={`py-3 ${s.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}
                          </td>
                          <td className="py-3 text-sm text-slate-500">{new Date(s.updatedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded">
                    <div className="text-sm text-slate-500">Portfolio Value</div>
                    <div className="text-xl font-semibold">${accountData.stocks.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</div>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="text-sm text-slate-500">Tickers</div>
                    <div className="font-medium">{accountData.stocks.map((s) => s.ticker).join(', ')}</div>
                  </div>

                  <div className="p-3 border rounded">
                    <div className="text-sm text-slate-500">Last refresh</div>
                    <div className="font-medium">{accountData.stocks.length>0 ? new Date(Math.max(...accountData.stocks.map(s=>s.updatedAt))).toLocaleTimeString() : '-'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white shadow rounded-lg p-4">
                <h3 className="font-semibold mb-2">Activity Log</h3>
                <div className="text-sm text-slate-500">
                  This demo uses an in-browser mock API. Prices update from the API every second; open another window and log in to a different account to see both dashboards updating independently.
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
