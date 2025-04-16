const express = require("express");
const vision = require("@google-cloud/vision");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Google Vision Client
const visionClient = new vision.ImageAnnotatorClient();

// OpenAI-klient
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze", async (req, res) => {
  const base64Image = req.body.image?.split(",")[1];
  if (!base64Image) {
    return res.status(400).json({ error: "Ingen bilde mottatt" });
  }

  try {
    // 🔍 Google Vision analyse
    const [result] = await visionClient.labelDetection({ image: { content: base64Image } });
    const labels = result.labelAnnotations.map(label => label.description);
    const food = labels.find(label =>
      label.match(/apple|banana|carrot|bread|salmon|rice|egg|potato|cheese|chicken|milk|orange|avocado|broccoli/i)
    ) || labels[0] || "ukjent matvare";

    // 🧠 Prompt til ChatGPT
    const prompt = `
      Gi meg kun et gyldig JSON-objekt med følgende:
      {
        "food": "${food}",
        "calories": (per 100g),
        "protein": "...",
        "fat": "...",
        "carbs": "...",
        "benefits": "...",
        "vitaminsAndMinerals": [
          { "name": "...", "function": "..." },
          ...
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    res.json({
      food: parsed.food,
      nutrition: {
        calories: parsed.calories,
        protein: parsed.protein,
        fat: parsed.fat,
        carbs: parsed.carbs,
        benefits: parsed.benefits,
        details: parsed.vitaminsAndMinerals
      }
    });
  } catch (err) {
    console.error("Feil i /analyze:", err.message);
    res.status(500).json({ error: "Analyse mislyktes" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server kjører på http://localhost:${PORT}`);
});
