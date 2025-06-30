const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8000;

app.use(cors());

app.use(express.json());

const { handleCloudflare } = require("./cloudflare");

app.post("/api/cloudflare", async (req, res) => {
    try {
        const result = await handleCloudflare(req.body);
        res.json({ results: result });
    } catch (error) {
        console.error("Ошибка:", error);
        res.status(500).json({ error: "Ошибка на сервере", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});