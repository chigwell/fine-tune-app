import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "components/card";
import { MdOutlineReceipt, MdRefresh } from "react-icons/md";
import { getAuthToken } from "utils/auth";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return "—";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatAmount = (cents, currency = "USD") => {
  const amountNumber = Number(cents);
  if (Number.isNaN(amountNumber)) return "—";
  const dollars = amountNumber / 100;
  const sign = dollars >= 0 ? "" : "-";
  return `${sign}$${Math.abs(dollars).toFixed(2)} ${currency}`;
};

const prettifyType = (value) => {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const Billing = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [error, setError] = useState("");

  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  const fetchTransactions = useCallback(
    async (pageIndex = page) => {
      const token = getAuthToken();
      if (!token) {
        setTransactions([]);
        setError("You need to sign in to view billing.");
        setReachedEnd(true);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/balance/transactions?limit=${PAGE_SIZE}&offset=${
            pageIndex * PAGE_SIZE
          }`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const reason =
            data?.detail ||
            data?.reason ||
            data?.message ||
            "Unable to load billing history.";
          throw new Error(reason);
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        setTransactions(items);
        setReachedEnd(items.length < PAGE_SIZE);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load billing history right now.";
        setError(message);
        setTransactions([]);
        setReachedEnd(true);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-gray-500">
                Billing
              </p>
              <div className="mt-1 flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
                <MdOutlineReceipt className="text-2xl text-brand-500" />
                <span>Balance history</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View your top-ups and usage charges.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchTransactions(page)}
                disabled={loading}
                className="linear flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                <MdRefresh />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Description</th>
                  <th className="py-3 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {!loading && transactions.length === 0 && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={4}
                    >
                      {error
                        ? "Unable to load billing history."
                        : "No billing activity yet."}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={4}
                    >
                      Loading billing history...
                    </td>
                  </tr>
                )}

                {!loading &&
                  transactions.map((tx) => {
                    const id = tx.id || tx.transaction_id || `${tx.created_at}-${tx.amount_cents}`;
                    const amountText = formatAmount(tx.amount_cents, tx.currency || "USD");
                    const isPositive = Number(tx.amount_cents) >= 0;

                    return (
                      <tr
                        key={id}
                        className="border-b border-gray-100 last:border-none dark:border-white/10"
                      >
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(tx.created_at || tx.timestamp)}
                        </td>
                        <td className="py-3 pr-4 text-sm font-semibold text-navy-700 dark:text-white">
                          {prettifyType(tx.type)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {tx.description || "—"}
                        </td>
                        <td className="py-3 pr-0 text-right text-sm">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isPositive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100"
                            }`}
                          >
                            {amountText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Showing {transactions.length} records {offset ? `(offset ${offset})` : ""}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0 || loading}
                className="linear rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Previous
              </button>
              <span className="self-center text-sm font-semibold text-navy-700 dark:text-white">
                Page {page + 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={loading || reachedEnd}
                className="linear rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
