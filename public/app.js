const content = document.querySelector("#news-content");
const filters = document.querySelectorAll(".filter");
const refreshButton = document.querySelector("#refresh-button");
const lastUpdated = document.querySelector("#last-updated");
let activeSection = "netherlands";

async function loadNews() {
  content.innerHTML = `
    <div class="loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      Nieuws wordt opgehaald...
    </div>
  `;
  refreshButton.disabled = true;

  try {
    const response = await fetch(`/api/news?section=${activeSection}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Het nieuws kon niet worden opgehaald.");
    }

    renderArticles(data.articles);
    lastUpdated.textContent = `Bijgewerkt ${formatTime(data.updatedAt)}`;
  } catch (error) {
    content.innerHTML = `
      <div class="error-message" role="alert">
        <strong>Oeps, daar ging iets mis.</strong>
        <span>${escapeHtml(error.message)}</span>
        <button type="button" class="try-again">Opnieuw proberen</button>
      </div>
    `;
    content.querySelector(".try-again").addEventListener("click", loadNews);
  } finally {
    refreshButton.disabled = false;
  }
}

function renderArticles(articles) {
  if (!articles.length) {
    content.innerHTML = '<p class="empty-message">Er zijn momenteel geen artikelen gevonden.</p>';
    return;
  }

  content.innerHTML = `<div class="article-grid">${articles.map(renderArticle).join("")}</div>`;
}

function renderArticle(article) {
  const image = article.image
    ? `<img src="${safeUrl(article.image)}" alt="" loading="lazy" />`
    : '<div class="image-placeholder" aria-hidden="true">A.</div>';
  const summary = article.summary.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const sourceLink = article.sourceUrl
    ? `<a href="${safeUrl(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.source)}</a>`
    : escapeHtml(article.source);

  return `
    <article class="article-card">
      <div class="article-image">${image}</div>
      <div class="article-body">
        <div class="article-meta">
          <span class="source">${sourceLink}</span>
          <time datetime="${escapeAttribute(article.publishedAt)}">${formatDate(article.publishedAt)}</time>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <div class="summary">
          <p>In het kort</p>
          <ul>${summary}</ul>
        </div>
        <a class="article-link" href="${safeUrl(article.url)}" target="_blank" rel="noopener noreferrer">
          Lees het oorspronkelijke bericht <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  `;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? escapeAttribute(url.href) : "#";
  } catch {
    return "#";
  }
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeSection = filter.dataset.section;
    filters.forEach((button) => {
      const isActive = button === filter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    loadNews();
  });
});

refreshButton.addEventListener("click", loadNews);
loadNews();
