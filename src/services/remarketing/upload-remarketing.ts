// src/upload-remarketing.ts
import express, { Request, Response } from "express";
import multer from "multer";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

dotenv.config();

const router = express.Router();

// Upload em memória (não escreve em disco)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB, ajuste se quiser
    },
});

const s3 = new S3Client({
    region: process.env.MINIO_REGION || "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "",
    },
});

const BUCKET = process.env.MINIO_BUCKET_REMARKETING || "remarketing";
const PUBLIC_BASE = (process.env.MINIO_PUBLIC_BASE_URL || "").replace(/\/$/, "");

// Rota: POST /api/remarketing/upload
router.post(
    "/api/remarketing/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ ok: false, error: "Arquivo não enviado." });
            }

            const originalName = req.file.originalname;
            const ext = path.extname(originalName) || "";
            const randomName = crypto.randomUUID();
            const key = `remarketing/${randomName}${ext}`;

            const putCommand = new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            });

            await s3.send(putCommand);

            const url = `${PUBLIC_BASE}/${BUCKET}/${key}`;

            return res.json({
                ok: true,
                url,
                bucket: BUCKET,
                key,
                originalName,
                size: req.file.size,
                mimeType: req.file.mimetype,
            });
        } catch (error) {
            console.error("Erro ao enviar arquivo para MinIO:", error);
            return res
                .status(500)
                .json({ ok: false, error: "Erro ao enviar arquivo para o armazenamento." });
        }
    }
);

export default router;
