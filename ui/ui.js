class UserInterfaces {
    static displayTitle = true
    static showMapping = false; // Tambahan state
    #UI = {}
    #CURRENT

    constructor() {
        GUI.init()
        this.#UI.chest = null
        this.#UI.itemBar = new ItemBarUI(Level.PLAYER)
        this.#UI.inventory = new InventoryUI(Level.PLAYER)
        this.#CURRENT = this.#UI.itemBar
    }

    getCurrent() {
        return this.#CURRENT;
    }

    openChest(chestRef) {
        this.#UI.chest = new ChestUI(Level.PLAYER, chestRef)
    }

    startATrade(targetUI) {
        this.#UI.trade = new TradeUI(Level.PLAYER, targetUI)
    }

    noUiIsOpening() {
        return this.#UI.chest == null && this.#UI.trade == null && !this.#UI.inventory.isOpening
    }

    closeChest() {
        this.#UI.chest = null
    }

    update() {
        // Handle Mapping UI terlebih dahulu (priority)
        if (MappingUI.isOpen) {
            MappingUIInstance.update();
            return;
        }

        if (UserInterfaces.displayTitle === true) return

        // Tombol Start untuk buka mapping saat di game
        if (typeof GamepadController !== 'undefined' && GamepadController.isJustPressed('btnStart')) {
            if (this.noUiIsOpening()) {
                MappingUI.open();
                return;
            }
        }
        // Mencegah input bertumpuk dan mendeteksi penekanan tombol Toggle (Y atau I)
        const toggleInventoryPressed = Controller.keys["KeyI"];

        if (toggleInventoryPressed) {
            if (this.#UI.inventory.isOpening) {
                // Jika sedang buka, maka tutup
                this.#UI.inventory.closeUI();
                this.#CURRENT = this.#UI.itemBar;
            } else {
                // Jika sedang tutup, maka buka
                this.#CURRENT = this.#UI.inventory;
                this.#UI.inventory.isOpening = true;
                this.#UI.inventory.setFocus(false);
            }
            // KUNCI INPUT AGAR TIDAK FLICKER (STROBO)
            Controller.keys["KeyI"] = false;
        }

        if (this.#UI.chest != null) {
            this.#CURRENT = this.#UI.chest
        } else if (this.#UI.trade != null) {
            if (this.#UI.trade.isOpening) {
                this.#CURRENT = this.#UI.trade
            } else {
                this.#UI.trade = null
            }
        } else if (!this.#UI.inventory.isOpening) {
            this.#CURRENT = this.#UI.itemBar
        }
    }

    draw(ctx) {
        if (MappingUI.isOpen) {
            MappingUIInstance.draw(ctx);
            return;
        }

        if (UserInterfaces.displayTitle === true) {

            const _width = ctx.canvas.width * 0.8
            const _height = ctx.canvas.height * 0.2
            ctx.drawImage(ASSET_MANAGER.getImage("ui", "title.png"), (ctx.canvas.width - _width) / 2, ctx.canvas.height * 0.2, _width, _height)

            // Tombol Start
            const startBtnFontSize = ctx.canvas.height * 0.05;
            if ((MessageButton.draw(ctx, "Mulai", startBtnFontSize, ctx.canvas.width * 0.425, ctx.canvas.height * 0.55) && !Controller.mouse_prev.leftClick && Controller.mouse.leftClick) || (typeof GamepadController !== 'undefined' && GamepadController.isJustPressed('btnA'))) {
                Transition.start(() => {
                    GAME_ENGINE.enterLevel("farm")
                    Level.PLAYER.setMapReference(GAME_ENGINE.getCurrentLevel())
                    GAME_ENGINE.getCurrentLevel().goToSpawn()
                    UserInterfaces.displayTitle = false
                })
            }

            // Tombol Setting Mapping
            const mappingBtnFontSize = ctx.canvas.height * 0.035;
            const mappingBtnX = ctx.canvas.width * 0.39;
            const mappingBtnY = ctx.canvas.height * 0.66;
            if (MessageButton.draw(ctx, "Pengaturan Tombol", mappingBtnFontSize, mappingBtnX, mappingBtnY)) {
                if ((!Controller.mouse_prev.leftClick && Controller.mouse.leftClick) || (typeof GamepadController !== 'undefined' && GamepadController.isJustPressed('btnB'))) {
                    MappingUI.open();
                }
            }
        } else {
            this.#CURRENT.draw(ctx)
            this.#drawControlsLegend(ctx)
        }
    }

    #drawControlsLegend(ctx) {
        const padding = 20
        const itemHeight = 22
        const boxWidth = 230
        const boxHeight = 110
        const x = ctx.canvas.width - boxWidth - padding
        const y = padding

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.fillRect(x, y, boxWidth, boxHeight)
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, boxWidth, boxHeight)

        ctx.fillStyle = 'white'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'

        const controls = [
            { btn: "[A]", action: "Menyiram / Ambil Item" },
            { btn: "[B]", action: "Tanam / Panen / Batal" },
            { btn: "[R1]", action: "Cangkul Tanah Baru" },
            { btn: "[Y/Segitiga]", action: "Buka Tas (Penyimpanan)" }
        ]

        controls.forEach((c, i) => {
            const rowY = y + 18 + (i * itemHeight)
            ctx.fillStyle = '#fbc531'
            ctx.font = 'bold 13px Arial'
            ctx.fillText(c.btn, x + 15, rowY)

            ctx.fillStyle = 'white'
            ctx.font = '13px Arial'
            ctx.fillText(c.action, x + 95, rowY)
        })
    }
}