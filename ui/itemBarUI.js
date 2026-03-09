class ItemBarUI extends GameObjectsMapContainer {

    static #itemsBarTiledStaticImage = null

    static ITEMS_PER_ROW = 9

    #boxSize

    #selected

    _latestHovered

    // Gamepad State
    #isNavigatingHotbar = false
    #lastGamepadInputTime = 0
    #isFocused = true
    #showGamepadTooltip = false

    constructor(characterRef) {
        super(characterRef.getItemBar())
        this.characterRef = characterRef
        this.#boxSize = Math.floor(GAME_ENGINE.ctx.canvas.width / 20)
        this.#selected = 0
        this._latestHovered = null
        if (ItemBarUI.#itemsBarTiledStaticImage == null) ItemBarUI.#itemsBarTiledStaticImage = new TiledStaticImage("./ui/itemsBar.json")
    }

    static getItemsBarTiledStaticImage() {
        return this.#itemsBarTiledStaticImage
    }

    noContainerIsHovering() {
        return !Dialogues.isAnyDialoguePlaying() && !ItemBarUI.#itemsBarTiledStaticImage.isHovering()
    }

    getPadding() {
        return Math.floor(this.#boxSize / 2)
    }

    getBoxSize() {
        return this.#boxSize
    }

    setFocus(focused) {
        this.#isFocused = focused;
    }

    isFocused() {
        return this.#isFocused;
    }

    getSelected() {
        return this.#selected;
    }

    drawTool(ctx, key, pixelX, pixelY, width, height, toolLevel = 0) {
        const boxWidth = this.#boxSize * 1.75
        const boxHeight = this.#boxSize * 1.75
        const boxStartX = pixelX + (width - boxWidth) / 2
        const boxStartY = pixelY + (height - boxHeight) / 2
        GUI.draw(ctx, 9, 0, 3, 3, boxStartX, boxStartY, boxWidth, boxHeight)
        InventoryItems.drawImage(ctx, key, pixelX, pixelY, width, height, toolLevel)
    }

    drawTools(ctx) {
        const size = Math.floor(this.#boxSize * 2 / 3)
        this.drawTool(ctx, "pot", size, size, size, size, 1)
        this.drawTool(ctx, "axe", size + this.#boxSize * 3 / 2, size, size, size, 1)
        this.drawTool(ctx, "hoe", size + this.#boxSize * 3, size, size, size, 1)
    }

    caseItemBeingHovered(currentIndex, key) {
        if (Controller.mouse.leftClick) {
            this.#selected = currentIndex
            return true
        }
        return false;
    }

    // Helper untuk mengecek input gamepad dengan cooldown (agar tidak terlalu cepat)
    #handleGamepadInput() {
        if (!this.#isFocused) return;

        const now = Date.now()
        if (now - this.#lastGamepadInputTime < 150) return // Delay 150ms antar input

        let inputProcessed = false

        // Tombol B untuk keluar dari navigasi Hotbar
        if (GamepadController.isJustPressed('btnB')) {
            if (this.#isNavigatingHotbar) {
                this.#isNavigatingHotbar = false
                this.#selected = -1 // Opsional: Deselect saat keluar
                inputProcessed = true
            }
        }

        // Pengecekan pergerakan analog untuk menyembunyikan tooltip
        if (Math.abs(GamepadController.getAxis('moveX')) > 0 || Math.abs(GamepadController.getAxis('moveY')) > 0) {
            this.#showGamepadTooltip = false;
        }

        // Navigasi D-Pad
        if (GamepadController.isPressed('dpadL')) {
            this.#selected = Math.max(0, this.#selected - 1)
            this.#showGamepadTooltip = true;
            inputProcessed = true
        } else if (GamepadController.isPressed('dpadR')) {
            this.#selected = Math.min(ItemBarUI.ITEMS_PER_ROW - 1, this.#selected + 1)
            this.#showGamepadTooltip = true;
            inputProcessed = true
        }

        // Tombol A untuk memilih item atau Place/Swap
        if (GamepadController.isJustPressed('btnA')) {
            const itemBarKeys = this.keys();
            const keyAtSlot = this.#selected < itemBarKeys.length ? itemBarKeys[this.#selected] : null;

            if (typeof InventoryUI !== 'undefined' && InventoryUI.heldItem != null) {
                // Place or Swap logic for ItemBar
                const itemBar = Level.PLAYER.getItemBar();
                if (keyAtSlot == null) {
                    itemBar[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                    InventoryUI.heldItem = null;
                } else if (keyAtSlot === InventoryUI.heldItem.key) {
                    itemBar[keyAtSlot].amount += InventoryUI.heldItem.amount;
                    InventoryUI.heldItem = null;
                } else {
                    const targetData = { ...itemBar[keyAtSlot] };
                    const targetKey = keyAtSlot;
                    itemBar[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                    if (targetKey !== InventoryUI.heldItem.key) delete itemBar[targetKey];
                    InventoryUI.heldItem = { key: targetKey, amount: targetData.amount };
                }
            } else {
                // Logic planting sudah ada di drawItem, tapi kita bisa trigger aksi lain di sini jika perlu
            }
            inputProcessed = true
        }

        if (inputProcessed) {
            this.#lastGamepadInputTime = now
        }
    }

    drawItem(ctx, key, value, index, pixelX, pixelY, width, height) {
        if (key != null) InventoryItems.drawImage(ctx, key, pixelX, pixelY, width, height)

        // Highlight item jika dipilih (Mouse atau Gamepad)
        if (this.#selected === index) {
            if (this.#isFocused) {
                GUI.draw(ctx, 15, 0, 2, 2, pixelX - this.#boxSize * 0.35, pixelY - this.#boxSize * 0.35, this.#boxSize * 1.75, this.#boxSize * 1.75)
            } else {
                ctx.globalAlpha = 0.5;
                GUI.draw(ctx, 15, 0, 2, 2, pixelX - this.#boxSize * 0.35, pixelY - this.#boxSize * 0.35, this.#boxSize * 1.75, this.#boxSize * 1.75)
                ctx.globalAlpha = 1;
            }

            if (key != null && InventoryItems.isUsable(key) && this.noContainerIsHovering()) {
                if (GAME_ENGINE.getCurrentLevel() instanceof FarmLevel && Level.PLAYER.notDisablePlayerController()) {
                    // Cek koordinat target (Mouse ATAU Gamepad)
                    let onBlock;
                    if (Controller.isGamepadActive) {
                        onBlock = Level.PLAYER.getTargetBlock();
                    } else {
                        onBlock = GAME_ENGINE.getCurrentLevel().getCoordinate(Controller.mouse.x, Controller.mouse.y, GAME_ENGINE.getCurrentLevel().getTileSize())
                    }

                    if (onBlock != null) {
                        if (GAME_ENGINE.getCurrentLevel().canPlantOnTile(onBlock[0], onBlock[1])) {
                            ctx.fillStyle = 'rgba(127,255,0,0.5)';
                            // Cek klik kiri mouse ATAU tombol Tanam (R/btnB) ATAU L1/trigL
                            if (((Controller.mouse.leftClick) || (Controller.keys["KeyR"] && !Controller.keys_prev["KeyR"]) || GamepadController.isJustPressed('trigL')) && Level.PLAYER.tryUseItem(key)) {
                                GAME_ENGINE.getCurrentLevel().addEntity(new Crop(key.replace('_seed', ''), onBlock[0], onBlock[1], GAME_ENGINE.getCurrentLevel()))
                            }
                        } else {
                            ctx.fillStyle = 'rgba(255,0,0,0.5)';
                        }
                        ctx.fillRect(
                            GAME_ENGINE.getCurrentLevel().getTileSize() * onBlock[0] + GAME_ENGINE.getCurrentLevel().getPixelX(),
                            GAME_ENGINE.getCurrentLevel().getTileSize() * onBlock[1] + GAME_ENGINE.getCurrentLevel().getPixelY(),
                            GAME_ENGINE.getCurrentLevel().getTileSize(), GAME_ENGINE.getCurrentLevel().getTileSize()
                        );
                        ctx.globalAlpha = 1;
                    }
                }
                // Jika sedang tidak hold mouse, tampilkan icon (di kursor mouse atau di atas target tile)
                if (Controller.isGamepadActive) {
                    const targetBlock = Level.PLAYER.getTargetBlock();
                    const targetPixelX = (targetBlock[0] + 0.25) * GAME_ENGINE.getCurrentLevel().getTileSize() + GAME_ENGINE.getCurrentLevel().getPixelX();
                    const targetPixelY = (targetBlock[1] - 0.5) * GAME_ENGINE.getCurrentLevel().getTileSize() + GAME_ENGINE.getCurrentLevel().getPixelY();
                    InventoryItems.drawImage(ctx, key, targetPixelX, targetPixelY, width / 2, height / 2)
                } else {
                    InventoryItems.drawImage(ctx, key, Controller.mouse.x, Controller.mouse.y, width / 2, height / 2)
                }
            }
        }

        // Mouse Hover Logic
        if (pixelX <= Controller.mouse.x && Controller.mouse.x <= pixelX + this.#boxSize && pixelY <= Controller.mouse.y && Controller.mouse.y <= pixelY + this.#boxSize) {
            this._latestHovered = { key, value, _pixelX: Controller.mouse.x, _pixelY: Controller.mouse.y }
            this.caseItemBeingHovered(index, key)
        }

        // Jika sedang navigasi (always active now), update hovered info agar tooltip muncul (Hanya jika Gamepad)
        if (Controller.isGamepadActive && this.#selected === index && this.#showGamepadTooltip) {
            this._latestHovered = { key, value, _pixelX: pixelX + this.#boxSize / 2, _pixelY: pixelY - this.#boxSize / 2 }
        }

        if (value != null && value.amount > 1) {
            Font.update(ctx, Math.ceil(ItemBarUI.#itemsBarTiledStaticImage.getTileHeight() * 1.75))
            Font.render(ctx, value.amount, pixelX + this.#boxSize - ctx.measureText(value.amount).width, pixelY + this.#boxSize)
        }
    }

    drawInfo(ctx) {
        if (this._latestHovered != null && this._latestHovered.value != null) {
            const itemPrice = InventoryItems.PRICES[this._latestHovered.key] != null ? InventoryItems.PRICES[this._latestHovered.key] : 0
            MessageBox.drawLines(
                ctx,
                [
                    `${InventoryItems.NAMES[this._latestHovered.key] != null ? InventoryItems.NAMES[this._latestHovered.key] : "?"}:`,
                    `- Jumlah: ${this._latestHovered.value.amount}`,
                    `- Harga Jual: ${itemPrice}`,
                    `- Total Harga: ${itemPrice * this._latestHovered.value.amount}`
                ],
                Math.ceil(ItemBarUI.#itemsBarTiledStaticImage.getTileHeight() * 1.75),
                this._latestHovered._pixelX, this._latestHovered._pixelY,
                undefined, undefined, undefined, 0.5
            )
        }
    }

    drawItemBar(ctx) {
        // Robust gamepad detection: force active if any button pressed
        if (typeof GamepadController !== 'undefined' && GamepadController.isAnyButtonPressed()) {
            Controller.isGamepadActive = true;
        }
        super.draw(ctx)

        // Handle Gamepad Input untuk Hotbar
        this.#handleGamepadInput()

        this.drawTools(ctx)
        const itemBarKeys = this.keys()
        const padding = this.getPadding()

        this.setWidth((this.#boxSize + padding) * ItemBarUI.ITEMS_PER_ROW + padding)
        this.setHeight(this.#boxSize + padding * 2)

        this.setPixelY(ctx.canvas.height - padding - this.getHeight())
        this.setPixelX((ctx.canvas.width - this.getWidth()) / 2)

        ItemBarUI.#itemsBarTiledStaticImage.setPixelX(this.getPixelX())
        ItemBarUI.#itemsBarTiledStaticImage.setPixelY(this.getPixelY())
        ItemBarUI.#itemsBarTiledStaticImage.setWidth(this.getWidth())
        ItemBarUI.#itemsBarTiledStaticImage.setHeight(this.getHeight())
        ItemBarUI.#itemsBarTiledStaticImage.draw(ctx)

        const _pixelY = Math.floor(this.getPixelY() + padding)
        this._latestHovered = null

        for (let i = 0; i < ItemBarUI.ITEMS_PER_ROW; i++) {
            const _pixelX = Math.floor(this.getPixelX() + i * 5 * ItemBarUI.#itemsBarTiledStaticImage.getTileWidth() + padding)
            if (i < itemBarKeys.length) {
                const key = itemBarKeys[i]
                this.drawItem(ctx, key, this.get(key), i, _pixelX, _pixelY, this.#boxSize, this.#boxSize)
            } else {
                this.drawItem(ctx, null, null, i, _pixelX, _pixelY, this.#boxSize, this.#boxSize)
            }
        }

        // Minecraft hotbar usually doesn't deselect with Escape, but we can leave it for keyboard/mouse
        if (Controller.keys["Escape"] && !Controller.isGamepadActive) {
            this.#selected = 0
        }
    }

    draw(ctx) {
        this.drawItemBar(ctx)
        this.drawInfo(ctx)

        // Render held item if focused here
        if (typeof InventoryUI !== 'undefined' && InventoryUI.heldItem != null && this.#isFocused) {
            const size = this.#boxSize / 2;
            const padding = this.getPadding();
            const i = this.#selected;
            if (i >= 0) {
                const drawX = Math.floor(this.getPixelX() + i * 5 * ItemBarUI.#itemsBarTiledStaticImage.getTileWidth() + padding + size / 2);
                const drawY = Math.floor(this.getPixelY() + padding + size / 2);
                InventoryItems.drawImage(ctx, InventoryUI.heldItem.key, drawX, drawY, size, size);
            }
        }
    }
}