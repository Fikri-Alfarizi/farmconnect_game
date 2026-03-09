class InventoryItems {

    static #ITEMS_SPRITE_SHEET
    static #PIXEL_SIZE
    static #LOCATIONS = {
        "pumpkin": [0, 0],
        "cabbage": [1, 0],
        "carrot": [2, 0],
        "grain": [3, 0],
        "potato": [4, 0],
        "strawberry": [5, 0],
        "tomato": [6, 0],
        "eggplant": [7, 0],
        "lavender": [8, 0],
        "corn": [9, 0],
        "pea": [9, 2],
        "pumpkin_seed": [0, 1],
        "cabbage_seed": [1, 1],
        "carrot_seed": [2, 1],
        "grain_seed": [3, 1],
        "potato_seed": [4, 1],
        "strawberry_seed": [5, 1],
        "tomato_seed": [6, 1],
        "eggplant_seed": [7, 1],
        "lavender_seed": [8, 1],
        "corn_seed": [9, 1],
        "pea_seed": [9, 3],
        "pot": [0, 3],
        "axe": [0, 4],
        "hoe": [3, 4]
    }
    static PRICES = {
        "pumpkin": 200,
        "cabbage": 200,
        "carrot": 200,
        "grain": 200,
        "potato": 200,
        "strawberry": 200,
        "tomato": 200,
        "eggplant": 200,
        "lavender": 200,
        "corn": 200,
        "pea": 200,
        "pumpkin_seed": 20,
        "cabbage_seed": 20,
        "carrot_seed": 20,
        "grain_seed": 20,
        "potato_seed": 20,
        "strawberry_seed": 20,
        "tomato_seed": 20,
        "eggplant_seed": 20,
        "lavender_seed": 20,
        "corn_seed": 20,
        "pea_seed": 20,
    }
    static NAMES = {
        "pumpkin": "Labu",
        "cabbage": "Kubis",
        "carrot": "Wortel",
        "grain": "Gandum",
        "potato": "Kentang",
        "strawberry": "Stroberi",
        "tomato": "Tomat",
        "eggplant": "Terong",
        "lavender": "Lavender",
        "corn": "Jagung",
        "pea": "Kacang Polong",
        "pumpkin_seed": "Bibit Labu",
        "cabbage_seed": "Bibit Kubis",
        "carrot_seed": "Bibit Wortel",
        "grain_seed": "Bibit Gandum",
        "potato_seed": "Bibit Kentang",
        "strawberry_seed": "Bibit Stroberi",
        "tomato_seed": "Bibit Tomat",
        "eggplant_seed": "Bibit Terong",
        "lavender_seed": "Bibit Lavender",
        "corn_seed": "Bibit Jagung",
        "pea_seed": "Bibit Kacang Polong",
    }

    static init() {
        this.#ITEMS_SPRITE_SHEET = ASSET_MANAGER.getImage("items", "items.png")
        this.#PIXEL_SIZE = ASSET_MANAGER.getJson("images", "items", "items.json")["tilewidth"]
    }

    // if an item can be used
    static isUsable(key) {
        return key.endsWith("seed")
    }

    static drawImage(ctx, key, pixelX, pixelY, width, height, offsetTileX = 0, offsetTileY = 0) {
        const _loc = this.#LOCATIONS[key]
        ctx.drawImage(this.#ITEMS_SPRITE_SHEET, (_loc[0] + offsetTileX) * this.#PIXEL_SIZE, (_loc[1] + offsetTileY) * this.#PIXEL_SIZE, this.#PIXEL_SIZE, this.#PIXEL_SIZE, pixelX, pixelY, width, height)
    }
}

