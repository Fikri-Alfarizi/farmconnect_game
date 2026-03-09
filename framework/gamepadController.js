class GamepadController {
    static DEADZONE = 0.15;
    static ANALOG_THRESHOLD = 0.5;

    static buttons_prev = {};
    static buttons_curr = {};

    static mappings = {
        moveX: { type: 'axis', index: 0 },
        moveY: { type: 'axis', index: 1 },
        btnA: { type: 'button', index: 0 },
        btnB: { type: 'button', index: 1 },
        btnX: { type: 'button', index: 2 },
        btnY: { type: 'button', index: 3 },
        dpadL: { type: 'button', index: 14 },
        dpadR: { type: 'button', index: 15 },
        dpadU: { type: 'button', index: 12 },
        dpadD: { type: 'button', index: 13 },
        trigL: { type: 'button', index: 6 },
        trigR: { type: 'button', index: 7 },
        btnStart: { type: 'button', index: 9 },
        btnSelect: { type: 'button', index: 8 },
        btnBack: { type: 'button', index: 8 } // Alias
    };

    static setMapping(actionId, buttonIndex) {
        if (this.mappings[actionId]) {
            this.mappings[actionId].index = buttonIndex;
        }
    }

    static getGamepads() {
        if (!document.hasFocus()) return [];
        return Array.from(navigator.getGamepads()).filter(gp => gp !== null);
    }

    static update() {
        const gamepads = this.getGamepads();
        for (const gp of gamepads) {
            // Initialize if first time
            if (!this.buttons_curr[gp.index]) {
                this.buttons_curr[gp.index] = gp.buttons.map(btn => btn.pressed);
                this.buttons_prev[gp.index] = gp.buttons.map(() => false);
                continue;
            }

            // Store previous state from the last frame's current
            this.buttons_prev[gp.index] = [...this.buttons_curr[gp.index]];

            // Get new current state
            this.buttons_curr[gp.index] = gp.buttons.map(btn => btn.pressed);
        }
    }

    static isPressed(actionId) {
        const map = this.mappings[actionId];
        if (!map) return false;

        const gamepads = this.getGamepads();
        for (const gp of gamepads) {
            if (map.type === 'button') {
                if (this.buttons_curr[gp.index] && this.buttons_curr[gp.index][map.index]) {
                    return true;
                }
            } else if (map.type === 'axis') {
                const val = gp.axes[map.index];
                if (Math.abs(val) > this.ANALOG_THRESHOLD) return true;
            }
        }
        return false;
    }

    static isAnyButtonPressed() {
        const gamepads = this.getGamepads();
        for (const gp of gamepads) {
            if (gp && gp.buttons) {
                for (let i = 0; i < gp.buttons.length; i++) {
                    if (gp.buttons[i].pressed) return true;
                }
            }
            if (gp && gp.axes) {
                for (let i = 0; i < gp.axes.length; i++) {
                    if (Math.abs(gp.axes[i]) > this.ANALOG_THRESHOLD) return true;
                }
            }
        }
        return false;
    }

    static isJustPressed(actionId) {
        const map = this.mappings[actionId];
        if (!map || map.type !== 'button') return false;

        const gamepads = this.getGamepads();
        for (const gp of gamepads) {
            const current = this.buttons_curr[gp.index] ? this.buttons_curr[gp.index][map.index] : false;
            const prev = this.buttons_prev[gp.index] ? this.buttons_prev[gp.index][map.index] : false;

            if (current && !prev) {
                return true;
            }
        }
        return false;
    }

    static getAxis(actionId) {
        const map = this.mappings[actionId];
        if (!map || map.type !== 'axis') return 0;

        const gamepads = this.getGamepads();
        let maxVal = 0;
        for (const gp of gamepads) {
            const val = gp.axes[map.index];
            if (Math.abs(val) > this.DEADZONE) {
                if (Math.abs(val) > Math.abs(maxVal)) maxVal = val;
            }
        }
        return maxVal;
    }
}
