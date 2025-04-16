import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import vision from "@google-cloud/vision";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const client = new vision.ImageAnnotatorClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeLabels = async (labels) => {
  const prompt = `
Du er en ernæringsassistent. Basert på følgende bildeetiketter: ${labels.join(', ')}, gi en kort beskrivelse av maten og et estimat på kalorier. Returner kun beskrivelsen og estimert kalorimengde, ikke noe annet.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // Endret fra gpt-4
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content.trim();
};

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Ingen fil lastet opp" });
    }
    app.post("/text-analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Ingen tekst mottatt" });
    }

    const prompt = `
Hva er næringsinnholdet per 100g for ${text.toLowerCase()}, inkludert kalorier, proteiner, fett, karbohydrater? 
Hvilke vitaminer og mineraler finnes i denne matvaren, og hva bidrar de med i kroppen?
Svar kort og punktvis.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ result: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("❌ Feil i tekst-analyse:", error);
    res.status(500).json({ error: "Tekstanalyse mislyktes" });
  }
});


    const filePath = path.resolve(req.file.path);
    const [result] = await client.labelDetection(filePath);
    const labels = result.labelAnnotations.map(label => label.description);

    console.log("🔎 Vision labels:", labels);

    const response = await analyzeLabels(labels);

    // Slett midlertidig bilde
    fs.unlinkSync(filePath);

    res.json({ result: response });
  } catch (error) {
    console.error("❌ Feil i analyse:", error);
    res.status(500).json({ error: "Analyse mislyktes" });
  }
});

app.listen(port, () => {
  console.log(`✅ Server kjører på port ${port}`);
});
