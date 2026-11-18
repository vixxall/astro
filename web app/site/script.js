/* ==========================================================================
   Astro Hub - Main JavaScript
   Handles: shared navbar/footer, favorites (API/localStorage), page rendering,
   planet detail, gallery filtering + popup, quiz, and auth.
   ========================================================================== */

/* --------------------------------------------------------------------------
   0. API CLIENT HELPERS
   All backend calls go through these helpers.
   The API base URL is the same origin since Express serves both.
   -------------------------------------------------------------------------- */
const API_BASE = ''; // same origin — Express serves both frontend and API

/** Get the stored JWT token */
function getToken() {
  return localStorage.getItem('astrohub_token');
}

/** Returns true if the user is currently logged in */
function isLoggedIn() {
  return !!getToken();
}

/** Get the stored user object */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('astrohub_user')) || null;
  } catch (_) {
    return null;
  }
}

/** Build Authorization headers for protected requests */
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() };
}

/** Store token + user after login/register */
function setSession(token, user) {
  localStorage.setItem('astrohub_token', token);
  localStorage.setItem('astrohub_user', JSON.stringify(user));
  sessionStorage.setItem(AUTH_TAB_KEY, 'active');
  localStorage.removeItem(AUTH_CLOSE_KEY);
}

/** Clear session on logout */
function clearSession() {
  localStorage.removeItem('astrohub_token');
  localStorage.removeItem('astrohub_user');
}

const AUTH_TAB_KEY = 'astrohub_auth_tab';
const AUTH_CLOSE_KEY = 'astrohub_auth_close_at';
const AUTH_CLOSE_TIMEOUT = 5 * 60 * 1000;
let authLogoutInProgress = false;
let authCloseTimer = null;

/** Keep auth scoped to this browser tab while preserving refreshes/routes. */
function logoutAndRedirect(reason = 'session-ended') {
  if (authLogoutInProgress) return;
  authLogoutInProgress = true;
  clearSession();
  sessionStorage.removeItem(AUTH_TAB_KEY);
  localStorage.removeItem(AUTH_CLOSE_KEY);

  if (window.supabase?.auth?.signOut) {
    window.supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }

  if (reason !== 'manual' && !/login\.html$/i.test(window.location.pathname)) {
    window.location.replace('login.html');
  }
}

function initializeAuthLifecycle() {
  const token = getToken();
  const tabMarker = sessionStorage.getItem(AUTH_TAB_KEY);
  const closeAt = Number(localStorage.getItem(AUTH_CLOSE_KEY) || 0);

  if (token && !tabMarker) {
    // A new tab or reopened browser must not inherit the old localStorage auth.
    clearSession();
    localStorage.removeItem(AUTH_CLOSE_KEY);
  } else if (token && closeAt && Date.now() - closeAt >= AUTH_CLOSE_TIMEOUT) {
    logoutAndRedirect();
    return false;
  } else if (token) {
    sessionStorage.setItem(AUTH_TAB_KEY, 'active');
    localStorage.removeItem(AUTH_CLOSE_KEY);
  }

  const recordPageExit = () => {
    if (!getToken() || authLogoutInProgress) return;
    // pagehide also fires for refresh/navigation; sessionStorage lets the next
    // page load distinguish those from a newly opened browser session.
    localStorage.setItem(AUTH_CLOSE_KEY, String(Date.now()));
  };

  const scheduleCloseLogout = (exitAt) => {
    if (authCloseTimer) clearTimeout(authCloseTimer);
    const remaining = AUTH_CLOSE_TIMEOUT - (Date.now() - exitAt);
    if (remaining <= 0) {
      logoutAndRedirect();
      return;
    }
    authCloseTimer = setTimeout(() => logoutAndRedirect(), remaining);
  };

  window.addEventListener('pagehide', recordPageExit, { capture: true });
  window.addEventListener('beforeunload', recordPageExit, { capture: true });
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_CLOSE_KEY && event.newValue) {
      scheduleCloseLogout(Number(event.newValue));
    } else if (event.key === AUTH_CLOSE_KEY && !event.newValue && authCloseTimer) {
      clearTimeout(authCloseTimer);
      authCloseTimer = null;
    }
  });
  window.addEventListener('pageshow', () => {
    const exitAt = Number(localStorage.getItem(AUTH_CLOSE_KEY) || 0);
    if (getToken() && exitAt && Date.now() - exitAt >= AUTH_CLOSE_TIMEOUT) {
      logoutAndRedirect();
    }
  });
  return true;
}

function enforceProtectedRoute() {
  const protectedPage = ['favorites.html', 'profile.html', 'admin.html']
    .includes((window.ACTIVE_PAGE || '').toLowerCase());
  if (protectedPage && !isLoggedIn()) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

/* --------------------------------------------------------------------------
   1. SHARED NAVBAR + FOOTER
   We inject the same navbar and footer into every page so we don't repeat
   HTML. Each page just needs <div id="navbar"></div> and <div id="footer">.
   -------------------------------------------------------------------------- */
function buildNavbar(activePage) {
  // The list of navigation links: [label, file, icon]
  const links = [
    ["Home", "index.html", "fa-house"],
    ["Planets", "planets.html", "fa-globe"],
    ["Stars", "stars.html", "fa-star"],
    ["Missions", "missions.html", "fa-rocket"],
    ["NASA Gallery", "gallery.html", "fa-images"],
    ["Quiz", "quiz.html", "fa-brain"],
    ["Favorites", "favorites.html", "fa-heart"],
    ["About", "about.html", "fa-circle-info"],
  ];

  // Build the <li> items, marking the current page as active
  const items = links
    .map(([label, file, icon]) => {
      const active = file === activePage ? "active" : "";
      return `<li class="nav-item">
        <a class="nav-link ${active}" href="${file}">
          <i class="fa-solid ${icon} me-1"></i>${label}
        </a>
      </li>`;
    })
    .join("");

  // Show user name + logout if logged in, otherwise login/signup buttons
  const user = getCurrentUser();
  const adminLink = user?.isAdmin
    ? `<li class="nav-item">
        <a class="nav-link ${activePage === "admin.html" ? "active" : ""}" href="admin.html">
          <i class="fa-solid fa-user-shield me-1"></i>Admin
        </a>
      </li>`
    : "";
  const profileLink = user
    ? `<li class="nav-item">
        <a class="nav-link ${activePage === "profile.html" ? "active" : ""}" href="profile.html">
          <i class="fa-solid fa-user-astronaut me-1"></i>Profile
        </a>
      </li>`
    : "";
  const authSection = user
    ? `<li class="nav-item ms-lg-2">
        <span class="btn btn-outline-space btn-sm" style="cursor:default">
          <i class="fa-solid fa-user me-1"></i>${user.firstName}
        </span>
      </li>
      <li class="nav-item ms-lg-1">
        <button id="navLogoutBtn" class="btn btn-space btn-sm">
          <i class="fa-solid fa-right-from-bracket me-1"></i>Logout
        </button>
      </li>`
    : `<li class="nav-item ms-lg-2 login-nav-item">
        <a class="btn btn-space btn-sm" href="login.html">
          <i class=""></i>Login
        </a>
      </li>
      <li class="nav-item ms-lg-2 signup-nav-item">
        <a class="btn btn-outline-space btn-sm" href="signup.html">
          <i class=""></i>SignUp
        </a>
      </li>`;

  return `
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
    <div class="container">
      <a class="navbar-brand gradient-text" href="index.html">
        <i class="fa-solid fa-meteor me-2"></i>Astro Hub
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse"
        data-bs-target="#navMenu" aria-controls="navMenu" aria-expanded="false" aria-label="Toggle navigation">
        <i class="fa-solid fa-bars"></i>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto align-items-lg-center">
          ${items}
          ${adminLink}
          ${profileLink}
          ${authSection}
        </ul>
      </div>
    </div>
  </nav>`;
}

function buildFooter() {
  const year = new Date().getFullYear();
  return `
  <footer class="footer">
    <div class="container">
      <div class="row gy-4">
        <div class="col-lg-4">
          <h5 class="gradient-text fw-bold"><i class="fa-solid fa-meteor me-2"></i>Astro Hub</h5>
          <p class="text-muted-space">Explore the wonders of the universe. An educational
          astronomy platform for students and space enthusiasts.</p>
        </div>
        <div class="col-6 col-lg-2">
          <h6 class="fw-bold mb-3">Quick Links</h6>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="index.html">Home</a></li>
            <li class="mb-2"><a href="planets.html">Planets</a></li>
            <li class="mb-2"><a href="stars.html">Stars</a></li>
            <li class="mb-2"><a href="missions.html">Missions</a></li>
            <li class="mb-2"><a href="gallery.html">Gallery</a></li>
            <li class="mb-2"><a href="quiz.html">Quiz</a></li>
          </ul>
        </div>
        <div class="col-6 col-lg-3">
          <h6 class="fw-bold mb-3">Contact</h6>
          <ul class="list-unstyled text-muted-space">
            <li class="mb-2"><i class="fa-solid fa-envelope me-2 text-info"></i>vishal@astrohub.com</li>
            <li class="mb-2"><i class="fa-solid fa-phone me-2 text-info"></i>+1 (555) 010-2025</li>
            <li class="mb-2"><i class="fa-solid fa-location-dot me-2 text-info"></i>india</li>
          </ul>
        </div>
        <div class="col-lg-3">
          <h6 class="fw-bold mb-3">Follow Us</h6>
          <div>
            <a class="social-icon" href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
            <a class="social-icon" href="#" aria-label="Twitter"><i class="fa-brands fa-x-twitter"></i></a>
            <a class="social-icon" href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a class="social-icon" href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
          </div>
        </div>
      </div>
      <hr class="divider mt-4">
      <p class="text-center text-muted-space mb-0">
        &copy; ${year} Astro Hub. Built for learning and exploration.
      </p>
    </div>
  </footer>`;
}

function buildSearchIndex() {
  const sections = [];

  PLANETS.forEach((planet) => {
    sections.push({
      type: "Planet",
      title: planet.name,
      subtitle: planet.type,
      description: planet.description,
      href: `planet-detail.html?id=${planet.id}`,
      searchText: `${planet.name} ${planet.type} ${planet.description} ${planet.distance} ${planet.atmosphere}`.toLowerCase(),
    });
  });

  STARS.forEach((star) => {
    sections.push({
      type: "Star",
      title: star.name,
      subtitle: star.type,
      description: star.description,
      href: `star-detail.html?id=${star.id}`,
      searchText: `${star.name} ${star.type} ${star.description} ${star.constellation}`.toLowerCase(),
    });
  });

  MISSIONS.forEach((mission) => {
    sections.push({
      type: "Mission",
      title: mission.name,
      subtitle: mission.agency,
      description: mission.description,
      href: "missions.html",
      searchText: `${mission.name} ${mission.agency} ${mission.destination} ${mission.description} ${mission.status}`.toLowerCase(),
    });
  });

  GALLERY.forEach((image) => {
    sections.push({
      type: "Gallery",
      title: image.title,
      subtitle: image.category,
      description: image.description,
      href: "gallery.html",
      searchText: `${image.title} ${image.category} ${image.description}`.toLowerCase(),
    });
  });

  return sections;
}

function renderGlobalSearchResults(query) {
  const results = document.getElementById("globalSearchResults");
  const input = document.getElementById("globalSearchInput");
  if (!results || !input) return;

  const term = query.trim().toLowerCase();
  if (!term) {
    results.innerHTML = "";
    results.classList.remove("show");
    return;
  }

  const matches = buildSearchIndex()
    .filter((item) => item.searchText.includes(term))
    .slice(0, 6);

  if (!matches.length) {
    results.innerHTML = `<div class="search-empty">No matches for “${query}”. Try a planet, mission, or topic.</div>`;
    results.classList.add("show");
    return;
  }

  results.innerHTML = matches
    .map(
      (item) => `
        <a class="search-result-item" href="${item.href}">
          <div class="search-result-meta">${item.type}</div>
          <div class="search-result-title">${item.title}</div>
          <div class="search-result-subtitle">${item.subtitle}</div>
          <div class="text-muted-space small mt-1">${item.description}</div>
        </a>
      `
    )
    .join("");

  results.classList.add("show");
}

function initGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  const results = document.getElementById("globalSearchResults");
  if (!input || !results) return;

  const closeResults = () => {
    results.classList.remove("show");
    results.innerHTML = "";
  };

  input.addEventListener("input", () => {
    renderGlobalSearchResults(input.value);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderGlobalSearchResults(input.value);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResults();
      input.blur();
    }
  });

  document.addEventListener("click", (event) => {
    const shell = input.closest(".search-shell");
    if (shell && !shell.contains(event.target)) {
      closeResults();
    }
  });

  results.addEventListener("click", () => {
    closeResults();
  });
}

/* Inject navbar + footer into placeholders if they exist */
function initLayout() {
  // activePage is set on each page via a global variable ACTIVE_PAGE
  const active = window.ACTIVE_PAGE || "";
  const navEl = document.getElementById("navbar");
  const footEl = document.getElementById("footer");
  if (navEl) navEl.innerHTML = buildNavbar(active);
  if (footEl) footEl.innerHTML = buildFooter();

  // Wire up logout button (rendered inside navbar when logged in)
  const logoutBtn = document.getElementById('navLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutAndRedirect('manual');
      window.location.href = 'index.html';
    });
  }

  initGlobalSearch();
}

/* --------------------------------------------------------------------------
   2. FAVORITES SYSTEM
   When logged in  → stored in MongoDB via /api/favorites
   When logged out → stored in localStorage (fallback)
   Format in both cases: { "planet:mars": { type, name, image, subtitle, link } }
   -------------------------------------------------------------------------- */
const FAV_KEY = "astrohub_favorites";

// Local cache so we don't hit the API on every isFavorite() check
let _favCache = null;

function getFavorites() {
  if (_favCache !== null) return _favCache;
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveFavorites(favs) {
  _favCache = favs;
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function isFavorite(key) {
  return Object.prototype.hasOwnProperty.call(getFavorites(), key);
}

/**
 * Load favorites from the server (when logged in) and merge into local cache.
 * Called once on page load.
 */
async function syncFavoritesFromServer() {
  if (!isLoggedIn()) return;
  try {
    const res = await fetch(API_BASE + '/api/favorites', { headers: authHeaders() });
    if (res.ok) {
      const serverFavs = await res.json();
      _favCache = serverFavs;
      localStorage.setItem(FAV_KEY, JSON.stringify(serverFavs));
      updateFavCount();
    }
  } catch (_) {
    // Network error — fall back to localStorage silently
  }
}

/** Toggle a favorite on/off. Persists to server when logged in. */
function toggleFavorite(key, item) {
  const favs = getFavorites();
  const adding = !favs[key];

  if (adding) {
    favs[key] = item;
  } else {
    delete favs[key];
  }
  saveFavorites(favs);
  updateFavCount();

  // Sync to backend asynchronously (non-blocking)
  if (isLoggedIn()) {
    if (adding) {
      fetch(API_BASE + '/api/favorites', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key, ...item }),
      }).catch(() => {});
    } else {
      fetch(API_BASE + '/api/favorites/' + encodeURIComponent(key), {
        method: 'DELETE',
        headers: authHeaders(),
      }).catch(() => {});
    }
  }

  return adding;
}

/* Show total favorites count wherever an element [data-fav-count] exists */
function updateFavCount() {
  const count = Object.keys(getFavorites()).length;
  document.querySelectorAll("[data-fav-count]").forEach((el) => {
    el.textContent = count;
  });
}

/* Create a favorite heart button element for a card */
function makeFavButton(key, item) {
  const btn = document.createElement("button");
  btn.className = "fav-btn" + (isFavorite(key) ? " active" : "");
  btn.setAttribute("aria-label", "Add to favorites");
  btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggleFavorite(key, item);
    btn.classList.toggle("active", nowFav);
  });
  return btn;
}

/* --------------------------------------------------------------------------
   3. HOME PAGE - Daily Space Fact
   -------------------------------------------------------------------------- */
const SPACE_FACTS = [
  "Jupiter's Great Red Spot is a storm larger than Earth that has been raging for over 350 years.",
  "The Sun contains 99.86% of the total mass in our Solar System, with a core temperature of 15 million degrees Celsius.",
  "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth, traveling at 299,792 km/s.",
  "A single teaspoon of neutron star material would weigh about 6 billion tonnes on Earth.",
  "Venus rotates backward: on Venus, the Sun rises in the west and sets in the east, opposite to Earth.",
  "There are more stars in the observable universe (over 2 trillion galaxies) than grains of sand on all Earth's beaches.",
  "Saturn's rings are made of billions of ice and rock particles, some as large as houses, extending up to 282,000 km from the planet.",
  "The footprints left by Apollo astronauts on the Moon can last for millions of years because there's no atmosphere or wind to erode them.",
  "The Milky Way and Andromeda galaxies are moving toward each other at 110 km/s and will collide in about 4.5 billion years.",
  "Mars has the tallest volcano in the Solar System: Olympus Mons stands 21.9 km high, nearly 2.5 times taller than Mount Everest.",
  "A day on Venus (243 Earth days) is longer than a year on Venus (225 Earth days).",
  "The International Space Station orbits Earth at 28,000 km/h, completing an orbit every 90 minutes.",
  "Neptune has the strongest winds in the Solar System, reaching speeds of 2,100 km/h.",
  "The Moon is slowly moving away from Earth at a rate of 3.8 cm per year.",
  "Pluto is smaller than the United States - it's only 2,376 km in diameter.",
  "A year on Mercury is just 88 Earth days, making it the shortest orbital period in our Solar System.",
  "The Sun's mass is 333,000 times greater than Earth's mass.",
  "Uranus rotates on its side with an axial tilt of 97.77 degrees, making it appear to roll around the Sun.",
  "The Hubble Space Telescope has sent back over 1.5 million observations and helped determine the age of the universe: 13.8 billion years.",
  "If you could fly a plane to Pluto, it would take over 800 years to get there."
];

function renderDailyFact() {
  const el = document.getElementById("dailyFact");
  if (!el) return;
  // Pick a fact based on the day of the month so it changes daily
  const index = new Date().getDate() % SPACE_FACTS.length;
  el.textContent = SPACE_FACTS[index];
}

async function renderNasaImageOfTheDay() {
  const imageEl = document.getElementById("nasaImage");
  const titleEl = document.getElementById("nasaTitle");
  const dateEl = document.getElementById("nasaDate");
  const descriptionEl = document.getElementById("nasaDescription");
  const linkEl = document.getElementById("nasaLink");
  const downloadEl = document.getElementById("nasaDownloadBtn");
  
  // New elements
  const skeletonEl = document.getElementById("nasaSkeleton");
  const contentEl = document.getElementById("nasaContent");
  const videoWrapperEl = document.getElementById("nasaVideoWrapper");
  const videoEl = document.getElementById("nasaVideo");
  const favBtn = document.getElementById("nasaFavBtn");
  const aspectBtn = document.getElementById("nasaAspectBtn");
  const hdBtn = document.getElementById("nasaHdBtn");
  const datePickerEl = document.getElementById("nasaDatePicker");
  const todayBtn = document.getElementById("nasaTodayBtn");
  const randomBtn = document.getElementById("nasaRandomBtn");
  const readMoreBtn = document.getElementById("nasaReadMoreBtn");

  if (!imageEl || !titleEl || !dateEl || !descriptionEl || !linkEl) return;

  // Track state
  let currentApodData = null;
  let isHdActive = false;
  let isExpanded = false;

  // Initialize date bounds in local timezone
  const localToday = new Date();
  const year = localToday.getFullYear();
  const month = String(localToday.getMonth() + 1).padStart(2, "0");
  const day = String(localToday.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  if (datePickerEl) {
    datePickerEl.max = todayStr;
    datePickerEl.min = "1995-06-16";
  }

  const showFallback = () => {
    if (skeletonEl) skeletonEl.classList.add("d-none");
    if (contentEl) contentEl.classList.remove("d-none");
    if (videoWrapperEl) videoWrapperEl.classList.add("d-none");
    imageEl.classList.remove("d-none");
    
    imageEl.src = "images/nebula.png";
    imageEl.alt = "A colourful nebula in space";
    titleEl.textContent = "Cosmic Nebula";
    dateEl.innerHTML = '<i class="fa-solid fa-calendar me-2"></i>Image unavailable';
    descriptionEl.textContent = "Explore more breathtaking images from our space gallery.";
    linkEl.href = "gallery.html";
    if (downloadEl) {
      downloadEl.href = "gallery.html";
      downloadEl.setAttribute("title", "Gallery");
    }
    if (favBtn) favBtn.classList.remove("active");
    if (hdBtn) hdBtn.classList.add("d-none");
    if (aspectBtn) aspectBtn.classList.add("d-none");
    if (readMoreBtn) readMoreBtn.style.display = "none";
  };

  imageEl.addEventListener("error", showFallback, { once: true });

  async function fetchApod(dateString = null) {
    // Show loading skeleton, hide content
    if (skeletonEl) skeletonEl.classList.remove("d-none");
    if (contentEl) contentEl.classList.add("d-none");
    if (readMoreBtn) readMoreBtn.style.display = "none";
    
    isHdActive = false;
    isExpanded = false;
    if (hdBtn) hdBtn.classList.remove("active");
    
    // Use the server-side NASA proxy (avoids CORS issues and adds caching)
    let url = API_BASE + '/api/nasa/apod';
    if (dateString) {
      url += `?date=${dateString}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("NASA APOD request failed");

      const data = await response.json();
      currentApodData = data;

      // Toggle Skeleton / Content
      if (skeletonEl) skeletonEl.classList.add("d-none");
      if (contentEl) contentEl.classList.remove("d-none");

      // Handle video or image rendering
      if (data.media_type === "video") {
        if (videoWrapperEl && videoEl) {
          videoWrapperEl.classList.remove("d-none");
          videoEl.src = data.url;
        }
        imageEl.classList.add("d-none");
        if (hdBtn) hdBtn.classList.add("d-none");
        if (aspectBtn) aspectBtn.classList.add("d-none");
        
        linkEl.href = data.url;
        linkEl.innerHTML = `View Video <i class="fa-solid fa-up-right-from-square ms-2"></i>`;
        
        if (downloadEl) {
          downloadEl.href = data.url;
          downloadEl.setAttribute("title", "Open Video Link");
          downloadEl.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i>`;
        }
      } else {
        // Image
        if (videoWrapperEl) videoWrapperEl.classList.add("d-none");
        if (videoEl) videoEl.src = "";
        imageEl.classList.remove("d-none");
        if (hdBtn) hdBtn.classList.remove("d-none");
        if (aspectBtn) aspectBtn.classList.remove("d-none");

        imageEl.src = data.url;
        imageEl.alt = data.title || "NASA Astronomy Picture of the Day";
        
        linkEl.href = data.hdurl || data.url;
        linkEl.innerHTML = `View Full Image <i class="fa-solid fa-arrow-right ms-2"></i>`;
        
        if (downloadEl) {
          downloadEl.href = data.hdurl || data.url;
          downloadEl.setAttribute("title", "Download HD Image");
          downloadEl.innerHTML = `<i class="fa-solid fa-download"></i>`;
        }
      }

      // Metadata
      titleEl.textContent = data.title || "NASA Astronomy Picture of the Day";
      dateEl.innerHTML = `<i class="fa-solid fa-calendar me-2"></i>`;
      dateEl.append(document.createTextNode(data.date || "Date unavailable"));

      // Description text truncation with inline expander
      const explanation = data.explanation || "NASA's Astronomy Picture of the Day.";
      if (explanation.length > 240) {
        descriptionEl.textContent = `${explanation.slice(0, 237)}...`;
        descriptionEl.classList.add("desc-collapsed");
        if (readMoreBtn) {
          readMoreBtn.style.display = "inline-block";
          readMoreBtn.textContent = "Read More";
        }
      } else {
        descriptionEl.textContent = explanation;
        descriptionEl.classList.remove("desc-collapsed");
        if (readMoreBtn) readMoreBtn.style.display = "none";
      }

      // Update Date Picker value to current APOD date
      if (datePickerEl && data.date) {
        datePickerEl.value = data.date;
      }

      // Update Favorite Button active status
      if (favBtn) {
        const favKey = "apod:" + data.date;
        favBtn.classList.toggle("active", isFavorite(favKey));
      }

    } catch (error) {
      console.error(error);
      showFallback();
    }
  }

  // Setup Event Listeners once
  if (!window.nasaApodInitialized) {
    // 1. Date picker change
    if (datePickerEl) {
      datePickerEl.addEventListener("change", (e) => {
        if (e.target.value) {
          fetchApod(e.target.value);
        }
      });
    }

    // 2. Today button click
    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        if (datePickerEl) datePickerEl.value = todayStr;
        fetchApod();
      });
    }

    // 3. Random date explorer button
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        // Generate random date between 1995-06-16 and today
        const startDate = new Date(1995, 5, 16); // June 16, 1995 (0-indexed month)
        const endDate = new Date();
        const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
        const randomDate = new Date(randomTime);
        
        const rYear = randomDate.getFullYear();
        const rMonth = String(randomDate.getMonth() + 1).padStart(2, "0");
        const rDay = String(randomDate.getDate()).padStart(2, "0");
        const randomStr = `${rYear}-${rMonth}-${rDay}`;
        
        if (datePickerEl) datePickerEl.value = randomStr;
        fetchApod(randomStr);
      });
    }

    // 4. Aspect fit/cover toggle
    if (aspectBtn) {
      aspectBtn.addEventListener("click", () => {
        if (imageEl.classList.contains("fit-cover")) {
          imageEl.classList.replace("fit-cover", "fit-contain");
          aspectBtn.setAttribute("title", "Toggle Aspect Fill");
          aspectBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
        } else {
          imageEl.classList.replace("fit-contain", "fit-cover");
          aspectBtn.setAttribute("title", "Toggle Aspect Fit");
          aspectBtn.innerHTML = `<i class="fa-solid fa-expand"></i>`;
        }
      });
    }

    // 5. HD resolution toggle
    if (hdBtn) {
      hdBtn.addEventListener("click", () => {
        if (!currentApodData) return;
        isHdActive = !isHdActive;
        hdBtn.classList.toggle("active", isHdActive);
        if (isHdActive) {
          imageEl.src = currentApodData.hdurl || currentApodData.url;
          hdBtn.setAttribute("title", "View Standard Image");
        } else {
          imageEl.src = currentApodData.url;
          hdBtn.setAttribute("title", "View High-Definition Image");
        }
      });
    }

    // 6. Favorites toggler click
    if (favBtn) {
      favBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentApodData) return;
        
        const favKey = "apod:" + currentApodData.date;
        const favItem = {
          type: "apod",
          id: currentApodData.date,
          name: currentApodData.title || "NASA APOD",
          image: currentApodData.media_type === "video" ? (currentApodData.thumbnail_url || "images/nebula.png") : currentApodData.url,
          subtitle: "NASA APOD - " + currentApodData.date,
          link: "index.html?apodDate=" + currentApodData.date
        };

        const nowFav = toggleFavorite(favKey, favItem);
        favBtn.classList.toggle("active", nowFav);
      });
    }

    // 7. Read more toggle expansion
    if (readMoreBtn) {
      readMoreBtn.addEventListener("click", () => {
        if (!currentApodData) return;
        isExpanded = !isExpanded;
        if (isExpanded) {
          descriptionEl.textContent = currentApodData.explanation;
          descriptionEl.classList.remove("desc-collapsed");
          readMoreBtn.textContent = "Read Less";
        } else {
          descriptionEl.textContent = `${currentApodData.explanation.slice(0, 237)}...`;
          descriptionEl.classList.add("desc-collapsed");
          readMoreBtn.textContent = "Read More";
        }
      });
    }

    window.nasaApodInitialized = true;
  }

  // Parse direct APOD link parameter if present
  const params = new URLSearchParams(window.location.search);
  const apodDate = params.get("apodDate");
  if (apodDate) {
    if (datePickerEl) datePickerEl.value = apodDate;
    fetchApod(apodDate);
  } else {
    if (datePickerEl) datePickerEl.value = todayStr;
    fetchApod();
  }
}


/* --------------------------------------------------------------------------
   4. PLANETS PAGE - render planet cards
   -------------------------------------------------------------------------- */
function renderPlanets() {
  const grid = document.getElementById("planetGrid");
  if (!grid) return;

  PLANETS.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 col-xl-3 reveal";

    col.innerHTML = `
      <div class="space-card text-center">
        <div class="card-media pt-4">
          <img src="${p.image}" alt="${p.name}" class="planet-img" />
        </div>
        <div class="card-body">
          <span class="chip mb-2">${p.type}</span>
          <h4 class="fw-bold mt-2">${p.name}</h4>
          <p class="text-muted-space small mb-3">${p.description}</p>
          <div class="text-start planet-meta mb-3">
            <div class="mb-1"><i class="fa-solid fa-sun"></i> ${p.distance}</div>
            <div class="mb-1"><i class="fa-solid fa-ruler"></i> ${p.diameter}</div>
            <div class="mb-1"><i class="fa-solid fa-moon"></i> ${p.moons} moon(s)</div>
            <div class="mb-1"><i class="fa-solid fa-temperature-half"></i> ${p.temperature}</div>
            <div class="mb-1"><i class="fa-solid fa-weight-hanging"></i> ${p.gravity}</div>
          </div>
          <a href="planet-detail.html?id=${p.id}" class="btn btn-space btn-sm w-100">
            Learn More <i class="fa-solid fa-arrow-right ms-1"></i>
          </a>
        </div>
      </div>`;

    // Add the favorite heart button
    const media = col.querySelector(".card-media");
    media.appendChild(
      makeFavButton("planet:" + p.id, {
        type: "planet",
        id: p.id,
        name: p.name,
        image: p.image,
        subtitle: p.type,
        link: "planet-detail.html?id=" + p.id,
      })
    );

    grid.appendChild(col);
  });
}

/* --------------------------------------------------------------------------
   5. PLANET DETAIL PAGE
   -------------------------------------------------------------------------- */
function renderPlanetDetail() {
  const container = document.getElementById("planetDetail");
  if (!container) return;

  // Read the ?id= from the URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || PLANETS[0].id;
  const index = PLANETS.findIndex((p) => p.id === id);
  const p = PLANETS[index] || PLANETS[0];

  // Work out previous and next planets (wrap around)
  const prev = PLANETS[(index - 1 + PLANETS.length) % PLANETS.length];
  const next = PLANETS[(index + 1) % PLANETS.length];

  document.title = p.name + " - Astro Hub";

  const factItems = p.facts.map((f) => `<li class="mb-2">${f}</li>`).join("");

  container.innerHTML = `
    <div class="row align-items-center g-5">
      <div class="col-lg-5 text-center">
        <img src="${p.image}" alt="${p.name}" class="img-fluid float" style="max-width: 320px;">
      </div>
      <div class="col-lg-7">
        <span class="chip mb-2">${p.type}</span>
        <h1 class="fw-bold display-5">${p.name}</h1>
        <p class="text-muted-space fs-5">${p.description}</p>
        <div class="row g-3 mt-2">
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Distance from Sun</div><strong>${p.distance}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Diameter</div><strong>${p.diameter}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Moons</div><strong>${p.moons}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Temperature</div><strong>${p.temperature}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Gravity</div><strong>${p.gravity}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Orbit Period</div><strong>${p.orbit}</strong></div></div>
        </div>
      </div>
    </div>

    <div class="row g-4 mt-4">
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-wind text-info me-2"></i>Atmosphere</h4>
          <p class="text-muted-space mb-0">${p.atmosphere}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-mountain text-info me-2"></i>Surface Features</h4>
          <p class="text-muted-space mb-0">${p.surface}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-clock text-info me-2"></i>Orbit &amp; Rotation</h4>
          <p class="text-muted-space mb-1">Orbit Period: <strong>${p.orbit}</strong></p>
          <p class="text-muted-space mb-0">Rotation Period: <strong>${p.rotation}</strong></p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-star text-info me-2"></i>Interesting Facts</h4>
          <ul class="text-muted-space mb-0 ps-3">${factItems}</ul>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between mt-5">
      <a href="planet-detail.html?id=${prev.id}" class="btn btn-outline-space">
        <i class="fa-solid fa-arrow-left me-1"></i> ${prev.name}
      </a>
      <a href="planet-detail.html?id=${next.id}" class="btn btn-outline-space">
        ${next.name} <i class="fa-solid fa-arrow-right ms-1"></i>
      </a>
    </div>`;
}

/* --------------------------------------------------------------------------
   5b. STARS PAGE - render star cards
   -------------------------------------------------------------------------- */
function renderStars() {
  const grid = document.getElementById("starGrid");
  if (!grid) return;

  STARS.forEach((s) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 reveal";

    col.innerHTML = `
      <div class="space-card text-center">
        <div class="card-media pt-4">
          <img src="${s.image}" alt="${s.name}" class="planet-img" />
        </div>
        <div class="card-body">
          <span class="chip mb-2">${s.type}</span>
          <h4 class="fw-bold mt-2">${s.name}</h4>
          <p class="text-muted-space small mb-3">${s.description}</p>
          <div class="text-start planet-meta mb-3">
            <div class="mb-1"><i class="fa-solid fa-star"></i> ${s.constellation}</div>
            <div class="mb-1"><i class="fa-solid fa-ruler-horizontal"></i> ${s.distance}</div>
            <div class="mb-1"><i class="fa-solid fa-temperature-half"></i> ${s.temperature}</div>
            <div class="mb-1"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${s.size}</div>
            <div class="mb-1"><i class="fa-solid fa-palette"></i> ${s.color}</div>
          </div>
          <a href="star-detail.html?id=${s.id}" class="btn btn-space btn-sm w-100">
            Learn More <i class="fa-solid fa-arrow-right ms-1"></i>
          </a>
        </div>
      </div>`;

    // Add the favorite heart button
    const media = col.querySelector(".card-media");
    media.appendChild(
      makeFavButton("star:" + s.id, {
        type: "star",
        id: s.id,
        name: s.name,
        image: s.image,
        subtitle: s.type,
        link: "star-detail.html?id=" + s.id,
      })
    );

    grid.appendChild(col);
  });
}

/* --------------------------------------------------------------------------
   5c. STAR DETAIL PAGE
   -------------------------------------------------------------------------- */
function renderStarDetail() {
  const container = document.getElementById("starDetail");
  if (!container) return;

  // Read the ?id= from the URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || STARS[0].id;
  const index = STARS.findIndex((s) => s.id === id);
  const s = STARS[index] || STARS[0];

  // Work out previous and next stars (wrap around)
  const prev = STARS[(index - 1 + STARS.length) % STARS.length];
  const next = STARS[(index + 1) % STARS.length];

  document.title = s.name + " - Astro Hub";

  const factItems = s.facts.map((f) => `<li class="mb-2">${f}</li>`).join("");
  const relatedImgs = (s.related || [])
    .map(
      (src) =>
        `<div class="col-4"><img src="${src}" alt="Related space image" class="img-fluid rounded-4"></div>`
    )
    .join("");

  container.innerHTML = `
    <div class="row align-items-center g-5">
      <div class="col-lg-5 text-center">
        <img src="${s.image}" alt="${s.name}" class="img-fluid float" style="max-width: 320px;">
      </div>
      <div class="col-lg-7">
        <span class="chip mb-2">${s.type}</span>
        <h1 class="fw-bold display-5">${s.name}</h1>
        <p class="text-muted-space fs-5">${s.description}</p>
        <div class="row g-3 mt-2">
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Constellation</div><strong>${s.constellation}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Distance</div><strong>${s.distance}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Temperature</div><strong>${s.temperature}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Size</div><strong>${s.size}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Color</div><strong>${s.color}</strong></div></div>
          <div class="col-6 col-md-4"><div class="space-card p-3 text-center"><div class="text-muted-space small">Type</div><strong>${s.type}</strong></div></div>
        </div>
      </div>
    </div>

    <div class="row g-4 mt-4">
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-fire text-info me-2"></i>Formation</h4>
          <p class="text-muted-space mb-0">${s.formation}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-arrows-spin text-info me-2"></i>Life Cycle</h4>
          <p class="text-muted-space mb-0">${s.lifecycle}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-star text-info me-2"></i>Interesting Facts</h4>
          <ul class="text-muted-space mb-0 ps-3">${factItems}</ul>
        </div>
      </div>
      <div class="col-md-6">
        <div class="space-card p-4 h-100">
          <h4 class="fw-bold"><i class="fa-solid fa-images text-info me-2"></i>Related Images</h4>
          <div class="row g-2 mt-1">${relatedImgs}</div>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between mt-5">
      <a href="star-detail.html?id=${prev.id}" class="btn btn-outline-space">
        <i class="fa-solid fa-arrow-left me-1"></i> ${prev.name}
      </a>
      <a href="star-detail.html?id=${next.id}" class="btn btn-outline-space">
        ${next.name} <i class="fa-solid fa-arrow-right ms-1"></i>
      </a>
    </div>`;
}

/* --------------------------------------------------------------------------
   6. MISSIONS PAGE
   -------------------------------------------------------------------------- */
function statusClass(status) {
  if (status === "Active") return "status-active";
  if (status === "Completed") return "status-completed";
  return "status-ongoing";
}

function renderMissions() {
  const grid = document.getElementById("missionGrid");
  if (!grid) return;

  const featuredMissionIds = [
    "apollo11", "voyager1", "voyager2", "jwst", "hubble",
    "chandrayaan3", "mangalyaan-featured", "adityal1", "perseverance",
  ];
  const featuredMissions = featuredMissionIds
    .map((id) => MISSIONS.find((mission) => mission.id === id))
    .filter(Boolean);

  featuredMissions.forEach((m) => {
    const launchYear = m.launch.match(/\d{4}/)?.[0] || m.launch;
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 reveal";

    col.innerHTML = `
      <div class="space-card">
        <div class="card-media">
          <img src="${m.image}" alt="${m.name}" class="gallery-img" />
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="chip">${m.agency}</span>
            <span class="chip ${statusClass(m.status)}">${m.status}</span>
          </div>
          <h5 class="fw-bold">${m.name}</h5>
          <p class="text-muted-space small mb-2">${m.description}</p>
          <div class="planet-meta mb-3">
            <div class="mb-1"><i class="fa-solid fa-calendar-day"></i> Launch year: ${launchYear}</div>
            <div class="mb-1"><i class="fa-solid fa-location-arrow"></i> ${m.destination}</div>
          </div>
          <button class="btn btn-space btn-sm w-100" data-mission="${m.id}">
            Read More <i class="fa-solid fa-arrow-right ms-1"></i>
          </button>
        </div>
      </div>`;

    // Favorite button
    const media = col.querySelector(".card-media");
    media.appendChild(
      makeFavButton("mission:" + m.id, {
        type: "mission",
        id: m.id,
        name: m.name,
        image: m.image,
        subtitle: m.agency,
        link: "missions.html",
      })
    );

    // Read More opens the modal
    col.querySelector("[data-mission]").addEventListener("click", () => openMissionModal(m));

    grid.appendChild(col);
  });
}

function openMissionModal(m) {
  const launchYear = m.launch.match(/\d{4}/)?.[0] || m.launch;
  document.getElementById("missionModalTitle").textContent = m.name;
  document.getElementById("missionModalBody").innerHTML = `
    <img src="${m.image}" alt="${m.name}" class="img-fluid rounded-4 mb-3">
    <div class="d-flex gap-2 mb-3">
      <span class="chip">${m.agency}</span>
      <span class="chip ${statusClass(m.status)}">${m.status}</span>
    </div>
    <p class="text-muted-space">${m.description}</p>
    <ul class="list-unstyled planet-meta">
      <li class="mb-2"><i class="fa-solid fa-calendar-day"></i> <strong>Launch year:</strong> ${launchYear}</li>
      <li class="mb-2"><i class="fa-solid fa-location-arrow"></i> <strong>Destination:</strong> ${m.destination}</li>
      <li class="mb-2"><i class="fa-solid fa-signal"></i> <strong>Status:</strong> ${m.status}</li>
    </ul>`;
  const modal = new bootstrap.Modal(document.getElementById("missionModal"));
  modal.show();
}

/* --------------------------------------------------------------------------
   7. GALLERY PAGE - grid, search, filter, popup
   -------------------------------------------------------------------------- */
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  // Populate category dropdown
  const select = document.getElementById("categoryFilter");
  GALLERY_CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  // Function to draw cards based on current filters
  function draw() {
    const term = document.getElementById("searchInput").value.toLowerCase();
    const cat = select.value;
    grid.innerHTML = "";

    const filtered = GALLERY.filter((g) => {
      const matchTerm = g.title.toLowerCase().includes(term) || g.description.toLowerCase().includes(term);
      const matchCat = cat === "all" || g.category === cat;
      return matchTerm && matchCat;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center text-muted-space py-5">
        <i class="fa-solid fa-magnifying-glass fa-2x mb-3"></i><p>No images found. Try another search.</p></div>`;
      return;
    }

    filtered.forEach((g) => {
      const key = "gallery:" + g.title;
      const col = document.createElement("div");
      col.className = "col-sm-6 col-lg-4 reveal visible";
      col.innerHTML = `
        <div class="space-card">
          <div class="card-media">
            <img src="${g.image}" alt="${g.title}" class="gallery-img" role="button" />
          </div>
          <div class="card-body">
            <span class="chip mb-2">${g.category}</span>
            <h6 class="fw-bold mt-2 mb-1">${g.title}</h6>
            <p class="text-muted-space small mb-0">${g.description}</p>
          </div>
        </div>`;

      // Favorite button
      const media = col.querySelector(".card-media");
      media.appendChild(
        makeFavButton(key, {
          type: "gallery",
          id: g.title,
          name: g.title,
          image: g.image,
          subtitle: g.category,
          link: "gallery.html",
        })
      );

      // Click image to open popup
      col.querySelector("img").addEventListener("click", () => openImageModal(g));
      grid.appendChild(col);
    });
  }

  document.getElementById("searchInput").addEventListener("input", draw);
  select.addEventListener("change", draw);
  draw();
}

function openImageModal(g) {
  document.getElementById("imageModalTitle").textContent = g.title;
  document.getElementById("imageModalImg").src = g.image;
  document.getElementById("imageModalImg").alt = g.title;
  document.getElementById("imageModalDesc").textContent = g.description;
  const modal = new bootstrap.Modal(document.getElementById("imageModal"));
  modal.show();
}

/* Download button (UI only) - shows a friendly alert */
function fakeDownload() {
  alert("Download started! (This is a UI-only demo — no file is actually downloaded.)");
}

/* --------------------------------------------------------------------------
   8. FAVORITES PAGE
   -------------------------------------------------------------------------- */
function renderFavoritesPage() {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;

  function draw() {
    const favs = getFavorites();
    const keys = Object.keys(favs);
    grid.innerHTML = "";

    if (keys.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center text-muted-space py-5">
        <i class="fa-regular fa-heart fa-3x mb-3"></i>
        <h4>No favorites yet</h4>
        <p>Tap the <i class="fa-solid fa-heart text-danger"></i> icon on planets, missions or gallery images to save them here.</p>
        <a href="planets.html" class="btn btn-space mt-2">Explore Planets</a>
      </div>`;
      return;
    }

    keys.forEach((key) => {
      const item = favs[key];
      const col = document.createElement("div");
      col.className = "col-sm-6 col-lg-4 reveal visible";
      col.innerHTML = `
        <div class="space-card">
          <div class="card-media">
            <img src="${item.image}" alt="${item.name}" class="gallery-img" />
          </div>
          <div class="card-body">
            <span class="chip mb-2 text-capitalize">${item.type}</span>
            <h6 class="fw-bold mt-2 mb-1">${item.name}</h6>
            <p class="text-muted-space small mb-3">${item.subtitle || ""}</p>
            <div class="d-flex gap-2">
              <a href="${item.link}" class="btn btn-outline-space btn-sm flex-fill">View</a>
              <button class="btn btn-sm flex-fill" style="background:rgba(255,92,138,.15);color:#ff5c8a;border:1px solid rgba(255,92,138,.35);border-radius:50px" data-remove="${key}">
                <i class="fa-solid fa-trash me-1"></i>Remove
              </button>
            </div>
          </div>
        </div>`;

      col.querySelector("[data-remove]").addEventListener("click", () => {
        toggleFavorite(key, item);
        draw();
      });
      grid.appendChild(col);
    });
  }

  draw();
}

/* --------------------------------------------------------------------------
   9. ADVANCED QUIZ GAME AND LEADERBOARD SYSTEM
   -------------------------------------------------------------------------- */

// Confetti Particle System
class ConfettiParticle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * -canvasHeight - 20;
    this.size = Math.random() * 6 + 4;
    this.speedX = Math.random() * 2 - 1.0;
    this.speedY = Math.random() * 4 + 3;
    this.color = ["#35e3ff", "#4f8bff", "#8a5cff", "#ffc107", "#ff5c8a"][Math.floor(Math.random() * 5)];
    this.alpha = 1;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 3 - 1.5;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    if (this.y > this.canvasHeight) {
      this.y = -20;
      this.x = Math.random() * this.canvasWidth;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(0, 0 - this.size);
      ctx.rotate(Math.PI / 5);
      ctx.lineTo(0, 0 - this.size / 2);
      ctx.rotate(Math.PI / 5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

let confettiActive = false;
let confettiParticles = [];
let confettiAnimationFrame = null;

function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  confettiParticles = Array.from({ length: 80 }, () => new ConfettiParticle(canvas.width, canvas.height));
  confettiActive = true;

  function animate() {
    if (!confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
      p.update();
      p.draw(ctx);
    });
    confettiAnimationFrame = requestAnimationFrame(animate);
  }
  animate();

  setTimeout(stopConfetti, 5000);
}

function stopConfetti() {
  confettiActive = false;
  const canvas = document.getElementById("confettiCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (confettiAnimationFrame) cancelAnimationFrame(confettiAnimationFrame);
}

// Fisher-Yates Shuffle
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Local Leaderboard Helpers
const LEADERBOARD_KEY = "astrohub_quiz_leaderboard";
function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveLeaderboard(board) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
}

function initQuiz() {
  // Elements
  const setupBox = document.getElementById("setupBox");
  const quizBox = document.getElementById("quizBox");
  const quizResults = document.getElementById("quizResults");
  if (!setupBox || !quizBox || !quizResults) return;

  const categoryCards = document.querySelectorAll(".category-card");
  const modeCards = document.querySelectorAll(".mode-card");
  const launchBtn = document.getElementById("launchBtn");
  const leaderboardBody = document.getElementById("leaderboardBody");
  const leaderboardEmpty = document.getElementById("leaderboardEmpty");

  const questionEl = document.getElementById("quizQuestion");
  const optionsEl = document.getElementById("quizOptions");
  const counterEl = document.getElementById("quizCounter");
  const categoryEl = document.getElementById("quizCategory");
  const progressEl = document.getElementById("quizProgress");
  const streakBadge = document.getElementById("quizStreak");
  const streakCountEl = document.getElementById("streakCount");
  
  const timerContainer = document.getElementById("quizTimer");
  const timerCircle = document.getElementById("timerCircle");
  const timerSeconds = document.getElementById("timerSeconds");
  
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  
  const lifeline5050 = document.getElementById("lifeline5050");
  const lifelineHint = document.getElementById("lifelineHint");
  const lifelineSkip = document.getElementById("lifelineSkip");
  const explanationCard = document.getElementById("explanationCard");
  const explanationText = document.getElementById("explanationText");
  const explanationType = document.getElementById("explanationType");

  const restartBtn = document.getElementById("restartBtn");
  const menuBtn = document.getElementById("menuBtn");
  const reviewList = document.getElementById("reviewList");
  const reviewFilter = document.getElementById("reviewFilter");
  
  const leaderboardEntryForm = document.getElementById("leaderboardEntryForm");
  const leaderboardNameInput = document.getElementById("leaderboardName");
  const submitScoreBtn = document.getElementById("submitScoreBtn");

  // Game States
  let activeQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = []; // holds chosen option index or null
  let skippedQuestions = []; // holds booleans
  let currentStreak = 0;
  let maxStreak = 0;
  
  let selectedCategory = "all";
  let selectedMode = "explorer";
  
  let timerInterval = null;
  let timeLeft = 15;
  let quizStartTime = null;
  let totalQuizTime = 0;
  let lifelinesUsed = { f50: false, hint: false, skip: false };
  let challengerScore = 0;

  // 1. Setup screen setup & Leaderboard loading
  function renderLeaderboardTable() {
    const list = getLeaderboard();
    leaderboardBody.innerHTML = "";
    if (list.length === 0) {
      leaderboardEmpty.classList.remove("d-none");
      return;
    }
    leaderboardEmpty.classList.add("d-none");
    list.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${index + 1}</strong></td>
        <td>${item.name}</td>
        <td><span class="chip">${item.topic}</span></td>
        <td class="text-end text-warning"><strong>${item.score}</strong></td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }
  renderLeaderboardTable();

  // Category selection handler
  categoryCards.forEach(card => {
    card.addEventListener("click", () => {
      categoryCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedCategory = card.getAttribute("data-category");
    });
  });

  // Mode selection handler
  modeCards.forEach(card => {
    card.addEventListener("click", () => {
      modeCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedMode = card.getAttribute("data-mode");
    });
  });

  // Launch Quiz
  launchBtn.addEventListener("click", () => {
    // Filter questions
    let pool = [];
    if (selectedCategory === "all") {
      pool = QUIZ;
    } else if (selectedCategory === "Solar System") {
      pool = QUIZ.filter(q => q.category === "Solar System" || q.category === "Planets");
    } else if (selectedCategory === "Galaxies") {
      pool = QUIZ.filter(q => q.category === "Galaxies" || q.category === "Black Holes" || q.category === "Stars");
    } else if (selectedCategory === "Missions") {
      pool = QUIZ.filter(q => q.category === "NASA" || q.category === "ISRO" || q.category === "Space Missions");
    }

    if (pool.length === 0) pool = QUIZ;

    // Always build a 10-question quiz. If a selected category has fewer than
    // 10 questions, fill the remaining spaces from the other sample questions.
    const categoryQuestions = shuffleArray(pool);
    const remainingQuestions = shuffleArray(
      QUIZ.filter((question) => !categoryQuestions.includes(question))
    );
    activeQuestions = [...categoryQuestions, ...remainingQuestions].slice(0, 10);
    userAnswers = new Array(activeQuestions.length).fill(null);
    skippedQuestions = new Array(activeQuestions.length).fill(false);
    
    // Reset states
    currentQuestionIndex = 0;
    currentStreak = 0;
    maxStreak = 0;
    lifelinesUsed = { f50: false, hint: false, skip: false };
    quizStartTime = Date.now();

    // Reset Lifelines buttons display
    lifeline5050.disabled = false;
    lifelineHint.disabled = false;
    lifelineSkip.disabled = false;

    // UI swap
    setupBox.classList.add("d-none");
    quizResults.classList.add("d-none");
    quizBox.classList.remove("d-none");

    // Mode-specific UI setup
    if (selectedMode === "challenger") {
      timerContainer.classList.remove("d-none");
      prevBtn.classList.add("d-none"); // No going back in challenger!
      streakBadge.classList.remove("d-none");
      streakCountEl.textContent = "0";
    } else {
      timerContainer.classList.add("d-none");
      prevBtn.classList.remove("d-none");
      streakBadge.classList.add("d-none");
    }

    showQuestion();
  });

  // Display question
  function showQuestion() {
    clearInterval(timerInterval);
    const question = activeQuestions[currentQuestionIndex];
    
    // Header details
    categoryEl.textContent = `🧠 ${question.category}`;
    counterEl.textContent = `Question ${currentQuestionIndex + 1} of ${activeQuestions.length}`;
    questionEl.innerHTML = question.q;

    // Progress
    const progressPct = Math.round(((currentQuestionIndex + 1) / activeQuestions.length) * 100);
    progressEl.style.width = progressPct + "%";
    progressEl.parentElement.setAttribute("aria-valuenow", progressPct);

    // Hide hints or explanation boxes by default
    explanationCard.classList.add("d-none");

    // Draw options
    optionsEl.innerHTML = "";
    question.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.innerHTML = `<i class="fa-regular fa-circle me-3"></i>${opt}`;
      
      const isAlreadyAnswered = userAnswers[currentQuestionIndex] !== null;

      if (selectedMode === "explorer") {
        if (isAlreadyAnswered) {
          btn.classList.add("disabled");
          const selectedIdx = userAnswers[currentQuestionIndex];
          if (i === question.answer) {
            btn.classList.add("correct");
            btn.querySelector("i").className = "fa-solid fa-circle-check me-3";
          } else if (i === selectedIdx) {
            btn.classList.add("wrong");
            btn.querySelector("i").className = "fa-solid fa-circle-xmark me-3";
          } else {
            btn.classList.add("faded");
          }
        } else {
          // Explorer Clicking Option
          btn.addEventListener("click", () => handleExplorerAnswer(i));
        }
      } else {
        // Challenger Mode Option Display
        if (isAlreadyAnswered) {
          if (i === userAnswers[currentQuestionIndex]) {
            btn.classList.add("selected");
            btn.querySelector("i").className = "fa-solid fa-circle-dot me-3";
          }
        }
        btn.addEventListener("click", () => {
          if (userAnswers[currentQuestionIndex] === i) return; // already selected
          userAnswers[currentQuestionIndex] = i;
          // Clear active outlines and select this one
          document.querySelectorAll(".quiz-option").forEach(b => {
            b.classList.remove("selected");
            b.querySelector("i").className = "fa-regular fa-circle me-3";
          });
          btn.classList.add("selected");
          btn.querySelector("i").className = "fa-solid fa-circle-dot me-3";
        });
      }
      optionsEl.appendChild(btn);
    });

    // Explorer Mode: Restore explanation details if already answered
    if (selectedMode === "explorer" && userAnswers[currentQuestionIndex] !== null) {
      const isCorrect = userAnswers[currentQuestionIndex] === question.answer;
      explanationCard.classList.remove("d-none");
      explanationType.innerHTML = isCorrect ? 
        `<i class="fa-solid fa-circle-check text-success me-2"></i>Correct!` : 
        `<i class="fa-solid fa-circle-xmark text-danger me-2"></i>Incorrect`;
      explanationText.innerHTML = `<strong>Fact File:</strong> ${question.explanation}`;
    }

    // Challenger Mode: Start/Reset Timer
    if (selectedMode === "challenger") {
      startTimer();
    }

    // Update Controls Button States
    prevBtn.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === activeQuestions.length - 1) {
      nextBtn.classList.add("d-none");
      submitBtn.classList.remove("d-none");
    } else {
      nextBtn.classList.remove("d-none");
      submitBtn.classList.add("d-none");
    }

    // Dynamic Lifelines display update
    lifeline5050.disabled = lifelinesUsed.f50 || userAnswers[currentQuestionIndex] !== null;
    lifelineHint.disabled = lifelinesUsed.hint || userAnswers[currentQuestionIndex] !== null;
    lifelineSkip.disabled = lifelinesUsed.skip;
  }

  // Handle Explorer answer selection immediately
  function handleExplorerAnswer(optionIdx) {
    const question = activeQuestions[currentQuestionIndex];
    userAnswers[currentQuestionIndex] = optionIdx;
    const isCorrect = optionIdx === question.answer;

    if (isCorrect) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    // Disable all options and show feedback coloring
    const buttons = optionsEl.querySelectorAll(".quiz-option");
    buttons.forEach((btn, i) => {
      btn.classList.add("disabled");
      if (i === question.answer) {
        btn.classList.add("correct");
        btn.querySelector("i").className = "fa-solid fa-circle-check me-3";
      } else if (i === optionIdx) {
        btn.classList.add("wrong");
        btn.querySelector("i").className = "fa-solid fa-circle-xmark me-3";
        btn.classList.add("shake-anim");
      } else {
        btn.classList.add("faded");
      }
    });

    // Reveal Explanation Card
    explanationCard.classList.remove("d-none");
    explanationType.innerHTML = isCorrect ? 
      `<i class="fa-solid fa-circle-check text-success me-2"></i>Correct!` : 
      `<i class="fa-solid fa-circle-xmark text-danger me-2"></i>Incorrect`;
    explanationText.innerHTML = `<strong>Fact File:</strong> ${question.explanation}`;

    // Disable lifelines once answered
    lifeline5050.disabled = true;
    lifelineHint.disabled = true;
  }

  // Timer mechanism for Challenger Mode
  function startTimer() {
    timeLeft = 15;
    timerSeconds.textContent = timeLeft;
    timerCircle.classList.remove("timer-warning");
    timerCircle.style.strokeDashoffset = "0";

    timerInterval = setInterval(() => {
      timeLeft--;
      timerSeconds.textContent = timeLeft;

      // Update circular dash offset (dasharray is 113)
      const offset = 113 - (timeLeft / 15) * 113;
      timerCircle.style.strokeDashoffset = offset;

      if (timeLeft <= 5) {
        timerCircle.classList.add("timer-warning");
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        // Force submit / skip
        skippedQuestions[currentQuestionIndex] = userAnswers[currentQuestionIndex] === null;
        currentStreak = 0; // Break streak
        streakCountEl.textContent = "0";

        // Display timeout shake and advance
        optionsEl.classList.add("shake-anim");
        setTimeout(() => {
          optionsEl.classList.remove("shake-anim");
          advanceQuestion();
        }, 800);
      }
    }, 1000);
  }

  function advanceQuestion() {
    // In Challenger mode, evaluate streak on the go for the flame UI
    if (selectedMode === "challenger" && userAnswers[currentQuestionIndex] !== null) {
      const q = activeQuestions[currentQuestionIndex];
      const isRight = userAnswers[currentQuestionIndex] === q.answer;
      if (isRight) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        streakBadge.classList.add("streak-pop");
        setTimeout(() => streakBadge.classList.remove("streak-pop"), 400);
      } else {
        currentStreak = 0;
      }
      streakCountEl.textContent = currentStreak;
    }

    if (currentQuestionIndex < activeQuestions.length - 1) {
      currentQuestionIndex++;
      showQuestion();
    } else {
      finishQuiz();
    }
  }

  // Navigation handlers
  prevBtn.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      showQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    advanceQuestion();
  });

  submitBtn.addEventListener("click", () => {
    // Process final index evaluating streak
    if (selectedMode === "challenger" && userAnswers[currentQuestionIndex] !== null) {
      const q = activeQuestions[currentQuestionIndex];
      const isRight = userAnswers[currentQuestionIndex] === q.answer;
      if (isRight) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      }
    }
    finishQuiz();
  });

  // Lifelines Actions
  lifeline5050.addEventListener("click", () => {
    if (lifelinesUsed.f50 || userAnswers[currentQuestionIndex] !== null) return;
    lifelinesUsed.f50 = true;
    lifeline5050.disabled = true;

    const question = activeQuestions[currentQuestionIndex];
    const correctIdx = question.answer;

    // Get all incorrect indices
    let incorrects = [];
    question.options.forEach((_, idx) => {
      if (idx !== correctIdx) incorrects.push(idx);
    });

    // Shuffle and pick 2 to fade out
    incorrects = shuffleArray(incorrects).slice(0, 2);

    const buttons = optionsEl.querySelectorAll(".quiz-option");
    buttons.forEach((btn, idx) => {
      if (incorrects.includes(idx)) {
        btn.classList.add("faded");
        // Disable click
        btn.style.pointerEvents = "none";
      }
    });
  });

  lifelineHint.addEventListener("click", () => {
    if (lifelinesUsed.hint || userAnswers[currentQuestionIndex] !== null) return;
    lifelinesUsed.hint = true;
    lifelineHint.disabled = true;

    const question = activeQuestions[currentQuestionIndex];
    
    // Inject hint banner directly inside question element
    const hintDiv = document.createElement("div");
    hintDiv.className = "text-warning small mt-2 fw-semibold animate__animated animate__fadeIn";
    hintDiv.innerHTML = `<i class="fa-solid fa-lightbulb me-1"></i>Hint: ${question.hint}`;
    questionEl.appendChild(hintDiv);
  });

  lifelineSkip.addEventListener("click", () => {
    if (lifelinesUsed.skip) return;
    lifelinesUsed.skip = true;
    lifelineSkip.disabled = true;

    // Mark as skipped/incorrect
    userAnswers[currentQuestionIndex] = null;
    skippedQuestions[currentQuestionIndex] = true;
    currentStreak = 0;
    if (selectedMode === "challenger") streakCountEl.textContent = "0";

    advanceQuestion();
  });

  // Finish quiz & calculate scores
  function finishQuiz() {
    clearInterval(timerInterval);
    totalQuizTime = Math.round((Date.now() - quizStartTime) / 1000);

    let correctCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) correctCount++;
    });

    const total = activeQuestions.length;
    const incorrectCount = total - correctCount;
    const pct = Math.round((correctCount / total) * 100);

    // Calculate score points (Challenger Mode)
    if (selectedMode === "challenger") {
      const basePoints = correctCount * 100;
      const streakBonus = maxStreak * 25;
      const timeLimitTotal = total * 15;
      const timeRemaining = Math.max(0, timeLimitTotal - totalQuizTime);
      const timeBonus = timeRemaining * 2;
      challengerScore = basePoints + streakBonus + timeBonus;

      // Show leaderboard entry form
      leaderboardEntryForm.classList.remove("d-none");
      leaderboardNameInput.value = "";
    } else {
      leaderboardEntryForm.classList.add("d-none");
    }

    // Set performance displays
    let title, msg;
    if (pct >= 90) {
      title = "Outstanding!";
      msg = "You are a true Space Expert. The cosmos belongs to you!";
    } else if (pct >= 70) {
      title = "Great Job!";
      msg = "You know your cosmos well. The stars are in your reach.";
    } else if (pct >= 50) {
      title = "Good Effort!";
      msg = "Nice try. Keep exploring the universe and studying details.";
    } else {
      title = "Keep Learning!";
      msg = "The stars await you! Re-read planet files and try again.";
    }

    document.getElementById("resultPct").textContent = `${pct}%`;
    document.getElementById("resultCorrect").textContent = `${correctCount}/${total}`;
    document.getElementById("resultTitle").textContent = title;
    document.getElementById("resultMsg").textContent = msg;

    // Stats Grid
    document.getElementById("statCorrect").textContent = correctCount;
    document.getElementById("statIncorrect").textContent = incorrectCount;
    document.getElementById("statStreak").textContent = maxStreak;
    document.getElementById("statTime").textContent = `${totalQuizTime}s`;

    // Swap UI
    quizBox.classList.add("d-none");
    quizResults.classList.remove("d-none");

    // Populate review debrief
    renderDebriefList();

    // Trigger star confetti if score is high!
    if (pct >= 70) {
      startConfetti();
    }
  }

  // Answer review list builder
  function renderDebriefList() {
    const filter = reviewFilter.value;
    reviewList.innerHTML = "";

    activeQuestions.forEach((q, idx) => {
      const userSelectedIdx = userAnswers[idx];
      const isCorrect = userSelectedIdx === q.answer;
      
      if (filter === "correct" && !isCorrect) return;
      if (filter === "incorrect" && isCorrect) return;

      const card = document.createElement("div");
      card.className = "bg-panel p-4 rounded-4 border " + (isCorrect ? "border-success-subtle" : "border-danger-subtle");

      let selectionText = "Not Answered";
      if (userSelectedIdx !== null) {
        selectionText = q.options[userSelectedIdx];
      } else if (skippedQuestions[idx]) {
        selectionText = "Skipped (Lifeline)";
      }

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <h6 class="fw-bold mb-0">${idx + 1}. ${q.q}</h6>
          <span class="chip">${q.category}</span>
        </div>
        <div class="small mb-2">
          Your Answer: <span class="${isCorrect ? "text-success fw-semibold" : "text-danger fw-semibold"}">
            <i class="fa-solid ${isCorrect ? "fa-circle-check" : "fa-circle-xmark"} me-1"></i>${selectionText}
          </span>
        </div>
        ${!isCorrect ? `<div class="small text-success mb-2"><i class="fa-solid fa-circle-check me-1"></i>Correct Answer: ${q.options[q.answer]}</div>` : ""}
        <div class="explanation-card mt-2 py-2 px-3 bg-opacity-25" style="border: 1px solid rgba(120, 150, 255, 0.1);">
          <div class="small text-muted-space"><i class="fa-solid fa-circle-info me-1"></i>${q.explanation}</div>
        </div>
      `;
      reviewList.appendChild(card);
    });
  }

  reviewFilter.addEventListener("change", renderDebriefList);

  // Submit Leaderboard score — POST to /api/leaderboard, fall back to localStorage
  submitScoreBtn.addEventListener("click", async () => {
    let callsign = leaderboardNameInput.value.trim().toUpperCase();
    if (!callsign) callsign = "PILOT-AH";

    const payload = {
      callsign,
      score: challengerScore,
      topic: selectedCategory === "all" ? "All" : selectedCategory,
    };

    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';

    try {
      const headers = isLoggedIn()
        ? authHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch(API_BASE + '/api/leaderboard', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { leaderboard } = await res.json();
        // Update local leaderboard display with global scores
        leaderboardBody.innerHTML = '';
        leaderboardEmpty.classList.add('d-none');
        leaderboard.forEach((item, index) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td>${item.callsign}</td>
            <td><span class="chip">${item.topic}</span></td>
            <td class="text-end text-warning"><strong>${item.score}</strong></td>
          `;
          leaderboardBody.appendChild(tr);
        });
      } else {
        // Fallback to localStorage if API is unavailable
        const newRecord = { name: callsign, score: challengerScore, topic: payload.topic, date: new Date().toISOString().split('T')[0] };
        const list = getLeaderboard();
        list.push(newRecord);
        list.sort((a, b) => b.score - a.score);
        saveLeaderboard(list.slice(0, 5));
        renderLeaderboardTable();
      }
    } catch (_) {
      // Offline fallback
      const newRecord = { name: callsign, score: challengerScore, topic: payload.topic, date: new Date().toISOString().split('T')[0] };
      const list = getLeaderboard();
      list.push(newRecord);
      list.sort((a, b) => b.score - a.score);
      saveLeaderboard(list.slice(0, 5));
      renderLeaderboardTable();
    } finally {
      submitScoreBtn.disabled = false;
      submitScoreBtn.textContent = 'Submit Score';
      leaderboardEntryForm.classList.add('d-none');
    }
  });

  // Action listeners
  restartBtn.addEventListener("click", () => {
    // Restart with same setups
    activeQuestions = shuffleArray(activeQuestions);
    userAnswers = new Array(activeQuestions.length).fill(null);
    skippedQuestions = new Array(activeQuestions.length).fill(false);
    currentQuestionIndex = 0;
    currentStreak = 0;
    maxStreak = 0;
    lifelinesUsed = { f50: false, hint: false, skip: false };
    quizStartTime = Date.now();

    lifeline5050.disabled = false;
    lifelineHint.disabled = false;
    lifelineSkip.disabled = false;

    quizResults.classList.add("d-none");
    quizBox.classList.remove("d-none");
    showQuestion();
  });

  menuBtn.addEventListener("click", () => {
    // Go to Setup setup
    quizResults.classList.add("d-none");
    quizBox.classList.add("d-none");
    setupBox.classList.remove("d-none");
    renderLeaderboardTable();
  });
}

function showResults(answers) {
  // Obsolete helper function replaced by advanced game states in initQuiz.
  // Kept empty to prevent syntax references from breaking elsewhere.
}

/* --------------------------------------------------------------------------
   10. AUTH — Login + Sign Up (connected to real backend API)
   -------------------------------------------------------------------------- */
function showAuthMsg(el, text, isError = false) {
  if (!el) return;
  el.style.background = isError ? 'rgba(255,92,92,.15)' : 'rgba(46,213,115,.15)';
  el.style.color = isError ? '#ff5c5c' : '#2ed573';
  el.innerHTML = `<i class="fa-solid fa-${isError ? 'circle-xmark' : 'circle-check'} me-1"></i>${text}`;
  el.classList.remove('d-none');
}

function setSubmitLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...`
    : label;
}

function initLogin() {
  /* ── Login form on login.html ── */
  const loginForm = document.getElementById('loginForm');
  const loginMsg  = document.getElementById('loginMsg');

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = loginForm.querySelector('[type=submit]');

      setSubmitLoading(btn, true);
      try {
        const res = await fetch(API_BASE + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');

        setSession(data.token, data.user);
        showAuthMsg(loginMsg, `Welcome back, ${data.user.firstName}! Redirecting...`);
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      } catch (err) {
        showAuthMsg(loginMsg, err.message, true);
        setSubmitLoading(btn, false, '<i class="fa-solid fa-right-to-bracket me-1"></i>Login');
      }
    });
  }

  /* ── Signup form on signup.html ── */
  const signupPageForm = document.getElementById('signupFormPage');
  const signupPageMsg  = document.getElementById('signupPageMsg');

  if (signupPageForm) {
    signupPageForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const firstName = document.getElementById('firstNamePage').value.trim();
      const lastName  = document.getElementById('lastNamePage').value.trim();
      const email     = document.getElementById('emailPage').value.trim();
      const password  = document.getElementById('passwordPage').value;
      const confirm   = document.getElementById('confirmPasswordPage').value;
      const btn = signupPageForm.querySelector('[type=submit]');

      if (password !== confirm) {
        showAuthMsg(signupPageMsg, 'Passwords do not match.', true);
        return;
      }
      if (password.length < 6) {
        showAuthMsg(signupPageMsg, 'Password must be at least 6 characters.', true);
        return;
      }

      setSubmitLoading(btn, true);
      try {
        const res = await fetch(API_BASE + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');

        setSession(data.token, data.user);
        showAuthMsg(signupPageMsg, `Account created! Welcome, ${data.user.firstName}! Redirecting...`);
        setTimeout(() => { window.location.href = 'index.html'; }, 1400);
      } catch (err) {
        showAuthMsg(signupPageMsg, err.message, true);
        setSubmitLoading(btn, false, '<i class="fa-solid fa-user-plus me-1"></i>Sign Up');
      }
    });
  }

  /* ── Legacy inline signupForm on login.html (kept for compatibility) ── */
  const signupForm = document.getElementById('signupForm');
  const signupMsg  = document.getElementById('signupMsg');
  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const firstName = document.getElementById('fullName').value.trim();
      const email     = document.getElementById('signupEmail').value.trim();
      const password  = document.getElementById('signupPassword').value;
      const confirm   = document.getElementById('confirmPassword').value;
      const btn = signupForm.querySelector('[type=submit]');

      if (password !== confirm) { showAuthMsg(signupMsg, 'Passwords do not match.', true); return; }
      setSubmitLoading(btn, true);
      try {
        const res = await fetch(API_BASE + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName: '', email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');
        setSession(data.token, data.user);
        showAuthMsg(signupMsg, `Account created! Welcome, ${data.user.firstName}!`);
        setTimeout(() => { window.location.href = 'index.html'; }, 1400);
      } catch (err) {
        showAuthMsg(signupMsg, err.message, true);
        setSubmitLoading(btn, false, '<i class="fa-solid fa-user-plus me-1"></i>Sign Up');
      }
    });
  }
}


/* --------------------------------------------------------------------------
   11. ADMIN PANEL
   Shows site stats and user activity for admin users only.
   -------------------------------------------------------------------------- */
function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function renderAdminRows(tbody, rows, emptyHtml) {
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = emptyHtml;
    return;
  }
  tbody.innerHTML = rows.join("");
}

function renderProfile() {
  const container = document.getElementById("profileContainer");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="space-card p-5 max-width-500 mx-auto">
          <i class="fa-solid fa-lock text-info mb-3" style="font-size: 3rem;"></i>
          <h3 class="fw-bold mb-3">Authentication Required</h3>
          <p class="text-muted-space mb-4">Please log in to view your profile.</p>
          <a href="login.html" class="btn btn-space">
            <i class="fa-solid fa-right-to-bracket me-2"></i>Login
          </a>
        </div>
      </div>
    `;
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="space-card p-5 max-width-500 mx-auto">
          <p class="text-muted-space">Unable to load profile. Please try logging in again.</p>
        </div>
      </div>
    `;
    return;
  }

  fetch(API_BASE + '/api/admin/me', { headers: authHeaders() })
    .then(res => res.ok ? res.json() : { isAdmin: false })
    .then(data => {
      const isAdmin = data.isAdmin || false;
      const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }) : 'N/A';

      container.innerHTML = `
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="space-card p-4 text-center h-100">
              <div class="icon-circle mx-auto mb-3" style="width: 80px; height: 80px; font-size: 2.5rem;">
                <i class="fa-solid fa-user-astronaut"></i>
              </div>
              <h3 class="fw-bold mb-1">${user.firstName} ${user.lastName || ''}</h3>
              <p class="text-muted-space small mb-3">${user.email}</p>
              <span class="badge ${isAdmin ? 'text-bg-info' : 'text-bg-secondary'} mb-3">
                <i class="fa-solid ${isAdmin ? 'fa-user-shield' : 'fa-user'} me-1"></i>${isAdmin ? 'Admin' : 'User'}
              </span>
              <div class="mt-3 text-start">
                <div class="mb-2">
                  <i class="fa-solid fa-calendar text-info me-2"></i>
                  <span class="text-muted-space">Member since:</span>
                  <strong>${memberSince}</strong>
                </div>
                <div class="mb-2">
                  <i class="fa-solid fa-envelope text-info me-2"></i>
                  <span class="text-muted-space">Email:</span>
                  <strong>${user.email}</strong>
                </div>
                <div>
                  <i class="fa-solid fa-shield-halved text-info me-2"></i>
                  <span class="text-muted-space">Role:</span>
                  <strong>${isAdmin ? 'Administrator' : 'Standard User'}</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-8">
            <div class="row g-4">
              <div class="col-md-6">
                <div class="space-card p-4 h-100">
                  <h5 class="fw-bold mb-3">
                    <i class="fa-solid fa-chart-simple text-info me-2"></i>Account Stats
                  </h5>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted-space">Favorites</span>
                    <strong>${user.favoritesCount || 0}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted-space">Account Type</span>
                    <strong>${isAdmin ? 'Admin' : 'User'}</strong>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="text-muted-space">Status</span>
                    <span class="badge text-bg-success">Active</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="space-card p-4 h-100">
                  <h5 class="fw-bold mb-3">
                    <i class="fa-solid fa-bolt text-info me-2"></i>Quick Actions
                  </h5>
                  <div class="d-grid gap-2">
                    <a href="favorites.html" class="btn btn-outline-space btn-sm text-start">
                      <i class="fa-solid fa-heart me-2"></i>View My Favorites
                    </a>
                    <a href="index.html" class="btn btn-outline-space btn-sm text-start">
                      <i class="fa-solid fa-house me-2"></i>Go to Home
                    </a>
                    ${isAdmin ? `
                    <a href="admin.html" class="btn btn-outline-space btn-sm text-start">
                      <i class="fa-solid fa-user-shield me-2"></i>Admin Panel
                    </a>
                    ` : ''}
                  </div>
                </div>
              </div>
              <div class="col-12">
                <div class="space-card p-4">
                  <h5 class="fw-bold mb-3">
                    <i class="fa-solid fa-meteor text-info me-2"></i>About Astro Hub
                  </h5>
                  <p class="text-muted-space mb-0">
                    Welcome to Astro Hub, your gateway to exploring the wonders of the universe!
                    Discover fascinating planets, stars, and space missions. Track your favorites,
                    test your knowledge with our quiz, and stay updated with NASA's Astronomy
                    Picture of the Day. Happy exploring, ${user.firstName}!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .catch(err => {
      console.error('Error loading profile:', err);
      container.innerHTML = `
        <div class="text-center py-5">
          <div class="space-card p-5 max-width-500 mx-auto">
            <i class="fa-solid fa-triangle-exclamation text-warning mb-3" style="font-size: 3rem;"></i>
            <h3 class="fw-bold mb-3">Error Loading Profile</h3>
            <p class="text-muted-space mb-4">Unable to load your profile data. Please try again later.</p>
            <button onclick="location.reload()" class="btn btn-space">
              <i class="fa-solid fa-rotate-right me-2"></i>Retry
            </button>
          </div>
        </div>
      `;
    });
}

async function renderAdminPanel() {
  const panel = document.getElementById("adminPanel");
  if (!panel) return;

  const authNotice = document.getElementById("adminAuthNotice");
  const statsGrid = document.getElementById("adminStatsGrid");
  const usersBody = document.getElementById("adminUsersBody");
  const leaderboardBody = document.getElementById("adminLeaderboardBody");
  const recentUsersBody = document.getElementById("adminRecentUsersBody");

  if (!isLoggedIn()) {
    panel.classList.add("d-none");
    authNotice.classList.remove("d-none");
    authNotice.innerHTML = `Please <a href="login.html" class="text-info text-decoration-none">login</a> with an admin account to open the admin panel.`;
    return;
  }

  try {
    const res = await fetch(API_BASE + "/api/admin/overview", { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      panel.classList.add("d-none");
      authNotice.classList.remove("d-none");
      authNotice.textContent = data.error || "Admin access required.";
      return;
    }

    authNotice.classList.add("d-none");
    panel.classList.remove("d-none");

    const stats = data.stats || {};
    statsGrid.innerHTML = [
      ["Users", stats.users || 0, "fa-users"],
      ["Favorites", stats.favorites || 0, "fa-heart"],
      ["Quiz Scores", stats.leaderboardEntries || 0, "fa-trophy"],
      ["Admins", stats.admins || 0, "fa-user-shield"],
    ].map(([label, value, icon]) => `
      <div class="col-md-6 col-xl-3">
        <div class="space-card admin-stat-card p-4">
          <div class="d-flex align-items-center justify-content-between gap-3">
            <div>
              <p class="text-muted-space small mb-1">${label}</p>
              <h3 class="fw-bold mb-0">${value}</h3>
            </div>
            <div class="icon-circle"><i class="fa-solid ${icon}"></i></div>
          </div>
        </div>
      </div>
    `).join("");

    renderAdminRows(usersBody, (data.users || []).map((user) => `
      <tr>
        <td>${user.firstName || "-"} ${user.lastName || ""}</td>
        <td>${user.email || "-"}</td>
        <td><span class="badge rounded-pill ${user.isAdmin ? "text-bg-info" : "text-bg-secondary"}">${user.isAdmin ? "Admin" : "User"}</span></td>
        <td>${user.favoritesCount || 0}</td>
        <td>${formatDateTime(user.createdAt)}</td>
      </tr>
    `), `<tr><td colspan="5" class="text-center text-muted-space py-4">No users yet.</td></tr>`);

    renderAdminRows(recentUsersBody, (data.recentUsers || []).map((user) => `
      <tr>
        <td>${user.firstName || "-"}</td>
        <td>${user.email || "-"}</td>
        <td>${formatDateTime(user.createdAt)}</td>
      </tr>
    `), `<tr><td colspan="3" class="text-center text-muted-space py-4">No recent users.</td></tr>`);

    renderAdminRows(leaderboardBody, (data.leaderboard || []).map((item, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td>${item.callsign || "PILOT-AH"}</td>
        <td>${item.score || 0}</td>
        <td>${item.topic || "All"}</td>
        <td>${item.submittedBy || "Guest"}</td>
        <td>${formatDateTime(item.submittedAt)}</td>
      </tr>
    `), `<tr><td colspan="6" class="text-center text-muted-space py-4">No leaderboard scores yet.</td></tr>`);
  } catch (err) {
    panel.classList.add("d-none");
    authNotice.classList.remove("d-none");
    authNotice.textContent = "Could not load admin data. Make sure the server is running.";
  }
}
/* --------------------------------------------------------------------------
   12. SCROLL REVEAL ANIMATION
   Uses IntersectionObserver to fade elements in as they scroll into view.
   -------------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   13. INITIALISE EVERYTHING WHEN THE PAGE LOADS
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async function () {
  if (!initializeAuthLifecycle() || !enforceProtectedRoute()) return;

  initLayout();
  updateFavCount();

  // Sync favorites from server (non-blocking — runs in background)
  syncFavoritesFromServer().then(() => {
    // Re-render favorites page after sync if we're on it
    if (document.getElementById('favoritesGrid')) {
      renderFavoritesPage();
    }
  });

  renderDailyFact();
  renderNasaImageOfTheDay();
  renderPlanets();
  renderPlanetDetail();
  renderStars();
  renderStarDetail();
  renderMissions();
  renderGallery();
  renderFavoritesPage();
  initQuiz();
  initLogin();
  renderProfile();
  renderAdminPanel();
  initReveal();
});
