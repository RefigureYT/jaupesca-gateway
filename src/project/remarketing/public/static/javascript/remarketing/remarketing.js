// public/remarketing/remarketing.js

// =====================
// Tema claro/escuro
// =====================
(() => {
    const storageKey = "jp-theme";
    const html = document.documentElement;
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;

    const icon = btn.querySelector(".theme-toggle__icon");
    const label = btn.querySelector(".theme-toggle__label");

    function applyTheme(theme) {
        html.setAttribute("data-theme", theme);
        try {
            localStorage.setItem(storageKey, theme);
        } catch (_) {
            // ignore
        }

        if (theme === "dark") {
            icon.textContent = "☀";
            label.textContent = "Modo claro";
        } else {
            icon.textContent = "☾";
            label.textContent = "Modo escuro";
        }
    }

    function getPreferredTheme() {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored === "light" || stored === "dark") return stored;
        } catch (_) {
            // ignore
        }

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

// =====================
// Helper de upload
// =====================

async function rmUploadFileToServer(file, blockType) {
    const formData = new FormData();
    formData.append("file", file);
    if (blockType) formData.append("type", blockType);

    const response = await fetch("/api/remarketing/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
    const data = await response.json();

    if (!data || data.ok !== true || !data.url) {
        throw new Error("Resposta inválida do servidor de upload.");
    }

    return data.url;
}

// =====================
// Builder de mensagens (CNPJ / Genérico)
// =====================

(() => {
    const list = document.getElementById("rm-block-list");
    const addBtn = document.getElementById("rm-add-btn");
    const addMenu = document.getElementById("rm-add-menu");
    const form = document.getElementById("rm-form");
    const tabs = document.querySelectorAll(".rm-builder__tab");

    if (!list || !addBtn || !addMenu || !form) return;

    // elementos para "mensagem privada" + "Assinatura"
    const privateToggle = document.getElementById("rm-private-toggle");
    const signatureSelect = document.getElementById("rm-signature");
    const signatureField =
        signatureSelect && signatureSelect.closest(".rm-field");

    let dragSrcEl = null;

    // ---------------------------
    // Controle de abas (CNPJ / Genérico)
    // ---------------------------
    const FLOW_TYPES = {
        CNPJ: "cnpj",
        GENERICO: "generico",
    };

    let currentFlow = FLOW_TYPES.CNPJ;

    // Rascunhos separados por aba
    const drafts = {
        [FLOW_TYPES.CNPJ]: [],
        [FLOW_TYPES.GENERICO]: [],
    };

    // ---------------------------
    // Toast / notificações simples
    // ---------------------------
    function ensureToastStyles() {
        if (document.getElementById("rm-toast-styles")) return;
        const style = document.createElement("style");
        style.id = "rm-toast-styles";
        style.textContent = `
.rm-toast-container {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rm-toast {
  min-width: 260px;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 30px rgba(15,23,42,0.6);
  color: #f9fafb;
  background: #0f172a;
  opacity: 0.98;
  animation: rmToastIn 0.16s ease-out;
}
.rm-toast--success { background: #16a34a; }
.rm-toast--error   { background: #b91c1c; }
.rm-toast--info    { background: #0f172a; }
.rm-toast__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(248,250,252,0.9);
}
.rm-toast__msg { flex: 1; }
@keyframes rmToastIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 0.98; transform: translateY(0); }
}
.msg-block--error {
  outline: 2px solid #b91c1c;
  outline-offset: 3px;
  animation: rmBlockShake 0.2s ease-in-out 2;
}
.msg-block__remove--highlight {
  box-shadow: 0 0 0 2px rgba(239,68,68,0.8);
}
@keyframes rmBlockShake {
  0%   { transform: translateX(0); }
  25%  { transform: translateX(-3px); }
  50%  { transform: translateX(3px); }
  75%  { transform: translateX(-3px); }
  100% { transform: translateX(0); }
}
.file-drop__hint--error {
  color: #f97373;
  font-weight: 700;
}
        `;
        document.head.appendChild(style);
    }

    function getToastContainer() {
        let container = document.querySelector(".rm-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "rm-toast-container";
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type = "info", durationMs = 5000) {
        ensureToastStyles();
        const container = getToastContainer();
        const toast = document.createElement("div");
        toast.className = `rm-toast rm-toast--${type}`;
        const dot = document.createElement("span");
        dot.className = "rm-toast__dot";
        const msg = document.createElement("span");
        msg.className = "rm-toast__msg";
        msg.textContent = message;

        toast.appendChild(dot);
        toast.appendChild(msg);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-4px)";
            setTimeout(() => {
                toast.remove();
            }, 160);
        }, durationMs);
    }

    // ---------------------------
    // Avisos Private x Assinatura
    // ---------------------------
    function showPrivateSignatureWarning() {
        if (!signatureSelect || !signatureField) return;

        // destaca o select e o container
        signatureSelect.classList.add("rm-select--warn");
        signatureField.classList.add("rm-field--warn", "rm-field--pulse");

        // dá um "ping" visual no izinho
        const infoIcon = signatureField.querySelector(".rm-info");
        if (infoIcon) {
            infoIcon.classList.add("rm-info--highlight");
            setTimeout(() => {
                infoIcon.classList.remove("rm-info--highlight");
            }, 2000);
        }

        // mensagem em toast, em vez de criar <p> que empurra layout
        showToast(
            "Mensagens privadas só estão disponíveis quando enviadas pelo Bot Principal (Chatwoot/CRM).",
            "info"
        );

        setTimeout(() => {
            signatureField.classList.remove("rm-field--pulse");
        }, 1200);
    }

    function clearPrivateSignatureWarning() {
        if (!signatureSelect || !signatureField) return;
        signatureSelect.classList.remove("rm-select--warn");
        signatureField.classList.remove("rm-field--warn", "rm-field--pulse");
    }

    function clearPrivateSignatureWarning() {
        if (!signatureSelect || !signatureField) return;
        signatureSelect.classList.remove("rm-select--warn");
        signatureField.classList.remove("rm-field--warn");
    }

    // Regras Private x Assinatura
    if (privateToggle && signatureSelect) {
        privateToggle.addEventListener("change", () => {
            if (privateToggle.checked) {
                signatureSelect.value = "bot-principal";
                showPrivateSignatureWarning();
            } else {
                clearPrivateSignatureWarning();
            }
        });

        signatureSelect.addEventListener("change", () => {
            if (
                privateToggle.checked &&
                signatureSelect.value !== "bot-principal"
            ) {
                signatureSelect.value = "bot-principal";
                showPrivateSignatureWarning();
            }
        });
    }

    // ---------------------------
    // Menu de adicionar bloco
    // ---------------------------
    function toggleMenu(force) {
        const isOpen =
            typeof force === "boolean"
                ? !force
                : addMenu.getAttribute("aria-hidden") === "false";

        const willOpen = typeof force === "boolean" ? force : !isOpen;

        addMenu.setAttribute("aria-hidden", willOpen ? "false" : "true");
        addBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    }

    addBtn.addEventListener("click", () => toggleMenu());

    document.addEventListener("click", (e) => {
        if (
            !addMenu.contains(e.target) &&
            !addBtn.contains(e.target) &&
            addMenu.getAttribute("aria-hidden") === "false"
        ) {
            toggleMenu(false);
        }
    });

    // ---------------------------
    // Extensões permitidas
    // ---------------------------
    const imageExt = ["jpg", "jpeg", "png", "webp", "gif"];
    const videoExt = ["mp4", "3gp", "mov", "avi"];
    const audioExt = ["ogg", "mp3", "wav", "aac", "m4a"];
    const docExt = [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "csv",
        "ppt",
        "pptx",
        "txt",
        "zip",
        "rar",
        "apk",
        "json",
        "xml",
    ];

    function getAllowedExtensions(blockType) {
        if (blockType === "image") return imageExt;
        if (blockType === "video") return videoExt;
        if (blockType === "audio") return audioExt;
        if (blockType === "document") return docExt;
        return null;
    }

    function buildFormatErrorMessage(blockType) {
        if (blockType === "image") {
            return "Formato de imagem não permitido. Use: JPG, JPEG, PNG, WEBP, GIF.";
        }
        if (blockType === "video") {
            return "Formato de vídeo não permitido. Use: MP4, 3GP, MOV, AVI.";
        }
        if (blockType === "audio") {
            return "Formato de áudio não permitido. Use: OGG, MP3, WAV, AAC, M4A.";
        }
        if (blockType === "document") {
            return "Formato de documento não permitido. Use: PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, TXT, ZIP, RAR, APK, JSON, XML.";
        }
        return "Formato de arquivo não permitido.";
    }

    function isFileAllowed(file, blockType) {
        const allowed = getAllowedExtensions(blockType);
        if (!allowed || !file || !file.name) return true;
        const name = String(file.name);
        const dotIndex = name.lastIndexOf(".");
        const ext = dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
        if (!ext) return false;
        return allowed.includes(ext);
    }

    // ---------------------------
    // Criação dos blocos
    // ---------------------------
    function createHandle() {
        const handleBtn = document.createElement("button");
        handleBtn.type = "button";
        handleBtn.className = "msg-block__handle";
        handleBtn.setAttribute("aria-label", "Reordenar mensagem");
        for (let i = 0; i < 6; i++) {
            const dot = document.createElement("span");
            dot.className = "msg-block__handle-dot";
            handleBtn.appendChild(dot);
        }
        return handleBtn;
    }

    function createRemoveBtn() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "msg-block__remove";
        btn.setAttribute("aria-label", "Excluir mensagem");
        btn.innerHTML = '<span aria-hidden="true">🗑</span>';
        btn.addEventListener("click", () => {
            const block = btn.closest(".msg-block");
            if (block) block.remove();
        });
        return btn;
    }

    function createDropzone(labelText, accept, allowCaption, blockType) {
        const wrapper = document.createElement("div");
        wrapper.className = "file-block";

        const drop = document.createElement("div");
        drop.className = "file-drop";
        drop.setAttribute("data-role", "dropzone");

        const input = document.createElement("input");
        input.type = "file";
        input.className = "file-drop__input";
        input.accept = accept || "";
        input.hidden = true;

        const label = document.createElement("p");
        label.className = "file-drop__label";
        label.textContent =
            labelText || "Arraste o arquivo aqui ou clique para selecionar";

        const hint = document.createElement("p");
        hint.className = "file-drop__hint";
        hint.textContent = "Você pode soltar o arquivo ou clicar para escolher.";

        const fileName = document.createElement("p");
        fileName.className = "file-drop__filename";
        fileName.textContent = "";

        // Campo hidden que guardará a URL do arquivo no S3/MinIO
        const urlInput = document.createElement("input");
        urlInput.type = "hidden";
        urlInput.name = "rm_file_url[]";
        urlInput.className = "file-drop__url";

        // Tipo do bloco (document, image, video, audio)
        const typeInput = document.createElement("input");
        typeInput.type = "hidden";
        typeInput.name = "rm_file_type[]";
        typeInput.className = "file-drop__type";
        typeInput.value = blockType || "";

        drop.appendChild(input);
        drop.appendChild(label);
        drop.appendChild(hint);
        drop.appendChild(fileName);

        wrapper.appendChild(drop);
        wrapper.appendChild(urlInput);
        wrapper.appendChild(typeInput);

        if (allowCaption) {
            const caption = document.createElement("textarea");
            caption.className = "msg-block__textarea msg-block__caption";
            caption.placeholder =
                "Texto opcional que será enviado junto com o arquivo.";
            wrapper.appendChild(caption);
        }

        function openPicker() {
            input.click();
        }

        async function handleFile(file) {
            if (!file) return;

            // Valida extensão antes de subir
            if (!isFileAllowed(file, blockType)) {
                const msg = buildFormatErrorMessage(blockType);
                hint.textContent = msg;
                hint.classList.add("file-drop__hint--error");
                fileName.textContent = "";
                urlInput.value = "";
                showToast(msg, "error");
                return;
            }

            hint.classList.remove("file-drop__hint--error");

            fileName.textContent = file.name;
            hint.textContent = "Enviando arquivo...";
            wrapper.classList.add("file-drop--uploading");

            try {
                const url = await rmUploadFileToServer(file, blockType);
                urlInput.value = url || "";
                hint.textContent = "Arquivo enviado com sucesso.";
            } catch (err) {
                console.error(err);
                urlInput.value = "";
                hint.textContent = "Erro ao enviar arquivo. Tente novamente.";
                showToast("Erro ao enviar arquivo. Tente novamente.", "error");
            } finally {
                wrapper.classList.remove("file-drop--uploading");
            }
        }

        drop.addEventListener("click", openPicker);

        drop.addEventListener("dragenter", (e) => {
            e.preventDefault();
            drop.classList.add("file-drop--active");
        });

        drop.addEventListener("dragover", (e) => {
            e.preventDefault();
            drop.classList.add("file-drop--active");
        });

        drop.addEventListener("dragleave", (e) => {
            e.preventDefault();
            drop.classList.remove("file-drop--active");
        });

        drop.addEventListener("drop", (e) => {
            e.preventDefault();
            drop.classList.remove("file-drop--active");
            const files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) return;
            const file = files[0];
            handleFile(file);
        });

        input.addEventListener("change", () => {
            if (input.files && input.files.length) {
                const file = input.files[0];
                handleFile(file);
            } else {
                fileName.textContent = "";
                urlInput.value = "";
                hint.textContent =
                    "Você pode soltar o arquivo ou clicar para escolher.";
                hint.classList.remove("file-drop__hint--error");
            }
        });

        return wrapper;
    }

    function createTextArea(placeholder) {
        const ta = document.createElement("textarea");
        ta.className = "msg-block__textarea";
        ta.placeholder =
            placeholder ||
            "Digite a mensagem que será enviada. Quebras de linha, emojis e caracteres especiais são permitidos.";
        return ta;
    }

    function createBlock(type) {
        const block = document.createElement("article");
        block.className = "msg-block";
        block.setAttribute("data-type", type);
        block.setAttribute("draggable", "true");

        const inner = document.createElement("div");
        inner.className = "msg-block__inner";

        const side = document.createElement("div");
        side.className = "msg-block__side";
        side.appendChild(createHandle());
        side.appendChild(createRemoveBtn());

        const body = document.createElement("div");
        body.className = "msg-block__body";

        const header = document.createElement("div");
        header.className = "msg-block__header";

        const label = document.createElement("span");
        label.className = "msg-block__type";

        switch (type) {
            case "text":
                label.textContent = "Texto";
                break;
            case "document":
                label.textContent = "Documento";
                break;
            case "image":
                label.textContent = "Imagem";
                break;
            case "video":
                label.textContent = "Vídeo";
                break;
            case "audio":
                label.textContent = "Áudio";
                break;
            default:
                label.textContent = "Bloco";
        }

        header.appendChild(label);
        body.appendChild(header);

        if (type === "text") {
            body.appendChild(createTextArea());
        } else if (type === "document") {
            body.appendChild(
                createDropzone(
                    "Arraste o documento aqui ou clique para selecionar",
                    ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx,.zip,.rar,.apk,.json,.xml",
                    true,
                    "document"
                )
            );
        } else if (type === "image") {
            body.appendChild(
                createDropzone(
                    "Arraste a imagem aqui ou clique para selecionar",
                    "image/*",
                    true,
                    "image"
                )
            );
        } else if (type === "video") {
            body.appendChild(
                createDropzone(
                    "Arraste o vídeo aqui ou clique para selecionar",
                    "video/*",
                    true,
                    "video"
                )
            );
        } else if (type === "audio") {
            body.appendChild(
                createDropzone(
                    "Arraste o áudio aqui ou clique para selecionar",
                    "audio/*",
                    false,
                    "audio"
                )
            );
        }

        inner.appendChild(side);
        inner.appendChild(body);
        block.appendChild(inner);

        // Drag & drop dos blocos
        block.addEventListener("dragstart", (e) => {
            dragSrcEl = block;
            block.classList.add("msg-block--dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
            }
        });

        block.addEventListener("dragend", () => {
            block.classList.remove("msg-block--dragging");
            dragSrcEl = null;
        });

        block.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
            }
        });

        block.addEventListener("drop", (e) => {
            e.stopPropagation();
            if (!dragSrcEl || dragSrcEl === block) return;
            const children = Array.from(list.children);
            const srcIndex = children.indexOf(dragSrcEl);
            const targetIndex = children.indexOf(block);

            if (srcIndex < targetIndex) {
                list.insertBefore(dragSrcEl, block.nextSibling);
            } else {
                list.insertBefore(dragSrcEl, block);
            }
        });

        return block;
    }

    // ---------------------------
    // Abas – salvar / restaurar rascunho
    // ---------------------------
    function serializeCurrentBlocks() {
        const blocks = Array.from(list.querySelectorAll(".msg-block"));
        return blocks.map((block) => {
            const type = block.getAttribute("data-type") || "text";

            let message = "";
            let url = "";
            let fileName = "";

            if (type === "text") {
                const textArea = block.querySelector(
                    ".msg-block__textarea:not(.msg-block__caption)"
                );
                if (textArea instanceof HTMLTextAreaElement) {
                    message = textArea.value || "";
                }
            } else {
                const urlInput = block.querySelector(".file-drop__url");
                if (urlInput instanceof HTMLInputElement) {
                    url = urlInput.value || "";
                }

                if (type !== "audio") {
                    const caption = block.querySelector(".msg-block__caption");
                    if (caption instanceof HTMLTextAreaElement) {
                        message = caption.value || "";
                    }
                }

                const fileNameEl = block.querySelector(".file-drop__filename");
                if (fileNameEl) {
                    fileName = fileNameEl.textContent || "";
                }
            }

            return { type, message, url, fileName };
        });
    }

    function restoreBlocks(draft) {
        list.innerHTML = "";
        if (!draft || !draft.length) return;

        draft.forEach((item) => {
            const block = createBlock(item.type);
            list.appendChild(block);

            if (item.type === "text") {
                const textArea = block.querySelector(
                    ".msg-block__textarea:not(.msg-block__caption)"
                );
                if (textArea instanceof HTMLTextAreaElement) {
                    textArea.value = item.message || "";
                }
            } else {
                const urlInput = block.querySelector(".file-drop__url");
                const fileNameEl = block.querySelector(".file-drop__filename");
                const hint = block.querySelector(".file-drop__hint");
                const caption = block.querySelector(".msg-block__caption");

                if (urlInput instanceof HTMLInputElement) {
                    urlInput.value = item.url || "";
                }
                if (fileNameEl) {
                    fileNameEl.textContent = item.fileName || "";
                }
                if (hint) {
                    if (item.url) {
                        hint.textContent = "Arquivo já selecionado.";
                    } else {
                        hint.textContent =
                            "Você pode soltar o arquivo ou clicar para escolher.";
                    }
                }
                if (caption instanceof HTMLTextAreaElement) {
                    caption.value = item.message || "";
                }
            }
        });
    }

    function updateTabsVisual() {
        tabs.forEach((btn) => {
            const flow = btn.getAttribute("data-flow-type");
            const isActive = flow === currentFlow;
            btn.classList.toggle("rm-builder__tab--active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
            btn.tabIndex = isActive ? 0 : -1;
        });
    }

    function setActiveFlow(flow) {
        if (!flow || flow === currentFlow) return;

        // Salva rascunho da aba atual
        drafts[currentFlow] = serializeCurrentBlocks();

        currentFlow = flow;
        updateTabsVisual();

        // Restaura conteúdo da aba selecionada
        restoreBlocks(drafts[currentFlow]);
    }

    if (tabs.length) {
        tabs.forEach((btn) => {
            btn.addEventListener("click", () => {
                const flow = btn.getAttribute("data-flow-type");
                setActiveFlow(flow);
            });
        });
        // Garante estado inicial
        updateTabsVisual();
    }

    // ---------------------------
    // Adicionar novos blocos
    // ---------------------------
    addMenu.querySelectorAll(".rm-add__option").forEach((btnOption) => {
        btnOption.addEventListener("click", () => {
            const type = btnOption.getAttribute("data-type");
            if (!type) return;
            const block = createBlock(type);
            list.appendChild(block);
            toggleMenu(false);
            const textarea = block.querySelector("textarea");
            if (textarea) textarea.focus();
        });
    });

    // ---------------------------
    // Validação de blocos antes de salvar
    // ---------------------------
    function highlightInvalidBlock(block, reason) {
        if (!block) return;
        block.classList.add("msg-block--error");
        const removeBtn = block.querySelector(".msg-block__remove");
        if (removeBtn) {
            removeBtn.classList.add("msg-block__remove--highlight");
        }

        try {
            block.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        } catch (_) {
            // ignore
        }

        showToast(reason, "error");
        setTimeout(() => {
            block.classList.remove("msg-block--error");
            if (removeBtn) {
                removeBtn.classList.remove("msg-block__remove--highlight");
            }
        }, 1800);
    }

    function validateBlocks() {
        const blocks = Array.from(list.querySelectorAll(".msg-block"));

        if (!blocks.length) {
            showToast(
                "Adicione pelo menos uma mensagem ao fluxo antes de salvar.",
                "error"
            );
            return { valid: false };
        }

        for (const block of blocks) {
            const type = block.getAttribute("data-type") || "text";

            let message = "";
            let url = "";

            if (type === "text") {
                const textArea = block.querySelector(
                    ".msg-block__textarea:not(.msg-block__caption)"
                );
                if (textArea instanceof HTMLTextAreaElement) {
                    message = textArea.value || "";
                }
                const trimmed = message.replace(/\s+/g, "");
                if (!trimmed) {
                    highlightInvalidBlock(
                        block,
                        "Bloco de texto vazio. Preencha a mensagem ou exclua o bloco."
                    );
                    return { valid: false };
                }
            } else {
                const urlInput = block.querySelector(".file-drop__url");
                if (urlInput instanceof HTMLInputElement) {
                    url = urlInput.value || "";
                }

                if (type !== "audio") {
                    const caption = block.querySelector(".msg-block__caption");
                    if (caption instanceof HTMLTextAreaElement) {
                        message = caption.value || "";
                    }
                }

                const trimmedMsg = message.replace(/\s+/g, "");
                const hasMsg = !!trimmedMsg;
                const hasFile = !!url;

                if (!hasMsg && !hasFile) {
                    highlightInvalidBlock(
                        block,
                        "Bloco de anexo vazio. Envie um arquivo ou exclua o bloco."
                    );
                    return { valid: false };
                }

                if (hasMsg && !hasFile) {
                    highlightInvalidBlock(
                        block,
                        "Você adicionou apenas texto em um bloco de anexo. Use um bloco de TEXTO para mensagens sem arquivo."
                    );
                    return { valid: false };
                }
            }
        }

        return { valid: true };
    }

    // ---------------------------
    // Montar payload final
    // ---------------------------
    function buildPayload({ mode, sendBy }) {
        const payload = [];
        const blocks = Array.from(list.querySelectorAll(".msg-block"));

        blocks.forEach((block) => {
            const type = block.getAttribute("data-type");

            let message = "";
            let url = "";

            if (type === "text") {
                const textArea = block.querySelector(
                    ".msg-block__textarea:not(.msg-block__caption)"
                );
                if (textArea instanceof HTMLTextAreaElement) {
                    message = textArea.value.trim();
                }
            } else if (
                type === "document" ||
                type === "image" ||
                type === "video" ||
                type === "audio"
            ) {
                const urlInput = block.querySelector(".file-drop__url");
                if (urlInput instanceof HTMLInputElement) {
                    url = urlInput.value || "";
                }

                if (type === "audio") {
                    // Regra: JAMAIS uma url de áudio terá texto junto
                    message = "";
                } else {
                    const caption = block.querySelector(".msg-block__caption");
                    if (caption instanceof HTMLTextAreaElement) {
                        message = caption.value.trim();
                    }
                }
            }

            if (!message && !url) return;

            payload.push({
                mode, // "debug" ou "production"
                send_by: sendBy, // "cw" ou "evolutionapi"
                url,
                message,
            });
        });

        return payload;
    }

    // ---------------------------
    // Modal de seleção de instâncias
    // ---------------------------
    async function fetchInstances() {
        const res = await fetch("/api/remarketing/config/instances");
        if (!res.ok) {
            throw new Error(`Falha HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data || !Array.isArray(data.instances)) return [];
        return data.instances;
    }

    async function openInstanceModal({ payload, flowType }) {
        // flowType: "cnpj" | "generico"
        const messagesToSave = payload;

        // garante que não fique modal duplicado
        const existing = document.querySelector(".rm-modal-backdrop");
        if (existing) {
            existing.remove();
        }

        // usa o estilo do SCSS (.rm-modal-backdrop / .rm-modal)
        const backdrop = document.createElement("div");
        backdrop.className = "rm-modal-backdrop";

        const modal = document.createElement("div");
        modal.className = "rm-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "rm-modal-title");

        const title = document.createElement("h2");
        title.id = "rm-modal-title";
        title.className = "rm-modal__title";
        title.textContent =
            flowType === FLOW_TYPES.CNPJ
                ? "Salvar fluxo para instâncias (CNPJ)"
                : "Salvar fluxo para instâncias (Genérico)";

        const desc = document.createElement("p");
        desc.className = "rm-modal__desc";
        desc.textContent =
            "Selecione em quais instâncias esta sequência de mensagens será aplicada.";

        const instancesContainer = document.createElement("div");
        instancesContainer.className = "rm-modal__instances";
        instancesContainer.innerHTML =
            '<p class="rm-modal__empty">Carregando instâncias...</p>';

        const footer = document.createElement("div");
        footer.className = "rm-modal__footer";

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "jp-button jp-button--secondary";
        cancelBtn.textContent = "Cancelar";

        const confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "jp-button jp-button--primary";
        confirmBtn.textContent = "Salvar";

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        modal.appendChild(title);
        modal.appendChild(desc);
        modal.appendChild(instancesContainer);
        modal.appendChild(footer);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        function closeModal() {
            backdrop.remove();
        }

        cancelBtn.addEventListener("click", closeModal);
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) closeModal();
        });

        // -------- Carrega instâncias --------
        let instances = [];
        try {
            instances = await fetchInstances();
        } catch (err) {
            console.error("Erro ao carregar instâncias:", err);
            instancesContainer.innerHTML =
                '<p class="rm-modal__error">Erro ao carregar instâncias. Tente novamente.</p>';
        }

        if (Array.isArray(instances) && instances.length) {
            instancesContainer.innerHTML = `
                <label class="rm-modal__row rm-modal__row--all">
                    <input type="checkbox" id="rm-modal-check-all" />
                    <span>Todos</span>
                </label>
                <div class="rm-modal__list"></div>
            `;

            const listEl = instancesContainer.querySelector(
                ".rm-modal__list"
            );

            instances.forEach((inst) => {
                const row = document.createElement("label");
                row.className = "rm-modal__row";

                // Normaliza tempos (podem vir como número ou string)
                const rawCnpj = inst.tempo_inativo_cnpj ?? inst.tempo_inativo;
                const rawGen = inst.tempo_inativo_gen;

                const diasCnpj = rawCnpj !== null && rawCnpj !== undefined && !Number.isNaN(Number(rawCnpj))
                    ? Number(rawCnpj)
                    : null;
                const diasGen = rawGen !== null && rawGen !== undefined && !Number.isNaN(Number(rawGen))
                    ? Number(rawGen)
                    : null;

                const labelCnpj = diasCnpj !== null
                    ? `${diasCnpj} dia${diasCnpj === 1 ? "" : "s"}`
                    : "não configurado";

                const labelGen = diasGen !== null
                    ? `${diasGen} dia${diasGen === 1 ? "" : "s"}`
                    : "não configurado";

                const isCnpjFlow = flowType === FLOW_TYPES.CNPJ;
                const isGenFlow = flowType === FLOW_TYPES.GENERICO;

                const cnpjClassParts = ["rm-modal__tempo-pill"];
                const genClassParts = ["rm-modal__tempo-pill"];

                if (diasCnpj === null) cnpjClassParts.push("rm-modal__tempo-pill--missing");
                if (diasGen === null) genClassParts.push("rm-modal__tempo-pill--missing");

                if (isCnpjFlow) cnpjClassParts.push("rm-modal__tempo-pill--active");
                if (isGenFlow) genClassParts.push("rm-modal__tempo-pill--active");

                const cnpjClass = cnpjClassParts.join(" ");
                const genClass = genClassParts.join(" ");

                row.innerHTML = `
                    <input
                        type="checkbox"
                        class="rm-modal-check-instance"
                        value="${inst.id}"
                    />
                    <div class="rm-modal__row-main">
                        <div class="rm-modal__instance-name">
                            ${inst.instance || "(sem nome)"} 
                        </div>
                        <div class="rm-modal__url">
                            ID ${inst.id} · ${inst.url_base || ""}
                        </div>
                        <div class="rm-modal__tempo">
                            <span class="${cnpjClass}">
                                CNPJ: ${labelCnpj}
                            </span>
                            <span class="${genClass}">
                                Genérico: ${labelGen}
                            </span>
                        </div>
                    </div>
                `;
                listEl.appendChild(row);
            });

            const checkAll = instancesContainer.querySelector(
                "#rm-modal-check-all"
            );
            const checkboxes = instancesContainer.querySelectorAll(
                ".rm-modal-check-instance"
            );

            checkAll.addEventListener("change", (ev) => {
                const checked = ev.target.checked;
                checkboxes.forEach((cb) => {
                    cb.checked = checked;
                });
            });
        } else if (
            !instancesContainer.querySelector(".rm-modal__error")
        ) {
            instancesContainer.innerHTML =
                '<p class="rm-modal__empty">Nenhuma instância configurada.</p>';
        }

        // -------- Clique em "Salvar" --------
        confirmBtn.addEventListener("click", async () => {
            const selectedIds = Array.from(
                instancesContainer.querySelectorAll(
                    ".rm-modal-check-instance"
                )
            )
                .filter((input) => input.checked)
                .map((input) => Number(input.value))
                .filter((id) => Number.isInteger(id) && id > 0);

            if (!selectedIds.length) {
                showToast(
                    "Selecione pelo menos uma instância para salvar o fluxo.",
                    "error"
                );
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Salvando...";

            try {
                const body = {
                    instanceIds: selectedIds,
                    messages: messagesToSave,
                    // IMPORTANTE: backend usa isso para escolher messages_cnpj x messages_generico
                    type: flowType, // "cnpj" ou "generico"
                };

                const res = await fetch("/api/remarketing/config/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    throw new Error(`Falha HTTP ${res.status}`);
                }

                const label =
                    flowType === FLOW_TYPES.CNPJ ? "CNPJ" : "Genérico";

                showToast(
                    `Fluxo (${label}) salvo para ${selectedIds.length} instância(s).`,
                    "success"
                );
                closeModal();
            } catch (err) {
                console.error(
                    "Erro ao salvar mensagens de remarketing:",
                    err
                );
                showToast(
                    "Erro ao salvar mensagens de remarketing. Verifique o backend / API.",
                    "error"
                );
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Salvar";
            }
        });
    }

    // ---------------------------
    // Submit do formulário principal
    // ---------------------------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const validation = validateBlocks();
        if (!validation.valid) return;

        // 1) Lê "Enviar mensagem privada" -> mode
        const privateToggleLocal = document.getElementById(
            "rm-private-toggle"
        );
        const isPrivate =
            privateToggleLocal instanceof HTMLInputElement
                ? privateToggleLocal.checked
                : false;

        const mode = isPrivate ? "debug" : "production";

        // 2) Lê "Assinatura" -> send_by
        const signatureSelectLocal =
            document.getElementById("rm-signature");
        let sendBy = "evolutionapi";

        if (
            signatureSelectLocal instanceof HTMLSelectElement &&
            signatureSelectLocal.value === "bot-principal"
        ) {
            sendBy = "cw";
        }

        // 3) Monta payload das mensagens para a aba atual
        const payload = buildPayload({ mode, sendBy });

        if (!payload.length) {
            showToast(
                "Nenhuma mensagem válida encontrada neste fluxo.",
                "error"
            );
            return;
        }

        // 4) Abre modal para selecionar instâncias e salvar
        try {
            await openInstanceModal({
                payload,
                flowType: currentFlow, // "cnpj" ou "generico"
            });
        } catch (err) {
            console.error(err);
            showToast(
                "Erro ao abrir seleção de instâncias. Verifique o backend / API.",
                "error"
            );
        }
    });
})();
