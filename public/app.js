const content = document.querySelector("#news-content");
const filters = document.querySelectorAll(".filter");
const refreshButton = document.querySelector("#refresh-button");
const lastUpdated = document.querySelector("#last-updated");
const locationSearch = document.querySelector("#location-search");
const locationInput = document.querySelector("#location-input");
const pagination = document.querySelector("#pagination");
const previousPageButton = document.querySelector("#previous-page");
const nextPageButton = document.querySelector("#next-page");
const pageStatus = document.querySelector("#page-status");
let activeSection = "netherlands";
let currentPage = 1;
let resultsPerPage = 25;

async function loadNews() {
  content.innerHTML = `
    <div class="loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      Nieuws wordt opgehaald...
    </div>
  `;
  refreshButton.disabled = true;
  pagination.hidden = true;

  try {
    const parameters = new URLSearchParams({
      section: activeSection,
      page: String(currentPage)
    });
    const location = locationInput.value.trim();

    if (location) {
      parameters.set("location", location);
    }

    const response = await fetch(`/api/news?${parameters}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Het nieuws kon niet worden opgehaald.");
    }

    renderArticles(data.articles);
    renderPagination(data.pagination);
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

function renderPagination({ page, pageSize, totalArticles }) {
  if (page === 1 && pageSize) {
    resultsPerPage = pageSize;
  }

  pagination.hidden = false;
  previousPageButton.disabled = page === 1;
  nextPageButton.disabled = page * resultsPerPage >= totalArticles;
  pageStatus.textContent = `Pagina ${page}`;
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
    currentPage = 1;
    resultsPerPage = 25;
    filters.forEach((button) => {
      const isActive = button === filter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    loadNews();
  });
});

refreshButton.addEventListener("click", loadNews);
locationSearch.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  resultsPerPage = 25;
  loadNews();
});
previousPageButton.addEventListener("click", () => {
  currentPage -= 1;
  loadNews();
});
nextPageButton.addEventListener("click", () => {
  currentPage += 1;
  loadNews();
});
loadNews();
