import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// ---------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBR-9CtLbm0T-yJor-lQD_dzvp5M2hmAAA",
    authDomain: "auto-pecas-irmaos-silva.firebaseapp.com",
    // Confira esta URL em Firebase > Realtime Database (aba "Dados").
    // Se o banco não foi criado nos EUA, ela será diferente.
    databaseURL: "https://auto-pecas-irmaos-silva-default-rtdb.firebaseio.com",
    projectId: "auto-pecas-irmaos-silva",
    storageBucket: "auto-pecas-irmaos-silva.firebasestorage.app",
    messagingSenderId: "103916753609",
    appId: "1:103916753609:web:f07a40e12abdb2babfb318",
    measurementId: "G-CNYJDMX15P"
};

const CLOUDINARY_CLOUD_NAME = "yuu2rmen";
const CLOUDINARY_UPLOAD_PRESET = "ofertas_irmaos";
const TOTAL_SLOTS = 5;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Ofertas atuais do site (usadas para pré-preencher o painel na primeira vez)
const OFERTAS_PADRAO = {
    1: { titulo: "Reservatório de Água Marvini M738", descricao: "", precoOriginal: 61, precoDesconto: 55, desconto: 10, whatsapp: "https://wa.me/5511947616214?text=Quero%20o%20Reservat%C3%B3rio%20Marvini", imagem: "img/reservatorio.jpg" },
    2: { titulo: "Óleo Radnaq 20W50 (1L)", descricao: "", precoOriginal: 33, precoDesconto: 28, desconto: 15, whatsapp: "https://wa.me/5511947616214?text=Quero%20o%20%C3%93leo%20Radnaq", imagem: "img/oleo.jpg" },
    3: { titulo: "Pasta Pinheiro Desengraxante", descricao: "", precoOriginal: 61, precoDesconto: 49, desconto: 20, whatsapp: "https://wa.me/5511947616214?text=Quero%20a%20Pasta%20Pinheiro", imagem: "img/pasta.jpg" },
    4: { titulo: "Kit Capa Correia Dofab 1595", descricao: "", precoOriginal: 61, precoDesconto: 55, desconto: 10, whatsapp: "https://wa.me/5511947616214?text=Quero%20o%20Kit%20Capa%20Dofab", imagem: "img/kitcapa.jpg" },
    5: { titulo: "Spray Preto Brilhante Radnaq", descricao: "", precoOriginal: 30, precoDesconto: 25, desconto: 17, whatsapp: "https://wa.me/5511947616214?text=Quero%20o%20Spray%20Radnaq", imagem: "img/spray.jpg" }
};

// ---------------------------------------------------------------
// Elementos
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const loadingEl = $("loading");
const loginView = $("loginView");
const panelView = $("panelView");
const loginForm = $("loginForm");
const loginError = $("loginError");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const slotsEl = $("slots");
const ofertasForm = $("ofertasForm");
const saveBtn = $("saveBtn");
const saveMsg = $("saveMsg");

let slotsBuilt = false;

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------
function parsePreco(valor) {
    if (valor === null || valor === undefined) return NaN;
    let s = String(valor).trim().replace(/[R$\s]/g, "");
    if (s === "") return NaN;
    if (s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
    }
    return Number(s);
}

function formatPreco(n) {
    if (typeof n !== "number" || isNaN(n)) return "";
    return n.toFixed(2).replace(".", ",");
}

function resolverImagem(url) {
    if (!url) return "";
    // Imagens locais (img/...) ficam na raiz do site; o painel está em /admin
    return /^https?:\/\//i.test(url) ? url : "../" + url.replace(/^\/+/, "");
}

function mostrarMensagem(tipo, texto) {
    saveMsg.hidden = false;
    saveMsg.className = "msg " + (tipo === "ok" ? "msg-success" : "msg-error");
    saveMsg.textContent = texto;
}

function traduzErroLogin(code) {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "E-mail ou senha incorretos.";
        case "auth/too-many-requests":
            return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
        case "auth/network-request-failed":
            return "Sem conexão com a internet.";
        default:
            return "Não foi possível entrar. Tente novamente.";
    }
}

// ---------------------------------------------------------------
// Construção dos slots
// ---------------------------------------------------------------
function construirSlots() {
    if (slotsBuilt) return;
    slotsBuilt = true;

    for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const slot = document.createElement("section");
        slot.className = "slot";
        slot.dataset.index = i;
        slot.innerHTML = `
            <h3>Oferta ${i}</h3>

            <label for="titulo-${i}">Título</label>
            <input type="text" id="titulo-${i}" maxlength="120" required>

            <label for="descricao-${i}">Descrição (opcional)</label>
            <textarea id="descricao-${i}" maxlength="300"></textarea>

            <div class="row">
                <div>
                    <label for="original-${i}">Preço original (R$)</label>
                    <input type="text" id="original-${i}" inputmode="decimal" placeholder="61,00">
                </div>
                <div>
                    <label for="desconto-preco-${i}">Preço com desconto (R$)</label>
                    <input type="text" id="desconto-preco-${i}" inputmode="decimal" placeholder="55,00" required>
                </div>
                <div>
                    <label for="percent-${i}">% desc.</label>
                    <input type="text" id="percent-${i}" inputmode="numeric" placeholder="10">
                </div>
            </div>

            <label for="whatsapp-${i}">Link do WhatsApp</label>
            <input type="url" id="whatsapp-${i}" placeholder="https://wa.me/5511947616214?text=...">

            <label>Foto da peça</label>
            <div class="preview-box">
                <img id="preview-${i}" alt="Pré-visualização da oferta ${i}" hidden>
                <input type="hidden" id="imagem-${i}">
                <button type="button" class="btn btn-secondary" id="upload-${i}">Upload de Imagem</button>
                <p class="hint" id="hint-${i}"></p>
            </div>
        `;
        slotsEl.appendChild(slot);

        configurarCalculoDesconto(i);
        configurarWidget(i);
    }
}

// Calcula a % automaticamente quando os dois preços são preenchidos
function configurarCalculoDesconto(i) {
    const original = $(`original-${i}`);
    const promo = $(`desconto-preco-${i}`);
    const percent = $(`percent-${i}`);

    const recalcular = () => {
        const o = parsePreco(original.value);
        const p = parsePreco(promo.value);
        if (o > 0 && p >= 0 && p <= o) {
            percent.value = String(Math.round((1 - p / o) * 100));
        }
    };
    original.addEventListener("input", recalcular);
    promo.addEventListener("input", recalcular);
}

function configurarWidget(i) {
    const btn = $(`upload-${i}`);

    btn.addEventListener("click", () => {
        if (typeof cloudinary === "undefined") {
            mostrarMensagem("erro", "O widget do Cloudinary não carregou. Recarregue a página.");
            return;
        }

        // Cria o widget uma vez por slot e reaproveita
        if (!btn._widget) {
            btn._widget = cloudinary.createUploadWidget(
                {
                    cloudName: CLOUDINARY_CLOUD_NAME,
                    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
                    sources: ["local", "url", "camera"],
                    multiple: false,
                    maxFiles: 1,
                    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                    maxFileSize: 5000000,
                    language: "pt"
                },
                (error, result) => {
                    if (error) {
                        console.error("Erro no upload:", error);
                        mostrarMensagem("erro", "Falha no upload da imagem. Tente novamente.");
                        return;
                    }
                    if (result && result.event === "success") {
                        const url = result.info.secure_url;
                        $(`imagem-${i}`).value = url;
                        atualizarPreview(i, url);
                        $(`hint-${i}`).textContent = "Imagem enviada. Clique em Salvar para publicar.";
                    }
                }
            );
        }
        btn._widget.open();
    });
}

function atualizarPreview(i, url) {
    const img = $(`preview-${i}`);
    if (url) {
        img.src = resolverImagem(url);
        img.hidden = false;
    } else {
        img.removeAttribute("src");
        img.hidden = true;
    }
}

// ---------------------------------------------------------------
// Carregar / preencher / salvar
// ---------------------------------------------------------------
function normalizarDados(data) {
    // O Realtime Database pode devolver array (chaves 1..5) ou objeto
    const resultado = {};
    if (!data) return resultado;
    Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === "object") resultado[k] = v;
    });
    return resultado;
}

function preencherFormulario(dados) {
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const o = dados[i] || {};
        $(`titulo-${i}`).value = o.titulo || "";
        $(`descricao-${i}`).value = o.descricao || "";
        $(`original-${i}`).value = o.precoOriginal != null ? formatPreco(Number(o.precoOriginal)) : "";
        $(`desconto-preco-${i}`).value = o.precoDesconto != null ? formatPreco(Number(o.precoDesconto)) : "";
        $(`percent-${i}`).value = o.desconto != null ? String(o.desconto) : "";
        $(`whatsapp-${i}`).value = o.whatsapp || "";
        $(`imagem-${i}`).value = o.imagem || "";
        $(`hint-${i}`).textContent = "";
        atualizarPreview(i, o.imagem || "");
    }
}

async function carregarOfertas() {
    try {
        const snap = await get(ref(db, "ofertas"));
        const dados = snap.exists() ? normalizarDados(snap.val()) : {};
        if (Object.keys(dados).length === 0) {
            preencherFormulario(OFERTAS_PADRAO);
            mostrarMensagem("ok", "Ainda não há ofertas salvas. Carreguei as ofertas atuais do site; clique em Salvar para publicá-las.");
        } else {
            preencherFormulario(dados);
        }
    } catch (err) {
        console.error(err);
        preencherFormulario(OFERTAS_PADRAO);
        mostrarMensagem("erro", "Não foi possível ler o banco de dados. Verifique a databaseURL e as regras do Firebase.");
    }
}

function lerFormulario() {
    const ofertas = {};
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const titulo = $(`titulo-${i}`).value.trim();
        const precoOriginal = parsePreco($(`original-${i}`).value);
        const precoDesconto = parsePreco($(`desconto-preco-${i}`).value);
        const desconto = parseInt($(`percent-${i}`).value, 10);
        const whatsapp = $(`whatsapp-${i}`).value.trim();

        if (!titulo) throw new Error(`Oferta ${i}: informe o título.`);
        if (isNaN(precoDesconto) || precoDesconto < 0) throw new Error(`Oferta ${i}: informe um preço com desconto válido.`);
        if (whatsapp && !/^https:\/\//i.test(whatsapp)) throw new Error(`Oferta ${i}: o link do WhatsApp deve começar com https://`);

        ofertas[i] = {
            titulo,
            descricao: $(`descricao-${i}`).value.trim(),
            precoOriginal: isNaN(precoOriginal) ? null : precoOriginal,
            precoDesconto,
            desconto: isNaN(desconto) ? 0 : desconto,
            whatsapp,
            imagem: $(`imagem-${i}`).value.trim()
        };
    }
    return ofertas;
}

ofertasForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveMsg.hidden = true;

    let ofertas;
    try {
        ofertas = lerFormulario();
    } catch (err) {
        mostrarMensagem("erro", err.message);
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
    try {
        await set(ref(db, "ofertas"), ofertas);
        mostrarMensagem("ok", "✔ Ofertas salvas com sucesso! O site já está atualizado.");
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
        console.error(err);
        mostrarMensagem("erro", "Erro ao salvar. Verifique se você está logado e as regras do banco.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Salvar ofertas";
    }
});

// ---------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = "Entrando...";
    try {
        await signInWithEmailAndPassword(auth, $("email").value.trim(), $("senha").value);
    } catch (err) {
        loginError.textContent = traduzErroLogin(err.code);
        loginError.hidden = false;
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Entrar";
    }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginView.hidden = true;
        panelView.hidden = false;
        construirSlots();
        saveMsg.hidden = true;
        await carregarOfertas();
    } else {
        panelView.hidden = true;
        loginView.hidden = false;
        $("senha").value = "";
    }
    loadingEl.classList.add("done");
});
