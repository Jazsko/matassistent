const express = require("express");
const vision = require("@google-cloud/vision");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "10mb" }));

// ✅ Tillat Vercel-frontend å kontakte backend
app.use(cors({
  origin: "https://matassistent-frontend.vercel.app",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Google Vision-klient
const visionClient = new vision.ImageAnnotatorClient();

// ✅ OpenAI-klient
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔍 Bildeanalyse-endepunkt
app.post("/analyze", async (req, res) => {
  const base64Image = req.body.image?.split(",")[1];

  if (!base64Image) {
    console.log("🚫 Ingen bilde mottatt");
    return res.status(400).json({ error: "Ingen bilde mottatt" });
  }

  console.log("📸 Bilde mottatt – starter analyse...");

  try {
    const [result] = await visionClient.labelDetection({ image: { content: base64Image } });

    const labels = result.labelAnnotations.map(label => label.description);
    console.log("🔎 Vision labels:", labels);

    const food = labels.find(l =>
      l.match(/apple|banana|carrot|bread|salmon|rice|egg|potato|cheese|tomato|avocado|chicken|milk|yogurt/i)
    ) || labels[0];

    if (!food) {
      console.log("🚫 Ingen matvare funnet i bilde");
      return res.status(400).json({ error: "Ingen matvare identifisert" });
    }

    const prompt = `Hva er næringsinnholdet per 100g for ${food.toLowerCase()}, inkludert kalorier, proteiner, fett, karbohydrater? Hvilke vitaminer og mineraler finnes i denne matvaren, og hva bidrar de med i kroppen?`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    });

    console.log("✅ GPT-svar mottatt");

    res.json({
      food,
      nutrition: {
        calories: 89,
        protein: "1.1g",
        fat: "0.3g",
        carbs: "22.8g",
        benefits: completion.data.choices[0].message.content,
        details: [
          { name: "Vitamin B6", function: "Støtter immunforsvaret og hjernen" },
          { name: "Kalium", function: "Regulerer blodtrykk og væskebalanse" }
        ]
      }
    });
  } catch (err) {
    console.error("❌ Feil i analyse:", err);
    res.status(500).json({ error: "Analyse mislyktes" });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server kjører på port ${PORT}`));
