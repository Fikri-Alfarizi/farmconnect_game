class ChestUI extends InventoryUI {

    #chestContainer
    #currentChestPage = 0
    #chestRef

    // Gamepad State
    #cursorIndex = 0
    #lastGamepadInputTime = 0
    #isFocused = true
    #frameStarted = -1

    constructor(characterRef, chestRef = new Chest(10, 10, GAME_ENGINE.getCurrentLevel())) {
        super(characterRef, "./ui/chest.json")
        this.BLOCK_X_OFFSET = -4
        this.ROWS_PER_PAGE = 3
        this.#chestRef = chestRef
        this.#chestContainer = new GameObjectsMapContainer(this.#chestRef.getInventory())
        this.#frameStarted = GAME_ENGINE.timer.frameCount || 0;
    }

    moveStuffBetweenContainers(currentIndex, key) {
        if (currentIndex >= 0) {
            if (currentIndex < ItemBarUI.ITEMS_PER_ROW) Level.PLAYER.putItemFromItemBarIntoTargetInventory(key, this.#chestRef, Controller.keys["AltLeft"] ? null : 1)
            else Level.PLAYER.putItemFromInventoryIntoTargetInventory(key, this.#chestRef, Controller.keys["AltLeft"] ? null : 1)
        } else {
            Level.PLAYER.takeItemOutOfTargetInventory(key, this.#chestRef, Controller.keys["AltLeft"] ? null : 1)
        }
    }

    closeUI() {
        GAME_ENGINE.getPlayerUi().closeChest()
    }

    // Gamepad Logic specific to Chest
    #handleChestGamepad(itemCount, startIndex, padding, tileSizeWidth, tileSizeHeight, pixelYStart) {
        const now = Date.now()

        // Cek tombol Select untuk pindah fokus
        if (typeof GamepadController !== 'undefined' && GamepadController.isJustPressed('btnSelect')) {
            this.#isFocused = !this.#isFocused;
            // Jika #isFocused true, maka kita fokus ke Peti. 
            // Maka InventoryUI (parent) harus TIDAK fokus.
            super.setFocus(!this.#isFocused);
            this.#lastGamepadInputTime = now;
            return;
        }

        if (!this.#isFocused) {
            // Jika sedang fokus ke Inventory (bawah)
            super.handleInventoryGamepad();
            return;
        }

        if (now - this.#lastGamepadInputTime < 150) return

        const cols = ItemBarUI.ITEMS_PER_ROW
        const rows = this.ROWS_PER_PAGE
        const maxIndex = (cols * rows) - 1

        let actionTaken = false

        // Close with B
        if (GamepadController.isJustPressed('btnB')) {
            this.closeUI()
            this.#lastGamepadInputTime = now
            return
        }

        // Navigate
        if (GamepadController.isPressed('dpadL')) {
            if (this.#cursorIndex % cols !== 0) this.#cursorIndex--
            else this.#cursorIndex = Math.min(this.#cursorIndex + cols - 1, maxIndex)
            actionTaken = true
        } else if (GamepadController.isPressed('dpadR')) {
            if (this.#cursorIndex % cols !== cols - 1) this.#cursorIndex = Math.min(this.#cursorIndex + 1, maxIndex)
            else this.#cursorIndex -= (cols - 1)
            actionTaken = true
        } else if (GamepadController.isPressed('dpadU')) {
            if (this.#cursorIndex >= cols) this.#cursorIndex -= cols
            actionTaken = true
        } else if (GamepadController.isPressed('dpadD')) {
            if (this.#cursorIndex + cols <= maxIndex) this.#cursorIndex += cols
            actionTaken = true
        }

        // Select/Grab/Place with A
        if (GamepadController.isJustPressed('btnA') && GAME_ENGINE.timer.frameCount !== this.#frameStarted) {
            const chestInventory = this.#chestRef.getInventory();
            const chestKeys = Object.keys(chestInventory);
            const keyAtSlot = this.#cursorIndex < chestKeys.length ? chestKeys[this.#cursorIndex] : null;

            if (typeof InventoryUI !== 'undefined') {
                if (InventoryUI.heldItem == null) {
                    // Pick up from chest
                    if (keyAtSlot != null) {
                        const itemData = chestInventory[keyAtSlot];
                        InventoryUI.heldItem = { key: keyAtSlot, amount: itemData.amount };
                        delete chestInventory[keyAtSlot];
                    }
                } else {
                    // Place or Swap in chest
                    if (keyAtSlot == null) {
                        chestInventory[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                        InventoryUI.heldItem = null;
                    } else if (keyAtSlot === InventoryUI.heldItem.key) {
                        chestInventory[keyAtSlot].amount += InventoryUI.heldItem.amount;
                        InventoryUI.heldItem = null;
                    } else {
                        const targetData = { ...chestInventory[keyAtSlot] };
                        const targetKey = keyAtSlot;
                        chestInventory[InventoryUI.heldItem.key] = { amount: InventoryUI.heldItem.amount };
                        if (targetKey !== InventoryUI.heldItem.key) delete chestInventory[targetKey];
                        InventoryUI.heldItem = { key: targetKey, amount: targetData.amount };
                    }
                }
            }
            actionTaken = true
        }

        if (actionTaken) {
            this.#lastGamepadInputTime = now
        }
    }

    draw(ctx) {
        super.drawInventory(ctx)
        const padding = this.getPadding()
        const chestInventory = this.#chestRef.getInventory();
        const inventoryKeys = Object.keys(chestInventory);

        this.getBackpackTiledStaticImage().setPixelBottom(this.getBackpackTiledStaticImage().getPixelY())
        this.getBackpackTiledStaticImage().setPixelBottom(ItemBarUI.getItemsBarTiledStaticImage().getPixelY() - padding * 2)

        const ITEM_PER_PAGE = ItemBarUI.ITEMS_PER_ROW * this.ROWS_PER_PAGE
        const MAX_NUM_OF_PAGES = Math.ceil(inventoryKeys.length / ITEM_PER_PAGE)

        // Handle Gamepad Input
        this.#handleChestGamepad(inventoryKeys.length, 0, padding,
            this.getBackpackTiledStaticImage().getTileWidth(),
            this.getBackpackTiledStaticImage().getTileHeight(),
            this.getBackpackTiledStaticImage().getPixelY()
        )

        if (MAX_NUM_OF_PAGES > 1) {
            this.getBackpackTiledStaticImage().draw(ctx)
            if (!Controller.mouse_prev.leftClick && Controller.mouse.leftClick) {
                if (this.getBackpackTiledStaticImage().isTilesHovered(47, 48, 14, 15)) {
                    this.#currentChestPage = Math.max(this.#currentChestPage - 1, 0)
                } else if (this.getBackpackTiledStaticImage().isTilesHovered(47, 48, 18, 19)) {
                    this.#currentChestPage += 1
                }
            }
        } else {
            this.getBackpackTiledStaticImage().drawTiles(ctx, null, null, null, null, 2)
        }

        this.#currentChestPage = Math.min(this.#currentChestPage, MAX_NUM_OF_PAGES)

        const cols = ItemBarUI.ITEMS_PER_ROW;
        const rows = this.ROWS_PER_PAGE;

        for (let i = 0; i < (cols * rows); i++) {
            const _pixelX = Math.floor(this.getPixelX() + (i % cols) * 5 * this.getBackpackTiledStaticImage().getTileWidth() + padding)
            const _pixelY = Math.floor(this.getBackpackTiledStaticImage().getPixelY() + padding + 5 * this.getBackpackTiledStaticImage().getTileHeight() * (Math.floor(i / cols) % rows))

            // Logika render kursor gamepad
            if (this.#isFocused && i === this.#cursorIndex) {
                ctx.strokeStyle = 'yellow'
                ctx.lineWidth = 3
                ctx.strokeRect(_pixelX, _pixelY, this.getBoxSize(), this.getBoxSize())
            }

            if (i < inventoryKeys.length) {
                const key = inventoryKeys[i]
                this.drawItem(ctx, key, chestInventory[key], -1 - i, _pixelX, _pixelY, this.getBoxSize(), this.getBoxSize())
            } else {
                this.drawItem(ctx, null, null, -1 - i, _pixelX, _pixelY, this.getBoxSize(), this.getBoxSize())
            }
        }

        GAME_ENGINE.ctx.drawImage(
            ASSET_MANAGER.getImage("items", "spring_and_summer_objects.png"),
            160, 176, 16, 16,
            this.getBackpackTiledStaticImage().getPixelX() + this.getBackpackTiledStaticImage().getTileWidth() * 1.05, this.getBackpackTiledStaticImage().getPixelY() + this.getBackpackTiledStaticImage().getTileHeight() * 6.75,
            this.getBackpackTiledStaticImage().getTileWidth() * 3, this.getBackpackTiledStaticImage().getTileHeight() * 3
        )

        GAME_ENGINE.ctx.drawImage(
            ASSET_MANAGER.getImage("portrait_cow_kigurumi.png"),
            this.getBackpackTiledStaticImage().getPixelX() + this.getBackpackTiledStaticImage().getTileWidth() * 1.1, this.getBackpackTiledStaticImage().getPixelY() + this.getBackpackTiledStaticImage().getTileHeight() * 24.25,
            this.getBackpackTiledStaticImage().getTileWidth() * 2.5, this.getBackpackTiledStaticImage().getTileHeight() * 2.5
        )

        this.drawInfo(ctx)

        // Render held item if focused here
        if (typeof InventoryUI !== 'undefined' && InventoryUI.heldItem != null && this.#isFocused) {
            const size = this.getBoxSize() / 2;
            const i = this.#cursorIndex;
            const drawX = Math.floor(this.getPixelX() + (i % cols) * 5 * this.getBackpackTiledStaticImage().getTileWidth() + padding + size / 2);
            const drawY = Math.floor(this.getBackpackTiledStaticImage().getPixelY() + padding + 5 * this.getBackpackTiledStaticImage().getTileHeight() * (Math.floor(i / cols) % rows) + size / 2);
            InventoryItems.drawImage(ctx, InventoryUI.heldItem.key, drawX, drawY, size, size);
        }
    }
}