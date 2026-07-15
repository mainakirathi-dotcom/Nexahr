import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

router.get("/employee/:id", (req, res) => {
  const docs = db.prepare("SELECT * FROM documents WHERE employee_id = ? ORDER BY uploaded_at DESC").all(req.params.id);
  res.json(docs);
});

router.post("/employee/:id", requireRole("super_admin", "hr_manager"), upload.single("file"), (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const docType = req.body.doc_type || "Other";
  const info = db.prepare(
    "INSERT INTO documents (employee_id, doc_type, original_name, file_path) VALUES (?,?,?,?)"
  ).run(req.params.id, docType, req.file.originalname, req.file.filename);
  logAudit(req, req.user!.name, "Document Uploaded", `${req.file.originalname} for employee ${req.params.id}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get("/download/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.sendFile(filePath);
});

router.delete("/:id", requireRole("super_admin", "hr_manager"), (req: AuthedRequest, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as any;
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const filePath = path.join(uploadDir, doc.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  logAudit(req, req.user!.name, "Document Deleted", doc.original_name);
  res.json({ ok: true });
});

export default router;
