# assets

`model-library/` is NOT tracked by git (see root `.gitignore`).
It holds large seed/display models (`v1/`, `v2/`, loose `.glb/.obj`,
moved from the old `模型库/uploads/`), meant to be uploaded manually
after deploy — e.g. via admin console, `scp`, or object storage —
instead of being cloned with the repo.

Local working-tree copy is kept for the current machine only.

## Manual upload after deploy

1. Get the model files out-of-band (archive / shared drive / storage bucket).
2. Place them on the server, either:
   - runtime dir: `backend/uploads/` (or the external dir pointed to by
     `UPLOAD_DIR` in `backend/.env`), or
   - this folder: `assets/model-library/` then copy/sync needed files
     into the runtime uploads dir.
3. Original Chinese `.glb/.obj` basenames are kept as-is; only the
   directory names were normalized to English (`1版/` → `v1/`,
   `2版/` → `v2/`).

Never `git add` this directory back in.
