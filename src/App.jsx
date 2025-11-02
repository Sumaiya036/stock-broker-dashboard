import React, { useEffect, useState, useRef } from "react";
import "./mockServer";

export default function StockBrokerDashboard() {
  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accountData, setAccountData] = useState({ stocks: [] });
  const pollingRef = useRef(null);

  async function callApi(path) {
    const res = await window.__mockApi.apiFetch(path);
    if (res.status >= 200 && res.status < 300) return res.json();
    throw new Error("API error");
  }

  useEffect(() => {
    callApi("/companies").then(setCompanies).catch(console.error);
    return () => pollingRef.current && clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
    if (!selectedCompany) return setAccounts([]);
    callApi(`/companies/${selectedCompany}/accounts`).then((a) => {
      setAccounts(a || []);
      if (a && a.length > 0) setSelectedAccount(a[0].id);
    });
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedAccount) return setAccountData({ stocks: [] });
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
    return () => pollingRef.current && clearInterval(pollingRef.current);
  }, [selectedAccount]);

  function handleLogin(e) {
    e.preventDefault();
    if (!email) return alert("please enter email");
    setLoggedIn(true);
    if (!selectedCompany && companies.length > 0) setSelectedCompany(companies[0].id);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Stock Broker Client Dashboard</h1>
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

                <label className="block text-sm text-slate-600">Company</label>
                <select
                  className="w-full border rounded px-3 py-2 mb-3"
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
              </div>

              <div className="mt-4 bg-white shadow rounded-lg p-4">
                <h3 className="font-semibold mb-2">Subscriptions</h3>
                <div className="space-y-2">
                  {accountData.stocks.length === 0 && (
                    <div className="text-sm text-slate-500">No account selected</div>
                  )}
                  {accountData.stocks.map((s) => (
                    <div key={s.ticker} className="flex items-center justify-between">
                      <div className="font-medium">{s.ticker}</div>
                      <div className="text-right">
                        <div className="text-sm">${s.price.toFixed(2)}</div>
                        <div className={`text-xs ${s.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {s.change >= 0 ? "+" : ""}
                          {s.change.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="col-span-2">
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Live Prices</h2>
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
                            {s.change >= 0 ? "+" : ""}
                            {s.change.toFixed(2)}
                          </td>
                          <td className="py-3 text-sm text-slate-500">
                            {new Date(s.updatedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
