class Dialogues {
    static #CURRENT = null
    static #CURRENT_INIT_BY = null
    static #selectedOptionIndex = 0
    static #lastGamepadInputTime = 0
    static #frameStartedInitiated = -1

    static #SCRIPTS = {
        Amely_interact1: {
            contents: ["Halo, namaku Amely", "Ada yang bisa kubantu, pelanggan setiaku?"],
            options: [{
                text: "Aku ingin melihat apa yang kamu jual",
                act: "$trade"
            }, {
                text: "Tidak ada, semoga harimu menyenangkan",
                act: "$close"
            }]
        },
        Mark_interact1: {
            contents: ["Hei, aku sedang tidak ingin berjualan sekarang", "Pergilah"],
            options: [{
                text: "Maaf",
                act: "$close"
            }]
        },
        Yu_interact1: {
            contents: ["Salam, mau minum sesuatu?"],
            options: [{
                text: "Tentu, minuman apa yang ada?",
                act: "Yu_interact2"
            }, {
                text: "Tidak, terima kasih",
                act: "$close"
            }]
        },
        Yu_interact2: {
            contents: ["Kami punya... air putih."],
            options: [{
                text: "Lalu...??",
                act: "Yu_interact3"
            }]
        },
        Yu_interact3: {
            contents: ["Itu saja"],
            options: [{
                text: "Bar macam apa yang hanya menyediakan air putih?",
                act: "Yu_interact4"
            }]
        },
        Yu_interact4: {
            contents: ["Yah... bar kami."],
            options: [{
                text: "Lupakan saja, semoga harimu menyenangkan",
                act: "%close"
            }, {
                text: "Oke, aku pesan air putihnya",
                act: "Yu_interact5"
            }]
        },
        Yu_interact5: {
            contents: ["Ini dia, semoga harimu menyenangkan"],
        },
        Adian_interact1: {
            contents: ["Hei kamu, iya aku berbicara denganmu", "Kemari"],
            next: "Adian_interact2"
        },
        Adian_interact2: {
            contents: ["Ini sangat bodoh", "Pernahkah kamu melihat bar yang hanya menyediakan air putih?"],
            options: [{
                text: "Yah, air putih kan bagus untuk kesehatan",
                act: "Adian_interact2_disagree"
            }, {
                text: "Memang agak aneh sih",
                act: "Adian_interact2_agree"
            }]
        },
        Adian_interact2_agree: {
            contents: ["Akhirnya, ternyata masih ada orang pintar di desa ini", "Kukira hanya aku satu-satunya"],
        },
        Adian_interact2_disagree: {
            contents: ["Pergi saja sana", "Tidak ada gunanya aku berbicara dengan orang sepertimu"],
        },
        Marx_interact1: {
            contents: ["Halo orang asing", "Belum pernah melihatmu di sini sebelumnya", "Dari mana asalmu?"],
            next: "Marx_interact2"
        },
        Marx_interact2: {
            contents: ["Hmm menarik", "Baru pindah ke sini dan mewarisi ladang dari keluarga yang sudah meninggal?", "Terdengar sangat klise seperti di dalam video game saja"],
            next: "Marx_interact3"
        },
        Marx_interact3: {
            contents: ["Coba lihat, kurasa bagus juga ada bar di sini", "yang hanya menyediakan air putih", "Alkohol hanya akan mengundang masalah kesehatan"],
            next: "Marx_interact4"
        },
        Marx_interact4: {
            contents: ["Anak muda zaman sekarang tidak mengerti pentingnya", "menjaga tubuh mereka", "Kamu tidak seperti mereka kan?"],
        },
        Bar_TV1_1: {
            contents: ["TV itu sedang menyiarkan laporan cuaca terbaru"],
            next: "Bar_TV1_2"
        },
        Bar_TV1_2: {
            contents: ["Sepertinya besok akan menjadi hari yang cerah lagi"],
        },
        Bar_TV2_1: {
            contents: ["Sebuah TV tua", "Apakah kamu ingin menyalakannya?"],
            options: [{
                text: "Ya",
                act: "Bar_TV2_2"
            }, {
                text: "Tidak",
                act: "$close"
            }]
        },
        Bar_TV2_2: {
            contents: ["Layarnya masih hitam", "TV ini sepertinya sudah rusak"],
        }
    }

    static isAnyDialoguePlaying() {
        return this.#CURRENT != null
    }

    static update(key, initBy) {
        this.#CURRENT = this.#SCRIPTS[key]
        this.#CURRENT_INIT_BY = initBy
        this.#selectedOptionIndex = 0
        this.#frameStartedInitiated = GAME_ENGINE.timer.frameCount || 0;
        this.#lastGamepadInputTime = Date.now(); // Lock input immediately on start
    }

    static draw(ctx) {
        if (this.isAnyDialoguePlaying()) {
            ctx.fillStyle = "#fbd09a"
            const boxRect = {
                x: 0,
                y: Math.ceil(ctx.canvas.height * 0.8),
                width: ctx.canvas.width,
                height: Math.ceil(ctx.canvas.height * 0.2)
            }
            ctx.fillRect(boxRect.x, boxRect.y, boxRect.width, boxRect.height);
            ctx.strokeStyle = "#2e1626"
            ctx.lineWidth = 6;
            ctx.strokeRect(boxRect.x + ctx.lineWidth / 2, boxRect.y - ctx.lineWidth / 2, boxRect.width - ctx.lineWidth, boxRect.height)
            ctx.lineWidth = 1;

            const textFontSize = Math.floor(ctx.canvas.height / 25)
            let lineIndex = 0
            this.#CURRENT.contents.forEach(_l => {
                Font.draw(ctx, _l, textFontSize, boxRect.x + textFontSize, boxRect.y + textFontSize * (1.25 + lineIndex))
                lineIndex += 1.1;
            })

            const hasNoOption = this.#CURRENT["options"] == null || this.#CURRENT["options"].length <= 0
            let currentHover = -1

            // Gamepad Navigation for Options
            if (!hasNoOption && typeof GamepadController !== 'undefined') {
                const now = Date.now();
                if (now - this.#lastGamepadInputTime > 200) {
                    if (GamepadController.isPressed('dpadU')) {
                        this.#selectedOptionIndex = Math.max(0, this.#selectedOptionIndex - 1);
                        this.#lastGamepadInputTime = now;
                    } else if (GamepadController.isPressed('dpadD')) {
                        this.#selectedOptionIndex = Math.min(this.#CURRENT["options"].length - 1, this.#selectedOptionIndex + 1);
                        this.#lastGamepadInputTime = now;
                    }
                }
            }

            if (hasNoOption) {
                Font.draw(ctx, ">>", Math.floor(ctx.canvas.height / 33), ctx.canvas.width * 0.95, ctx.canvas.height * 0.975)
            } else {
                for (let i = 0, l = this.#CURRENT["options"].length; i < l; i++) {
                    const isGamepadSelected = (i === this.#selectedOptionIndex && Controller.isGamepadActive);
                    if (MessageButton.draw(
                        ctx, this.#CURRENT["options"][i]["text"], textFontSize,
                        ctx.canvas.width * 0.925 - Font.measure(ctx, this.#CURRENT["options"][i]["text"]).width,
                        boxRect.y - textFontSize * (l - i) * 2 - textFontSize / 2,
                        undefined, undefined, isGamepadSelected
                    )) {
                        currentHover = i
                        this.#selectedOptionIndex = i // Update gamepad index based on mouse hover too
                    }
                }
            }

            // ADVANCE Logic (Mouse OR Keyboard E OR Gamepad A)
            const now = Date.now();
            const isAdvancePressed = ((!Controller.mouse_prev.leftClick && Controller.mouse.leftClick)
                || (Controller.keys["KeyE"] && !Controller.keys_prev["KeyE"])
                || (typeof GamepadController !== 'undefined' && GamepadController.isJustPressed('btnA')))
                && (GAME_ENGINE.timer.frameCount !== this.#frameStartedInitiated)
                && (now - this.#lastGamepadInputTime > 250);

            if (isAdvancePressed) {
                if (hasNoOption) {
                    if (this.#CURRENT.next == null) {
                        this.#CURRENT = null;
                    } else {
                        this.update(this.#CURRENT.next, this.#CURRENT_INIT_BY)
                    }
                } else {
                    // Use currentHover if mouse is hovering, otherwise use #selectedOptionIndex
                    const finalIndex = currentHover >= 0 ? currentHover : this.#selectedOptionIndex;
                    const option = this.#CURRENT["options"][finalIndex];
                    if (option) {
                        if (option.act.startsWith("$")) {
                            if (option.act.localeCompare("$close") === 0) {
                                this.#CURRENT = null;
                            } else if (option.act.localeCompare("$trade") === 0) {
                                this.#CURRENT = null;
                                GAME_ENGINE.getPlayerUi().startATrade(this.#CURRENT_INIT_BY);
                            }
                        } else {
                            this.update(option.act, this.#CURRENT_INIT_BY)
                        }
                    }
                }
            }
        }
    }
}