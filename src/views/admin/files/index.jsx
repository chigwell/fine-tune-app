import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Card from "components/card";
import {
  MdDelete,
  MdDownload,
  MdOutlineFolder,
  MdRefresh,
  MdUpload,
} from "react-icons/md";
import { getAuthToken } from "utils/auth";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const PAGE_SIZE = 10;
const MAX_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["train", "validation", "benchmark"];

const formatDate = (value) => {
  if (!value) return "—";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatSizeMb = (bytes) => {
  if (bytes === null || bytes === undefined) return "—";
  const sizeNumber = Number(bytes);
  if (Number.isNaN(sizeNumber)) return "—";
  const mb = sizeNumber / (1024 * 1024);
  if (mb < 1) {
    return `${mb.toFixed(2)} MB`;
  }
  return `${mb.toFixed(1)} MB`;
};

const truncateName = (name, max = 50) => {
  if (!name) return "—";
  if (name.length <= max) return name;
  const keep = max - 3;
  const front = Math.ceil(keep / 2);
  const back = Math.floor(keep / 2);
  return `${name.slice(0, front)}...${name.slice(name.length - back)}`;
};

const Files = () => {
  const [files, setFiles] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(ALLOWED_FILE_TYPES[0]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);
  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  const fetchFiles = useCallback(
    async (pageIndex = page) => {
      const authToken = getAuthToken();
      if (!authToken) {
        setError("You need to sign in to view files.");
        setFiles([]);
        setReachedEnd(true);
        return;
      }

      setLoading(true);
      setError("");
      setStatusMessage("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/files?limit=${PAGE_SIZE}&offset=${
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
            "Unable to load files.";
          throw new Error(reason);
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        setFiles(items);
        setReachedEnd(items.length < PAGE_SIZE);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load files right now.";
        setError(message);
        setFiles([]);
        setReachedEnd(true);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchFiles(page);
  }, [page, fetchFiles]);

  const resetUploadState = useCallback(
    (nextFileType = ALLOWED_FILE_TYPES[0]) => {
      setSelectedFile(null);
      setFileType(nextFileType);
      setUploadError("");
      setReplaceTarget(null);
      setShowUpload(false);
    },
    []
  );

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".jsonl")) {
      setUploadError("Only .jsonl files are allowed.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("File size must be 500 MB or less.");
      setSelectedFile(null);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!event.dataTransfer?.files?.length) return;
      const [file] = event.dataTransfer.files;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const downloadFile = useCallback(async (file) => {
    if (!file) return;
    const fileId = file.id || file.file_id;
    if (!fileId) return;

    const authToken = getAuthToken();
    if (!authToken) {
      setError("You need to sign in to download files.");
      return;
    }
    setError("");
    setDownloadingId(fileId);

    const isGguf = (file.file_type || "").toLowerCase() === "gguf";
    const endpoint = isGguf
      ? `${API_BASE_URL}/files/${fileId}/download-gguf`
      : `${API_BASE_URL}/files/${fileId}/download`;

    const filenameFromHeaders = (res) => {
      const disposition = res.headers.get("Content-Disposition") || "";
      const match =
        disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
      const raw = match?.[1] || match?.[2] || "";
      const cleaned = raw.replace(/['"]/g, "");
      if (!cleaned) return "";
      try {
        return decodeURIComponent(cleaned);
      } catch (e) {
        return cleaned;
      }
    };
    const ensureZipFilename = (name) => {
      const base = name || (fileId ? `file-${fileId}` : "download");
      if (base.toLowerCase().endsWith(".zip")) return base;
      const trimmed = base.replace(/\.gguf$/i, "").replace(/\.$/, "");
      return `${trimmed}.zip`;
    };

    try {
      const res = await fetch(endpoint, {
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
          "Unable to download file.";
        throw new Error(reason);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        filenameFromHeaders(res) ||
        file.original_name ||
        file.storage_key ||
        "";

      link.href = url;
      if (filename) {
        link.download = isGguf ? ensureZipFilename(filename) : filename;
      } else if (isGguf) {
        link.download = ensureZipFilename("");
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to download file right now.";
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const performDelete = useCallback(
    async (fileId, { silent = false, skipRefresh = false } = {}) => {
      const authToken = getAuthToken();
      if (!authToken) {
        if (!silent) setError("You need to sign in to delete files.");
        return false;
      }

      setDeletingId(fileId);
      if (!silent) {
        setError("");
        setStatusMessage("");
      }

      try {
        const res = await fetch(`${API_BASE_URL}/files/${fileId}`, {
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
            "Unable to delete file.";
          throw new Error(reason);
        }

        if (!skipRefresh) {
          const nextPage =
            files.length === 1 && page > 0 ? Math.max(0, page - 1) : page;
          if (nextPage === page) {
            fetchFiles(nextPage);
          } else {
            setPage(nextPage);
          }
        }

        return true;
      } catch (err) {
        if (!silent) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to delete file right now.";
          setError(message);
        }
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [fetchFiles, files.length, page]
  );

  const handleUpload = useCallback(async () => {
    if (uploading) return;
    const authToken = getAuthToken();
    if (!authToken) {
      setUploadError("You need to sign in to upload files.");
      return;
    }

    if (!selectedFile) {
      setUploadError("Please select a .jsonl file first.");
      return;
    }

    const payloadFileType = fileType || ALLOWED_FILE_TYPES[0];
    const formData = new FormData();
    formData.append("file_type", payloadFileType);
    formData.append("file", selectedFile);

    setUploading(true);
    setUploadError("");
    setStatusMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const reason =
          data?.detail ||
          data?.reason ||
          data?.message ||
          "Unable to upload file.";
        throw new Error(reason);
      }

      if (replaceTarget?.id) {
        // Best-effort delete of the old file after successful replacement upload.
        await performDelete(replaceTarget.id, { silent: true, skipRefresh: true });
      }

      setStatusMessage(
        replaceTarget ? "File replaced successfully." : "File uploaded successfully."
      );
      resetUploadState();
      setPage(0);
      fetchFiles(0);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to upload file right now.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }, [
    fetchFiles,
    fileType,
    replaceTarget,
    resetUploadState,
    selectedFile,
    uploading,
    performDelete,
  ]);

  const openUploadModal = useCallback(
    (fileToReplace = null) => {
      setReplaceTarget(
        fileToReplace
          ? {
              id: fileToReplace.id || fileToReplace.file_id,
              original_name: fileToReplace.original_name,
              file_type: fileToReplace.file_type,
            }
          : null
      );
      setFileType(fileToReplace?.file_type || ALLOWED_FILE_TYPES[0]);
      setSelectedFile(null);
      setUploadError("");
      setShowUpload(true);
    },
    []
  );

  const renderUploadModal = () => {
    if (!showUpload) return null;

    const title = replaceTarget ? "Replace File" : "Upload File";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-3xl dark:bg-navy-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-200">
              <MdUpload className="text-xl" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-navy-700 dark:text-white">
                {title}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Upload a .jsonl file up to 500 MB. Allowed types:{" "}
                {ALLOWED_FILE_TYPES.join(", ")}.
              </p>
              {replaceTarget?.original_name && (
                <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-200">
                  Replacing: {replaceTarget.original_name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
              File Type
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
              >
                {ALLOWED_FILE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-brand-500 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:hover:border-brand-300 dark:hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jsonl"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <p className="text-sm font-semibold text-navy-700 dark:text-white">
              Drag &amp; drop your file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
              Only .jsonl files, max 500 MB
            </p>
            {selectedFile && (
              <div className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-white">
                Selected: {selectedFile.name} (
                {formatSizeMb(selectedFile.size)})
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {uploadError}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetUploadState();
              }}
              className="linear rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="linear inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-300"
            >
              <MdUpload />
              {uploading
                ? replaceTarget
                  ? "Replacing..."
                  : "Uploading..."
                : replaceTarget
                  ? "Replace File"
                  : "Upload File"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirm = () => {
    if (!confirmTarget) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-3xl dark:bg-navy-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200">
              <MdDelete className="text-xl" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-navy-700 dark:text-white">
                Delete file?
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                This will remove the file permanently.
              </p>
              <p className="mt-2 font-mono text-xs text-gray-600 dark:text-gray-200">
                {confirmTarget.original_name || confirmTarget.storage_key}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className="linear rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                performDelete(confirmTarget.id, { silent: false }).finally(() =>
                  setConfirmTarget(null)
                );
              }}
              disabled={deletingId === confirmTarget.id}
              className="linear rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-red-600 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-500"
            >
              {deletingId === confirmTarget.id ? "Deleting..." : "Yes, delete"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-gray-500">
                Files
              </p>
              <div className="mt-1 flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
                <MdOutlineFolder className="text-2xl text-brand-500" />
                <span>Manage your datasets</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Upload, replace, or delete your .jsonl datasets (max 500 MB).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchFiles(page)}
                disabled={loading}
                className="linear flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                <MdRefresh />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => openUploadModal()}
                className="linear flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300"
              >
                <MdUpload />
                Upload File
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-900/30 dark:text-emerald-100">
              {statusMessage}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Size</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && files.length === 0 && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={5}
                    >
                      {error
                        ? "Unable to load files."
                        : "No files yet. Upload your first dataset."}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={5}
                    >
                      Loading files...
                    </td>
                  </tr>
                )}

                {!loading &&
                  files.map((file) => {
                    const fileId = file.id || file.file_id;
                    const displayName = truncateName(file.original_name, 50);
                    const isGguf = (file.file_type || "").toLowerCase() === "gguf";
                    return (
                      <tr
                        key={fileId || file.storage_key}
                        className="border-b border-gray-100 last:border-none dark:border-white/10"
                      >
                        <td
                          className="py-3 pr-4 text-sm font-semibold text-navy-700 dark:text-white"
                          title={file.original_name}
                        >
                          {displayName}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {file.file_type || "—"}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {formatSizeMb(file.size_bytes)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(file.created_at)}
                        </td>
                        <td className="py-3 pr-0 text-right text-sm">
                          {isGguf && (
                            <button
                              type="button"
                              onClick={() => downloadFile(file)}
                              disabled={downloadingId === fileId}
                              className="linear mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                            >
                              {downloadingId === fileId ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                              ) : (
                                <MdDownload />
                              )}
                              {downloadingId === fileId ? "Preparing..." : "Download"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openUploadModal(file)}
                            className="linear mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                          >
                            <MdUpload />
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmTarget({
                                id: fileId,
                                original_name: file.original_name,
                                storage_key: file.storage_key,
                              })
                            }
                            disabled={deletingId === fileId}
                            className="linear inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                          >
                            <MdDelete />
                            {deletingId === fileId ? "Deleting..." : "Delete"}
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
              Showing {files.length} files {offset ? `(offset ${offset})` : ""}
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

      {renderUploadModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default Files;
