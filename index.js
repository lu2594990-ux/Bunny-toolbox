jQuery(() => {
    $(document.getElementById("extensions_settings")).append(
        '<div class="inline-drawer">' +
        '<div class="inline-drawer-toggle inline-drawer-header">' +
        '<b>🐰 Bunny Toolbox</b>' +
        '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>' +
        '</div>' +
        '<div class="inline-drawer-content">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0;">' +
        '<input type="checkbox" id="bny-toggle" /><span>Show Bunny</span>' +
        '</label>' +
        '<div id="bny-status" style="padding:5px 0;font-size:12px;color:#888;">Bunny is hidden</div>' +
        '</div></div>'
    );

    function getActiveRegex() {
        var result = [];
        try {
            var ctx = SillyTavern.getContext();
            var gr = ctx.extensionSettings.regex || [];
            for (var i = 0; i < gr.length; i++) {
                if (!gr[i].disabled && gr[i].placement && (gr[i].placement.indexOf(1) !== -1 || gr[i].placement.indexOf(2) !== -1)) {
                    result.push({ source: "全局", id: gr[i].id, name: gr[i].scriptName || "未命名", findRegex: gr[i].findRegex || "", replaceString: gr[i].replaceString || "" });
                }
            }if (ctx.characters && ctx.characterId !== undefined) {
                var ch = ctx.characters[ctx.characterId];
                if (ch && ch.data && ch.data.extensions && ch.data.extensions.regex_scripts) {
                    var cr = ch.data.extensions.regex_scripts;
                    for (var j = 0; j < cr.length; j++) {
                        if (!cr[j].disabled && cr[j].placement && (cr[j].placement.indexOf(1) !== -1 || cr[j].placement.indexOf(2) !== -1)) {
                            result.push({ source: "角色卡", id: cr[j].id, name: cr[j].scriptName || "未命名", findRegex: cr[j].findRegex || "", replaceString: cr[j].replaceString || "" });
                        }
                    }
                }
            }
        } catch (e) {}
        return result;
    }

    function getLastAIMsg() {
        try {
            var ctx = SillyTavern.getContext();
            var chat = ctx.chat;
            for (var i = chat.length - 1; i >= 0; i--) {
                if (!chat[i].is_user) return { idx: i, mes: chat[i].mes, name: chat[i].name };
            }
        } catch (e) {}
        return null;
    }

    function parseRegex(fr) {
        try {
            var m = fr.match(/^\/(.*)\/([gimsuy]*)$/s);
            if (m) return new RegExp(m[1], m[2]);
            return new RegExp(fr);
        } catch (e) { return null; }
    }

    function extractSkeleton(regexStr) {
        var m = regexStr.match(/^\/(.*)\/[gimsuy]*$/s);
        var pattern = m ? m[1] : regexStr;
        var pieces = [];
        var fixed = "";
        var i = 0;
        while (i < pattern.length) {
            var ch = pattern[i];
            if (ch === "\\" && i + 1 < pattern.length) {
                var nx = pattern[i + 1];
                if ("sSdDwWbBnrtfv".indexOf(nx) !== -1) {
                    if (fixed) { pieces.push(fixed); fixed = ""; }
                    i += 2;
                    while (i < pattern.length && "*+?{".indexOf(pattern[i]) !== -1) {
                        if (pattern[i] === "{") { while (i < pattern.length && pattern[i] !== "}") i++; i++; } else i++;
                    }
                } else { fixed += nx; i += 2; }
            } else if (ch === "(") {
                if (fixed) { pieces.push(fixed); fixed = ""; }
                i++;
                if (i < pattern.length && pattern[i] === "?") {
                    i++;
                    while (i < pattern.length && pattern[i] !== ")" && ":!=<".indexOf(pattern[i]) !== -1) i++;
                }
            } else if (ch === ")") { i++; }
            else if (ch === "[") {
                if (fixed) { pieces.push(fixed); fixed = ""; }
                i++;
                while (i < pattern.length && pattern[i] !== "]") {
                    if (pattern[i] === "\\" && i + 1 < pattern.length) i += 2; else i++;
                }
                if (i < pattern.length) i++;
                while (i < pattern.length && "*+?{".indexOf(pattern[i]) !== -1) {
                    if (pattern[i] === "{") { while (i < pattern.length && pattern[i] !== "}") i++; i++; } else i++;
                }
            } else if (".*+?^$|".indexOf(ch) !== -1) {
                if (ch === "|" && fixed) { pieces.push(fixed); fixed = ""; }
                else if (fixed && "*+?".indexOf(ch) !== -1) { fixed = fixed.slice(0, -1); if (!fixed) pieces.length && pieces[pieces.length - 1]; }
                if (fixed && ".^$|".indexOf(ch) !== -1) { pieces.push(fixed); fixed = ""; }
                i++;
            } else if (ch === "{") {
                while (i < pattern.length && pattern[i] !== "}") i++;
                if (i < pattern.length) i++;
            } else { fixed += ch; i++; }
        }
        if (fixed) pieces.push(fixed);
        return pieces.filter(function (p) { return p.length >= 1; });
    }

    function fuzzyFind(text, pieces) {
        if (!pieces.length) return null;
        var anchor = null;
        for (var i = 0; i < pieces.length; i++) {
            if (pieces[i].length >= 2) { anchor = i; break; }
        }
        if (anchor === null) anchor = 0;
        var search = pieces[anchor].toLowerCase();
        var tLow = text.toLowerCase();
        var best = null;
        var pos = 0;
        while (true) {
            var idx = tLow.indexOf(search, pos);
            if (idx === -1) break;
            var segStart = idx;
            var segEnd = idx + search.length;
            var score = 0;
            for (var j = 0; j < pieces.length; j++) {
                var pLow = pieces[j].toLowerCase();
                var fIdx = tLow.indexOf(pLow, Math.max(0, idx - 100));
                if (fIdx !== -1 && fIdx < idx + 3000) {
                    score++;
                    if (fIdx < segStart) segStart = fIdx;
                    if (fIdx + pLow.length > segEnd) segEnd = fIdx + pLow.length;
                }
            }
            if (!best || score > best.score) {
                best = { start: segStart, end: segEnd, score: score, total: pieces.length, text: text.substring(segStart, segEnd) };
            }
            pos = idx + 1;
        }
        return best;
    }

    function saveMsg(idx, newText) {
        try {
            var ctx = SillyTavern.getContext();
            ctx.chat[idx].mes = newText;
            ctx.saveChat();
            ctx.reloadCurrentChat();
            return true;
        } catch (e) { return false; }
    }
    var host = document.createElement("div");
    host.id = "bny-host";
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });

    var styleEl = document.createElement("style");
    styleEl.textContent =
        "*{box-sizing:border-box;margin:0;padding:0;}" +
        "::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#e0c0c8;border-radius:4px;}" +
        ".overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1;pointer-events:auto;display:none;background:rgba(0,0,0,.2);}" +
        ".fab{position:fixed;width:52px;height:52px;font-size:24px;line-height:52px;text-align:center;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;border:2px solid rgba(255,255,255,.3);cursor:pointer;box-shadow:0 4px 15px rgba(255,107,157,.5);display:none;touch-action:none;user-select:none;-webkit-user-select:none;pointer-events:auto;transition:transform .15s;z-index:10;}" +
        ".fab:active{transform:scale(.9);}" +
        ".pnl{position:fixed;width:92vw;max-width:440px;height:80vh;max-height:700px;background:#fffafc;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;pointer-events:auto;border:1px solid #fde2e8;z-index:5;}" +
        ".hdr{display:flex;align-items:center;padding:12px 14px;background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;font-size:14px;font-weight:bold;gap:8px;flex-shrink:0;}" +
        ".hdr .htitle{flex:1;}" +
        ".body{flex:1;overflow-y:auto;padding:12px;}" +
        ".sel{margin-bottom:12px;}" +
        ".sel label{font-size:11px;color:#999;display:block;margin-bottom:4px;}" +
        ".sel select{width:100%;height:36px;border:1px solid #f0d0d8;border-radius:10px;padding:0 10px;font-size:12px;outline:none;background:#fff;}" +
        ".sel select:focus{border-color:#ff6b9d;}" +
        ".box{background:#fff;border:1px solid #f0e0e6;border-radius:10px;padding:10px;margin-bottom:10px;}" +
        ".box .blabel{font-size:11px;color:#999;margin-bottom:6px;display:flex;align-items:center;gap:4px;}" +
        ".box .bstatus{font-size:11px;padding:2px 8px;border-radius:8px;color:#fff;}" +
        ".box .bstatus.ok{background:#059669;}" +
        ".box .bstatus.no{background:#dc2626;}" +
        ".box .bstatus.warn{background:#d97706;}" +
        ".box textarea{width:100%;min-height:100px;border:1px solid #f0d0d8;border-radius:8px;padding:8px;font-size:11px;font-family:monospace;outline:none;resize:vertical;line-height:1.5;}" +
        ".box textarea:focus{border-color:#ff6b9d;}" +
        ".box pre{background:#f8f5f6;border-radius:8px;padding:8px;font-size:10px;font-family:monospace;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow-y:auto;color:#555;line-height:1.5;}" +
        ".btns{display:flex;gap:8px;margin-top:8px;}" +
        ".btns button{flex:1;height:36px;border:none;border-radius:10px;font-size:12px;cursor:pointer;color:#fff;}" +
        ".btns button:active{opacity:.7;}" +
        ".btns .btest{background:linear-gradient(135deg,#60a5fa,#3b82f6);}" +
        ".btns .bsave{background:linear-gradient(135deg,#34d399,#059669);}" +
        ".btns .breset{background:#ddd;color:#888;}" +
        ".info{font-size:11px;color:#888;text-align:center;padding:8px;}" +
        ".pieces{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;}" +
        ".pieces span{font-size:10px;padding:2px 6px;border-radius:6px;background:#fde2e8;color:#c44569;font-family:monospace;}" +
        ".msg{text-align:center;padding:6px;font-size:11px;min-height:20px;}";
    shadow.appendChild(styleEl);

    var overlay = document.createElement("div");
    overlay.className = "overlay";
    shadow.appendChild(overlay);

    var fab = document.createElement("div");
    fab.className = "fab";
    fab.innerHTML = "&#x1F430;";
    shadow.appendChild(fab);

    var panel = document.createElement("div");
    panel.className = "pnl";
    panel.innerHTML =
        '<div class="hdr"><span class="htitle">🔧 正则调试</span></div>' +
        '<div class="body" id="bny-body">' +
        '<div class="sel"><label>选择要调试的正则：</label><select id="bny-sel"><option value="">-- 请选择 --</option></select></div>' +
        '<div id="bny-content"><div class="info">👆 请先选择一条正则</div></div>' +
        '</div>' +
        '<div class="msg" id="bny-msg"></div>';
    shadow.appendChild(panel);

    var bodyEl = panel.querySelector("#bny-body");
    var selEl = panel.querySelector("#bny-sel");
    var contentEl = panel.querySelector("#bny-content");
    var msgEl = panel.querySelector("#bny-msg");
    var panelOpen = false;
    var cachedRegex = [];

    panel.addEventListener("touchstart", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchmove", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchend", function (e) { e.stopPropagation(); });
    panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    overlay.addEventListener("click", function () { closeP(); });
    overlay.addEventListener("touchstart", function (e) { e.preventDefault(); closeP(); });

    function populateSelect() {
        cachedRegex = getActiveRegex();
        var old = selEl.value;
        selEl.innerHTML = '<option value="">-- 请选择（共' + cachedRegex.length + '条启用）--</option>';
        for (var i = 0; i < cachedRegex.length; i++) {
            var opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = "[" + cachedRegex[i].source + "] " + cachedRegex[i].name;
            selEl.appendChild(opt);
        }
        if (old) selEl.value = old;
    }

    selEl.addEventListener("change", function (e) {
        e.stopPropagation();
        var idx = selEl.value;
        if (idx === "") { contentEl.innerHTML = '<div class="info">👆 请先选择一条正则</div>'; return; }
        runAnalysis(parseInt(idx));
    });
    selEl.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    selEl.addEventListener("touchstart", function (e) { e.stopPropagation(); });

    function runAnalysis(idx) {
        var rx = cachedRegex[idx];
        var lastMsg = getLastAIMsg();
        if (!lastMsg) { contentEl.innerHTML = '<div class="info">❌ 没有找到AI消息</div>'; return; }

        var pieces = extractSkeleton(rx.findRegex);
        var reg = parseRegex(rx.findRegex);
        var directMatch = false;
        if (reg) { directMatch = reg.test(lastMsg.mes); if (reg.global) reg.lastIndex = 0; }

        var found = fuzzyFind(lastMsg.mes, pieces);

        var statusHtml = "";
        if (directMatch) {
            statusHtml = '<span class="bstatus ok">✅ 正则直接匹配成功</span>';
        } else if (found && found.score >= Math.ceil(found.total * 0.5)) {
            statusHtml = '<span class="bstatus warn">⚠️ 正则未匹配，但找到相似段落（' + found.score + '/' + found.total + '碎片命中）</span>';
        } else if (found) {
            statusHtml = '<span class="bstatus no">❌ 未匹配，相似度低（' + found.score + '/' + found.total + '）</span>';
        } else {
            statusHtml = '<span class="bstatus no">❌ 完全未匹配</span>';
        }

        var piecesHtml = "";
        if (pieces.length > 0) {
            piecesHtml = '<div class="blabel">🧩 提取的骨架碎片：</div><div class="pieces">';
            for (var i = 0; i < Math.min(pieces.length, 20); i++) {
                piecesHtml += "<span>" + pieces[i].replace(/</g, "&lt;") + "</span>";
            }
            if (pieces.length > 20) piecesHtml += "<span>...还有" + (pieces.length - 20) + "个</span>";
            piecesHtml += "</div>";
        }

        var foundText = found ? found.text : "";
        var fullMes = lastMsg.mes;

        contentEl.innerHTML =
            '<div class="box"><div class="blabel">📊匹配状态 ' + statusHtml + '</div>' +
            '<div class="blabel" style="margin-top:6px;">📐 查找正则：</div>' +
            '<pre>' + rx.findRegex.replace(/</g, "&lt;").substring(0, 300) + '</pre>' +
            piecesHtml + '</div>' +
            '<div class="box"><div class="blabel">📍疑似问题段落' + (found ? '（位置' + found.start + '-' + found.end + '）' : '') + '：</div>' +
            '<textarea id="bny-edit">' + foundText.replace(/</g, "&lt;") + '</textarea></div>' +
            '<div class="btns">' +
            '<button class="btest" id="bny-test">▶️ 测试修改</button>' +
            '<button class="bsave" id="bny-save">💾 替换到正文</button>' +
            '<button class="breset" id="bny-reset">🔄 重置</button>' +
            '</div>' +
            '<div id="bny-result"></div>';

        var editEl = contentEl.querySelector("#bny-edit");
        ["keydown", "keyup", "keypress", "input", "touchstart", "touchmove"].forEach(function (evt) {
            editEl.addEventListener(evt, function (e) { e.stopPropagation(); });
        });

        contentEl.querySelector("#bny-test").addEventListener("click", function (e) {
            e.stopPropagation();
            var edited = editEl.value;
            var testResult = reg ? reg.test(edited) : false;
            if (reg && reg.global) reg.lastIndex = 0;
            var resultEl = contentEl.querySelector("#bny-result");
            if (testResult) {
                var replaced = edited;
                try { replaced = edited.replace(reg, rx.replaceString); } catch (er) {}
                resultEl.innerHTML =
                    '<div class="box" style="margin-top:8px;"><div class="blabel"><span class="bstatus ok">✅ 修改后正则匹配成功！</span></div>' +
                    '<div class="blabel">替换后预览：</div><pre>' + replaced.replace(/</g, "&lt;").substring(0, 500) + '</pre></div>';
            } else {
                resultEl.innerHTML =
                    '<div class="box" style="margin-top:8px;"><div class="blabel"><span class="bstatus no">❌ 修改后仍然不匹配</span></div>' +
                    '<div class="blabel" style="font-size:10px;color:#999;">继续调整文本再试试</div></div>';
            }
            msgEl.textContent = testResult ? "✅ 匹配成功" : "❌ 仍未匹配";
        });

        contentEl.querySelector("#bny-save").addEventListener("click", function (e) {
            e.stopPropagation();
            if (!found) { msgEl.textContent = "❌ 没有找到段落无法替换"; return; }
            var edited = editEl.value;
            var newMes = fullMes.substring(0, found.start) + edited + fullMes.substring(found.end);
            if (saveMsg(lastMsg.idx, newMes)) {
                msgEl.textContent = "✅ 已替换到正文并保存！";
            } else {
                msgEl.textContent = "❌ 替换失败";
            }
        });

        contentEl.querySelector("#bny-reset").addEventListener("click", function (e) {
            e.stopPropagation();
            editEl.value = foundText;
            contentEl.querySelector("#bny-result").innerHTML = "";
            msgEl.textContent = "🔄 已重置";
        });
    }

    var posX = 100, posY = 300;
    function posPanel() {
        var pw = Math.min(window.innerWidth * 0.92, 440);
        var ph = Math.min(window.innerHeight * 0.8, 700);
        var left = posX + 26- pw / 2;
        if (left < 5) left = 5;
        if (left + pw > window.innerWidth - 5) left = window.innerWidth - 5 - pw;
        var top = posY -10 - ph > 5 ? posY - 10 - ph : posY + 62;
        if (top + ph > window.innerHeight - 5) top = window.innerHeight - 5 - ph;
        panel.style.left = left + "px";
        panel.style.top = top + "px";
        panel.style.width = pw + "px";
        panel.style.height = ph + "px";
    }
    function openP() { posPanel(); panel.style.display = "flex"; overlay.style.display = "block"; panelOpen = true; populateSelect(); }
    function closeP() { panel.style.display = "none"; overlay.style.display = "none"; panelOpen = false; }
    function toggleP() { if (panelOpen) closeP(); else openP(); }

    var dragging = false, hasMoved = false, startX = 0, startY = 0;
    function moveTo(x, y) {
        var mx = window.innerWidth - 52, my = window.innerHeight - 52;
        posX = Math.max(0, Math.min(x, mx)); posY = Math.max(0, Math.min(y, my));
        fab.style.left = posX + "px"; fab.style.top = posY + "px";
        if (panelOpen) posPanel();
    }
    fab.addEventListener("touchstart", function (e) { e.preventDefault(); e.stopImmediatePropagation(); dragging = true; hasMoved = false; startX = e.touches[0].clientX - posX; startY = e.touches[0].clientY - posY; }, { passive: false });
    fab.addEventListener("touchmove", function (e) { e.preventDefault(); e.stopImmediatePropagation(); if (!dragging) return; hasMoved = true; moveTo(e.touches[0].clientX - startX, e.touches[0].clientY - startY); }, { passive: false });
    fab.addEventListener("touchend", function (e) { e.preventDefault(); e.stopImmediatePropagation(); var wm = hasMoved; dragging = false; hasMoved = false; if (!wm) setTimeout(toggleP, 50); else { localStorage.setItem("bnyPosX", posX); localStorage.setItem("bnyPosY", posY); } }, { passive: false });
    fab.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopImmediatePropagation(); dragging = true; hasMoved = false; startX = e.clientX - posX; startY = e.clientY - posY; });
    document.addEventListener("mousemove", function (e) { if (!dragging) return; hasMoved = true; moveTo(e.clientX - startX, e.clientY - startY); });
    document.addEventListener("mouseup", function () { if (!dragging) return; var wm = hasMoved; dragging = false; hasMoved = false; if (!wm) toggleP(); else { localStorage.setItem("bnyPosX", posX); localStorage.setItem("bnyPosY", posY); } });

    function showFab() { var sx = localStorage.getItem("bnyPosX"), sy = localStorage.getItem("bnyPosY"); if (sx && sy) { posX = parseInt(sx); posY = parseInt(sy); } moveTo(posX, posY); fab.style.display = "block"; }
    function hideFab() { fab.style.display = "none"; closeP(); }
    var saved = localStorage.getItem("bnyShow");
    if (saved === "1") { $("#bny-toggle").prop("checked", true); showFab(); $("#bny-status").text("Bunny is visible!"); }
    $("#bny-toggle").on("change", function () { var on = $(this).prop("checked"); if (on) { showFab(); $("#bny-status").text("Bunny is visible!"); } else { hideFab(); $("#bny-status").text("Bunny is hidden"); } localStorage.setItem("bnyShow", on ? "1" : "0"); });
});
