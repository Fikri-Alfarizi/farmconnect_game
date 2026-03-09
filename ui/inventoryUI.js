class InventoryUI extends ItemBarUI {
    #backpackTiledStaticImage = null
    ROWS_PER_PAGE = 6
    #currentInventoryPage = 0
    #inventoryContainer

    // Gamepad State Khusus Inventory
    #gridCursor = 0;       // Posisi kursor di kotak atas
    #hotbarCursor = 0;     // Posisi kursor di kotak bawah
    #isFocusOnHotbar = false; // Penanda apakah kursor sedang ada di atas atau di bawah
    #lastGamepadInputTime = 0;

    static heldItem = null // { key, amount }

    constructor(characterRef, backpackTiledStaticImagePath = null) {
        super(characterRef)
        this.#inventoryContainer = new GameObjectsMapContainer(characterRef.getInventory())
        this.BLOCK_X_OFFSET = 0
        if (this.#backpackTiledStaticImage == null) this.#backpackTiledStaticImage = new TiledStaticImage(backpackTiledStaticImagePath == null ? "./ui/backpack.json" : backpackTiledStaticImagePath)
        this.isOpening = false
    }

    closeUI() {
        if (InventoryUI.heldItem != null) {
            // Return held item to player inventory instead of losing it
            this.characterRef.obtainItem(InventoryUI.heldItem.key, InventoryUI.heldItem.amount);
            InventoryUI.heldItem = null;
        }
        this.isOpening = false
        this.setFocus(true) // Kembalikan kontrol ke Hotbar normal saat ditutup
    }

    getBackpackTiledStaticImage() {
        return this.#backpackTiledStaticImage;
    }

    handleInventoryGamepad() {
        const cols = ItemBarUI.ITEMS_PER_ROW;
        const rows = this.ROWS_PER_PAGE;
        const maxGridIndex = (cols * rows) - 1;

        // Tombol B untuk menutup inventory
        if (GamepadController.isJustPressed('btnB')) {
            if (InventoryUI.heldItem != null) {
                // Opsional: Batal pegang barang
            } else {
                this.closeUI();
                return;
            }
        }

        // --- NAVIGASI D-PAD PINTAR (Menggunakan isJustPressed) ---
        const dpadLeft = GamepadController.isJustPressed('dpadL');
        const dpadRight = GamepadController.isJustPressed('dpadR');
        const dpadUp = GamepadController.isJustPressed('dpadU');
        const dpadDown = GamepadController.isJustPressed('dpadD');

        if (this.#isFocusOnHotbar) {
            // Jika Kursor sedang di Hotbar (Bawah)
            if (dpadLeft) {
                this.#hotbarCursor = Math.max(0, this.#hotbarCursor - 1);
            } else if (dpadRight) {
                this.#hotbarCursor = Math.min(cols - 1, this.#hotbarCursor + 1);
            } else if (dpadUp) {
                // Lompat Naik ke Inventory
                this.#isFocusOnHotbar = false;
                this.#gridCursor = (rows - 1) * cols + this.#hotbarCursor;
            }
        } else {
            // Jika Kursor sedang di Inventory (Atas)
            if (dpadLeft) {
                if (this.#gridCursor % cols !== 0) this.#gridCursor--;
            } else if (dpadRight) {
                if (this.#gridCursor % cols !== cols - 1) this.#gridCursor++;
            } else if (dpadUp) {
                if (this.#gridCursor >= cols) this.#gridCursor -= cols;
            } else if (dpadDown) {
                if (this.#gridCursor + cols <= maxGridIndex) {
                    this.#gridCursor += cols; // Turun sebaris
                } else {
                    // Lompat Turun ke Hotbar
                    this.#isFocusOnHotbar = true;
                    this.#hotbarCursor = this.#gridCursor % cols;
                }
            }
        }

        // --- TOMBOL A (Ambil / Taruh / Tukar) ---
        if (GamepadController.isJustPressed('btnA')) {
            const inventory = Level.PLAYER.getInventory();
            const itemBar = Level.PLAYER.getItemBar();
            const inventoryKeys = Object.keys(inventory);
            const itemBarKeys = Object.keys(itemBar);

            let targetContainer = this.#isFocusOnHotbar ? itemBar : inventory;
            let targetKeys = this.#isFocusOnHotbar ? itemBarKeys : inventoryKeys;
            let cursorObj = this.#isFocusOnHotbar ? this.#hotbarCursor : this.#gridCursor;

            const keyAtSlot = cursorObj < targetKeys.length ? targetKeys[cursorObj] : null;

            if (InventoryUI.heldItem == null) {
                // AMBIL BARANG (Pick Up)
                if (keyAtSlot != null) {
                    InventoryUI.heldItem = { key: keyAtSlot, amount: targetContainer[keyAtSlot].amount };
                    delete targetContainer[keyAtSlot];
                }
            } else {
                // TARUH / TUKAR BARANG (Place / Swap)
                if (keyAtSlot == null) {
                    targetContainer[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                    InventoryUI.heldItem = null;
                } else if (keyAtSlot === InventoryUI.heldItem.key) {
                    targetContainer[keyAtSlot].amount += InventoryUI.heldItem.amount;
                    InventoryUI.heldItem = null;
                } else {
                    const targetData = { ...targetContainer[keyAtSlot] };
                    const targetKey = keyAtSlot;
                    targetContainer[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                    if (targetKey !== InventoryUI.heldItem.key) delete targetContainer[targetKey];
                    InventoryUI.heldItem = { key: targetKey, amount: targetData.amount };
                }
            }
        }
    }

    drawInventory(ctx) {
        // Kontrol gamepad bawaan Hotbar dimatikan saat UI dibuka/ditutup (lihat UserInterfaces/ItemBarUI)
        this.drawItemBar(ctx);

        const padding = this.getPadding()
        const inventory = Level.PLAYER.getInventory();
        const inventoryKeys = Object.keys(inventory);

        this.#backpackTiledStaticImage.setTileWidth(ItemBarUI.getItemsBarTiledStaticImage().getTileWidth())
        this.#backpackTiledStaticImage.setTileHeight(ItemBarUI.getItemsBarTiledStaticImage().getTileHeight())
        this.#backpackTiledStaticImage.setPixelX(this.getPixelX() + ItemBarUI.getItemsBarTiledStaticImage().getTileWidth() * this.BLOCK_X_OFFSET)
        this.#backpackTiledStaticImage.setPixelBottom(ItemBarUI.getItemsBarTiledStaticImage().getPixelY() - padding * 2)

        // Panggil Logika Gamepad Khusus Inventory
        if (Controller.isGamepadActive) {
            this.handleInventoryGamepad();
        }

        this.#backpackTiledStaticImage.drawTiles(ctx, null, null, null, null, 2)

        const cols = ItemBarUI.ITEMS_PER_ROW;
        const rows = this.ROWS_PER_PAGE;

        // Gambar Kotak-kotak di Inventory Atas
        for (let i = 0; i < (cols * rows); i++) {
            const _pixelX = Math.floor(this.getPixelX() + (i % cols) * 5 * this.#backpackTiledStaticImage.getTileWidth() + padding)
            const _pixelY = Math.floor(this.#backpackTiledStaticImage.getPixelY() + padding + 5 * this.#backpackTiledStaticImage.getTileHeight() * (Math.floor(i / cols) % rows))

            // Kursor Gamepad untuk Inventory Atas
            if (Controller.isGamepadActive && !this.#isFocusOnHotbar && i === this.#gridCursor) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                ctx.strokeRect(_pixelX, _pixelY, this.getBoxSize(), this.getBoxSize());

                // Track gamepad hover for tooltip
                const key = i < inventoryKeys.length ? inventoryKeys[i] : null;
                const value = key ? inventory[key] : null;
                this._latestHovered = { key, value, _pixelX: _pixelX + this.getBoxSize() / 2, _pixelY: _pixelY - this.getBoxSize() / 2 };
            }

            if (i < inventoryKeys.length) {
                const key = inventoryKeys[i]
                this.drawItem(ctx, key, inventory[key], i + cols, _pixelX, _pixelY, this.getBoxSize(), this.getBoxSize())
            } else {
                this.drawItem(ctx, null, null, i + cols, _pixelX, _pixelY, this.getBoxSize(), this.getBoxSize())
            }
        }

        // Kursor Gamepad untuk Hotbar Bawah (saat Inventory terbuka)
        if (Controller.isGamepadActive && this.#isFocusOnHotbar) {
            const _pixelX = Math.floor(this.getPixelX() + this.#hotbarCursor * 5 * ItemBarUI.getItemsBarTiledStaticImage().getTileWidth() + padding);
            const _pixelY = Math.floor(this.getPixelY() + padding);
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.strokeRect(_pixelX, _pixelY, this.getBoxSize(), this.getBoxSize());

            // Track gamepad hover for tooltip
            const itemBarKeys = this.keys();
            const key = this.#hotbarCursor < itemBarKeys.length ? itemBarKeys[this.#hotbarCursor] : null;
            const value = key ? this.get(key) : null;
            this._latestHovered = { key, value, _pixelX: _pixelX + this.getBoxSize() / 2, _pixelY: _pixelY - this.getBoxSize() / 2 };
        }

        // Tombol Close Mouse
        const _fontSize = Level.PLAYER.getMapReference().getTileSize() / 2
        if (MessageButton.draw(GAME_ENGINE.ctx, "Tutup", _fontSize, GAME_ENGINE.ctx.canvas.width * 0.85, GAME_ENGINE.ctx.canvas.height * 0.7)) {
            if (!Controller.mouse_prev.leftClick && Controller.mouse.leftClick) {
                this.closeUI()
            }
        }
    }

    draw(ctx) {
        this.drawInventory(ctx)

        // Menggambar Barang yang Sedang Dipegang (Melayang mengikuti kursor)
        if (InventoryUI.heldItem != null) {
            const size = this.getBoxSize() / 2;
            let drawX, drawY;

            if (Controller.isGamepadActive) {
                const padding = this.getPadding();
                const cols = ItemBarUI.ITEMS_PER_ROW;
                const rows = this.ROWS_PER_PAGE;

                if (!this.#isFocusOnHotbar) {
                    const i = this.#gridCursor;
                    drawX = Math.floor(this.getPixelX() + (i % cols) * 5 * this.#backpackTiledStaticImage.getTileWidth() + padding + size / 2);
                    drawY = Math.floor(this.#backpackTiledStaticImage.getPixelY() + padding + 5 * this.#backpackTiledStaticImage.getTileHeight() * (Math.floor(i / cols) % rows) + size / 2);
                } else {
                    drawX = Math.floor(this.getPixelX() + this.#hotbarCursor * 5 * ItemBarUI.getItemsBarTiledStaticImage().getTileWidth() + padding + size / 2);
                    drawY = Math.floor(this.getPixelY() + padding + size / 2);
                }
            } else {
                drawX = Controller.mouse.x;
                drawY = Controller.mouse.y;
            }
            InventoryItems.drawImage(ctx, InventoryUI.heldItem.key, drawX, drawY, size, size);
        }
    }
}