// Enkel backend for tekstbasert matvareanalyse med Google Gemini

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Gemini init
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.get("/", (req, res) => {
  res.send("✅ Tekstbasert Matassistent backend kjører!");
});

app.post("/text-analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Ingen matvare sendt" });

  try {
    const prompt = `
Gi en kort og tydelig oppsummering av næringsinnholdet per 100g for matvaren "${text}".
Ta med:
- Kalorier
- Proteiner, fett og karbohydrater
- Viktige vitaminer og mineraler
- Hva de bidrar med i kroppen
Svar i punktform, på norsk.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    res.json({ result: content });
  } catch (err) {
    console.error("❌ Feil i tekstanalyse:", err);
    res.status(500).json({ error: "Tekstanalyse mislyktes" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Tekstbasert backend kjører på port ${PORT}`);
});
