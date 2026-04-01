jQuery(() => {
    var getContainer = function () {
        return $(document.getElementById("extensions_settings"));
    };

    getContainer().append(
        '<div class="inline-drawer">' +
            '<div class="inline-drawer-toggle inline-drawer-header">' +
                '<b>Bunny Search</b>' +
                '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>' +
            '</div>' +
            '<div class="inline-drawer-content">' +
                '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0;">' +
                    '<input type="checkbox" id="bny-toggle" />' +
                    '<span>Show Bunny</span>' +
                '</label>' +
                '<div style="padding:5px 0;">' +
                    '<label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">搜索引擎</label>' +
                    '<select id="bny-engine" style="width:100%;padding:5px 8px;border-radius:8px;border:1px solid #ddd;font-size:13px;">' +
                        '<option value="google">Google</option>' +
                        '<option value="baidu">百度</option>' +
                        '<option value="bing">必应 Bing</option>' +
                        '<option value="quark">夸克</option>' +
                    '</select>' +
                '</div>' +
                '<div id="bny-status" style="padding:5px 0;font-size:12px;color:#888;">Bunny is hidden</div>' +
            '</div>' +
        '</div>'
    );

    var engines = {
        google: {
            name: "Google",
            search: function (q) { return "https://www.google.com/search?igu=1&q=" + encodeURIComponent(q); },
            fallback: function (q) { return "https://www.google.com/search?q=" + encodeURIComponent(q); }
        },
        baidu: {
            name: "百度",
            search: function (q) { return "https://www.baidu.com/s?wd=" + encodeURIComponent(q); },
            fallback: function (q) { return "https://www.baidu.com/s?wd=" + encodeURIComponent(q); }
        },
        bing: {
            name: "必应",
            search: function (q) { return "https://www.bing.com/search?q=" + encodeURIComponent(q); },
            fallback: function (q) { return "https://www.bing.com/search?q=" + encodeURIComponent(q); }
        },
        quark: {
            name: "夸克",
            search: function (q) { return "https://quark.sm.cn/s?q=" + encodeURIComponent(q); },
            fallback: function (q) { return "https://quark.sm.cn/s?q=" + encodeURIComponent(q); }
        }
    };

    function getEngine() {
        var key = localStorage.getItem("bnyEngine") || "google";
        return engines[key] || engines.google;
    }

    var savedEngine = localStorage.getItem("bnyEngine") || "google";
    $("#bny-engine").val(savedEngine);

    $("#bny-engine").on("change", function () {
        var val = $(this).val();
        localStorage.setItem("bnyEngine", val);
        $("#bny-status").text("已切换到: " + engines[val].name);
    });

    localStorage.removeItem("bnyPosX");
    localStorage.removeItem("bnyPosY");

    var host = document.createElement("div");
    host.id = "bny-host";
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: "open" });

    var styleEl = document.createElement("style");
    styleEl.textContent = [
        "* { box-sizing:border-box; margin:0; padding:0; }",
        ".bny-fab { position:fixed; width:52px; height:52px; font-size:24px; line-height:52px; text-align:center; border-radius:50%; background:linear-gradient(135deg,#ff6b9d,#c44569); color:white; border:2px solid rgba(255,255,255,0.3); cursor:pointer; box-shadow:0 4px 15px rgba(255,107,157,0.5); display:none; touch-action:none; user-select:none; -webkit-user-select:none; pointer-events:auto; transition:transform 0.15s; }",
        ".bny-fab:active { transform:scale(0.9); }",
        ".bny-panel { position:fixed; width:88vw; max-width:380px; height:55vh; max-height:450px; background:#fffafc; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.18); display:none; flex-direction:column; overflow:hidden; pointer-events:auto; border:1px solid #fde2e8; }",
        ".bny-header { display:flex; align-items:center; padding:8px 10px; background:#fff; border-bottom:1px solid #fde2e8; gap:5px; flex-shrink:0; flex-wrap:nowrap; }",
        ".bny-header input { flex:1; height:34px; border:1px solid #f0d0d8; border-radius:20px; padding:0 12px; font-size:13px; outline:none; background:#fffafc; color:#333; min-width:0; }",
        ".bny-header input:focus { border-color:#ff6b9d; }",
        ".bny-btn { height:34px; padding:0 10px; border:none; border-radius:20px; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0; }",
        ".bny-go { background:linear-gradient(135deg,#ff6b9d,#c44569); color:white; }",
        ".bny-newtab { background:#e8f4e8; color:#5a9; font-size:14px; width:34px; padding:0; }",
        ".bny-close { background:#f0e0e4; color:#999; width:34px; padding:0; font-size:16px; }",
        ".bny-engine-tag { font-size:10px; color:#c44569; background:#fde2e8; padding:2px 8px; border-radius:10px; flex-shrink:0; }",
        ".bny-body { flex:1; position:relative; background:#fff; overflow:hidden; }",
        ".bny-body iframe { width:100%; height:100%; border:none; }",
        ".bny-fallback { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.95); border:1px solid #fde2e8; padding:6px 16px; border-radius:20px; font-size:11px; color:#c44569; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.1); text-decoration:none; z-index:1; }",
        ".bny-tip { display:flex; align-items:center; justify-content:center; height:100%; color:#ccc; font-size:13px; text-align:center; padding:20px; line-height:1.8; }",
        ".bny-blocked { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:30px; text-align:center; gap:12px; }",
        ".bny-blocked-icon { font-size:40px; }",
        ".bny-blocked-text { color:#999; font-size:13px; line-height:1.6; }",
        ".bny-blocked-btn { background:linear-gradient(135deg,#ff6b9d,#c44569); color:white; border:none; padding:10px 24px; border-radius:20px; font-size:13px; cursor:pointer; text-decoration:none; }"
    ].join("\n");
    shadow.appendChild(styleEl);

    var fab = document.createElement("div");
    fab.className = "bny-fab";
    fab.innerHTML = "&#x1F430;";
    shadow.appendChild(fab);

    var panel = document.createElement("div");
    panel.className = "bny-panel";
    panel.innerHTML =
        '<div class="bny-header">' +
            '<span class="bny-engine-tag"></span>' +
            '<input type="text" class="bny-input" placeholder="搜索 或 输入网址..." />' +
            '<button class="bny-btn bny-go">搜索</button>' +
            '<button class="bny-btn bny-newtab" title="新标签页打开">↗</button>' +
            '<button class="bny-btn bny-close">\u2715</button>' +
        '</div>' +
        '<div class="bny-body">' +
            '<div class="bny-tip">选中文字后点🐰 自动搜索<br/>输入网址可直接访问<br/>在设置里切换搜索引擎</div>' +
            '<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer" style="display:none;"></iframe>' +
            '<a class="bny-fallback" target="_blank" rel="noopener" style="display:none;">显示异常？点这里打开 ↗</a>' +
        '</div>';
    shadow.appendChild(panel);

    var searchInput = panel.querySelector(".bny-input");
    var searchBtn = panel.querySelector(".bny-go");
    var newtabBtn = panel.querySelector(".bny-newtab");
    var closeBtn = panel.querySelector(".bny-close");
    var iframe = panel.querySelector("iframe");
    var fallbackLink = panel.querySelector(".bny-fallback");
    var tip = panel.querySelector(".bny-tip");
    var engineTag = panel.querySelector(".bny-engine-tag");
    var panelOpen = false;
    var lastUrl = "";

    function isUrl(str) {
        var s = str.trim().toLowerCase();
        if (s.indexOf("http://") === 0 || s.indexOf("https://") === 0) return true;
        if (/^[a-z0-9]([a-z0-9\-]*\.)+[a-z]{2,}/.test(s)) return true;
        return false;
    }

    function toUrl(str) {
        var s = str.trim();
        if (s.indexOf("http://") !== 0 && s.indexOf("https://") !== 0) {
            s = "https://" + s;
        }
        return s;
    }

    function doSearch(query) {
        if (!query.trim()) return;
        var q = query.trim();
        var engine = getEngine();
        engineTag.textContent = engine.name;

        if (isUrl(q)) {
            var url = toUrl(q);
            lastUrl = url;
            iframe.src = url;
            iframe.style.display = "block";
            tip.style.display = "none";
            fallbackLink.href = url;
            fallbackLink.style.display = "block";} else {
            lastUrl = engine.fallback(q);
            iframe.src = engine.search(q);
            iframe.style.display = "block";
            tip.style.display = "none";
            fallbackLink.href = engine.fallback(q);
            fallbackLink.style.display = "block";
        }
    }

    function positionPanel() {
        var pw = Math.min(window.innerWidth * 0.88, 380);
        var ph = Math.min(window.innerHeight * 0.55, 450);
        var gap = 10;
        var bunnyCenter = posX + 26;

        var left = bunnyCenter - pw / 2;
        if (left < 5) left = 5;
        if (left + pw > window.innerWidth - 5) left = window.innerWidth - 5 - pw;

        var top;
        if (posY - gap - ph > 5) {
            top = posY - gap - ph;
        } else {
            top = posY + 52 + gap;
            if (top + ph > window.innerHeight - 5) {
                top = window.innerHeight - 5 - ph;
            }
        }

        panel.style.left = left + "px";
        panel.style.top = top + "px";panel.style.width = pw + "px";
        panel.style.height = ph + "px";
    }

    function openPanel(text) {
        var engine = getEngine();
        engineTag.textContent = engine.name;

        if (text) {
            searchInput.value = text;
            doSearch(text);
        } else {
            searchInput.value = "";
            iframe.src = "";
            iframe.style.display = "none";
            tip.style.display = "flex";
            fallbackLink.style.display = "none";
            lastUrl = "";
        }
        positionPanel();
        panel.style.display = "flex";
        panelOpen = true;
    }

    function closePanel() {
        panel.style.display = "none";
        iframe.src = "";
        panelOpen = false;
        lastUrl = "";
    }

    function togglePanel() {
        if (panelOpen) {
            closePanel();
        } else {
            var sel = window.getSelection();
            var text = sel ? sel.toString().trim() : "";
            openPanel(text);
        }
    }

    searchBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        doSearch(searchInput.value);
    });

    newtabBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (lastUrl) {
            window.open(lastUrl, "_blank");
        } else if (searchInput.value.trim()) {
            var q = searchInput.value.trim();
            if (isUrl(q)) {
                window.open(toUrl(q), "_blank");
            } else {
                window.open(getEngine().fallback(q), "_blank");
            }
        }
    });

    searchInput.addEventListener("keydown", function (e) {
        e.stopPropagation();
        if (e.key === "Enter") doSearch(searchInput.value);
    });
    searchInput.addEventListener("keyup", function (e) { e.stopPropagation(); });
    searchInput.addEventListener("keypress", function (e) { e.stopPropagation(); });
    searchInput.addEventListener("input", function (e) { e.stopPropagation(); });

    closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closePanel();
    });

    panel.addEventListener("touchstart", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchmove", function (e) { e.stopPropagation(); });
    panel.addEventListener("touchend", function (e) { e.stopPropagation(); });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });

    var dragging = false;
    var hasMoved = false;
    var startX = 0;
    var startY = 0;
    var posX = 100;
    var posY = 300;

    function moveTo(x, y) {
        var maxX = window.innerWidth - 52;
        var maxY = window.innerHeight - 52;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > maxX) x = maxX;
        if (y > maxY) y = maxY;
        posX = x;
        posY = y;
        fab.style.left = x + "px";
        fab.style.top = y + "px";
        if (panelOpen) positionPanel();
    }

    fab.addEventListener("touchstart", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        dragging = true;
        hasMoved = false;
        var t = e.touches[0];
        startX = t.clientX - posX;
        startY = t.clientY - posY;
    }, { passive: false });

    fab.addEventListener("touchmove", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!dragging) return;
        hasMoved = true;
        var t = e.touches[0];
        moveTo(t.clientX - startX, t.clientY - startY);
    }, { passive: false });

    fab.addEventListener("touchend", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var wasDragging = dragging;
        var wasMoving = hasMoved;
        dragging = false;
        hasMoved = false;
        if (wasDragging && !wasMoving) {
            setTimeout(function () {
                togglePanel();
            }, 50);
        }
        if (wasDragging && wasMoving) {
            localStorage.setItem("bnyPosX", String(posX));
            localStorage.setItem("bnyPosY", String(posY));
        }
    }, { passive: false });

    fab.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        dragging = true;
        hasMoved = false;
        startX = e.clientX - posX;
        startY = e.clientY - posY;
    });

    document.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        hasMoved = true;
        moveTo(e.clientX - startX, e.clientY - startY);
    });

    document.addEventListener("mouseup", function () {
        if (!dragging) return;
        var wasMoving = hasMoved;
        dragging = false;
        hasMoved = false;
        if (!wasMoving) {
            togglePanel();
        } else {
            localStorage.setItem("bnyPosX", String(posX));
            localStorage.setItem("bnyPosY", String(posY));
        }
    });

    function showFab() {
        var sx = localStorage.getItem("bnyPosX");
        var sy = localStorage.getItem("bnyPosY");
        if (sx !== null && sy !== null) {
            posX = parseInt(sx);
            posY = parseInt(sy);
        }
        moveTo(posX, posY);
        fab.style.display = "block";
    }

    function hideFab() {
        fab.style.display = "none";
        closePanel();
    }

    var saved = localStorage.getItem("bnyShow");
    if (saved === "1") {
        $("#bny-toggle").prop("checked", true);
        showFab();
        $("#bny-status").text("Bunny is visible!");
    }

    $("#bny-toggle").on("change", function () {
        var on = $(this).prop("checked");
        if (on) {
            showFab();
            $("#bny-status").text("Bunny is visible!");
        } else {
            hideFab();
            $("#bny-status").text("Bunny is hidden");
        }
        localStorage.setItem("bnyShow", on ? "1" : "0");
    });
});
