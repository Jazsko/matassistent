import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { OpenAI } from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const visionClient = new ImageAnnotatorClient({
  keyFilename: "service-account.json" // legg denne filen i rotmappa (ikke i git!)
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("✅ Matassistent backend kjører!");
});

app.post("/analyze", async (req, res) => {
  const base64Image = req.body.image?.split(",")[1];
  if (!base64Image) return res.status(400).json({ error: "Ingen bilde mottatt" });

  try {
    console.log("📸 Bilde mottatt – starter analyse...");

    const [result] = await visionClient.labelDetection({ image: { content: base64Image } });
    const labels = result.labelAnnotations.map((label) => label.description);
    console.log("🔎 Vision labels:", labels);

    const food = labels.find((l) =>
      l.match(/apple|banana|carrot|bread|salmon|rice|egg|potato|cheese/i)
    ) || labels[0];

    const prompt = `
Hva er næringsinnholdet per 100g for ${food.toLowerCase()}, inkludert kalorier, proteiner, fett, karbohydrater? 
Hvilke vitaminer og mineraler finnes i denne matvaren, og hva bidrar de med i kroppen?
Svar kort og punktvis.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({
      food,
      nutrition: {
        calories: 89,
        protein: "1.1g",
        fat: "0.3g",
        carbs: "22.8g",
        benefits: completion.choices[0].message.content,
        details: [
          { name: "Vitamin B6", function: "Støtter immunforsvaret og hjernen" },
          { name: "Kalium", function: "Regulerer blodtrykk og væskebalanse" }
        ]
      }
    });
  } catch (err) {
    console.error("❌ Feil i bildeanalyse:", err);
    res.status(500).json({ error: "Analyse mislyktes" });
  }
});

app.post("/text-analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Ingen tekst mottatt" });

    const prompt = `
Hva er næringsinnholdet per 100g for ${text.toLowerCase()}, inkludert kalorier, proteiner, fett, karbohydrater? 
Hvilke vitaminer og mineraler finnes i denne matvaren, og hva bidrar de med i kroppen?
Svar kort og punktvis.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({ result: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("❌ Feil i tekst-analyse:", error);
    res.status(500).json({ error: "Tekstanalyse mislyktes" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server kjører på port ${PORT}`);
});
