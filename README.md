# Modern Book Search App

A modern, responsive book discovery web app powered by the Google Books API. It includes instant autocomplete suggestions, keyboard navigation, fast search results, polished dark UI, loading states, and clear error handling.

## Features

- Search books using the Google Books API
- Live autocomplete suggestions while typing
- Maximum 6 dropdown suggestions
- Keyboard support for `Enter`, `Arrow Up`, and `Arrow Down`
- Book cards with cover, title, author, published date, and description
- `Preview Book` and `More Info` links
- Premium dark futuristic interface
- Glassmorphism search bar
- Blue neon hover effects
- Responsive layout for desktop, tablet, and mobile
- Smooth animations and loading indicators
- GitHub Pages compatible

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Google Books API

## How To Run Locally

1. Download or clone this repository.
2. Open the project folder.
3. Open `index.html` directly in your browser.

No build step, backend, package manager, or framework is required.

## How To Add API Key Safely

The API key is stored once in `main.js`:

```js
const API_KEY = "PASTE_YOUR_BROWSER_RESTRICTED_API_KEY_HERE";
```

For a public static app, the key will be visible in browser code. That is normal for client-side API usage, so protect it with Google Cloud restrictions:

1. Go to Google Cloud Console.
2. Open **APIs & Services**.
3. Enable **Google Books API**.
4. Open **Credentials** and select your API key.
5. Under **Application restrictions**, choose **HTTP referrers (web sites)**.
6. Add allowed referrers such as:
   - `http://localhost:*`
   - `https://your-github-username.github.io/*`
   - `https://your-custom-domain.com/*`
7. Under **API restrictions**, allow only **Google Books API**.
8. Save the changes.

Do not place private server secrets in this repository. This app is designed for a browser-restricted public API key, which keeps it compatible with GitHub Pages and helps avoid GitHub secret scanning problems.

## GitHub Pages Deployment

1. Push the project to a GitHub repository.
2. Go to repository **Settings**.
3. Open **Pages**.
4. Select the `main` branch and root folder.
5. Save and wait for the deployment URL.
6. Add the GitHub Pages URL to the allowed HTTP referrers for your Google Books API key.

## Screenshots

Add screenshots here after deployment:

- Desktop home and search results
- Mobile autocomplete dropdown
- Book card grid

## Future Improvements

- Add category filters
- Add sorting by newest or relevance
- Add saved favorites using local storage
- Add pagination or infinite scrolling
- Add theme toggle
- Add recent searches

## Author

**Yash Bajaj**

- GitHub: [https://github.com/yashbajaj02](https://github.com/yashbajaj02)
- LinkedIn: [https://www.linkedin.com/in/yashbajaj02/](https://www.linkedin.com/in/yashbajaj02/)
- Instagram: [https://www.instagram.com/yash___bajaj/](https://www.instagram.com/yash___bajaj/)
- YouTube: [https://www.youtube.com/@LyricJunction](https://www.youtube.com/@LyricJunction)
