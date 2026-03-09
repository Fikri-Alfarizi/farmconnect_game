class Player extends Character {
    // whether the player is in idle or not
    #isIdle
    #itemBar

    constructor(name, x, y, mapRef) {
        super(name, "player", x, y, mapRef)
        this.setMovingSpeedX(5)
        this.setMovingSpeedY(5)
        this.setSize(this.getMapReference().getTileSize() * 1.5, this.getMapReference().getTileSize() * 1.5)
        this.#isIdle = true
        this.ishidden = false
        this.#itemBar = {}
    }

    getItemBar() {
        return this.#itemBar
    }

    obtainItem(key, num = 1) {
        if (super.hasItemInInventory(key)) {
            super.obtainItem(key, num)
        } else if (this.#itemBar[key] != null) {
            this.#itemBar[key]["amount"] += num
        } else if (Object.keys(this.#itemBar).length < ItemBarUI.ITEMS_PER_ROW) {
            this.#itemBar[key] = { "amount": num }
        } else {
            super.obtainItem(key, num)
        }
    }

    tryUseItem(key, num = 1) {
        if (super.hasItemInInventory(key)) {
            return super.tryUseItem(key, num)
        } else if (this.#itemBar[key] != null && this.#itemBar[key]["amount"] >= num) {
            this.#itemBar[key]["amount"] -= num
            if (this.#itemBar[key]["amount"] === 0) {
                delete this.#itemBar[key]
            }
            return true
        }
        return false;
    }

    putItemFromItemBarIntoTargetInventory(key, targetRef, amount = null) {
        if (amount == null || amount > this.#itemBar[key]["amount"]) {
            amount = this.#itemBar[key]["amount"]
        }
        targetRef.obtainItem(key, amount)
        this.#itemBar[key]["amount"] -= amount
        if (this.#itemBar[key]["amount"] === 0) {
            delete this.#itemBar[key]
        }
    }


    putItemIntoInventory(key, amount = null) {
        if (amount == null || amount > this.#itemBar[key]["amount"]) {
            amount = this.#itemBar[key]["amount"]
        }
        super.obtainItem(key, amount)
        this.#itemBar[key]["amount"] -= amount
        if (this.#itemBar[key]["amount"] === 0) {
            delete this.#itemBar[key]
        }
    }

    takeItemOutOfInventory(key, amount = null) {
        if (amount == null || amount > this.getInventory()[key]["amount"]) {
            amount = this.getInventory()[key]["amount"]
        }
        this.getInventory()[key]["amount"] -= amount
        if (this.getInventory()[key]["amount"] === 0) {
            delete this.getInventory()[key]
        }
        if (this.#itemBar[key] == null) {
            this.#itemBar[key] = { "amount": amount }
        } else {
            this.#itemBar[key]["amount"] += amount
        }
    }

    getTargetBlock() {
        const x = this.getBlockX();
        const y = this.getBlockY();
        if (typeof Controller !== 'undefined' && Controller.isGamepadActive) {
            const dir = this.getDirectionFacing();
            if (dir === 'l') return [Math.floor(x - 0.6), Math.floor(y)];
            if (dir === 'r') return [Math.floor(x + 0.6), Math.floor(y)];
        }
        return [Math.floor(x), Math.floor(y)];
    }

    #checkNotLoopAnimation(key, action) {
        if (Controller.keys[key] === true) {
            this.setCurrentAction(action)
            this.#isIdle = false
            return true
        } else {
            this.getAnimation(action + "_l").resetElapsedTime()
            this.getAnimation(action + "_r").resetElapsedTime()
            return false
        }
    }

    #checkSpecialAction() {
        if (this.getMapReference() && this.getMapReference().interactionAvailable) return true;
        if (!(this.getMapReference() instanceof FarmLevel)) return true;

        const [tx, ty] = this.getTargetBlock();
        const farm = this.getMapReference();

        // 1. Tombol A (Menyiram)
        if (Controller.keys["KeyQ"] === true) {
            this.setCurrentAction("water");
            this.#isIdle = false;
            return false;
        }

        // 2. Tombol X / Kotak (Membuat Tanah Baru)
        if (Controller.keys["KeyE"] === true) {
            this.setCurrentAction("dig");
            this.#isIdle = false;
            return false;
        }

        // 3. Tombol B (Memanen) - Menanam di-handle otomatis oleh ItemBarUI
        if (Controller.keys["KeyC"] === true) {
            const crop = farm.getCrop(tx, ty);
            if (crop != null && crop.isMatured()) {
                this.setCurrentAction("cut");
                this.#isIdle = false;
                return false;
            }
        }

        return !this.#checkNotLoopAnimation("KeyQ", "water")
            && !this.#checkNotLoopAnimation("KeyE", "dig")
            && !this.#checkNotLoopAnimation("KeyC", "cut");
    }

    notDisablePlayerController() {
        return Transition.isNotActivated() && GAME_ENGINE.getPlayerUi().noUiIsOpening() && !Dialogues.isAnyDialoguePlaying() && !this.ishidden
    }

    update() {
        if (this.ishidden) return
        this.#isIdle = true
        this.setCurrentMovingSpeedX(0)
        this.setCurrentMovingSpeedY(0)
        
        // for dig action, try to convert grass to dirt (Membuat Tanah Baru)
        if (this.isCurrentAction("dig") && this.getCurrentAnimation().currentFrame() === 1) {
            ASSET_MANAGER.playSound(`Gravel_hit${getRandomIntInclusive(1, 4)}.ogg`)
            const [targetX, targetY] = this.getTargetBlock();
            if (this.getMapReference() instanceof FarmLevel) this.getMapReference().tryConvertTileToDirt(targetX, targetY)
        }
        // for water action, try to water the ground (Menyiram)
        else if (this.isCurrentAction("water") && this.getCurrentAnimation().currentFrame() === 1) {
            ASSET_MANAGER.playSound(`Empty_water_bucket${getRandomIntInclusive(1, 3)}.ogg`)
            const [targetX, targetY] = this.getTargetBlock();
            if (this.getMapReference() instanceof FarmLevel) this.getMapReference().tryConvertTileToWateredDirt(targetX, targetY)
        }
        // for cut action, try to harvest the crop (Memanen)
        else if (this.isCurrentAction("cut") && this.getCurrentAnimation().currentFrame() === 1) {
            ASSET_MANAGER.playSound(`Gravel_hit${getRandomIntInclusive(1, 4)}.ogg`)
            if (this.getMapReference() instanceof FarmLevel) {
                const [targetX, targetY] = this.getTargetBlock();
                const _crop = this.getMapReference().getCrop(targetX, targetY)
                if (_crop != null && _crop.isMatured()) {
                    _crop.removeFromWorld = true
                    // obtain a random amount of crop
                    this.obtainItem(_crop.getType(), getRandomIntInclusive(1, 3))
                    // obtain a random amount of seed for that crop
                    this.obtainItem(_crop.getType() + "_seed", getRandomIntInclusive(1, 2))
                }
            }
        }
        
        // check special action
        if (this.notDisablePlayerController() && this.#checkSpecialAction()) {
            // move left or right
            if (Controller.left === true) {
                this.setDirectionFacing("l")
                this.setCurrentAction("move")
                this.setCurrentMovingSpeedX(-this.getMovingSpeedX())
                this.#isIdle = false
            } else if (Controller.right === true) {
                this.setDirectionFacing("r")
                this.setCurrentAction("move")
                this.setCurrentMovingSpeedX(this.getMovingSpeedX())
                this.#isIdle = false
            }
            // move up or down
            if (Controller.up === true) {
                this.setCurrentAction("move")
                this.setCurrentMovingSpeedY(-this.getMovingSpeedY())
                this.#isIdle = false
            } else if (Controller.down === true) {
                this.setCurrentAction("move")
                this.setCurrentMovingSpeedY(this.getMovingSpeedY())
                this.#isIdle = false
            }
        }
        if (this.#isIdle) {
            this.setCurrentAction("idle")
        }
        super.update()
    };

    display(ctx, offsetX, offsetY) {
        if (!this.ishidden) super.display(ctx, offsetX, offsetY);
    }
}