import "dotenv/config";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;
const gnewsApiKey = process.env.GNEWS_API_KEY;
const validSections = new Set(["netherlands", "international"]);

app.use(express.static("public"));

app.get("/api/news", async (request, response) => {
  const section = request.query.section || "netherlands";

  if (!validSections.has(section)) {
    return response.status(400).json({ error: "Onbekende nieuwssectie." });
  }

  if (!gnewsApiKey) {
    return response.status(500).json({
      error: "De nieuws-API is niet geconfigureerd. Voeg GNEWS_API_KEY toe aan je .env-bestand."
    });
  }

  const parameters = new URLSearchParams({
    q: section === "netherlands" ? "nieuws" : "world",
    lang: section === "netherlands" ? "nl" : "en",
    country: section === "netherlands" ? "nl" : "us",
    max: "12",
    apikey: gnewsApiKey
  });

  try {
    const apiResponse = await fetch(`https://gnews.io/api/v4/search?${parameters}`);

    if (!apiResponse.ok) {
      const details = await apiResponse.json().catch(() => ({}));
      console.error("GNews API fout:", apiResponse.status, details);
      return response.status(apiResponse.status).json({
        error: "Het nieuws kon nu niet worden opgehaald. Probeer het straks opnieuw."
      });
    }

    const data = await apiResponse.json();
    const articles = (data.articles || []).map((article) => ({
      title: article.title,
      summary: createSummary(article.description, article.content),
      image: article.image,
      source: article.source?.name || "Onbekende bron",
      sourceUrl: article.source?.url,
      url: article.url,
      publishedAt: article.publishedAt
    }));

    return response.json({ articles, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("GNews API is niet bereikbaar:", error);
    return response.status(502).json({
      error: "De nieuwsbron is tijdelijk niet bereikbaar. Controleer je internetverbinding en probeer opnieuw."
    });
  }
});

function createSummary(description, content) {
  const text = description || content || "Voor dit artikel is nog geen samenvatting beschikbaar.";
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  return sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2);
}

app.listen(port, () => {
  console.log(`Nieuws-app draait op http://localhost:${port}`);
});
