import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "./env";

// Absolute path to the uploads directory (created on startup).
export const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.join(process.cwd(), env.UPLOAD_DIR);

export function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

// SVG is intentionally excluded — it can embed scripts (stored-XSS risk).
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 }, // 8MB each, up to 10 files
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Дозволені лише зображення (jpg, png, webp, gif, avif)"));
  },
});

/** Deletes a stored file given its public "/uploads/<name>" path. Never throws. */
export function deleteUploadByUrl(url: string) {
  try {
    const name = path.basename(url);
    if (!name || name.includes("..")) return;
    const filePath = path.join(uploadDir, name);
    if (filePath.startsWith(uploadDir) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}
