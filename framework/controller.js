class Controller {
    // basic move behaviors
    static up = false;
    static down = false;
    static left = false;
    static right = false;

    // Information on the input
    static mouse = { x: 0, y: 0, radius: 0, leftClick: false, rightClick: false };
    static mouse_prev = structuredClone(this.mouse);
    static wheel = null;
    static keys = {};
    static keys_prev = {};

    static keyboardActive = false;
    static isGamepadActive = false;

    static startInput(_ctx) {
        let getPixelXandY = function (e) {
            let x = e.clientX - _ctx.canvas.getBoundingClientRect().left;
            let y = e.clientY - _ctx.canvas.getBoundingClientRect().top;

            return { x: x, y: y, radius: 0 };
        }

        function mouseMove(e) {
            Controller.isGamepadActive = false;
            Controller.mouse = { ...Controller.mouse, ...getPixelXandY(e) };
        }

        function mouseDown(e) {
            switch (e.button) {
                case 0:
                    Controller.mouse.leftClick = true
                    break;
                case 2:
                    Controller.mouse.rightClick = true;
                    break;
            }
        }

        function mouseUp(e) {
            switch (e.button) {
                case 0:
                    Controller.mouse.leftClick = false
                    break;
                case 2:
                    Controller.mouse.rightClick = false;
                    break;
            }
        }

        function wheelListener(e) {
            e.preventDefault(); // Prevent Scrolling
            Controller.wheel = e.deltaY;
        }

        function keydownListener(e) {
            Controller.keyboardActive = true;
            Controller.isGamepadActive = false;
            switch (e.code) {
                case "ArrowLeft":
                case "KeyA":
                    Controller.left = true;
                    break;
                case "ArrowRight":
                case "KeyD":
                    Controller.right = true;
                    break;
                case "ArrowUp":
                case "KeyW":
                    Controller.up = true;
                    break;
                case "ArrowDown":
                case "KeyS":
                    Controller.down = true;
                    break;
                default:
                    Controller.keys[e.code] = true;
            }
        }

        function keyUpListener(e) {
            Controller.keyboardActive = false;
            switch (e.code) {
                case "ArrowLeft":
                case "KeyA":
                    Controller.left = false;
                    break;
                case "ArrowRight":
                case "KeyD":
                    Controller.right = false;
                    break;
                case "ArrowUp":
                case "KeyW":
                    Controller.up = false;
                    break;
                case "ArrowDown":
                case "KeyS":
                    Controller.down = false;
                    break;
                default:
                    Controller.keys[e.code] = false;
            }
        }

        Controller.mousemove = mouseMove;
        Controller.wheelscroll = wheelListener;
        Controller.keydown = keydownListener;
        Controller.keyup = keyUpListener;

        _ctx.canvas.addEventListener("mousemove", Controller.mousemove, false);
        _ctx.canvas.addEventListener("mousedown", mouseDown, false);
        _ctx.canvas.addEventListener("mouseup", mouseUp, false);
        _ctx.canvas.addEventListener("wheel", Controller.wheelscroll, false);
        _ctx.canvas.addEventListener("keydown", Controller.keydown, false);
        _ctx.canvas.addEventListener("keyup", Controller.keyup, false);
    };

    static clearMovement() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
    }

    static update() {
        if (!document.hasFocus()) {
            this.clearMovement();
            for (let k in this.keys) this.keys[k] = false;
            return;
        }

        this.mouse_prev = structuredClone(this.mouse);
        this.keys_prev = structuredClone(this.keys);

        // Gamepad handling
        if (typeof GamepadController !== 'undefined') {
            GamepadController.update();
            const dx = GamepadController.getAxis('moveX');
            const dy = GamepadController.getAxis('moveY');

            if (Math.abs(dx) > GamepadController.ANALOG_THRESHOLD || Math.abs(dy) > GamepadController.ANALOG_THRESHOLD) {
                this.isGamepadActive = true;
            }

            if (dx < -GamepadController.ANALOG_THRESHOLD) this.left = true;
            else if (!this.keyboardActive) this.left = false;

            if (dx > GamepadController.ANALOG_THRESHOLD) this.right = true;
            else if (!this.keyboardActive) this.right = false;

            if (dy < -GamepadController.ANALOG_THRESHOLD) this.up = true;
            else if (!this.keyboardActive) this.up = false;

            if (dy > GamepadController.ANALOG_THRESHOLD) this.down = true;
            else if (!this.keyboardActive) this.down = false;

            // --- MAPPING BARU YANG LEBIH SPESIFIK ---

            // Tombol A = Menyiram
            if (GamepadController.isPressed('btnA')) this.keys['KeyQ'] = true;
            else if (!this.keyboardActive) this.keys['KeyQ'] = false;

            // Tombol B = Menanam (KeyR) & Memanen (KeyC)
            if (GamepadController.isPressed('btnB')) {
                this.keys['KeyR'] = true; // Trigger menanam di ItemBarUI
                this.keys['KeyC'] = true; // Trigger panen di Player
            } else if (!this.keyboardActive) {
                this.keys['KeyR'] = false;
                this.keys['KeyC'] = false;
            }

            // Tombol R1 (Trigger Kanan) = Mencangkul / Membuat Tanah Baru (Dig)
            if (GamepadController.isPressed('trigR')) this.keys['KeyE'] = true;
            else if (!this.keyboardActive) this.keys['KeyE'] = false;

            // Tombol Y (Segitiga) = Buka Inventory
            if (GamepadController.isJustPressed('btnY')) this.keys['KeyI'] = true;
            else if (!this.keyboardActive) this.keys['KeyI'] = false;

            // Mark gamepad as active if any button is pressed
            const gamepadMappings = Object.keys(GamepadController.mappings);
            for (let i = 0; i < gamepadMappings.length; i++) {
                if (GamepadController.isPressed(gamepadMappings[i])) {
                    this.isGamepadActive = true;
                    break;
                }
            }

            if (GamepadController.isJustPressed('btnStart')) {
                Transition.start(() => {
                    GAME_ENGINE.enterLevel("main_menu");
                    UserInterfaces.displayTitle = true;
                });
            }
        }
    }
}