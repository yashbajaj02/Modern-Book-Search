// Google Books API key setup:
// 1. Paste your browser-restricted API key below.
// 2. In Google Cloud Console, restrict the key to "HTTP referrers (web sites)".
// 3. Add only the domains you use, for example:
//    - http://localhost:*
//    - https://your-github-username.github.io/*
//    - https://your-custom-domain.com/*
// 4. Also restrict the key to the Google Books API only.
const API_KEY = "AIzaSyBeV2GjoQrZwjYHiQnz67rQG_rsti0JLjM";

const API_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const MAX_RESULTS = 12;
const MAX_SUGGESTIONS = 6;
const DEBOUNCE_DELAY = 220;
const MIN_SUGGESTION_CHARS = 3;
const REQUEST_TIMEOUT = 4500;

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchBox = document.querySelector("#searchBox");
const suggestionsList = document.querySelector("#suggestionsList");
const booksGrid = document.querySelector("#booksGrid");
const loader = document.querySelector("#loader");
const message = document.querySelector("#message");
const resultsTitle = document.querySelector("#resultsTitle");
const resultCount = document.querySelector("#resultCount");

let suggestionItems = [];
let activeSuggestionIndex = -1;
let suggestionAbortController = null;
let searchAbortController = null;
let debounceTimer = null;

const fallbackCoverText = "No cover available";
const FALLBACK_BOOKS = [
  createFallbackBook({
    title: "Atomic Habits",
    authors: ["James Clear"],
    publishedDate: "2018",
    description: "A practical guide to building good habits, breaking bad ones, and improving by one percent every day.",
    thumbnail: "https://books.google.com/books/content?id=fFCjDQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Atomic+Habits"
  }),
  createFallbackBook({
    title: "Atomic Love",
    authors: ["Jennie Fields"],
    publishedDate: "2020",
    description: "A historical novel about science, secrets, and complicated love in postwar Chicago.",
    thumbnail: "https://books.google.com/books/content?id=Qai-DwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Atomic+Love"
  }),
  createFallbackBook({
    title: "Atomic Design",
    authors: ["Brad Frost"],
    publishedDate: "2016",
    description: "A design systems book that explains how to create interfaces from small reusable pieces.",
    thumbnail: "https://books.google.com/books/content?id=Z-8fvgAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Atomic+Design"
  }),
  createFallbackBook({
    title: "The Psychology of Money",
    authors: ["Morgan Housel"],
    publishedDate: "2020",
    description: "Timeless lessons on wealth, greed, happiness, and the behavior behind financial decisions.",
    thumbnail: "https://books.google.com/books/content?id=TnrrDwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=The+Psychology+of+Money"
  }),
  createFallbackBook({
    title: "Deep Work",
    authors: ["Cal Newport"],
    publishedDate: "2016",
    description: "Rules for focused success in a distracted world, with practical systems for meaningful productivity.",
    thumbnail: "https://books.google.com/books/content?id=ui1HCgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Deep+Work"
  }),
  createFallbackBook({
    title: "Clean Code",
    authors: ["Robert C. Martin"],
    publishedDate: "2008",
    description: "A handbook of agile software craftsmanship focused on writing readable, maintainable code.",
    thumbnail: "https://books.google.com/books/content?id=dwSfGQAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Clean+Code"
  }),
  createFallbackBook({
    title: "The Alchemist",
    authors: ["Paulo Coelho"],
    publishedDate: "1988",
    description: "A philosophical novel about a shepherd's journey, personal legend, courage, and destiny.",
    thumbnail: "https://books.google.com/books/content?id=FzVjBgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=The+Alchemist"
  }),
  createFallbackBook({
    title: "Rich Dad Poor Dad",
    authors: ["Robert T. Kiyosaki"],
    publishedDate: "1997",
    description: "A personal finance classic about assets, liabilities, investing, and money mindset.",
    thumbnail: "https://books.google.com/books/content?id=6XalDAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    previewLink: "https://books.google.com/books?q=Rich+Dad+Poor+Dad"
  })
];

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();

  if (!query) {
    showMessage("Type a book title, author, or topic to begin.", "info");
    searchInput.focus();
    return;
  }

  hideSuggestions();
  searchBooks(query);
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  clearTimeout(debounceTimer);
  activeSuggestionIndex = -1;

  if (query.length < MIN_SUGGESTION_CHARS) {
    hideSuggestions();
    return;
  }

  debounceTimer = setTimeout(() => fetchSuggestions(query), DEBOUNCE_DELAY);
});

searchInput.addEventListener("keydown", (event) => {
  if (!suggestionsList.classList.contains("show")) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSuggestion(1);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSuggestion(-1);
  }

  if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    selectSuggestion(suggestionItems[activeSuggestionIndex].title);
  }

  if (event.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (!searchForm.contains(event.target)) {
    hideSuggestions();
  }
});

async function fetchSuggestions(query) {
  const localSuggestions = getUniqueSuggestions(searchFallbackBooks(query, MAX_SUGGESTIONS));

  if (localSuggestions.length) {
    renderSuggestions(localSuggestions);
  }

  try {
    if (suggestionAbortController) {
      suggestionAbortController.abort();
    }

    suggestionAbortController = new AbortController();
    const books = await requestBooks(query, MAX_SUGGESTIONS, suggestionAbortController.signal);
    const uniqueSuggestions = getUniqueSuggestions([...books, ...searchFallbackBooks(query, MAX_SUGGESTIONS)]);
    renderSuggestions(uniqueSuggestions);
  } catch (error) {
    if (error.name !== "AbortError" && !localSuggestions.length) {
      hideSuggestions();
    }
  }
}

async function searchBooks(query) {
  try {
    if (searchAbortController) {
      searchAbortController.abort();
    }

    searchAbortController = new AbortController();
    setLoading(true);
    clearMessage();
    booksGrid.innerHTML = "";
    resultCount.textContent = "Searching...";
    resultsTitle.textContent = `Results for "${query}"`;

    const instantFallbackBooks = searchFallbackBooks(query, MAX_RESULTS);

    if (instantFallbackBooks.length) {
      renderBooks(instantFallbackBooks);
      resultCount.textContent = `${instantFallbackBooks.length} ${instantFallbackBooks.length === 1 ? "book" : "books"}`;
      showMessage("Showing instant results while live Google Books data loads.", "info");
    }

    const books = await requestBooks(query, MAX_RESULTS, searchAbortController.signal);

    if (!books.length) {
      if (!instantFallbackBooks.length) {
        renderSearchFallback(query);
      }

      return;
    }

    booksGrid.innerHTML = "";
    clearMessage();
    renderBooks(books);
    resultCount.textContent = `${books.length} ${books.length === 1 ? "book" : "books"}`;
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (!booksGrid.children.length) {
      renderSearchFallback(query);
      return;
    }

    showMessage("Showing instant fallback results. Add a correctly restricted Google Books API key for live results.", "info");
  } finally {
    setLoading(false);
  }
}

function renderSearchFallback(query) {
  const fallbackBooks = searchFallbackBooks(query, MAX_RESULTS);

  if (!fallbackBooks.length) {
    resultCount.textContent = "0 books";
    showMessage("No books found. Try a different title, author, or topic.", "info");
    return;
  }

  renderBooks(fallbackBooks);
  resultCount.textContent = `${fallbackBooks.length} ${fallbackBooks.length === 1 ? "book" : "books"}`;
  showMessage("Showing instant fallback results. Add a correctly restricted Google Books API key for live results.", "info");
}

async function requestBooks(query, maxResults, signal) {
  const keyedUrl = buildBooksUrl(query, maxResults, API_KEY);
  let data;

  // Google Books supports public read requests. This fallback keeps the static
  // app usable if a demo key is restricted, expired, or not yet configured.
  try {
    data = await requestJSON(keyedUrl, signal);
  } catch (error) {
    if (!API_KEY || error.name === "AbortError") {
      throw error;
    }

    data = await requestJSON(buildBooksUrl(query, maxResults), signal);
  }

  return Array.isArray(data.items) ? data.items : [];
}

async function requestJSON(url, signal) {
  if ("fetch" in window) {
    try {
      const response = await withRequestTimeout(fetch(url, { signal }), signal);

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }
    }
  }

  return requestJSONWithXHR(url, signal);
}

function requestJSONWithXHR(url, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "json";
    xhr.timeout = REQUEST_TIMEOUT;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response || JSON.parse(xhr.responseText));
        return;
      }

      reject(new Error(`Google Books API error: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network request failed."));
    xhr.ontimeout = () => reject(new Error("Google Books API request timed out."));
    xhr.onabort = () => reject(new DOMException("Request aborted.", "AbortError"));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send();
  });
}

function withRequestTimeout(promise, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Google Books API request timed out."));
    }, REQUEST_TIMEOUT);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeoutId);
          reject(new DOMException("Request aborted.", "AbortError"));
        },
        { once: true }
      );
    }

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

function buildBooksUrl(query, maxResults, apiKey = "") {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults)
  });

  if (apiKey) {
    params.set("key", apiKey);
  }

  return `${API_BASE_URL}?${params.toString()}`;
}

function createFallbackBook({ title, authors, publishedDate, description, thumbnail, previewLink }) {
  return {
    volumeInfo: {
      title,
      authors,
      publishedDate,
      description,
      previewLink,
      infoLink: previewLink,
      imageLinks: {
        thumbnail,
        smallThumbnail: thumbnail
      }
    }
  };
}

function searchFallbackBooks(query, limit) {
  const normalizedQuery = query.toLowerCase();
  const scoredBooks = FALLBACK_BOOKS
    .map((book) => {
      const info = book.volumeInfo || {};
      const title = normalizeText(info.title).toLowerCase();
      const authors = normalizeText((info.authors || []).join(" ")).toLowerCase();
      const description = normalizeText(info.description).toLowerCase();
      const haystack = `${title} ${authors} ${description}`;
      let score = 0;

      if (title.startsWith(normalizedQuery)) {
        score += 4;
      }

      if (title.includes(normalizedQuery)) {
        score += 3;
      }

      if (authors.includes(normalizedQuery)) {
        score += 2;
      }

      if (haystack.includes(normalizedQuery)) {
        score += 1;
      }

      return { book, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredBooks.map((item) => item.book).slice(0, limit);
}

function getUniqueSuggestions(books) {
  const seen = new Set();

  return books
    .map((book) => {
      const info = book.volumeInfo || {};
      return {
        title: normalizeText(info.title) || "Untitled book",
        author: normalizeText((info.authors || []).join(", ")) || "Unknown author"
      };
    })
    .filter((book) => {
      const key = book.title.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUGGESTIONS);
}

function renderSuggestions(suggestions) {
  suggestionItems = suggestions;
  activeSuggestionIndex = -1;
  suggestionsList.innerHTML = "";

  if (!suggestions.length) {
    hideSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();

  suggestions.forEach((suggestion, index) => {
    const item = document.createElement("li");
    item.className = "suggestion-item";
    item.setAttribute("role", "option");
    item.setAttribute("id", `suggestion-${index}`);
    item.innerHTML = `
      <span class="suggestion-title">${escapeHTML(suggestion.title)}</span>
      <span class="suggestion-meta">${escapeHTML(suggestion.author)}</span>
    `;
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectSuggestion(suggestion.title);
    });
    fragment.appendChild(item);
  });

  suggestionsList.appendChild(fragment);
  suggestionsList.classList.add("show");
  searchInput.setAttribute("aria-expanded", "true");
}

function moveSuggestion(direction) {
  if (!suggestionItems.length) {
    return;
  }

  const options = suggestionsList.querySelectorAll(".suggestion-item");
  activeSuggestionIndex += direction;

  if (activeSuggestionIndex < 0) {
    activeSuggestionIndex = suggestionItems.length - 1;
  }

  if (activeSuggestionIndex >= suggestionItems.length) {
    activeSuggestionIndex = 0;
  }

  options.forEach((option, index) => {
    const isActive = index === activeSuggestionIndex;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });

  searchInput.setAttribute("aria-activedescendant", `suggestion-${activeSuggestionIndex}`);
}

function selectSuggestion(title) {
  searchInput.value = title;
  hideSuggestions();
  searchBooks(title);
}

function renderBooks(books) {
  const fragment = document.createDocumentFragment();

  books.forEach((book, index) => {
    const info = book.volumeInfo || {};
    const title = normalizeText(info.title) || "Untitled book";
    const authors = normalizeText((info.authors || []).join(", ")) || "Unknown author";
    const publishedDate = normalizeText(info.publishedDate) || "Unknown date";
    const description = normalizeText(stripHTML(info.description)) || "No description is available for this book yet.";
    const thumbnail = getThumbnail(info.imageLinks);
    const previewLink = info.previewLink || info.infoLink || "#";
    const infoLink = info.infoLink || previewLink;

    const card = document.createElement("article");
    card.className = "book-card";
    card.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
    card.innerHTML = `
      <div class="cover-wrap">
        ${thumbnail
          ? `<img class="book-cover" src="${escapeAttribute(thumbnail)}" alt="${escapeAttribute(title)} cover" loading="lazy">`
          : `<div class="cover-fallback">${fallbackCoverText}</div>`
        }
      </div>
      <div class="book-body">
        <h3 class="book-title">${escapeHTML(title)}</h3>
        <div class="book-meta">
          <span>By ${escapeHTML(authors)}</span>
          <span>Published ${escapeHTML(publishedDate)}</span>
        </div>
        <p class="book-description">${escapeHTML(description)}</p>
      </div>
      <div class="book-actions">
        <a class="book-link primary" href="${escapeAttribute(previewLink)}" target="_blank" rel="noreferrer">Preview Book</a>
        <a class="book-link" href="${escapeAttribute(infoLink)}" target="_blank" rel="noreferrer">More Info</a>
      </div>
    `;

    fragment.appendChild(card);
  });

  booksGrid.appendChild(fragment);
}

function getThumbnail(imageLinks = {}) {
  const thumbnail = imageLinks.thumbnail || imageLinks.smallThumbnail;
  return thumbnail ? thumbnail.replace("http://", "https://") : "";
}

function setLoading(isLoading) {
  loader.hidden = !isLoading;
  searchBox.classList.toggle("is-loading", isLoading);
}

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type === "info" ? "info" : ""}`;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
  message.className = "message";
}

function hideSuggestions() {
  suggestionsList.classList.remove("show");
  suggestionsList.innerHTML = "";
  suggestionItems = [];
  activeSuggestionIndex = -1;
  searchInput.setAttribute("aria-expanded", "false");
  searchInput.removeAttribute("aria-activedescendant");
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHTML(value = "") {
  const template = document.createElement("template");
  template.innerHTML = value;
  return template.content.textContent || "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
