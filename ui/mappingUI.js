class MappingUI {
    static isOpen = false;
    static #instance = null;

    // State Management
    #selectedRow = 0; // 0 = dropdown, 1..n = actions, n+1 = back button
    #selectedGamepadIndex = 0;
    #isListening = false;
    #listeningActionId = null;
    #lastInputTime = 0;
    #blinkTimer = 0;
    #dropdownOpen = false;
    #scrollOffset = 0;
    #maxVisibleRows = 6;
    #clickBoxes = []; // Disimpan saat draw() untuk deteksi klik mouse
    #prevKeys = {}; // Untuk deteksi isJustPressed keyboard

    // Data
    #actions = [
        { id: 'btnA', label: 'Menyiram / Ambil Item', desc: 'Aksi utama di ladang' },
        { id: 'btnB', label: 'Tanam / Panen / Batal', desc: 'Batal atau konfirmasi' },
        { id: 'btnX', label: 'Gunakan Item Spesial', desc: 'Item sekunder' },
        { id: 'btnY', label: 'Buka Tas', desc: 'Tampilkan ransel' },
        { id: 'trigL', label: 'Tab Kiri', desc: 'Navigasi tab' },
        { id: 'trigR', label: 'Tab Kanan/Cangkul', desc: 'Navigasi tab / Cangkul' },
        { id: 'btnStart', label: 'Menu Pause', desc: 'Buka menu utama' },
        { id: 'btnSelect', label: 'Pindah Fokus UI', desc: 'Switch antar panel' }
    ];

    #gamepadMappings = new Map(); // gamepadIndex -> { actionId -> buttonIndex }

    static getInstance() {
        if (!MappingUI.#instance) {
            MappingUI.#instance = new MappingUI();
        }
        return MappingUI.#instance;
    }

    static open() {
        const ui = MappingUI.getInstance();
        MappingUI.isOpen = true;
        ui.#selectedRow = 1;
        ui.#dropdownOpen = false;
        ui.#isListening = false;
        ui.#syncGamepads();
    }

    static close() {
        MappingUI.isOpen = false;
        const ui = MappingUI.getInstance();
        ui.#dropdownOpen = false;
        ui.#isListening = false;
    }

    #syncGamepads() {
        const gamepads = GamepadController.getGamepads();
        // Inisialisasi mapping untuk gamepad baru
        gamepads.forEach((gp, index) => {
            if (!this.#gamepadMappings.has(index)) {
                this.#gamepadMappings.set(index, this.#getDefaultMappings());
            }
        });
        // Hapus mapping untuk gamepad yang disconnect
        const activeIndices = new Set(gamepads.map((_, i) => i));
        for (const key of this.#gamepadMappings.keys()) {
            if (!activeIndices.has(key)) {
                this.#gamepadMappings.delete(key);
            }
        }
        // Adjust selected index jika out of bounds
        if (this.#selectedGamepadIndex >= gamepads.length) {
            this.#selectedGamepadIndex = Math.max(0, gamepads.length - 1);
        }
    }

    #getDefaultMappings() {
        return {
            'btnA': 0, 'btnB': 1, 'btnX': 2, 'btnY': 3,
            'trigL': 6, 'trigR': 7,
            'btnStart': 9, 'btnSelect': 8
        };
    }

    #getCurrentMappings() {
        return this.#gamepadMappings.get(this.#selectedGamepadIndex) || this.#getDefaultMappings();
    }

    // Helper untuk Keyboard/Mouse (Fallback jika tidak pakai gamepad)
    #isNavDown() {
        return GamepadController.isPressed('dpadD') || Controller.keys["ArrowDown"] || Controller.keys["KeyS"];
    }

    #isNavUp() {
        return GamepadController.isPressed('dpadU') || Controller.keys["ArrowUp"] || Controller.keys["KeyW"];
    }

    #isConfirmJustPressed(now) {
        const isEnter = Controller.keys["Enter"] && !this.#prevKeys["Enter"];
        return GamepadController.isJustPressed('btnA') || isEnter;
    }

    #isCancelJustPressed(now) {
        const isEsc = Controller.keys["Escape"] && !this.#prevKeys["Escape"];
        return GamepadController.isJustPressed('btnB') || isEsc || Controller.keys["Backspace"];
    }

    #getButtonName(buttonIndex) {
        const names = {
            0: 'A', 1: 'B', 2: 'X', 3: 'Y',
            4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
            8: 'Back/Select', 9: 'Start', 10: 'L3', 11: 'R3',
            12: '↑', 13: '↓', 14: '←', 15: '→'
        };
        return names[buttonIndex] || `Btn${buttonIndex}`;
    }

    #getGamepadDisplayName(gamepad) {
        if (!gamepad) return "Tidak ada Gamepad";
        let id = gamepad.id;
        id = id.replace(/\s*\([^)]*:[^)]*\)\s*/g, ' ');
        id = id.replace(/Standard GAMEPAD/i, '');
        id = id.replace(/STANDARD GAMEPAD/i, '');
        id = id.trim();
        if (id.length > 35) id = id.substring(0, 32) + '...';
        return id || "Kontroler Tidak Dikenal";
    }

    update() {
        if (!MappingUI.isOpen) return;

        const now = Date.now();
        this.#blinkTimer = now;
        this.#syncGamepads();

        // Mode listening: tunggu input tombol apapun
        if (this.#isListening) {
            this.#handleListeningMode(now);
            return;
        }

        if (now - this.#lastInputTime < 180) return;

        const gamepads = GamepadController.getGamepads();
        const gp = gamepads[this.#selectedGamepadIndex];

        const prevEnter = this.#prevKeys["Enter"];
        const prevEsc = this.#prevKeys["Escape"];
        const prevClick = Controller.mouse_prev?.leftClick;
        const currClick = Controller.mouse?.leftClick;

        // Handle Mouse Click
        // PERBAIKAN: Loop terbalik (dari belakang ke depan) agar elemen yang digambar terakhir (Overlay Dropdown) diklik duluan
        if (currClick && !prevClick && !this.#isListening) {
            const mx = Controller.mouse.x;
            const my = Controller.mouse.y;
            if (this.#clickBoxes.length > 0) {
                for (let i = this.#clickBoxes.length - 1; i >= 0; i--) {
                    const box = this.#clickBoxes[i];
                    if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                        this.#handleMouseClick(box.id, now);
                        this.#lastInputTime = now;
                        break; // Hanya proses klik elemen teratas yang tertabrak
                    }
                }
            }
        }

        // Handle dropdown terbuka
        if (this.#dropdownOpen) {
            this.#handleDropdownNavigation(now, gamepads.length);
        } else {
            // Navigasi utama
            this.#handleMainNavigation(now);
        }

        // Update prev keys
        this.#prevKeys["Enter"] = !!Controller.keys["Enter"];
        this.#prevKeys["Escape"] = !!Controller.keys["Escape"];
    }

    #handleMouseClick(id, now) {
        // Jika dropdown terbuka, klik di luar item dropdown akan menutupnya
        if (this.#dropdownOpen && !id.startsWith('drop_') && id !== 'dropdown') {
            this.#dropdownOpen = false;
            return;
        }

        if (id === 'dropdown') {
            this.#selectedRow = 0;
            this.#dropdownOpen = !this.#dropdownOpen;
        } else if (id.startsWith('drop_')) {
            const index = parseInt(id.split('_')[1]);
            this.#selectedGamepadIndex = index;
            this.#dropdownOpen = false;
            this.#selectedRow = 0;
        } else if (id.startsWith('action_')) {
            const actId = id.split('_')[1];
            const idx = this.#actions.findIndex(a => a.id === actId);
            if (idx !== -1) {
                this.#selectedRow = idx + 1;
                this.#isListening = true;
                this.#listeningActionId = actId;
            }
        } else if (id === 'back') {
            MappingUI.close();
        }
    }

    #handleListeningMode(now) {
        const gamepads = GamepadController.getGamepads();
        const gp = gamepads[this.#selectedGamepadIndex];
        if (!gp) return;

        // Cek semua tombol
        for (let i = 0; i < gp.buttons.length; i++) {
            if (gp.buttons[i].pressed) {
                // Jangan allow remap dpad
                if (i >= 12 && i <= 15) {
                    continue;
                }

                const mappings = this.#getCurrentMappings();
                const existingAction = Object.entries(mappings).find(([aid, idx]) => idx === i && aid !== this.#listeningActionId);

                if (existingAction) {
                    mappings[existingAction[0]] = mappings[this.#listeningActionId];
                    GamepadController.setMapping(existingAction[0], mappings[existingAction[0]]);
                }

                mappings[this.#listeningActionId] = i;
                GamepadController.setMapping(this.#listeningActionId, i);

                this.#isListening = false;
                this.#listeningActionId = null;
                this.#lastInputTime = now + 300;
                return;
            }
        }

        // Batal dengan B atau Escape
        if (this.#isCancelJustPressed(now)) {
            this.#isListening = false;
            this.#listeningActionId = null;
            this.#lastInputTime = now;
        }
    }

    #handleDropdownNavigation(now, gamepadCount) {
        if (this.#isNavDown()) {
            this.#selectedGamepadIndex = (this.#selectedGamepadIndex + 1) % Math.max(1, gamepadCount);
            this.#lastInputTime = now;
        } else if (this.#isNavUp()) {
            this.#selectedGamepadIndex = (this.#selectedGamepadIndex - 1 + Math.max(1, gamepadCount)) % Math.max(1, gamepadCount);
            this.#lastInputTime = now;
        } else if (this.#isConfirmJustPressed(now)) {
            this.#dropdownOpen = false;
            this.#lastInputTime = now;
        } else if (this.#isCancelJustPressed(now)) {
            this.#dropdownOpen = false;
            this.#lastInputTime = now;
        }
    }

    #handleMainNavigation(now) {
        const totalRows = this.#actions.length + 2; // + dropdown + back button

        if (this.#isNavDown()) {
            if (this.#selectedRow < totalRows - 1) {
                this.#selectedRow++;
                if (this.#selectedRow > this.#maxVisibleRows && this.#selectedRow <= this.#actions.length) {
                    this.#scrollOffset = Math.min(this.#scrollOffset + 1, this.#actions.length - this.#maxVisibleRows);
                }
            }
            this.#lastInputTime = now;
        } else if (this.#isNavUp()) {
            if (this.#selectedRow > 0) {
                if (this.#selectedRow === this.#actions.length + 1) {
                    this.#selectedRow = this.#actions.length;
                    this.#scrollOffset = Math.max(0, this.#actions.length - this.#maxVisibleRows);
                } else {
                    this.#selectedRow--;
                    if (this.#selectedRow < this.#scrollOffset + 1 && this.#scrollOffset > 0) {
                        this.#scrollOffset--;
                    }
                }
            }
            this.#lastInputTime = now;
        }

        if (this.#isConfirmJustPressed(now)) {
            if (this.#selectedRow === 0) {
                this.#dropdownOpen = true;
            } else if (this.#selectedRow >= 1 && this.#selectedRow <= this.#actions.length) {
                const action = this.#actions[this.#selectedRow - 1];
                this.#isListening = true;
                this.#listeningActionId = action.id;
            } else if (this.#selectedRow === this.#actions.length + 1) {
                MappingUI.close();
            }
            this.#lastInputTime = now;
        }

        if (this.#isCancelJustPressed(now)) {
            MappingUI.close();
            this.#lastInputTime = now;
        }
    }

    draw(ctx) {
        if (!MappingUI.isOpen) return;

        this.#clickBoxes = []; // Reset click areas

        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;
        const centerX = cw / 2;

        // ===== STYLING CONSTANTS =====
        const colors = {
            bg: '#1a1a2e',
            panel: '#16213e',
            panelBorder: '#0f3460',
            highlight: '#e94560',
            text: '#eaeaea',
            textDim: '#a0a0a0',
            accent: '#ffd700',
            success: '#4cd137',
            danger: '#e84118'
        };

        // ===== BACKGROUND =====
        const gradient = ctx.createLinearGradient(0, 0, 0, ch);
        gradient.addColorStop(0, colors.bg);
        gradient.addColorStop(1, '#0f0f1e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);

        // Grid overlay
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let x = 0; x < cw; x += 4) ctx.fillRect(x, 0, 1, ch);
        for (let y = 0; y < ch; y += 4) ctx.fillRect(0, y, cw, 1);

        // ===== TITLE =====
        const titleSize = Math.floor(ch * 0.05);
        this.#drawPixelText(ctx, "PENGATURAN TOMBOL", centerX, ch * 0.06, titleSize, colors.accent, 'center');

        // ===== MAIN PANEL =====
        const panelW = Math.min(cw * 0.8, 800);
        const panelH = ch * 0.75;
        const panelX = (cw - panelW) / 2;
        const panelY = ch * 0.12;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(panelX + 8, panelY + 8, panelW, panelH);
        ctx.fillStyle = colors.panel;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = colors.panelBorder;
        ctx.lineWidth = 4;
        ctx.strokeRect(panelX, panelY, panelW, panelH);
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8);

        // ===== GAMEPAD SELECTOR (DROPDOWN) =====
        const rowH = Math.floor(panelH * 0.1);
        const margin = 20;
        let curY = panelY + margin;

        const isDropdownSelected = this.#selectedRow === 0;
        this.#drawDropdown(ctx, panelX + margin, curY, panelW - margin * 2, rowH, isDropdownSelected);
        this.#clickBoxes.push({ id: 'dropdown', x: panelX + margin, y: curY, w: panelW - margin * 2, h: rowH });

        curY += rowH + 15;

        // ===== HEADERS =====
        const headerY = curY;
        ctx.fillStyle = colors.panelBorder;
        ctx.fillRect(panelX + margin, headerY, panelW - margin * 2, rowH * 0.6);

        const col1X = panelX + margin + 15;
        const col2X = panelX + panelW * 0.55;

        this.#drawPixelText(ctx, "AKSI", col1X, headerY + rowH * 0.3, rowH * 0.35, colors.textDim, 'left');
        this.#drawPixelText(ctx, "TOMBOL", col2X, headerY + rowH * 0.3, rowH * 0.35, colors.textDim, 'left');

        curY += rowH * 0.6 + 10;

        // ===== ACTION LIST =====
        const listHeight = panelH * 0.55;
        const visibleRows = this.#maxVisibleRows;

        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX + margin, curY, panelW - margin * 2, listHeight);
        ctx.clip();

        const startIdx = this.#scrollOffset;
        const endIdx = Math.min(startIdx + visibleRows, this.#actions.length);

        for (let i = startIdx; i < endIdx; i++) {
            const action = this.#actions[i];
            const rowY = curY + (i - startIdx) * (rowH + 5);
            const isSelected = this.#selectedRow === i + 1;
            const isListening = this.#isListening && this.#listeningActionId === action.id;

            if (rowY > curY + listHeight) continue;

            this.#drawActionRow(ctx, panelX + margin, rowY, panelW - margin * 2, rowH,
                action, isSelected, isListening, col1X, col2X);

            this.#clickBoxes.push({ id: `action_${action.id}`, x: panelX + margin, y: rowY, w: panelW - margin * 2, h: rowH });
        }

        ctx.restore();

        // Scrollbar
        if (this.#actions.length > visibleRows) {
            const scrollH = (visibleRows / this.#actions.length) * listHeight;
            const scrollY = curY + (this.#scrollOffset / this.#actions.length) * listHeight;
            const scrollX = panelX + panelW - margin - 8;

            ctx.fillStyle = colors.panelBorder;
            ctx.fillRect(scrollX, curY, 6, listHeight);
            ctx.fillStyle = isDropdownSelected ? colors.textDim : colors.highlight;
            ctx.fillRect(scrollX - 1, scrollY, 8, scrollH);
        }

        curY += listHeight + 15;

        // ===== BACK BUTTON =====
        const isBackSelected = this.#selectedRow === this.#actions.length + 1;
        const btnW = panelW * 0.3;
        const btnX = panelX + (panelW - btnW) / 2;

        this.#drawPixelButton(ctx, btnX, curY, btnW, rowH, "KEMBALI", isBackSelected, colors.danger);
        this.#clickBoxes.push({ id: 'back', x: btnX, y: curY, w: btnW, h: rowH });

        // ===== INSTRUCTIONS =====
        const instrY = panelY + panelH - 20;
        let instrText = "";
        if (this.#isListening) {
            instrText = ">> TEKAN TOMBOL UNTUK MAPPING <<  |  [B] BATAL";
        } else if (this.#dropdownOpen) {
            instrText = "[↑↓] PILIH GAMEPAD  |  [A] KONFIRM  |  [B] BATAL";
        } else {
            instrText = "[↑↓] NAVIGASI  |  [A] PILIH  |  [B] TUTUP";
        }

        this.#drawPixelText(ctx, instrText, centerX, instrY, rowH * 0.3, colors.textDim, 'center');

        // ===== DROPDOWN OVERLAY =====
        // Digambar terakhir agar di atas (Z-Index tertinggi)
        if (this.#dropdownOpen) {
            this.#drawDropdownList(ctx, panelX + margin, panelY + margin + rowH, panelW - margin * 2);
        }
    }

    #drawPixelText(ctx, text, x, y, size, color, align = 'left') {
        ctx.font = `bold ${size}px "Courier New", monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(text, x + 2, y + 2);

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    #drawPixelButton(ctx, x, y, w, h, text, isSelected, color) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 4, y + 4, w, h);

        ctx.fillStyle = isSelected ? color : '#2d3436';
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = isSelected ? '#fff' : '#636e72';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        if (isSelected) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 4, y + 4, w - 8, h / 2 - 4);
        }

        this.#drawPixelText(ctx, text, x + w / 2, y + h / 2, h * 0.4, '#fff', 'center');
    }

    #drawDropdown(ctx, x, y, w, h, isSelected) {
        const colors = {
            bg: isSelected ? '#0f3460' : '#16213e',
            border: isSelected ? '#e94560' : '#0f3460',
            text: '#eaeaea'
        };

        ctx.fillStyle = colors.bg;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        const iconSize = h * 0.5;
        this.#drawGamepadIcon(ctx, x + 15, y + h / 2 - iconSize / 2, iconSize, isSelected);

        const gamepads = GamepadController.getGamepads();
        const gp = gamepads[this.#selectedGamepadIndex];
        const text = this.#getGamepadDisplayName(gp);
        this.#drawPixelText(ctx, text, x + 25 + iconSize, y + h / 2, h * 0.35, colors.text, 'left');

        const arrowX = x + w - 30;
        const arrowY = y + h / 2;
        ctx.fillStyle = isSelected ? '#e94560' : '#636e72';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY - 5);
        ctx.lineTo(arrowX + 10, arrowY - 5);
        ctx.lineTo(arrowX + 5, arrowY + 5);
        ctx.fill();

        const dotX = x + w - 50;
        ctx.beginPath();
        ctx.arc(dotX, arrowY, 5, 0, Math.PI * 2);
        ctx.fillStyle = gp ? '#4cd137' : '#e84118';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    #drawDropdownList(ctx, x, y, w) {
        const gamepads = GamepadController.getGamepads();
        const itemH = 50;
        const listH = Math.max(50, Math.min(gamepads.length * itemH, 200));

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, w, listH);
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, listH);

        if (gamepads.length === 0) {
            this.#drawPixelText(ctx, "Tidak ada controller terhubung", x + w / 2, y + listH / 2, 16, '#a0a0a0', 'center');
            return;
        }

        gamepads.forEach((gp, i) => {
            const itemY = y + i * itemH;
            const isSelected = i === this.#selectedGamepadIndex;

            if (isSelected) {
                ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
                ctx.fillRect(x + 2, itemY + 2, w - 4, itemH - 4);
            }

            this.#drawGamepadIcon(ctx, x + 15, itemY + itemH / 2 - 10, 20, isSelected);

            const name = this.#getGamepadDisplayName(gp);
            this.#drawPixelText(ctx, name, x + 45, itemY + itemH / 2, 16, isSelected ? '#fff' : '#a0a0a0', 'left');

            // Box klik untuk dropdown list
            this.#clickBoxes.push({ id: `drop_${i}`, x: x, y: itemY, w: w, h: itemH });
        });
    }

    #drawGamepadIcon(ctx, x, y, size, active) {
        ctx.strokeStyle = active ? '#e94560' : '#636e72';
        ctx.lineWidth = 2;

        ctx.strokeRect(x, y, size, size * 0.6);

        ctx.fillStyle = active ? '#e94560' : '#636e72';
        ctx.fillRect(x + size * 0.2, y + size * 0.15, size * 0.15, size * 0.15);
        ctx.fillRect(x + size * 0.6, y + size * 0.15, size * 0.15, size * 0.15);

        ctx.fillRect(x + size * 0.4, y + size * 0.35, size * 0.2, size * 0.1);
        ctx.fillRect(x + size * 0.45, y + size * 0.3, size * 0.1, size * 0.2);
    }

    #drawActionRow(ctx, x, y, w, h, action, isSelected, isListening, labelX, valueX) {
        const colors = {
            bg: isSelected ? 'rgba(233, 69, 96, 0.2)' : 'rgba(22, 33, 62, 0.8)',
            border: isSelected ? '#e94560' : 'transparent',
            text: isSelected ? '#fff' : '#eaeaea',
            desc: '#a0a0a0'
        };

        ctx.fillStyle = colors.bg;
        ctx.fillRect(x, y, w, h);

        if (isSelected) {
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = '#e94560';
            ctx.fillRect(x - 2, y - 2, 6, 6);
            ctx.fillRect(x + w - 4, y - 2, 6, 6);
            ctx.fillRect(x - 2, y + h - 4, 6, 6);
            ctx.fillRect(x + w - 4, y + h - 4, 6, 6);
        }

        this.#drawPixelText(ctx, action.label, labelX, y + h * 0.35, h * 0.35, colors.text, 'left');
        this.#drawPixelText(ctx, action.desc, labelX, y + h * 0.75, h * 0.2, colors.desc, 'left');

        if (isListening) {
            const blink = Math.floor(Date.now() / 300) % 2 === 0;
            if (blink) {
                this.#drawPixelText(ctx, ">> TEKAN TOMBOL <<", valueX, y + h / 2, h * 0.3, '#ffd700', 'left');
            }
        } else {
            const mappings = this.#getCurrentMappings();
            const btnIndex = mappings[action.id];
            const btnName = btnIndex !== undefined ? this.#getButtonName(btnIndex) : '?';

            const badgeW = 90;
            const badgeH = h * 0.6;
            const badgeY = y + (h - badgeH) / 2;

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(valueX + 4, badgeY + 4, badgeW, badgeH);

            ctx.fillStyle = isSelected ? '#e94560' : '#2d3436';
            ctx.fillRect(valueX, badgeY, badgeW, badgeH);

            ctx.strokeStyle = isSelected ? '#fff' : '#636e72';
            ctx.lineWidth = 2;
            ctx.strokeRect(valueX, badgeY, badgeW, badgeH);

            this.#drawPixelText(ctx, btnName, valueX + badgeW / 2, badgeY + badgeH / 2 + 2, h * 0.35, '#fff', 'center');
        }
    }
}

// Singleton pattern untuk akses global
const MappingUIInstance = MappingUI.getInstance();