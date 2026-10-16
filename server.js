import "dotenv/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;
const gnewsApiKey = process.env.GNEWS_API_KEY;
const validSections = new Set(["netherlands", "international"]);
const maximumLocationLength = 80;
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(projectDirectory, "public")));

app.get("/api/news", async (request, response) => {
  const section = request.query.section || "netherlands";
  const location = typeof request.query.location === "string" ? request.query.location.trim() : "";
  const page = parsePage(request.query.page);

  if (!validSections.has(section)) {
    return response.status(400).json({ error: "Onbekende nieuwssectie." });
  }

  if (!page) {
    return response.status(400).json({ error: "Voer een geldig paginanummer in." });
  }

  if (location.length > maximumLocationLength) {
    return response.status(400).json({ error: "Voer een plaatsnaam van maximaal 80 tekens in." });
  }

  if (!gnewsApiKey) {
    return response.status(500).json({
      error: "De nieuws-API is niet geconfigureerd. Voeg GNEWS_API_KEY toe aan je .env-bestand."
    });
  }

  const parameters = new URLSearchParams({
    q: location || (section === "netherlands" ? "nieuws" : "world"),
    lang: section === "netherlands" ? "nl" : "en",
    max: "25",
    page: String(page),
    apikey: gnewsApiKey
  });

  if (section === "netherlands") {
    parameters.set("country", "nl");
  }

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
    const sourceArticles = data.articles || [];
    const articles = removeDuplicates(sourceArticles).slice(0, 25).map((article) => ({
      title: article.title,
      summary: createSummary(article.description, article.content),
      image: article.image,
      source: article.source?.name || "Onbekende bron",
      sourceUrl: article.source?.url,
      url: article.url,
      publishedAt: article.publishedAt
    }));

    const totalArticles = Number.isInteger(data.totalArticles) ? data.totalArticles : articles.length;

    return response.json({
      articles,
      pagination: {
        page,
        pageSize: sourceArticles.length,
        totalArticles
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("GNews API is niet bereikbaar:", error);
    return response.status(502).json({
      error: "De nieuwsbron is tijdelijk niet bereikbaar. Controleer je internetverbinding en probeer opnieuw."
    });
  }
});

function parsePage(value) {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

// Persbureauberichten (zoals ANP) verschijnen op veel sites tegelijk, soms met een
// iets andere kop. Een artikel geldt als dubbel bij dezelfde URL of een kop die
// grotendeels uit dezelfde woorden bestaat als een eerder artikel.
function removeDuplicates(articles) {
  const seenUrls = new Set();
  const seenTitles = [];

  return articles.filter((article) => {
    const url = normalizeUrl(article.url);
    const words = titleWords(article.title);

    if (url && seenUrls.has(url)) {
      return false;
    }

    if (seenTitles.some((seenWords) => isSimilar(words, seenWords))) {
      return false;
    }

    if (url) {
      seenUrls.add(url);
    }
    seenTitles.push(words);
    return true;
  });
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

function titleWords(title = "") {
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // Sites zetten hun eigen naam vaak achter de kop, bijvoorbeeld "... | NU.nl".
    .replace(/\s+[|\-–—]\s+[^|\-–—]+$/, "");

  return new Set(normalized.match(/[\p{L}\p{N}]{3,}/gu) || []);
}

function isSimilar(wordsA, wordsB) {
  if (!wordsA.size || !wordsB.size) {
    return false;
  }

  let shared = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) {
      shared += 1;
    }
  });

  return shared / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

function createSummary(description, content) {
  const text = description || content || "Voor dit artikel is nog geen samenvatting beschikbaar.";
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  return sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Nieuws-app draait op http://localhost:${port}`);
  });
}

export default app;
