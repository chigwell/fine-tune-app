Fine-tune.app Dashboard
=======================

This project is the web dashboard behind [dash.fine-tune.app](https://dash.fine-tune.app), a lightweight UI for creating and monitoring fine-tune tasks on tiny models (e.g., 270M parameter Gemma variants). It’s built with React and Tailwind and talks to the fine-tune API backend.

What you can do
---------------
- Create draft fine-tune tasks, pick a base model, and configure hyperparameters.
- Upload JSONL datasets (drag & drop supported) or assemble splits from multiple files.
- Auto-split a single dataset into train/validation/benchmark or provide explicit split files.
- Track task status, start/stop/delete drafts, and download produced GGUF artifacts.
- View balance, projected costs, and per-task logs.

Running locally
---------------
1. Install dependencies: `npm install`
2. Start the dev server: `npm start`
3. Open `http://localhost:3000` (expects the API at `REACT_APP_API_BASE_URL` or defaults to `http://localhost:8000`)

Notes
-----
- Uploads expect JSONL where each line is an object with a `messages` array alternating `user` and `assistant` roles, each with non-empty `content`.
- The UI favors tiny models to keep iteration fast and affordable; defaults assume the 270M class.
