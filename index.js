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
                '<div id="bny-status" style="padding:5px 0;font-size:12px;color:#888;">Bunny is hidden</div>' +
            '</div>' +
        '</div>'
    );

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
        ".bny-fab { position:fixed; width:52px; height:52px; font-size:24px; line-height:52px; text-align:center; border-radius:50%; background:linear-gradient(135deg,#ff6b9d,#c44569); color:white; border:2px solid rgba(255,255,255,0.3); cursor:pointer; box-shadow:0 4px 15px rgba(255,107,157,0.5); display:none; touch-action:none; user-select:none; -webkit-user-select:none; pointer-events:auto; }",
        ".bny-panel { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:92vw; max-width:420px; height:78vh; background:#fffafc; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.15); display:none; flex-direction:column; overflow:hidden; pointer-events:auto; border:1px solid #fde2e8; }",
        ".bny-header { display:flex; align-items:center; padding:10px 12px; background:#fff; border-bottom:1px solid #fde2e8; gap:6px; }",
        ".bny-header input { flex:1; height:36px; border:1px solid #f0d0d8; border-radius:20px; padding:0 14px; font-size:14px; outline:none; background:#fffafc; color:#333; }",
        ".bny-header input:focus { border-color:#ff6b9d; }",
        ".bny-btn { height:36px; padding:0 14px; border:none; border-radius:20px; font-size:13px; cursor:pointer; white-space:nowrap; }",
        ".bny-go { background:linear-gradient(135deg,#ff6b9d,#c44569); color:white; }",
        ".bny-close { background:#f0e0e4; color:#999; width:36px; padding:0; font-size:18px; }",
        ".bny-body { flex:1; position:relative; background:#fff; }",
        ".bny-body iframe { width:100%; height:100%; border:none; }",
        ".bny-fallback { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.95); border:1px solid #fde2e8; padding:8px 20px; border-radius:20px; font-size:12px; color:#c44569; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.1); text-decoration:none; }",
        ".bny-tip { display:flex; align-items:center; justify-content:center; height:100%; color:#ccc; font-size:14px; }"
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
            '<input type="text" class="bny-input" placeholder="输入要搜索的内容..." />' +
            '<button class="bny-btn bny-go">搜索</button>' +
            '<button class="bny-btn bny-close">\u2715</button>' +
        '</div>' +
        '<div class="bny-body">' +
            '<div class="bny-tip">选中文字后点🐰 可以自动搜索哦~</div>' +
            '<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer" style="display:none;"></iframe>' +
            '<a class="bny-fallback" target="_blank" rel="noopener" style="display:none;">加载不出来？点这里打开 ↗</a>' +
        '</div>';
    shadow.appendChild(panel);

    var searchInput = panel.querySelector(".bny-input");
    var searchBtn = panel.querySelector(".bny-go");
    var closeBtn = panel.querySelector(".bny-close");
    var iframe = panel.querySelector("iframe");
    var fallbackLink = panel.querySelector(".bny-fallback");
    var tip = panel.querySelector(".bny-tip");

    function doSearch(query) {
        if (!query.trim()) return;
        var q = query.trim();
        var url = "https://www.google.com/search?igu=1&q=" + encodeURIComponent(q);
        iframe.src = url;
        iframe.style.display = "block";
        tip.style.display = "none";
        fallbackLink.href = "https://www.google.com/search?q=" + encodeURIComponent(q);fallbackLink.style.display = "block";
    }

    function openPanel(text) {
        if (text) {
            searchInput.value = text;
            doSearch(text);
        } else {
            searchInput.value = "";
            iframe.src = "";
            iframe.style.display = "none";
            tip.style.display = "flex";
            fallbackLink.style.display = "none";
        }
        panel.style.display = "flex";
    }

    function closePanel() {
        panel.style.display = "none";
        iframe.src = "";}

    searchBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        doSearch(searchInput.value);
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
                var sel = window.getSelection();
                var text = sel ? sel.toString().trim() : "";
                openPanel(text);
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
        if (wasMoving) {
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
