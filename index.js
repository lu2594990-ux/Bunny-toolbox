jQuery(() => {
    const getContainer = () => $(document.getElementById("extensions_settings"));

    getContainer().append(`
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Bunny Game</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0;">
                <input type="checkbox" id="bny-toggle" />
                <span>Show Bunny</span>
            </label>
        </div>
    </div>`);

    $("body").append('<button id="bny-fab" style="display:none;">🐰</button>');

    var saved = localStorage.getItem("bnyShow");
    if (saved === "1") {
        $("#bny-toggle").prop("checked", true);
        $("#bny-fab").css("display", "flex");
    }

    $("#bny-toggle").on("change", function () {
        var on = $(this).prop("checked");
        $("#bny-fab").css("display", on ? "flex" : "none");
        localStorage.setItem("bnyShow", on ? "1" : "0");
    });

    $("#bny-fab").on("click", function () {
        alert("Bunny is here! It works!");
    });
});
