import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "components/card";
import {
  MdDelete,
  MdOutlineReceipt,
  MdPlayArrow,
  MdStop,
  MdUpload,
  MdViewList,
  MdRefresh,
  MdOpenInNew,
} from "react-icons/md";
import { getAuthToken } from "utils/auth";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const PAGE_SIZE = 10;
const LOGS_PAGE_SIZE = 20;

const formatDate = (value) => {
  if (!value) return "—";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const statusBadgeClass = (status) => {
  switch ((status || "").toLowerCase()) {
    case "running":
    case "queued":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100";
    case "succeeded":
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white";
  }
};

const defaultHyperparams = {
  learning_rate: 2e-4,
  batch_size: 1,
  grad_accumulation: 4,
  epochs: 1,
  max_seq_length: 2048,
  optim: "adamw_torch",
  lr_scheduler_type: "cosine",
  logging_steps: 10,
  save_strategy: "epoch",
  eval_strategy: "no",
  bf16: true,
};

const TaskDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startLoading, setStartLoading] = useState({});
  const [reachedEnd, setReachedEnd] = useState(false);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [baseModels, setBaseModels] = useState([]);
  const [baseModelsLoading, setBaseModelsLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [baseModelId, setBaseModelId] = useState("");
  const [datasetSource, setDatasetSource] = useState("auto_split"); // auto_split | from_files
  const [trainFiles, setTrainFiles] = useState([]);
  const [valFiles, setValFiles] = useState([]);
  const [benchFiles, setBenchFiles] = useState([]);
  const [uploadingRole, setUploadingRole] = useState("");
  const [splitTrain, setSplitTrain] = useState(80);
  const [splitVal, setSplitVal] = useState(10);
  const [splitBench, setSplitBench] = useState(10);
  const [singleFile, setSingleFile] = useState(null);
  const [singleFileError, setSingleFileError] = useState("");
  const singleFileInputRef = useRef(null);

  const [hyperparams, setHyperparams] = useState(defaultHyperparams);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [logsModal, setLogsModal] = useState({
    open: false,
    taskId: null,
    taskName: "",
    items: [],
    loading: false,
    page: 0,
    reachedEnd: false,
  });

  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  const fetchTasks = useCallback(
    async (pageIndex = page) => {
      const token = getAuthToken();
      if (!token) {
        setError("You need to sign in to view tasks.");
        setTasks([]);
        setReachedEnd(true);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/tasks?limit=${PAGE_SIZE}&offset=${pageIndex * PAGE_SIZE}`,
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
            "Unable to load tasks.";
          throw new Error(reason);
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        setTasks(items);
        setReachedEnd(items.length < PAGE_SIZE);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load tasks right now.";
        setError(message);
        setTasks([]);
        setReachedEnd(true);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchTasks(page);
  }, [page, fetchTasks]);

  const refreshBaseModels = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setBaseModelsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/base-models?limit=100&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error();
      const items = Array.isArray(data?.items) ? data.items : [];
      setBaseModels(items);
      if (!baseModelId && items.length) {
        const preferred = items.find((m) => Number(m.id) === 1);
        const firstId = preferred?.id || items[0].id;
        if (firstId) setBaseModelId(String(firstId));
      }
    } catch (e) {
      setBaseModels([]);
    } finally {
      setBaseModelsLoading(false);
    }
  }, [baseModelId]);

  useEffect(() => {
    if (showCreate) {
      refreshBaseModels();
    }
  }, [showCreate, refreshBaseModels]);

  const normalizeStatus = (s) => {
    const val = (s ?? "draft").toString().trim().toLowerCase();
    if (val === "completed") return "succeeded";
    return val || "draft";
  };
  const canStart = (status) => {
    const s = normalizeStatus(status);
    return s === "draft";
  };
  const canStop = (status) => {
    const s = normalizeStatus(status);
    return s === "queued" || s === "running";
  };
  const canDelete = (status) => {
    const s = normalizeStatus(status);
    return s === "draft" || s === "cancelled";
  };

  const setStartLoadingFlag = useCallback((taskId, value) => {
    setStartLoading((prev) => {
      if (value) {
        return { ...prev, [taskId]: true };
      }
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const performAction = useCallback(
    async (taskId, action) => {
      const token = getAuthToken();
      if (!token) {
        setError("You need to sign in first.");
        return;
      }
      try {
        let url = "";
        let method = "POST";
        if (action === "start") url = `${API_BASE_URL}/tasks/${taskId}/start`;
        if (action === "stop") url = `${API_BASE_URL}/tasks/${taskId}/stop`;
        if (action === "delete") {
          url = `${API_BASE_URL}/tasks/${taskId}`;
          method = "DELETE";
        }
        const res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: method === "POST" ? JSON.stringify({}) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const reason =
            data?.detail || data?.reason || data?.message || "Action failed.";
          throw new Error(reason);
        }
        fetchTasks(page);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to perform action right now.";
        setError(message);
      }
    },
    [fetchTasks, page]
  );

  const startWithLoader = useCallback(
    async (taskId) => {
      if (startLoading[taskId]) return;
      setStartLoadingFlag(taskId, true);
      try {
        await performAction(taskId, "start");
      } finally {
        setStartLoadingFlag(taskId, false);
      }
    },
    [performAction, setStartLoadingFlag, startLoading]
  );

  const uploadFile = useCallback(async (file, role) => {
    if (!file) return null;
    const token = getAuthToken();
    if (!token) {
      throw new Error("You need to sign in to upload files.");
    }
    const formData = new FormData();
    formData.append("file_type", role);
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const reason =
        data?.detail || data?.reason || data?.message || "Unable to upload file.";
      throw new Error(reason);
    }
    return data;
  }, []);

  const buildDatasetFromFiles = useCallback(
    async ({ fileMappings, sourceType }) => {
      // Call dataset-configs endpoint to build a dataset configuration from provided files.
      const token = getAuthToken();
      if (!token) {
        throw new Error("You need to sign in to build datasets.");
      }

      const mapped = fileMappings
        .map((entry, idx) => {
          const idNumber = Number(entry.file_id);
          if (!Number.isFinite(idNumber)) return null;
          return {
            file_id: idNumber,
            split_role: entry.split_role,
            position:
              entry.position === 0 || Number.isFinite(entry.position)
                ? Number(entry.position)
                : idx,
          };
        })
        .filter(Boolean);

      if (!mapped.length) {
        throw new Error("No file ids available to build dataset config.");
      }

      const resolvedSource = sourceType || "explicit_files";
      const payload = {
        name: projectName || "Fine-tune dataset",
        description: "Generated from UI",
        source_type: resolvedSource,
        split_train_pct: splitTrain,
        split_validation_pct: splitVal,
        split_benchmark_pct: splitBench,
        files: mapped,
      };

      const res = await fetch(`${API_BASE_URL}/dataset-configs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const reason =
          data?.detail ||
          data?.reason ||
          data?.message ||
          "Unable to create dataset config.";
        throw new Error(reason);
      }
      const newId = data?.dataset_config_id || data?.id || data?.data?.id;
      if (!newId) {
        throw new Error("Dataset config created but no id returned.");
      }
      return newId;
    },
    [projectName, splitBench, splitTrain, splitVal]
  );

  const handleSingleFileSelect = useCallback((file) => {
    if (!file) return;
    setSingleFile(file);
    setSingleFileError("");
  }, []);

  const handleUploadFiles = useCallback(
    async (fileList, role) => {
      if (!fileList.length) return;
      setUploadingRole(role);
      try {
        for (const file of fileList) {
          if (!file.name.toLowerCase().endsWith(".jsonl")) {
            setCreateError("Only .jsonl files are allowed.");
            continue;
          }
          if (file.size > 500 * 1024 * 1024) {
            setCreateError("File must be 500 MB or smaller.");
            continue;
          }
          const uploaded = await uploadFile(file, role);
          const newId = uploaded?.id || uploaded?.file_id;
          if (!newId) {
            setCreateError("Upload failed: missing file id.");
            continue;
          }
          const displayName =
            uploaded?.original_name || file.name || uploaded?.storage_key || `file-${newId}`;
          const entry = { id: newId, name: displayName };
          if (role === "train") {
            setTrainFiles((prev) => [...prev, entry]);
          } else if (role === "validation") {
            setValFiles((prev) => [...prev, entry]);
          } else {
            setBenchFiles((prev) => [...prev, entry]);
          }
        }
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      } finally {
        setUploadingRole("");
      }
    },
    [uploadFile]
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const input = event.target;
      const filesPicked = Array.from(input.files || []);
      const role = input.dataset.role || "train";
      input.value = "";
      if (!filesPicked.length) return;

      if (datasetSource === "auto_split") {
        const file = filesPicked[0];
        if (!file.name.toLowerCase().endsWith(".jsonl")) {
          setSingleFileError("Only .jsonl files are allowed.");
          setSingleFile(null);
          return;
        }
        if (file.size > 500 * 1024 * 1024) {
          setSingleFileError("File must be 500 MB or smaller.");
          setSingleFile(null);
          return;
        }
        setSingleFileError("");
        handleSingleFileSelect(file);
        return;
      }

      handleUploadFiles(filesPicked, role);
    },
    [datasetSource, handleSingleFileSelect, handleUploadFiles]
  );

  const adjustSplits = useCallback(
    (field, value) => {
      const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
      let nextTrain = splitTrain;
      let nextVal = splitVal;
      let nextBench = splitBench;
      if (field === "train") nextTrain = safeValue;
      if (field === "val") nextVal = safeValue;
      if (field === "bench") nextBench = safeValue;

      const total = nextTrain + nextVal + nextBench;
      if (total <= 100) {
        setSplitTrain(nextTrain);
        setSplitVal(nextVal);
        setSplitBench(nextBench);
        return;
      }

      const overflow = total - 100;
      const otherTotal =
        field === "train"
          ? nextVal + nextBench
          : field === "val"
            ? nextTrain + nextBench
            : nextTrain + nextVal;

      const reduce = (current, share) =>
        Math.max(0, current - overflow * (share / Math.max(otherTotal, 1)));

      if (field === "train") {
        nextVal = reduce(nextVal, nextVal);
        nextBench = reduce(nextBench, nextBench);
      } else if (field === "val") {
        nextTrain = reduce(nextTrain, nextTrain);
        nextBench = reduce(nextBench, nextBench);
      } else {
        nextTrain = reduce(nextTrain, nextTrain);
        nextVal = reduce(nextVal, nextVal);
      }

      nextTrain = Math.round(nextTrain);
      nextVal = Math.round(nextVal);
      nextBench = Math.round(nextBench);

      let roundedTotal = nextTrain + nextVal + nextBench;
      if (roundedTotal !== 100) {
        const diff = 100 - roundedTotal;
        if (field === "bench") {
          nextTrain = Math.max(0, nextTrain + diff);
        } else {
          nextBench = Math.max(0, nextBench + diff);
        }
      }

      setSplitTrain(nextTrain);
      setSplitVal(nextVal);
      setSplitBench(nextBench);
    },
    [splitBench, splitTrain, splitVal]
  );

  const truncateFileName = (name, max = 30) => {
    if (!name) return "—";
    if (name.length <= max) return name;
    const keep = max - 3;
    const front = Math.ceil(keep / 2);
    const back = Math.floor(keep / 2);
    return `${name.slice(0, front)}...${name.slice(name.length - back)}`;
  };

  const handleCreateTask = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCreateError("You need to sign in to create tasks.");
      return;
    }

    if (!projectName.trim()) {
      setCreateError("Project name is required.");
      return;
    }
    if (!baseModelId) {
      setCreateError("Base model ID is required.");
      return;
    }
    if (datasetSource === "auto_split" && splitTrain + splitVal + splitBench !== 100) {
      setCreateError("Split percentages must total 100.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      let targetDatasetConfigId = null;

      if (datasetSource === "from_files") {
        if (!trainFiles.length || !valFiles.length || !benchFiles.length) {
          throw new Error("Upload at least one train, validation, and benchmark file.");
        }
        const newId = await buildDatasetFromFiles({
          sourceType: "explicit_files",
          fileMappings: [
            ...trainFiles.map((f, idx) => ({
              file_id: Number(f.id),
              split_role: "train",
              position: idx,
            })),
            ...valFiles.map((f, idx) => ({
              file_id: Number(f.id),
              split_role: "validation",
              position: idx,
            })),
            ...benchFiles.map((f, idx) => ({
              file_id: Number(f.id),
              split_role: "benchmark",
              position: idx,
            })),
          ],
        });
        targetDatasetConfigId = newId;
      }

      if (datasetSource === "auto_split") {
        if (!singleFile) {
          throw new Error("Upload a dataset file to auto-split.");
        }
        const uploaded = await uploadFile(singleFile, "train");
        const uploadedId = uploaded?.id || uploaded?.file_id;
        if (!uploadedId) {
          throw new Error("Upload failed: missing file id.");
        }
        const newId = await buildDatasetFromFiles({
          sourceType: "single_split",
          fileMappings: [
            {
              file_id: Number(uploadedId),
              split_role: "raw",
              position: 0,
            },
          ],
        });
        targetDatasetConfigId = newId;
      }

      if (!targetDatasetConfigId) {
        throw new Error("Dataset config ID is required.");
      }

      const payload = {
        base_model_id: Number(baseModelId),
        dataset_config_id: Number(targetDatasetConfigId),
        project_name: projectName.trim(),
        learning_rate: Number(hyperparams.learning_rate),
        batch_size: Number(hyperparams.batch_size),
        grad_accumulation: Number(hyperparams.grad_accumulation),
        epochs: Number(hyperparams.epochs),
        max_seq_length: Number(hyperparams.max_seq_length),
        optim: hyperparams.optim,
        lr_scheduler_type: hyperparams.lr_scheduler_type,
        logging_steps: Number(hyperparams.logging_steps),
        save_strategy: hyperparams.save_strategy,
        eval_strategy: hyperparams.eval_strategy,
        bf16: Boolean(hyperparams.bf16),
      };

      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const reason =
          data?.detail || data?.reason || data?.message || "Unable to create task.";
        throw new Error(reason);
      }

      setShowCreate(false);
      setPage(0);
      fetchTasks(0);
      setProjectName("");
      setBaseModelId("");
      setDatasetSource("auto_split");
      setTrainFiles([]);
      setValFiles([]);
      setBenchFiles([]);
      setSingleFile(null);
      setHyperparams(defaultHyperparams);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create task right now.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }, [
    baseModelId,
    datasetSource,
    fetchTasks,
    hyperparams,
    projectName,
    uploadFile,
    buildDatasetFromFiles,
    trainFiles,
    valFiles,
    benchFiles,
    singleFile,
  ]);

  const openLogs = useCallback(
    async (taskId, taskName = "") => {
      const token = getAuthToken();
      if (!token) return;
      const next = {
        open: true,
        taskId,
        taskName,
        items: [],
        loading: true,
        page: 0,
        reachedEnd: false,
      };
      setLogsModal(next);

      try {
        const res = await fetch(
          `${API_BASE_URL}/tasks/${taskId}/logs?limit=${LOGS_PAGE_SIZE}&offset=0`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error();
        const items = Array.isArray(data?.items) ? data.items : [];
        setLogsModal((prev) => ({
          ...prev,
          items,
          loading: false,
          reachedEnd: items.length < LOGS_PAGE_SIZE,
        }));
      } catch (e) {
        setLogsModal((prev) => ({
          ...prev,
          items: [],
          loading: false,
          reachedEnd: true,
        }));
      }
    },
    []
  );

  const paginateLogs = useCallback(
    async (direction) => {
      if (!logsModal.taskId) return;
      const token = getAuthToken();
      if (!token) return;
      const nextPage =
        direction === "next"
          ? logsModal.page + 1
          : Math.max(0, logsModal.page - 1);
      setLogsModal((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          `${API_BASE_URL}/tasks/${logsModal.taskId}/logs?limit=${LOGS_PAGE_SIZE}&offset=${
            nextPage * LOGS_PAGE_SIZE
          }`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error();
        const items = Array.isArray(data?.items) ? data.items : [];
        setLogsModal((prev) => ({
          ...prev,
          items,
          page: nextPage,
          loading: false,
          reachedEnd: items.length < LOGS_PAGE_SIZE,
        }));
      } catch (e) {
        setLogsModal((prev) => ({ ...prev, loading: false }));
      }
    },
    [logsModal.page, logsModal.taskId]
  );

  const renderCreateModal = () => {
    if (!showCreate) return null;
    const totalSplit = splitTrain + splitVal + splitBench;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-3xl dark:bg-navy-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-200">
              <MdOutlineReceipt className="text-xl" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-navy-700 dark:text-white">
                Create fine-tune task
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Start with a draft; you can queue it when ready.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
              Project name
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                placeholder="e.g. My-fine-tune-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
              Base model
              <select
                value={baseModelId}
                onChange={(e) => setBaseModelId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
              >
                <option value="">
                  {baseModelsLoading ? "Loading models..." : "Select a base model"}
                </option>
                {baseModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.display_name || model.model_name || `Model #${model.id}`}
                    {Number(model.id) === 1 ? " (gemma-3-270m)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-gray-100 p-3 dark:border-white/10">
            <p className="text-sm font-semibold text-gray-700 dark:text-white">
              Dataset source
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "auto_split", label: "Auto-split single file" },
                { key: "from_files", label: "Build from separate files" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setDatasetSource(opt.key);
                    setCreateError("");
                    if (opt.key === "auto_split") {
                      setTrainFiles([]);
                      setValFiles([]);
                      setBenchFiles([]);
                    } else {
                      setSingleFile(null);
                      setSingleFileError("");
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    datasetSource === opt.key
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {datasetSource === "from_files" && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { label: "Train files", role: "train", files: trainFiles, setter: setTrainFiles },
                  { label: "Validation files", role: "validation", files: valFiles, setter: setValFiles },
                  { label: "Benchmark files", role: "benchmark", files: benchFiles, setter: setBenchFiles },
                ].map((entry) => (
                  <div key={entry.role} className="flex flex-col gap-2 text-sm font-semibold text-gray-700 dark:text-white">
                    <span>{entry.label}</span>
                    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-2 dark:border-white/10">
                      {entry.files.length === 0 && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-300">
                          No files uploaded yet.
                        </p>
                      )}
                      {entry.files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-white"
                        >
                          <span title={f.name}>{truncateFileName(f.name, 30)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              entry.setter(entry.files.filter((item) => item.id !== f.id))
                            }
                            className="text-red-500 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {uploadingRole === entry.role && (
                        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-200">
                          <span className="h-2 w-16 rounded-full bg-brand-500 animate-pulse" />
                          Uploading...
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          singleFileInputRef.current?.click();
                          singleFileInputRef.current.dataset.role = entry.role;
                          singleFileInputRef.current.value = "";
                        }}
                        className="linear rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                      >
                        Upload new {entry.role} file
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {datasetSource === "auto_split" && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
                  Train %
                  <input
                    type="number"
                    value={splitTrain}
                    onChange={(e) => adjustSplits("train", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
                  Validation %
                  <input
                    type="number"
                    value={splitVal}
                    onChange={(e) => adjustSplits("val", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white">
                  Benchmark %
                  <input
                    type="number"
                    value={splitBench}
                    onChange={(e) => adjustSplits("bench", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                  />
                </label>
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 dark:text-gray-300">
                    Total: {totalSplit}% (should equal 100)
                  </p>
                </div>
                <div className="md:col-span-3">
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center transition hover:border-brand-500 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:hover:border-brand-300 dark:hover:bg-white/10"
                    onClick={() => {
                      if (singleFileInputRef.current) {
                        singleFileInputRef.current.dataset.role = "auto";
                        singleFileInputRef.current.click();
                      }
                    }}
                  >
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      Drag & drop or click to upload a single dataset file
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                      We will reuse it for train/validation/benchmark splits.
                    </p>
                    {singleFile && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-white">
                        <span title={singleFile.name}>
                          {truncateFileName(singleFile.name, 30)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSingleFile(null)}
                          className="text-red-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {singleFileError && (
                      <div className="mt-2 text-xs font-semibold text-red-500">
                        {singleFileError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <input
            type="file"
            accept=".jsonl"
            ref={singleFileInputRef}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="mt-4 rounded-xl border border-gray-100 p-3 dark:border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">
                Advanced options
              </p>
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-sm font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-200"
              >
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>
            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.entries(hyperparams).map(([key, value]) => {
                  const isBool = typeof value === "boolean";
                  const isString = typeof value === "string";
                  return (
                    <label
                      key={key}
                      className="flex flex-col gap-1 text-sm font-semibold text-gray-700 dark:text-white"
                    >
                      {key.replace(/_/g, " ")}
                      <input
                        type={isBool ? "checkbox" : isString ? "text" : "number"}
                        checked={isBool ? value : undefined}
                        value={isBool ? undefined : value}
                        onChange={(e) =>
                          setHyperparams((prev) => ({
                            ...prev,
                            [key]: isBool
                              ? e.target.checked
                              : isString
                                ? e.target.value
                                : Number(e.target.value),
                          }))
                        }
                        className={`${
                          isBool
                            ? "h-4 w-4"
                            : "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-navy-700 dark:text-white"
                        }`}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {createError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200">
              {createError}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="linear rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={creating}
              className="linear inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-300"
            >
              <MdUpload />
              {creating ? "Creating..." : "Create draft"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLogsModal = () => {
    if (!logsModal.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-3xl dark:bg-navy-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-navy-700 dark:text-white">
                Task logs{logsModal.taskName ? ` - ${logsModal.taskName}` : ""}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Showing latest events (newest first).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLogsModal({ open: false, taskId: null, items: [] })}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-gray-100 dark:border-white/10">
            {logsModal.loading ? (
              <div className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">
                Loading logs...
              </div>
            ) : logsModal.items.length === 0 ? (
              <div className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">
                No logs yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {logsModal.items.map((log) => (
                  <li key={log.id || `${log.timestamp}-${log.message}`} className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-300">
                      {formatDate(log.timestamp || log.created_at)}{" "}
                      {log.level ? `• ${log.level}` : ""}
                    </p>
                    <p className="text-sm text-gray-800 dark:text-white">{log.message || log.detail || "—"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Page {logsModal.page + 1}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => paginateLogs("prev")}
                disabled={logsModal.page === 0 || logsModal.loading}
                className="linear rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => paginateLogs("next")}
                disabled={logsModal.loading || logsModal.reachedEnd}
                className="linear rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Next
              </button>
            </div>
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
                Fine-tune tasks
              </p>
              <div className="mt-1 flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
                <MdViewList className="text-2xl text-brand-500" />
                <span>Manage your runs</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Create drafts, start/stop, monitor logs.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(true);
                }}
                className="linear flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300"
              >
                <MdUpload />
                New Task
              </button>
              <button
                type="button"
                onClick={() => fetchTasks(page)}
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
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10">
                  <th className="py-3 pr-4">Project</th>
                  <th className="py-3 pr-4">Base model</th>
                  <th className="py-3 pr-4">Dataset</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && tasks.length === 0 && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={6}
                    >
                      {error ? "Unable to load tasks." : "No tasks yet. Create your first draft."}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      className="py-6 text-sm font-medium text-gray-600 dark:text-gray-200"
                      colSpan={6}
                    >
                      Loading tasks...
                    </td>
                  </tr>
                )}

                {!loading &&
                  tasks.map((item) => {
                    const task = item.task || item || {};
                    const base = item.base_model || {};
                    const dataset = item.dataset_config || {};
                    const id = task.id || task.task_id;
                    const status = normalizeStatus(task.status || item.task_status);
                    return (
                      <tr
                        key={id}
                        className="border-b border-gray-100 last:border-none dark:border-white/10"
                      >
                        <td className="py-3 pr-4 text-sm font-semibold text-navy-700 dark:text-white">
                          {task.project_name || `Task #${id}`}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {base.display_name || base.model_name || "—"}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {dataset.name || "—"}
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                            {status === "draft" && (
                              <button
                                type="button"
                                onClick={() => startWithLoader(id)}
                                disabled={startLoading[id]}
                                className="linear flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                title="Start task"
                              >
                                {startLoading[id] ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                                ) : (
                                  <MdPlayArrow />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(task.created_at || task.createdAt)}
                        </td>
                        <td className="py-3 pr-0 text-right text-sm">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/tasks/${id}`)}
                            className="linear mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                          >
                            <MdOpenInNew />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openLogs(id, task.project_name)}
                            disabled={(status || "").toLowerCase() === "draft"}
                            className="linear mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                          >
                            <MdOutlineReceipt />
                            Logs
                          </button>
                          {canStart(status) && (
                            <button
                              type="button"
                              onClick={() => startWithLoader(id)}
                              disabled={startLoading[id]}
                              className="linear mr-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition duration-200 hover:bg-emerald-600"
                            >
                              {startLoading[id] ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                              ) : (
                                <>
                                  <MdPlayArrow />
                                  Start
                                </>
                              )}
                            </button>
                          )}
                          {canStop(status) && (
                            <button
                              type="button"
                              onClick={() => performAction(id, "stop")}
                              className="linear mr-2 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition duration-200 hover:bg-amber-600"
                            >
                              <MdStop />
                              Stop
                            </button>
                          )}
                          {canDelete(status) && (
                            <button
                              type="button"
                              onClick={() => performAction(id, "delete")}
                              className="linear inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                            >
                              <MdDelete />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Showing {tasks.length} tasks {offset ? `(offset ${offset})` : ""}
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
      {renderCreateModal()}
      {renderLogsModal()}
    </div>
  );
};

export default TaskDashboard;
