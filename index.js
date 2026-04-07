jQuery(() => {
    var GRP_KEY = "bunnyPresetGroups";

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

    var engines = {
        google: { name: "Google", search: function (q) { return "https://www.google.com/search?igu=1&q=" + encodeURIComponent(q); }, fallback: function (q) { return "https://www.google.com/search?q=" + encodeURIComponent(q); } },
        baidu: { name: "百度", search: function (q) { return "https://www.baidu.com/s?wd=" + encodeURIComponent(q); }, fallback: function (q) { return "https://www.baidu.com/s?wd=" + encodeURIComponent(q); } },
        bing: { name: "必应", search: function (q) { return "https://www.bing.com/search?q=" + encodeURIComponent(q); }, fallback: function (q) { return "https://www.bing.com/search?q=" + encodeURIComponent(q); } },
        quark: { name: "夸克", search: function (q) { return "https://quark.sm.cn/s?q=" + encodeURIComponent(q); }, fallback: function (q) { return "https://quark.sm.cn/s?q=" + encodeURIComponent(q); } }
    };
    var engineKeys = ["google", "baidu", "bing", "quark"];
    function getEngine() { var k = localStorage.getItem("bnyEngine") || "google"; return engines[k] || engines.google; }
    function setEngine(k) { localStorage.setItem("bnyEngine", k); }

    function getActiveOrder() {
        try {
            var ccs = SillyTavern.getContext().chatCompletionSettings;
            if (!ccs || !ccs.prompt_order) return [];
            var po = ccs.prompt_order, best = po[0];
            for (var i = 1; i < po.length; i++) { if (po[i].order && po[i].order.length > best.order.length) best = po[i]; }
            return best.order || [];
        } catch (e) { return []; }
    }
    function getPromptById(id) {
        try {
            var prompts = SillyTavern.getContext().chatCompletionSettings.prompts;
            for (var i = 0; i < prompts.length; i++) { if (prompts[i].identifier === id) return prompts[i]; }
        } catch (e) {} return null;
    }
    function isItemEnabled(id) {
        var order = getActiveOrder();
        for (var i = 0; i < order.length; i++) { if (order[i].identifier === id) return order[i].enabled; }
        return false;
    }
    function toggleItem(id) {
        var el = document.querySelector('[data-pm-identifier="' + id + '"] .prompt-manager-toggle-action');
        if (el) el.click();
    }
    function loadGroups() { try { return JSON.parse(localStorage.getItem(GRP_KEY)) || []; } catch (e) { return []; } }
    function saveGroups(g) { localStorage.setItem(GRP_KEY, JSON.stringify(g)); }

    var host = document.createElement("div");
    host.id = "bny-host";
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });

    var styleEl = document.createElement("style");
    styleEl.textContent =
        "*{box-sizing:border-box;margin:0;padding:0;}" +
        "::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#e0c0c8;border-radius:4px;}" +
        /* overlay */
        ".overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:auto;display:none;}" +
        /* fab */
        ".fab{position:fixed;width:52px;height:52px;font-size:24px;line-height:52px;text-align:center;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;border:2px solid rgba(255,255,255,.3);cursor:pointer;box-shadow:0 4px 15px rgba(255,107,157,.5);display:none;touch-action:none;user-select:none;-webkit-user-select:none;pointer-events:auto;transition:transform .15s;z-index:10;}" +
        ".fab:active{transform:scale(.9);}" +
        /* panel */
        ".pnl{position:fixed;width:90vw;max-width:420px;height:75vh;max-height:650px;background:#fffafc;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;pointer-events:auto;border:1px solid #fde2e8;z-index:5;}" +
        ".tabs{display:flex;background:#fff;border-bottom:1px solid #fde2e8;flex-shrink:0;}" +
        ".tab{flex:1;padding:10px 0;text-align:center;font-size:13px;cursor:pointer;color:#aaa;border-bottom:2px solid transparent;transition:.2s;}" +
        ".tab.on{color:#c44569;border-bottom-color:#c44569;font-weight:bold;}" +
        ".tc{flex:1;display:none;flex-direction:column;overflow:hidden;}.tc.on{display:flex;}" +
        /*搜索栏 */
        ".sh{display:flex;align-items:center;padding:8px 10px;background:#fff;border-bottom:1px solid #fde2e8;gap:5px;flex-shrink:0;position:relative;}" +
        ".sh input{flex:1;height:34px;border:1px solid #f0d0d8;border-radius:20px;padding:0 12px;font-size:13px;outline:none;background:#fffafc;color:#333;min-width:0;}" +
        ".sh input:focus{border-color:#ff6b9d;}" +
        ".btn{height:34px;padding:0 10px;border:none;border-radius:20px;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;}" +
        ".bgo{background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;}" +
        ".bcl{background:#f0e0e4;color:#c44569;font-size:11px;padding:0 8px;}" +
        /* 引擎标签+弹窗 */
        ".etag{font-size:10px;color:#c44569;background:#fde2e8;padding:2px 8px;border-radius:10px;flex-shrink:0;cursor:pointer;user-select:none;}" +
        ".etag:active{opacity:.7;}" +
        ".epop{position:absolute;top:44px;left:10px;background:#fff;border:1px solid #fde2e8;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.12);z-index:10;overflow:hidden;display:none;}" +
        ".eitem{padding:10px 20px;font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:8px;}" +
        ".eitem:active{background:#fff5f8;}" +
        ".eitem.on{color:#c44569;font-weight:bold;}" +
        ".eitem.on::before{content:'✓';}" +
        ".eitem:not(.on)::before{content:'';display:inline-block;width:14px;}" +
        /* 搜索body */
        ".sb{flex:1;position:relative;background:#fff;overflow:hidden;}" +
        ".sb iframe{width:100%;height:100%;border:none;}" +
        ".fb{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);border:1px solid #fde2e8;padding:6px 16px;border-radius:20px;font-size:11px;color:#c44569;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.1);text-decoration:none;z-index:1;}" +
        ".tip{display:flex;align-items:center;justify-content:center;height:100%;color:#ccc;font-size:13px;text-align:center;padding:20px;line-height:1.8;}" +
        /* 组选择器 */
        ".gs{position:relative;flex-shrink:0;}" +
        ".gs-bar{display:flex;align-items:center;padding:10px 12px;background:#f9f0f3;border-bottom:1px solid #fde2e8;cursor:pointer;gap:8px;}" +
        ".gs-bar:active{background:#f5e8ed;}" +
        ".gs-name{flex:1;font-size:13px;color:#c44569;font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
        ".gs-cnt{font-size:11px;color:#aaa;}" +
        ".gs-arr{font-size:10px;color:#ccc;}" +
        ".gs-drop{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #fde2e8;border-top:none;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:10;max-height:240px;overflow-y:auto;display:none;}" +
        ".gs-item{display:flex;align-items:center;padding:10px 14px;gap:8px;cursor:pointer;border-bottom:1px solid #f8f0f2;}" +
        ".gs-item:active{background:#fff5f8;}" +
        ".gs-item.on{background:#fff0f5;}" +
        ".gs-item .gi-dot{width:8px;height:8px;border-radius:50%;border:2px solid #ddd;flex-shrink:0;}" +
        ".gs-item.on .gi-dot{background:#ff6b9d;border-color:#ff6b9d;}" +
        ".gs-item .gi-name{flex:1;font-size:12px;color:#555;}" +
        ".gs-item.on .gi-name{color:#c44569;font-weight:bold;}" +
        ".gs-item .gi-cnt{font-size:10px;color:#bbb;}" +
        /*筛选栏 */
        ".pf{display:flex;align-items:center;padding:8px 10px;background:#fff;border-bottom:1px solid #fde2e8;gap:5px;flex-shrink:0;}" +
        ".pf input{flex:1;height:32px;border:1px solid #f0d0d8;border-radius:20px;padding:0 12px;font-size:12px;outline:none;background:#fffafc;}" +
        ".pf input:focus{border-color:#ff6b9d;}" +
        /* 条目列表 */
        ".pl{flex:1;overflow-y:auto;padding:4px 0;}" +
        ".pi{display:flex;align-items:center;padding:6px 12px;gap:8px;border-bottom:1px solid #f8f0f2;}" +
        ".pi:active{background:#fff5f8;}" +
        ".pi .pn{flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
        ".pi .pn.on-c{color:#c44569;}" +
        ".pi .pn.off-c{color:#aaa;}" +
        ".pi .pt{position:relative;width:40px;height:22px;background:#ddd;border-radius:11px;cursor:pointer;transition:.2s;flex-shrink:0;}" +
        ".pi .pt.on{background:#ff6b9d;}" +
        ".pi .pt::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;}" +
        ".pi .pt.on::after{left:20px;}" +
        ".pi .pc2{width:18px;height:18px;border:2px solid #ddd;border-radius:4px;cursor:pointer;flex-shrink:0;position:relative;}" +
        ".pi .pc2.on{background:#ff6b9d;border-color:#ff6b9d;}" +
        ".pi .pc2.on::after{content:'\\2713';position:absolute;top:-2px;left:2px;color:#fff;font-size:12px;}" +
        /* 消息+操作栏 */
        ".pmsg{text-align:center;padding:4px;font-size:11px;color:#888;flex-shrink:0;min-height:20px;}" +
        ".pbar{display:flex;gap:4px;padding:6px 10px;background:#fff;border-top:1px solid #fde2e8;flex-shrink:0;flex-wrap:wrap;}" +
        ".pbar .pbtn{flex:1;min-width:60px;height:32px;border:none;border-radius:10px;font-size:11px;cursor:pointer;}" +
        ".pbar .pbtn.pink{background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;}" +
        ".pbar .pbtn.purple{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;}" +
        ".pbar .pbtn.green{background:linear-gradient(135deg,#34d399,#059669);color:#fff;}" +
        ".pbar .pbtn.red{background:linear-gradient(135deg,#f87171,#dc2626);color:#fff;}" +
        ".pbar .pbtn.gray{background:#f0e0e4;color:#c44569;}";
    shadow.appendChild(styleEl);

    /* overlay遮罩层 */
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.addEventListener("click", function (e) { e.stopPropagation(); closeP(); });
    overlay.addEventListener("touchend", function (e) { e.stopPropagation(); closeP(); });
    shadow.appendChild(overlay);

    var fab = document.createElement("div");
    fab.className = "fab";
    fab.innerHTML = "&#x1F430;";
    shadow.appendChild(fab);

    var panel = document.createElement("div");
    panel.className = "pnl";
    panel.innerHTML =
        '<div class="tabs"><div class="tab on" data-t="search">🔍 搜索</div><div class="tab" data-t="preset">📋 预设</div></div>' +
        '<div class="tc on" data-t="search">' +
            '<div class="sh">' +
                '<span class="etag"></span>' +
                '<input type="text" class="si" placeholder="搜索或输入网址..."/>' +
                '<button class="btn bgo sbtn">搜索</button>' +'<button class="btn bcl cbtn">清空</button>' +
                '<div class="epop"></div>' +
            '</div>' +
            '<div class="sb"><div class="tip">选中文字后点🐰自动搜索<br/>输入网址可直接访问</div><iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer" style="display:none;"></iframe><a class="fb" target="_blank" rel="noopener" style="display:none;">加载不出来？点这里 ↗</a></div>' +
        '</div>' +
        '<div class="tc" data-t="preset">' +
            '<div class="gs">' +
                '<div class="gs-bar"><span class="gs-name">📋 全部条目</span><span class="gs-cnt"></span><span class="gs-arr">▼</span></div>' +
                '<div class="gs-drop"></div>' +
            '</div>' +
            '<div class="pf"><input type="text" class="pfin" placeholder="🔍 筛选条目名称..."/><button class="btn bcl refbtn">刷新</button></div>' +
            '<div class="pl"></div>' +
            '<div class="pmsg"></div>' +
            '<div class="pbar"></div>' +
        '</div>';
    shadow.appendChild(panel);

    /* Tab切换 */
    var tabEls = panel.querySelectorAll(".tab");
    var tcEls = panel.querySelectorAll(".tc");
    tabEls.forEach(function (t) {
        t.addEventListener("click", function (e) {
            e.stopPropagation();
            var v = this.getAttribute("data-t");
            tabEls.forEach(function (x) { x.classList.remove("on"); });
            tcEls.forEach(function (x) { x.classList.remove("on"); });
            this.classList.add("on");
            panel.querySelector('.tc[data-t="' + v + '"]').classList.add("on");
            if (v === "preset") renderAll();
        });
    });

    /* 搜索相关 */
    var sInput = panel.querySelector(".si");
    var sBtnEl = panel.querySelector(".sbtn");
    var cBtnEl = panel.querySelector(".cbtn");
    var iframe = panel.querySelector("iframe");
    var fbLink = panel.querySelector(".fb");
    var tipEl = panel.querySelector(".tip");
    var eTag = panel.querySelector(".etag");
    var ePop = panel.querySelector(".epop");
    var panelOpen = false, hasSearch = false;

    function isUrl(s) { s = s.trim().toLowerCase(); return s.indexOf("http://") === 0 || s.indexOf("https://") === 0|| /^[a-z0-9]([a-z0-9\-]*\.)+[a-z]{2,}/.test(s); }
    function toUrl(s) { s = s.trim(); if (s.indexOf("http") !== 0) s = "https://" + s; return s; }
    function doSearch(q) {
        if (!q.trim()) return; q = q.trim(); var eng = getEngine(); eTag.textContent = eng.name;
        if (isUrl(q)) { iframe.src = toUrl(q); fbLink.href = toUrl(q); } else { iframe.src = eng.search(q); fbLink.href = eng.fallback(q); }
        iframe.style.display = "block"; tipEl.style.display = "none"; fbLink.style.display = "block"; hasSearch = true;
    }
    function clearS() { iframe.src = ""; iframe.style.display = "none"; tipEl.style.display = "flex"; fbLink.style.display = "none"; sInput.value = ""; hasSearch = false; }
    sBtnEl.addEventListener("click", function (e) { e.stopPropagation(); doSearch(sInput.value); });
    cBtnEl.addEventListener("click", function (e) { e.stopPropagation(); clearS(); });
    sInput.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") doSearch(sInput.value); });
    sInput.addEventListener("keyup", function (e) { e.stopPropagation(); });
    sInput.addEventListener("keypress", function (e) { e.stopPropagation(); });
    sInput.addEventListener("input", function (e) { e.stopPropagation(); });

    /* 引擎弹窗 */
    eTag.textContent = getEngine().name;
    eTag.addEventListener("click", function (e) {
        e.stopPropagation();
        var curKey = localStorage.getItem("bnyEngine") || "google";
        ePop.innerHTML = "";
        for (var i = 0; i < engineKeys.length; i++) {
            (function (k) {
                var item = document.createElement("div");
                item.className = "eitem" + (k === curKey ? " on" : "");
                item.textContent = engines[k].name;
                item.addEventListener("click", function (ev) {
                    ev.stopPropagation(); setEngine(k); eTag.textContent = engines[k].name;ePop.style.display = "none";
                });
                ePop.appendChild(item);
            })(engineKeys[i]);
        }ePop.style.display =ePop.style.display === "block" ? "none" : "block";
    });
    panel.addEventListener("click", function () { ePop.style.display = "none"; gsDrop.style.display = "none"; });
    /* 预设相关元素 */
    var gsBar = panel.querySelector(".gs-bar");
    var gsName = panel.querySelector(".gs-name");
    var gsCnt = panel.querySelector(".gs-cnt");
    var gsDrop = panel.querySelector(".gs-drop");
    var pfInput = panel.querySelector(".pfin");
    var refBtn = panel.querySelector(".refbtn");
    var plEl = panel.querySelector(".pl");
    var pmsgEl = panel.querySelector(".pmsg");
    var pbarEl = panel.querySelector(".pbar");

    var currentGroup = null;
    var editingGroup = null;
    var selectMode = false;
    var selected = {};

    /* 组选择器下拉 */
    gsBar.addEventListener("click", function (e) {
        e.stopPropagation();
        gsDrop.style.display = gsDrop.style.display === "block" ? "none" : "block";
        if (gsDrop.style.display === "block") renderDropdown();
    });

    function renderDropdown() {
        var groups = loadGroups();
        gsDrop.innerHTML = "";
        var allItem = document.createElement("div");
        allItem.className = "gs-item" + (currentGroup === null ? " on" : "");
        allItem.innerHTML = '<span class="gi-dot"></span><span class="gi-name">📋 全部条目</span>';
        allItem.addEventListener("click", function (e) {
            e.stopPropagation(); currentGroup = null; editingGroup = null; selectMode = false; selected = {};
            gsDrop.style.display = "none"; renderAll();
        });
        gsDrop.appendChild(allItem);
        for (var i = 0; i < groups.length; i++) {
            (function (idx) {
                var g = groups[idx];
                var item = document.createElement("div");
                item.className = "gs-item" + (currentGroup === idx ? " on" : "");
                item.innerHTML = '<span class="gi-dot"></span><span class="gi-name">📁 ' + g.name + '</span><span class="gi-cnt">' + g.ids.length + '条</span>';
                item.addEventListener("click", function (e) {
                    e.stopPropagation(); currentGroup = idx; editingGroup = null; selectMode = false; selected = {};
                    gsDrop.style.display = "none"; renderAll();
                });
                gsDrop.appendChild(item);
            })(i);
        }
    }

    pfInput.addEventListener("input", function (e) { e.stopPropagation(); renderList(); });
    pfInput.addEventListener("keydown", function (e) { e.stopPropagation(); });
    pfInput.addEventListener("keyup", function (e) { e.stopPropagation(); });
    pfInput.addEventListener("keypress", function (e) { e.stopPropagation(); });
    refBtn.addEventListener("click", function (e) { e.stopPropagation(); renderAll(); pmsgEl.textContent = "🔄 已刷新"; pmsgEl.style.color = "#888"; });

    /* 主渲染 */
    function renderAll() { renderBar(); renderList(); renderActions(); }

    function renderBar() {
        var groups = loadGroups();
        if (editingGroup !== null && groups[editingGroup]) {
            gsName.textContent = "✏️ 编辑：" + groups[editingGroup].name;
            gsCnt.textContent = "";} else if (currentGroup !== null && groups[currentGroup]) {
            gsName.textContent = "📁 " + groups[currentGroup].name;
            gsCnt.textContent = groups[currentGroup].ids.length + "条";
        } else {
            gsName.textContent = "📋 全部条目";
            gsCnt.textContent = getActiveOrder().length + "条";
        }
    }

    function renderList() {
        var order = getActiveOrder();
        var filter = pfInput.value.trim().toLowerCase();
        var groups = loadGroups();
        plEl.innerHTML = "";
        var shown = 0, enabledCount = 0, totalCount = 0;

        var showIds = null;
        if (editingGroup === null && currentGroup !== null && groups[currentGroup]) {
            showIds = {};
            for (var j = 0; j < groups[currentGroup].ids.length; j++) showIds[groups[currentGroup].ids[j]] = true;
        }

        for (var i = 0; i < order.length; i++) {
            (function (entry) {
                var id = entry.identifier;
                var p = getPromptById(id);
                var name = p ? (p.name || id) : id;
                if (filter && name.toLowerCase().indexOf(filter) === -1) return;
                if (showIds && !showIds[id]) return;
                var en = isItemEnabled(id);
                totalCount++;
                if (en) enabledCount++;

                var row = document.createElement("div"); row.className = "pi";
                var nameEl = document.createElement("div");
                nameEl.className = "pn " + (en ? "on-c" : "off-c");
                nameEl.textContent = name;

                if (selectMode || editingGroup !== null) {
                    var chk = document.createElement("div");
                    chk.className = "pc2" + (selected[id] ? " on" : "");
                    chk.addEventListener("click", function (e) {
                        e.stopPropagation(); selected[id] = !selected[id];
                        if (selected[id]) chk.classList.add("on"); else chk.classList.remove("on");
                        var cnt = 0; for (var k in selected) { if (selected[k]) cnt++; }
                        pmsgEl.textContent = "已选 " + cnt + " 条"; pmsgEl.style.color = "#c44569";
                    });
                    row.appendChild(nameEl); row.appendChild(chk);
                } else {
                    var tog = document.createElement("div");
                    tog.className = "pt" + (en ? " on" : "");
                    tog.addEventListener("click", function (e) {
                        e.stopPropagation();
                        toggleItem(id);
                        setTimeout(function () {
                            var nowOn = isItemEnabled(id);
                            if (nowOn) { tog.classList.add("on"); nameEl.className = "pn on-c"; }
                            else { tog.classList.remove("on"); nameEl.className = "pn off-c"; }
                            pmsgEl.textContent = (nowOn ? "✅ 开启" : "❌ 关闭") + " " + name;
                            pmsgEl.style.color = nowOn ? "#27ae60" : "#e74c3c";
                            updateCount();
                        }, 50);
                    });
                    row.appendChild(nameEl); row.appendChild(tog);
                }
                plEl.appendChild(row); shown++;
            })(order[i]);
        }
        if (shown === 0) plEl.innerHTML = '<div style="text-align:center;padding:20px;color:#ccc;font-size:12px;">没有找到条目</div>';

        if (!(selectMode || editingGroup !== null)) {
            pmsgEl.textContent = "开启 " + enabledCount + " / " + totalCount + " 条";
            pmsgEl.style.color = "#888";
        }
    }

    function updateCount() {
        var order = getActiveOrder();
        var groups = loadGroups();
        var showIds = null;
        if (editingGroup === null && currentGroup !== null && groups[currentGroup]) {
            showIds = {};
            for (var j = 0; j < groups[currentGroup].ids.length; j++) showIds[groups[currentGroup].ids[j]] = true;
        }
        var filter = pfInput.value.trim().toLowerCase();
        var en = 0, tot = 0;
        for (var i = 0; i < order.length; i++) {
            var id = order[i].identifier;
            var p = getPromptById(id);
            var name = p ? (p.name || id) : id;
            if (filter && name.toLowerCase().indexOf(filter) === -1) continue;
            if (showIds && !showIds[id]) continue;
            tot++;
            if (isItemEnabled(id)) en++;
        }
        pmsgEl.textContent = "开启 " + en + " / " + tot + " 条";
        pmsgEl.style.color = "#888";
    }

    function renderActions() {
        pbarEl.innerHTML = "";
        var groups = loadGroups();

        if (editingGroup !== null) {
            var saveBtn = mk("button", "pbtn green", "✅ 保存");
            saveBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var ids = []; for (var k in selected) { if (selected[k]) ids.push(k); }
                if (ids.length === 0) { pmsgEl.textContent = "⚠️ 至少选一条！"; pmsgEl.style.color = "#e74c3c"; return; }
                var gs = loadGroups(); gs[editingGroup].ids = ids; saveGroups(gs);
                pmsgEl.textContent = "✅ 已保存"; pmsgEl.style.color = "#27ae60";
                editingGroup = null; selected = {}; renderAll();
            });
            var canBtn = mk("button", "pbtn gray", "✖ 取消");
            canBtn.addEventListener("click", function (e) { e.stopPropagation(); editingGroup = null; selected = {}; renderAll(); });
            pbarEl.appendChild(saveBtn); pbarEl.appendChild(canBtn);} else if (selectMode) {
            var savBtn = mk("button", "pbtn purple", "💾 存为组");
            savBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var ids = []; for (var k in selected) { if (selected[k]) ids.push(k); }
                if (ids.length === 0) { pmsgEl.textContent = "⚠️ 请先勾选！"; pmsgEl.style.color = "#e74c3c"; return; }
                var nm = prompt("给分组取个名字："); if (!nm || !nm.trim()) return;
                var gs = loadGroups(); gs.push({ name: nm.trim(), ids: ids }); saveGroups(gs);
                selectMode = false; selected = {}; currentGroup = gs.length - 1;
                renderAll(); pmsgEl.textContent = "✅ 已创建「" + nm.trim() + "」" + ids.length + "条"; pmsgEl.style.color = "#27ae60";
            });
            var canBtn = mk("button", "pbtn gray", "✖ 取消");
            canBtn.addEventListener("click", function (e) { e.stopPropagation(); selectMode = false; selected = {}; renderAll(); });
            pbarEl.appendChild(savBtn); pbarEl.appendChild(canBtn);

        } else if (currentGroup !== null && groups[currentGroup]) {
            var g = groups[currentGroup];
            var onBtn = mk("button", "pbtn green", "🔛 全开");
            onBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                for (var j = 0; j < g.ids.length; j++) { if (!isItemEnabled(g.ids[j])) toggleItem(g.ids[j]); }
                setTimeout(function () { renderList(); }, 100);
            });
            var offBtn = mk("button", "pbtn red", "🔌 全关");
            offBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                for (var j = 0; j < g.ids.length; j++) { if (isItemEnabled(g.ids[j])) toggleItem(g.ids[j]); }
                setTimeout(function () { renderList(); }, 100);
            });
            var editBtn = mk("button", "pbtn pink", "✏️ 编辑");
            editBtn.addEventListener("click", function (e) {
                e.stopPropagation(); editingGroup = currentGroup; selected = {};
                var gs = loadGroups();
                for (var j = 0; j < gs[currentGroup].ids.length; j++) selected[gs[currentGroup].ids[j]] = true;
                renderAll();
            });
            var renBtn = mk("button", "pbtn gray", "📝 改名");
            renBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var gs = loadGroups(); var nm = prompt("新名字：", gs[currentGroup].name);
                if (!nm || !nm.trim()) return;
                gs[currentGroup].name = nm.trim(); saveGroups(gs); renderAll();
            });
            var delBtn = mk("button", "pbtn red", "🗑 删除");
            delBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                if (!confirm("确定删除「" + g.name + "」分组吗？")) return;
                var gs = loadGroups(); gs.splice(currentGroup, 1); saveGroups(gs);
                currentGroup = null; renderAll();
            });
            pbarEl.appendChild(onBtn); pbarEl.appendChild(offBtn);
            pbarEl.appendChild(editBtn); pbarEl.appendChild(renBtn); pbarEl.appendChild(delBtn);

        } else {
            /* 全部模式：多选建组 + 全开 + 全关 */
            var selBtn = mk("button", "pbtn pink", "☑ 多选建组");
            selBtn.addEventListener("click", function (e) { e.stopPropagation(); selectMode = true; selected = {}; renderAll(); });
            var allOnBtn = mk("button", "pbtn green", "🔛 全开");
            allOnBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var order = getActiveOrder();
                for (var i = 0; i < order.length; i++) { if (!isItemEnabled(order[i].identifier)) toggleItem(order[i].identifier); }
                setTimeout(function () { renderList(); }, 200);
            });
            var allOffBtn = mk("button", "pbtn red", "🔌 全关");
            allOffBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var order = getActiveOrder();
                for (var i = 0; i < order.length; i++) { if (isItemEnabled(order[i].identifier)) toggleItem(order[i].identifier); }
                setTimeout(function () { renderList(); }, 200);
            });
            pbarEl.appendChild(selBtn); pbarEl.appendChild(allOnBtn); pbarEl.appendChild(allOffBtn);
        }
    }

    function mk(tag, cls, txt) { var e = document.createElement(tag); e.className = cls; e.textContent = txt; return e; }

    /* 事件阻断 */
    panel.addEventListener("touchstart", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchmove", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchend", function (e) { e.stopPropagation(); });
    panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });

    /* FAB拖拽 */
    var posX = 100, posY = 300;
    function posPanel() {
        var pw = Math.min(window.innerWidth * 0.9, 420);
        var ph = Math.min(window.innerHeight * 0.75, 650);
        var gap = 10;
        var left = posX +26 - pw / 2;
        if (left < 5) left = 5;
        if (left + pw > window.innerWidth - 5) left = window.innerWidth - 5 - pw;
        var top;
        if (posY - gap - ph >5) top = posY - gap - ph;
        else { top = posY + 52+ gap; if (top + ph > window.innerHeight - 5) top = window.innerHeight - 5 - ph; }
        panel.style.left = left + "px"; panel.style.top = top + "px";
        panel.style.width = pw + "px"; panel.style.height = ph + "px";
    }
    function openP(text) {
        eTag.textContent = getEngine().name;
        if (text) { sInput.value = text; tabEls[0].click(); doSearch(text); }
        if (!text && !hasSearch) tipEl.style.display = "flex";
        posPanel(); panel.style.display = "flex"; overlay.style.display = "block"; panelOpen = true;
    }
    function closeP() {
        panel.style.display = "none"; overlay.style.display = "none"; panelOpen = false;
        gsDrop.style.display = "none"; ePop.style.display = "none";}
    function toggleP() {
        var sel = window.getSelection(); var text = sel ? sel.toString().trim() : "";
        if (panelOpen) { if (text) { sInput.value = text; tabEls[0].click(); doSearch(text); } else closeP(); }
        else openP(text);
    }

    var dragging = false, hasMoved = false, startX = 0, startY = 0;
    function moveTo(x, y) {
        var mx = window.innerWidth - 52, my = window.innerHeight - 52;
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x > mx) x = mx; if (y > my) y = my;
        posX = x; posY = y;
        fab.style.left = x + "px"; fab.style.top = y + "px";
        if (panelOpen) posPanel();
    }
    fab.addEventListener("touchstart", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        dragging = true; hasMoved = false;
        var t = e.touches[0]; startX = t.clientX - posX; startY = t.clientY - posY;
    }, { passive: false });
    fab.addEventListener("touchmove", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!dragging) return; hasMoved = true;
        var t = e.touches[0]; moveTo(t.clientX - startX, t.clientY - startY);
    }, { passive: false });
    fab.addEventListener("touchend", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        varwd = dragging, wm = hasMoved;
        dragging = false; hasMoved = false;
        if (wd && !wm) setTimeout(function () { toggleP(); }, 50);
        if (wd && wm) { localStorage.setItem("bnyPosX", String(posX)); localStorage.setItem("bnyPosY", String(posY)); }
    }, { passive: false });
    fab.addEventListener("mousedown", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        dragging = true; hasMoved = false;
        startX = e.clientX - posX; startY = e.clientY - posY;
    });
    document.addEventListener("mousemove", function (e) {
        if (!dragging) return; hasMoved = true;
        moveTo(e.clientX - startX, e.clientY - startY);
    });
    document.addEventListener("mouseup", function () {
        if (!dragging) return;
        var wm = hasMoved; dragging = false; hasMoved = false;
        if (!wm) toggleP();
        else { localStorage.setItem("bnyPosX", String(posX)); localStorage.setItem("bnyPosY", String(posY)); }
    });

    function showFab() {
        var sx = localStorage.getItem("bnyPosX"), sy = localStorage.getItem("bnyPosY");
        if (sx !== null && sy !== null) { posX = parseInt(sx); posY = parseInt(sy); }
        moveTo(posX, posY); fab.style.display = "block";
    }
    function hideFab() { fab.style.display = "none"; closeP(); }

    var saved = localStorage.getItem("bnyShow");
    if (saved === "1") { $("#bny-toggle").prop("checked", true); showFab(); $("#bny-status").text("Bunny is visible!"); }
    $("#bny-toggle").on("change", function () {
        var on = $(this).prop("checked");
        if (on) { showFab(); $("#bny-status").text("Bunny is visible!"); }
        else { hideFab(); $("#bny-status").text("Bunny is hidden"); }
        localStorage.setItem("bnyShow", on ? "1" : "0");
    });
});
