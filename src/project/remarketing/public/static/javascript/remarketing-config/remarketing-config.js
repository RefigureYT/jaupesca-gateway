// --------- TEMA (claro/escuro) ---------
(function () {
    const storageKey = "jp-theme";
    const html = document.documentElement;
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;

    const icon = btn.querySelector(".theme-toggle__icon");
    const label = btn.querySelector(".theme-toggle__label");

    function applyTheme(theme) {
        html.setAttribute("data-theme", theme);
        localStorage.setItem(storageKey, theme);
        if (theme === "dark") {
            icon.textContent = "☀";
            label.textContent = "Modo claro";
        } else {
            icon.textContent = "☾";
            label.textContent = "Modo escuro";
        }
    }

    function getPreferredTheme() {
        const stored = localStorage.getItem(storageKey);
        if (stored === "light" || stored === "dark") return stored;
        if (window.matchMedia) {
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }
        return "light";
    }

    applyTheme(getPreferredTheme());

    btn.addEventListener("click", () => {
        const current = html.getAttribute("data-theme") || "light";
        const next = current === "light" ? "dark" : "light";
        applyTheme(next);
    });
})();

// --------- FORM / EDIÇÃO / PAGINAÇÃO / CRUD ---------
(function () {
    const form = document.getElementById("cfg-form");
    const editBtn = document.getElementById("cfg-edit-btn");
    const saveBtn = document.getElementById("cfg-save-btn");
    const footerHint = document.querySelector(".cfg-footer__hint");

    // inputs específicos (pra facilitar)
    const inputIdAccount = document.getElementById("env-id_account");
    const inputAccessToken = document.getElementById("env-access_token");
    const inputUrlBase = document.getElementById("env-url_base");
    const inputInstance = document.getElementById("env-instance");
    const inputTempoInativoGen = document.getElementById("env-tempo_inativo_gen");
    const inputTempoInativoCnpj = document.getElementById("env-tempo_inativo_cnpj");
    const inputMessagesCnpj = document.getElementById("env-messages_cnpj");
    const inputMessagesGenerico = document.getElementById("env-messages_generico");
    const inputConfigId = document.getElementById("env-config-id");

    // paginação
    const pagerLabel = document.querySelector(".cfg-pager__label");
    const pagerPrevBtn = document.getElementById("cfg-pager-prev");
    const pagerNextBtn = document.getElementById("cfg-pager-next");

    // botões extras
    const newBtn = document.getElementById("cfg-new-btn");
    const deleteBtn = document.getElementById("cfg-delete-btn");

    const inputs = document.querySelectorAll(".env-input");

    if (!form || !editBtn || !saveBtn) return;

    const API_URL = "/api/remarketing/config";

    let editing = false;
    let isSaving = false;
    let currentPage = 1;
    let totalPages = 0;
    let currentConfigId = null;
    let isNew = false;

    function runPanelAnimation(panel) {
        if (!panel) return;
        panel.classList.remove("cfg-panel--anim");
        // força reflow pra reiniciar a animação
        // eslint-disable-next-line no-unused-expressions
        void panel.offsetWidth;
        panel.classList.add("cfg-panel--anim");
    }

    function showStatus(message, type = "info") {
        if (!footerHint) return;
        footerHint.textContent = message;
        footerHint.dataset.status = type; // opcional p/ estilizar via CSS
    }

    function updatePager() {
        if (!pagerLabel || !pagerPrevBtn || !pagerNextBtn) return;

        if (!totalPages || totalPages <= 0) {
            pagerLabel.textContent = "0 de 0";
            pagerPrevBtn.disabled = true;
            pagerNextBtn.disabled = true;
            return;
        }

        pagerLabel.textContent = `${currentPage} de ${totalPages}`;

        const disableNav = editing;
        pagerPrevBtn.disabled = disableNav || currentPage <= 1;
        pagerNextBtn.disabled = disableNav || currentPage >= totalPages;
    }

    function setEditing(state) {
        editing = state;
        document.body.setAttribute("data-editing", state ? "true" : "false");

        inputs.forEach((input) => {
            if (state) {
                input.removeAttribute("readonly");
            } else {
                input.setAttribute("readonly", "readonly");
            }
        });

        if (state) {
            saveBtn.disabled = false;
            editBtn.querySelector(".cfg-edit__label").textContent = "Editando";
        } else {
            saveBtn.disabled = true;
            editBtn.querySelector(".cfg-edit__label").textContent = "Editar";
        }

        if (newBtn) {
            newBtn.disabled = state;
        }

        if (deleteBtn) {
            deleteBtn.disabled = state || !currentConfigId;
        }

        updatePager();
    }

    function parseMessagesField(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            const parsed =
                typeof value === "string" ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async function loadConfig(pageToLoad = 1) {
        const panel = document.querySelector(".cfg-panel");

        try {
            showStatus("Carregando configurações do servidor...", "info");

            const url = `${API_URL}?page=${pageToLoad}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Falha HTTP ${res.status}`);
            }

            const data = await res.json();

            // Se o back já estiver no formato novo
            currentPage = data.page || 1;
            totalPages = data.totalPages || 0;

            // Suporta tanto { config: {...} } quanto o formato antigo "flat"
            const rawCfg = data.config || data;

            // Nenhuma config
            if (
                !rawCfg ||
                (!rawCfg.id &&
                    !rawCfg.id_account &&
                    !rawCfg.access_token &&
                    !rawCfg.url_base &&
                    !rawCfg.instance)
            ) {
                currentConfigId = null;
                isNew = false;

                if (inputConfigId) inputConfigId.value = "";
                if (inputIdAccount) inputIdAccount.value = "";
                if (inputAccessToken) inputAccessToken.value = "";
                if (inputUrlBase) inputUrlBase.value = "";
                if (inputInstance) inputInstance.value = "";
                if (inputTempoInativoGen) inputTempoInativoGen.value = "";
                if (inputTempoInativoCnpj) inputTempoInativoCnpj.value = "";
                if (inputMessagesCnpj) inputMessagesCnpj.value = "[]";
                if (inputMessagesGenerico) inputMessagesGenerico.value = "[]";

                updatePager();
                showStatus(
                    "Nenhuma configuração encontrada. Clique em 'Nova linha' para criar a primeira.",
                    "info"
                );

                runPanelAnimation(panel);
                return;
            }

            // Normaliza config (já com tempos separados)
            const cfg = {
                id: rawCfg.id ?? null,
                id_account: rawCfg.id_account ?? "",
                access_token: rawCfg.access_token ?? "",
                url_base: rawCfg.url_base ?? "",
                instance: rawCfg.instance ?? "",
                tempo_inativo_cnpj:
                    rawCfg.tempo_inativo_cnpj !== undefined &&
                        rawCfg.tempo_inativo_cnpj !== null
                        ? Number(rawCfg.tempo_inativo_cnpj)
                        : rawCfg.tempo_inativo !== undefined &&
                            rawCfg.tempo_inativo !== null
                            ? Number(rawCfg.tempo_inativo)
                            : null,
                tempo_inativo_gen:
                    rawCfg.tempo_inativo_gen !== undefined &&
                        rawCfg.tempo_inativo_gen !== null
                        ? Number(rawCfg.tempo_inativo_gen)
                        : rawCfg.tempo_inativo !== undefined &&
                            rawCfg.tempo_inativo !== null
                            ? Number(rawCfg.tempo_inativo)
                            : null,
                messages_cnpj: parseMessagesField(
                    rawCfg.messages_cnpj !== undefined && rawCfg.messages_cnpj !== null
                        ? rawCfg.messages_cnpj
                        : rawCfg.messages // fallback p/ compat
                ),
                messages_generico: parseMessagesField(rawCfg.messages_generico),
            };

            currentConfigId = cfg.id;
            isNew = false;

            // LIMPA tudo antes de preencher (garante que nada "sobrou" da página anterior)
            if (inputConfigId) inputConfigId.value = "";
            if (inputIdAccount) inputIdAccount.value = "";
            if (inputAccessToken) inputAccessToken.value = "";
            if (inputUrlBase) inputUrlBase.value = "";
            if (inputInstance) inputInstance.value = "";
            if (inputTempoInativoGen) inputTempoInativoGen.value = "";
            if (inputTempoInativoCnpj) inputTempoInativoCnpj.value = "";
            if (inputMessagesCnpj) inputMessagesCnpj.value = "";
            if (inputMessagesGenerico) inputMessagesGenerico.value = "";

            if (inputConfigId && cfg.id != null) {
                inputConfigId.value = String(cfg.id);
            }
            if (inputIdAccount) {
                inputIdAccount.value = String(cfg.id_account ?? "");
            }
            if (inputAccessToken) {
                inputAccessToken.value = String(cfg.access_token ?? "");
            }
            if (inputUrlBase) {
                inputUrlBase.value = String(cfg.url_base ?? "");
            }
            if (inputInstance) {
                inputInstance.value = String(cfg.instance ?? "");
            }
            if (inputTempoInativoGen) {
                inputTempoInativoGen.value =
                    cfg.tempo_inativo_gen != null ? String(cfg.tempo_inativo_gen) : "";
            }
            if (inputTempoInativoCnpj) {
                inputTempoInativoCnpj.value =
                    cfg.tempo_inativo_cnpj != null ? String(cfg.tempo_inativo_cnpj) : "";
            }
            if (inputMessagesCnpj) {
                inputMessagesCnpj.value = JSON.stringify(
                    cfg.messages_cnpj,
                    null,
                    2
                );
            }
            if (inputMessagesGenerico) {
                inputMessagesGenerico.value = JSON.stringify(
                    cfg.messages_generico,
                    null,
                    2
                );
            }

            updatePager();
            showStatus("Configurações carregadas com sucesso.", "success");

            // animação sempre que os dados são trocados
            runPanelAnimation(panel);

            console.log("Config carregada:", cfg);
        } catch (err) {
            console.error("Erro ao carregar config:", err);
            showStatus(
                "Erro ao carregar configurações. Verifique o backend / API.",
                "error"
            );
        } finally {
            setEditing(false);
        }
    }

    editBtn.addEventListener("click", () => {
        setEditing(!editing);
        if (editing) {
            showStatus(
                "Modo edição ativo. Altere os campos e clique em Salvar.",
                "info"
            );
        }
    });

    if (pagerPrevBtn) {
        pagerPrevBtn.addEventListener("click", () => {
            if (isSaving || editing) return;
            if (currentPage <= 1) return;
            loadConfig(currentPage - 1);
        });
    }

    if (pagerNextBtn) {
        pagerNextBtn.addEventListener("click", () => {
            if (isSaving || editing) return;
            if (!totalPages || currentPage >= totalPages) return;
            loadConfig(currentPage + 1);
        });
    }

    if (newBtn) {
        newBtn.addEventListener("click", () => {
            if (isSaving) return;

            isNew = true;
            currentConfigId = null;

            if (inputConfigId) inputConfigId.value = "";
            if (inputIdAccount) inputIdAccount.value = "";
            if (inputAccessToken) inputAccessToken.value = "";
            if (inputUrlBase) inputUrlBase.value = "";
            if (inputInstance) inputInstance.value = "";
            if (inputTempoInativoGen) inputTempoInativoGen.value = "";
            if (inputTempoInativoCnpj) inputTempoInativoCnpj.value = "";
            if (inputMessagesCnpj) inputMessagesCnpj.value = "[]";
            if (inputMessagesGenerico) inputMessagesGenerico.value = "[]";

            setEditing(true);
            showStatus(
                "Preencha os campos e clique em Salvar para criar uma nova linha.",
                "info"
            );
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (isSaving) return;
            if (!currentConfigId) {
                showStatus("Nenhuma linha carregada para excluir.", "error");
                return;
            }

            const confirmed = window.confirm(
                "Você tem certeza que deseja excluir esta linha?\nEssa ação não tem volta depois!"
            );
            if (!confirmed) return;

            try {
                isSaving = true;
                showStatus("Excluindo linha...", "info");

                const res = await fetch(`${API_URL}/${currentConfigId}`, {
                    method: "DELETE",
                });

                if (!res.ok) {
                    throw new Error(`Falha HTTP ${res.status}`);
                }

                await loadConfig(currentPage);

                showStatus("Linha excluída com sucesso.", "success");
            } catch (err) {
                console.error("Erro ao excluir config:", err);
                showStatus(
                    "Erro ao excluir linha. Verifique o backend / API.",
                    "error"
                );
            } finally {
                isSaving = false;
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editing || isSaving) return;
        if (!inputMessagesCnpj || !inputMessagesGenerico) return;

        let parsedMessagesCnpj;
        let parsedMessagesGenerico;

        try {
            parsedMessagesCnpj = JSON.parse(inputMessagesCnpj.value || "[]");
            if (!Array.isArray(parsedMessagesCnpj)) {
                throw new Error("messages_cnpj deve ser um array JSON.");
            }
        } catch (err) {
            console.error("Erro ao parsear messages_cnpj:", err);
            showStatus(
                "Erro no campo messages_cnpj: verifique se o JSON está válido e é um array.",
                "error"
            );
            return;
        }

        try {
            parsedMessagesGenerico = JSON.parse(
                inputMessagesGenerico.value || "[]"
            );
            if (!Array.isArray(parsedMessagesGenerico)) {
                throw new Error("messages_generico deve ser um array JSON.");
            }
        } catch (err) {
            console.error("Erro ao parsear messages_generico:", err);
            showStatus(
                "Erro no campo messages_generico: verifique se o JSON está válido e é um array.",
                "error"
            );
            return;
        }

        const payload = {
            id_account: inputIdAccount ? Number(inputIdAccount.value) || 0 : 0,
            access_token: inputAccessToken ? inputAccessToken.value : "",
            url_base: inputUrlBase ? inputUrlBase.value : "",
            instance: inputInstance ? inputInstance.value : "",
            tempo_inativo_cnpj: inputTempoInativoCnpj
                ? Number(inputTempoInativoCnpj.value) || 0
                : 0,
            tempo_inativo_gen: inputTempoInativoGen
                ? Number(inputTempoInativoGen.value) || 0
                : 0,
            messages_cnpj: parsedMessagesCnpj,
            messages_generico: parsedMessagesGenerico,
        };

        try {
            isSaving = true;
            saveBtn.disabled = true;
            showStatus("Salvando configurações...", "info");

            let url = API_URL;
            let method = "POST";

            if (currentConfigId && !isNew) {
                url = `${API_URL}/${currentConfigId}`;
                method = "PUT";
            }

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`Falha HTTP ${res.status}`);
            }

            const data = await res.json();

            if (method === "POST") {
                const total =
                    typeof data.total === "number" && data.total > 0
                        ? data.total
                        : 1;
                await loadConfig(total); // vai para a última página (nova linha)
            } else {
                await loadConfig(currentPage); // recarrega a mesma página
            }

            showStatus("Configurações salvas com sucesso.", "success");
        } catch (err) {
            console.error("Erro ao salvar config:", err);
            showStatus(
                "Erro ao salvar configurações. Verifique o backend / API.",
                "error"
            );
            saveBtn.disabled = false;
        } finally {
            isSaving = false;
        }
    });

    // carrega a primeira página ao abrir a tela
    loadConfig(1);
})();
// --------- FIM DO CÓDIGO ---------
