// src/remarketing-config.routes.ts
import express, { Request, Response } from "express";
import { Pool } from "pg";
import { env } from "../../config/env";

const router = express.Router();

// Pool usando suas variáveis DB_*
const pool = new Pool({
    host: env.dbHost,
    port: Number(env.dbPort) || 5432,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbDatabase,
    ssl:
        String(env.dbSSL).toLowerCase() === "true"
            ? { rejectUnauthorized: false }
            : undefined,
});

// 1 linha por página
const PAGE_SIZE = 1;

function normalizeMessages(messages: unknown): any[] {
    let msgs: unknown = messages;

    if (typeof msgs === "string") {
        try {
            msgs = JSON.parse(msgs);
        } catch {
            msgs = [];
        }
    }

    if (!Array.isArray(msgs)) {
        msgs = [];
    }

    return msgs as any[];
}

// GET /api/remarketing/config?page=1
// Retorna a "N-ésima" linha, total de linhas e total de páginas
router.get(
    "/api/remarketing/config",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const pageParam = parseInt(String(req.query.page ?? "1"), 10);
            let page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

            const countResult = await pool.query(
                "SELECT COUNT(*)::int AS count FROM public.config_remarketing_crm"
            );
            const total: number = countResult.rows[0]?.count ?? 0;
            const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;

            // Nenhuma config ainda
            if (total === 0) {
                return res.json({
                    page: 1,
                    pageSize: PAGE_SIZE,
                    total: 0,
                    totalPages: 0,
                    config: null,
                });
            }

            if (page > totalPages) {
                page = totalPages;
            }

            const offset = (page - 1) * PAGE_SIZE;

            const result = await pool.query(
                `
                SELECT
                    id,
                    id_account,
                    access_token,
                    url_base,
                    instance,
                    tempo_inativo_cnpj,
                    tempo_inativo_gen,
                    messages_cnpj,
                    messages_generico
                  FROM public.config_remarketing_crm
                 ORDER BY id
                 LIMIT $1 OFFSET $2
                `,
                [PAGE_SIZE, offset]
            );

            if (result.rows.length === 0) {
                return res.json({
                    page,
                    pageSize: PAGE_SIZE,
                    total,
                    totalPages,
                    config: null,
                });
            }

            const row = result.rows[0];

            const msgsCnpj = normalizeMessages(row.messages_cnpj);
            const msgsGenerico = normalizeMessages(row.messages_generico);

            const tempoInativoCnpj =
                row.tempo_inativo_cnpj !== null && row.tempo_inativo_cnpj !== undefined
                    ? Number(row.tempo_inativo_cnpj)
                    : null;
            const tempoInativoGen =
                row.tempo_inativo_gen !== null && row.tempo_inativo_gen !== undefined
                    ? Number(row.tempo_inativo_gen)
                    : null;

            const config = {
                id: row.id,
                id_account: row.id_account,
                access_token: row.access_token,
                url_base: row.url_base,
                instance: row.instance,
                // novos campos separados
                tempo_inativo_cnpj: tempoInativoCnpj,
                tempo_inativo_gen: tempoInativoGen,
                // alias para compatibilidade (mantém tempo_inativo apontando para CNPJ)
                tempo_inativo: tempoInativoCnpj,
                messages_cnpj: msgsCnpj,
                messages_generico: msgsGenerico,
                // alias para compatibilidade com o front atual
                messages: msgsCnpj,
            };

            return res.json({
                page,
                pageSize: PAGE_SIZE,
                total,
                totalPages,
                config,
            });
        } catch (err) {
            console.error("Erro ao buscar config:", err);
            return res.status(500).json({ error: "Erro ao buscar config" });
        }
    }
);

// POST /api/remarketing/config
// Cria uma nova linha
router.post(
    "/api/remarketing/config",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const {
                id_account,
                access_token,
                url_base,
                instance,
                tempo_inativo_cnpj,
                tempo_inativo_gen,
                // fallback legado: caso o front antigo mande só tempo_inativo
                tempo_inativo,
                messages_cnpj,
                messages_generico,
                // fallback para compat com front antigo
                messages,
            } = req.body;

            // Se não vier messages_cnpj, mas vier messages, usa messages como CNPJ
            const normalizedMessagesCnpj = Array.isArray(messages_cnpj)
                ? messages_cnpj
                : Array.isArray(messages)
                    ? messages
                    : [];
            const normalizedMessagesGenerico = Array.isArray(messages_generico)
                ? messages_generico
                : [];

            const messagesCnpjJson = JSON.stringify(normalizedMessagesCnpj);
            const messagesGenericoJson = JSON.stringify(normalizedMessagesGenerico);

            const tempoInativoCnpjNumber =
                tempo_inativo_cnpj !== undefined && tempo_inativo_cnpj !== null
                    ? Number(tempo_inativo_cnpj) || 0
                    : tempo_inativo !== undefined && tempo_inativo !== null
                    ? Number(tempo_inativo) || 0
                    : 0;

            const tempoInativoGenNumber =
                tempo_inativo_gen !== undefined && tempo_inativo_gen !== null
                    ? Number(tempo_inativo_gen) || 0
                    : tempo_inativo !== undefined && tempo_inativo !== null
                    ? Number(tempo_inativo) || 0
                    : 0;

            const insertResult = await pool.query(
                `
                INSERT INTO public.config_remarketing_crm
                    (id_account, access_token, url_base, instance, tempo_inativo_cnpj, tempo_inativo_gen, messages_cnpj, messages_generico)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
                RETURNING
                    id,
                    id_account,
                    access_token,
                    url_base,
                    instance,
                    tempo_inativo_cnpj,
                    tempo_inativo_gen,
                    messages_cnpj,
                    messages_generico
                `,
                [
                    id_account,
                    access_token,
                    url_base,
                    instance,
                    tempoInativoCnpjNumber,
                    tempoInativoGenNumber,
                    messagesCnpjJson,
                    messagesGenericoJson,
                ]
            );

            const row = insertResult.rows[0];

            // Conta total de linhas para o front saber quantas "páginas" existem
            const countResult = await pool.query(
                "SELECT COUNT(*)::int AS count FROM public.config_remarketing_crm"
            );
            const total: number = countResult.rows[0]?.count ?? 1;

            const msgsCnpj = normalizeMessages(row.messages_cnpj);
            const msgsGenerico = normalizeMessages(row.messages_generico);

            const tempoInativoCnpjOut =
                row.tempo_inativo_cnpj !== null && row.tempo_inativo_cnpj !== undefined
                    ? Number(row.tempo_inativo_cnpj)
                    : null;
            const tempoInativoGenOut =
                row.tempo_inativo_gen !== null && row.tempo_inativo_gen !== undefined
                    ? Number(row.tempo_inativo_gen)
                    : null;

            return res.status(201).json({
                config: {
                    id: row.id,
                    id_account: row.id_account,
                    access_token: row.access_token,
                    url_base: row.url_base,
                    instance: row.instance,
                    tempo_inativo_cnpj: tempoInativoCnpjOut,
                    tempo_inativo_gen: tempoInativoGenOut,
                    // alias
                    tempo_inativo: tempoInativoCnpjOut,
                    messages_cnpj: msgsCnpj,
                    messages_generico: msgsGenerico,
                    // alias
                    messages: msgsCnpj,
                },
                total,
            });
        } catch (err) {
            console.error("Erro ao criar config:", err);
            return res.status(500).json({ error: "Erro ao criar config" });
        }
    }
);

// PUT /api/remarketing/config/:id
// Atualiza uma linha existente
router.put(
    "/api/remarketing/config/:id",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const id = Number(req.params.id);
            if (!id || Number.isNaN(id)) {
                return res.status(400).json({ error: "ID inválido" });
            }

            const {
                id_account,
                access_token,
                url_base,
                instance,
                tempo_inativo_cnpj,
                tempo_inativo_gen,
                // fallback compat (front antigo)
                tempo_inativo,
                messages_cnpj,
                messages_generico,
                // fallback compat
                messages,
            } = req.body;

            const normalizedMessagesCnpj = Array.isArray(messages_cnpj)
                ? messages_cnpj
                : Array.isArray(messages)
                    ? messages
                    : [];
            const normalizedMessagesGenerico = Array.isArray(messages_generico)
                ? messages_generico
                : [];

            const messagesCnpjJson = JSON.stringify(normalizedMessagesCnpj);
            const messagesGenericoJson = JSON.stringify(normalizedMessagesGenerico);

            const tempoInativoCnpjNumber =
                tempo_inativo_cnpj !== undefined && tempo_inativo_cnpj !== null
                    ? Number(tempo_inativo_cnpj) || 0
                    : tempo_inativo !== undefined && tempo_inativo !== null
                    ? Number(tempo_inativo) || 0
                    : 0;

            const tempoInativoGenNumber =
                tempo_inativo_gen !== undefined && tempo_inativo_gen !== null
                    ? Number(tempo_inativo_gen) || 0
                    : tempo_inativo !== undefined && tempo_inativo !== null
                    ? Number(tempo_inativo) || 0
                    : 0;

            const updateResult = await pool.query(
                `
                UPDATE public.config_remarketing_crm
                   SET id_account        = $1,
                       access_token      = $2,
                       url_base          = $3,
                       instance          = $4,
                       tempo_inativo_cnpj = $5,
                       tempo_inativo_gen  = $6,
                       messages_cnpj     = $7::jsonb,
                       messages_generico = $8::jsonb
                 WHERE id = $9
                 RETURNING
                    id,
                    id_account,
                    access_token,
                    url_base,
                    instance,
                    tempo_inativo_cnpj,
                    tempo_inativo_gen,
                    messages_cnpj,
                    messages_generico
                `,
                [
                    id_account,
                    access_token,
                    url_base,
                    instance,
                    tempoInativoCnpjNumber,
                    tempoInativoGenNumber,
                    messagesCnpjJson,
                    messagesGenericoJson,
                    id,
                ]
            );

            if (updateResult.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Config não encontrada para atualizar" });
            }

            const row = updateResult.rows[0];

            const msgsCnpj = normalizeMessages(row.messages_cnpj);
            const msgsGenerico = normalizeMessages(row.messages_generico);

            const tempoInativoCnpjOut =
                row.tempo_inativo_cnpj !== null && row.tempo_inativo_cnpj !== undefined
                    ? Number(row.tempo_inativo_cnpj)
                    : null;
            const tempoInativoGenOut =
                row.tempo_inativo_gen !== null && row.tempo_inativo_gen !== undefined
                    ? Number(row.tempo_inativo_gen)
                    : null;

            return res.json({
                config: {
                    id: row.id,
                    id_account: row.id_account,
                    access_token: row.access_token,
                    url_base: row.url_base,
                    instance: row.instance,
                    tempo_inativo_cnpj: tempoInativoCnpjOut,
                    tempo_inativo_gen: tempoInativoGenOut,
                    // alias
                    tempo_inativo: tempoInativoCnpjOut,
                    messages_cnpj: msgsCnpj,
                    messages_generico: msgsGenerico,
                    // alias
                    messages: msgsCnpj,
                },
            });
        } catch (err) {
            console.error("Erro ao salvar config:", err);
            return res.status(500).json({ error: "Erro ao salvar config" });
        }
    }
);

// DELETE /api/remarketing/config/:id
// Remove uma linha
router.delete(
    "/api/remarketing/config/:id",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const id = Number(req.params.id);
            if (!id || Number.isNaN(id)) {
                return res.status(400).json({ error: "ID inválido" });
            }

            const deleteResult = await pool.query(
                "DELETE FROM public.config_remarketing_crm WHERE id = $1",
                [id]
            );

            if (deleteResult.rowCount === 0) {
                return res
                    .status(404)
                    .json({ error: "Config não encontrada para exclusão" });
            }

            return res.json({ success: true });
        } catch (err) {
            console.error("Erro ao excluir config:", err);
            return res.status(500).json({ error: "Erro ao excluir config" });
        }
    }
);

// Lista todas as instâncias disponíveis (para o modal da tela de remarketing)
router.get(
    "/api/remarketing/config/instances",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const result = await pool.query(
                `
                SELECT
                    id,
                    id_account,
                    instance,
                    url_base,
                    tempo_inativo_cnpj,
                    tempo_inativo_gen
                  FROM public.config_remarketing_crm
                 ORDER BY id
                `
            );

            const instances = result.rows.map((row) => {
                const tempoInativoCnpj =
                    row.tempo_inativo_cnpj !== null && row.tempo_inativo_cnpj !== undefined
                        ? Number(row.tempo_inativo_cnpj)
                        : null;
                const tempoInativoGen =
                    row.tempo_inativo_gen !== null && row.tempo_inativo_gen !== undefined
                        ? Number(row.tempo_inativo_gen)
                        : null;

                return {
                    id: row.id,
                    id_account: row.id_account,
                    instance: row.instance,
                    url_base: row.url_base,
                    tempo_inativo_cnpj: tempoInativoCnpj,
                    tempo_inativo_gen: tempoInativoGen,
                    // alias para compatibilidade, se algum front ainda lê tempo_inativo
                    tempo_inativo: tempoInativoCnpj,
                };
            });

            return res.json({ instances });
        } catch (err) {
            console.error("Erro ao listar instâncias:", err);
            return res.status(500).json({ error: "Erro ao listar instâncias" });
        }
    }
);

// Salva o JSON de mensagens em uma ou mais instâncias
// Body esperado: { instanceIds: number[], messages: any[], type?: "cnpj" | "generico" }
router.post(
    "/api/remarketing/config/messages",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            const { instanceIds, messages, type } = req.body;

            if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
                return res
                    .status(400)
                    .json({ error: "instanceIds deve ser um array com pelo menos 1 id." });
            }

            // Normaliza ids para inteiros válidos
            const ids = instanceIds
                .map((id: unknown) => Number(id))
                .filter((id: number) => Number.isInteger(id) && id > 0);

            if (ids.length === 0) {
                return res
                    .status(400)
                    .json({ error: "Nenhum ID de instância válido foi informado." });
            }

            // Garante que messages é sempre um array JSON
            const normalizedMessages = Array.isArray(messages) ? messages : [];
            const messagesJson = JSON.stringify(normalizedMessages);

            // Decide em qual coluna gravar baseado no "type" vindo do front
            const normalizedType =
                typeof type === "string" ? type.toLowerCase() : "cnpj";

            // Por padrão, mantém compatibilidade escrevendo em messages_cnpj
            let targetColumn = "messages_cnpj";

            // Se o front mandar "generico" (ou "genérico"), grava em messages_generico
            if (normalizedType === "generico" || normalizedType === "genérico") {
                targetColumn = "messages_generico";
            }

            const updateQuery = `
                UPDATE public.config_remarketing_crm
                   SET ${targetColumn} = $1::jsonb
                 WHERE id = ANY($2::int[])
            `;

            const updateResult = await pool.query(updateQuery, [messagesJson, ids]);

            return res.json({
                updatedCount: updateResult.rowCount ?? 0,
                instanceIds: ids,
                type: targetColumn,
            });
        } catch (err) {
            console.error("Erro ao salvar mensagens de remarketing:", err);
            return res.status(500).json({ error: "Erro ao salvar mensagens" });
        }
    }
);

export default router;
