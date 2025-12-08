import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "components/card";
import { MdOutlineVpnKey, MdRefresh, MdDelete } from "react-icons/md";
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

const copyToClipboard = (value) => {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    !navigator.clipboard.writeText
  ) {
    return;
  }

  navigator.clipboard.writeText(value).catch(() => {});
};

const ApiKeys = () => {
  const [tokens, setTokens] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [reachedEnd, setReachedEnd] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  const fetchTokens = useCallback(
    async (pageIndex = page) => {
      const authToken = getAuthToken();
      if (!authToken) {
        setError("You need to sign in to view API keys.");
        setTokens([]);
        setReachedEnd(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/tokens?limit=${PAGE_SIZE}&offset=${
            pageIndex * PAGE_SIZE
          }`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const reason =
            data?.detail ||
            data?.reason ||
            data?.message ||
            "Unable to load API keys.";
          throw new Error(reason);
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        setTokens(items);
        setReachedEnd(items.length < PAGE_SIZE);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load API keys right now.";
        setError(message);
        setTokens([]);
        setReachedEnd(true);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchTokens(page);
  }, [page, fetchTokens]);

  const handleCreate = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken || creating) return;

    setCreating(true);
    setError("");
    setLastCreated(null);

    try {
      const res = await fetch(`${API_BASE_URL}/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const reason =
          data?.detail ||
          data?.reason ||
          data?.message ||
          "Unable to create API key.";
        throw new Error(reason);
      }

      setLastCreated(data?.token_value || null);
      if (page !== 0) {
        setPage(0);
      } else {
        fetchTokens(0);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create API key right now.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }, [creating, fetchTokens, page]);

  const handleDelete = useCallback(
    async (tokenId) => {
      const authToken = getAuthToken();
      if (!authToken || deletingId) return;

      const confirmDelete = window.confirm(
        "This API key will be revoked. Continue?"
      );
      if (!confirmDelete) return;

      setDeletingId(tokenId);
      setError("");

      try {
        const res = await fetch(`${API_BASE_URL}/tokens/${tokenId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const reason =
            data?.detail ||
            data?.reason ||
            data?.message ||
            "Unable to delete API key.";
          throw new Error(reason);
        }

        const nextPage =
          tokens.length === 1 && page > 0 ? Math.max(0, page - 1) : page;

        if (nextPage === page) {
          fetchTokens(nextPage);
        } else {
          setPage(nextPage);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to delete API key right now.";
        setError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, fetchTokens, page, tokens.length]
  );

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-gray-500">
                API Keys
              </p>
              <div className="mt-1 flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
                <MdOutlineVpnKey className="text-2xl text-brand-500" />
                <span>Manage access tokens</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Generate keys for CLI or programmatic access.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchTokens(page)}
                disabled={loading}
                className="linear flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                <MdRefresh />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || loading}
                className="linear flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-300"
              >
                {creating ? "Creating..." : "Generate API Key"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {lastCreated && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-900/30 dark:text-emerald-100">
              New API key created: <span className="font-mono">{lastCreated}</span>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10">
                  <th className="py-3 pr-4">Token</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4">Valid Until</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && tokens.length === 0 && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={5}
                    >
                      {error
                        ? "Unable to load keys."
                        : "No API keys yet. Generate one to get started."}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={5}
                    >
                      Loading keys...
                    </td>
                  </tr>
                )}

                {!loading &&
                  tokens.map((token) => {
                    const tokenValue = token.token_value || "—";
                    const tokenId = token.id || token.token_id;
                    const isActive = token.is_active !== 0;

                    return (
                      <tr
                        key={tokenId || tokenValue}
                        className="border-b border-gray-100 last:border-none dark:border-white/10"
                      >
                        <td className="py-3 pr-4 text-sm font-semibold text-navy-700 dark:text-white">
                          <div className="flex flex-col">
                            <span className="font-mono text-[13px]">
                              {tokenValue}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {tokenId ?? "unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(token.created_at)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {token.valid_until ? formatDate(token.valid_until) : "No expiry"}
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-0 text-right text-sm">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(tokenValue)}
                            className="linear mr-2 rounded-lg px-3 py-2 text-xs font-semibold text-brand-600 transition duration-200 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-white/10"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tokenId)}
                            disabled={deletingId === tokenId}
                            className="linear inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                          >
                            <MdDelete />
                            {deletingId === tokenId ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Showing {tokens.length} keys {offset ? `(offset ${offset})` : ""}
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

export default ApiKeys;
