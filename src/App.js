import React, { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import CinemaGalaxy from "./CinemaGalaxy";
import MovieCard from "./MovieCard";
import "./App.css";

const API_URL = "https://api.tvmaze.com/search/shows";
const STARTER_QUERIES = ["batman", "marvel", "crime", "comedy"];
const QUICK_SEARCHES = ["Batman", "Marvel", "Crime", "Anime", "Comedy", "Drama"];
const NAV_ITEMS = ["Home", "Discover", "Collections", "Compare", "Insights", "Watchlist", "About"];
const toSlug = (value) => value.toLowerCase();
const fromSlug = (value) =>
  NAV_ITEMS.find((item) => toSlug(item) === String(value || "").replace("#", "").toLowerCase()) ||
  "Home";

const stripTags = (value) => String(value || "").replace(/<[^>]*>/g, "").trim();

const normalizeShow = (item) => {
  const show = item.show || item;
  return {
    id: show.id,
    name: show.name || "Untitled",
    type: show.type || "Show",
    language: show.language || "Unknown",
    genres: show.genres || [],
    status: show.status || "Unknown",
    runtime: show.averageRuntime || show.runtime,
    premiered: show.premiered,
    ended: show.ended,
    rating: show.rating?.average,
    network: show.network?.name || show.webChannel?.name || "Independent",
    country: show.network?.country?.name || show.webChannel?.country?.name || "Global",
    image: show.image?.original || show.image?.medium || "",
    summary: stripTags(show.summary) || "No summary is available for this title yet.",
    url: show.url,
    officialSite: show.officialSite,
  };
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

function App() {
  const [page, setPage] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("Batman");
  const [shows, setShows] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeGenre, setActiveGenre] = useState("All");
  const [sortBy, setSortBy] = useState("signal");
  const [statusFilter, setStatusFilter] = useState("All");
  const [runtimeFilter, setRuntimeFilter] = useState("All");
  const [savedIds, setSavedIds] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [watchNotes, setWatchNotes] = useState({});
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Finding the good stuff...");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("cinestack-saved") || "[]");
    const compared = JSON.parse(localStorage.getItem("cinestack-compare") || "[]");
    const notes = JSON.parse(localStorage.getItem("cinestack-notes") || "{}");
    setSavedIds(saved);
    setCompareIds(compared);
    setWatchNotes(notes);
  }, []);

  useEffect(() => {
    localStorage.setItem("cinestack-saved", JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem("cinestack-compare", JSON.stringify(compareIds));
  }, [compareIds]);

  useEffect(() => {
    localStorage.setItem("cinestack-notes", JSON.stringify(watchNotes));
  }, [watchNotes]);

  useEffect(() => {
    loadStarterShows();
  }, []);

  useEffect(() => {
    const syncPageFromHash = () => setPage(fromSlug(window.location.hash));
    syncPageFromHash();
    window.addEventListener("hashchange", syncPageFromHash);
    window.addEventListener("popstate", syncPageFromHash);
    return () => {
      window.removeEventListener("hashchange", syncPageFromHash);
      window.removeEventListener("popstate", syncPageFromHash);
    };
  }, []);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMenuOpen(false);
    window.history.pushState(null, "", `#${toSlug(nextPage)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadStarterShows = async () => {
    setStatus("loading");
    setMessage("Building your opening shelf...");

    try {
      const responses = await Promise.all(
        STARTER_QUERIES.map((term) =>
          fetch(`${API_URL}?q=${encodeURIComponent(term)}`).then((res) => res.json())
        )
      );
      const hydrated = uniqueById(responses.flat().map(normalizeShow));
      setShows(hydrated);
      setFeatured(hydrated.find((show) => show.image && show.rating) || hydrated[0]);
      setStatus("ready");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage("The entertainment feed did not respond. Please try again.");
    }
  };

  const searchShows = async (term = query, destination = "Discover") => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage(`Searching for "${trimmed}"...`);
    setQuery(trimmed);
    setActiveGenre("All");
    setStatusFilter("All");
    setRuntimeFilter("All");
    setPage(destination);
    window.history.pushState(null, "", `#${toSlug(destination)}`);

    try {
      const response = await fetch(`${API_URL}?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      const results = uniqueById(data.map(normalizeShow));
      setShows(results);
      setFeatured(results.find((show) => show.image) || results[0] || null);
      setStatus("ready");
      setMessage(results.length ? "" : "No titles matched that search.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus("error");
      setMessage("Search is unavailable right now. Please try another title.");
    }
  };

  const genres = useMemo(() => {
    const allGenres = shows.flatMap((show) => show.genres);
    return ["All", ...Array.from(new Set(allGenres)).sort()];
  }, [shows]);

  const filteredShows = useMemo(() => {
    const filtered = shows.filter((show) => {
      const genreMatch = activeGenre === "All" || show.genres.includes(activeGenre);
      const statusMatch = statusFilter === "All" || show.status === statusFilter;
      const runtimeMatch =
        runtimeFilter === "All" ||
        (runtimeFilter === "Short" && show.runtime && show.runtime <= 30) ||
        (runtimeFilter === "Standard" && show.runtime && show.runtime > 30 && show.runtime <= 50) ||
        (runtimeFilter === "Long" && show.runtime && show.runtime > 50);

      return genreMatch && statusMatch && runtimeMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "newest") return new Date(b.premiered || 0) - new Date(a.premiered || 0);
      if (sortBy === "runtime") return (a.runtime || 999) - (b.runtime || 999);
      return (b.rating || 0) + (b.image ? 1 : 0) - ((a.rating || 0) + (a.image ? 1 : 0));
    });
  }, [activeGenre, runtimeFilter, shows, sortBy, statusFilter]);

  const topRated = useMemo(
    () =>
      [...shows]
        .filter((show) => show.rating)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5),
    [shows]
  );

  const runningShows = useMemo(
    () => shows.filter((show) => show.status === "Running").slice(0, 8),
    [shows]
  );

  const savedShows = useMemo(
    () => shows.filter((show) => savedIds.includes(show.id)),
    [savedIds, shows]
  );

  const comparedShows = useMemo(
    () => shows.filter((show) => compareIds.includes(show.id)),
    [compareIds, shows]
  );

  const statusOptions = useMemo(
    () => ["All", ...Array.from(new Set(shows.map((show) => show.status))).filter(Boolean).sort()],
    [shows]
  );

  const genreSignals = useMemo(() => {
    const counts = shows.reduce((acc, show) => {
      show.genres.forEach((genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [shows]);

  const collectionCards = useMemo(
    () => [
      {
        title: "High-score picks",
        description: "Titles with the strongest audience signals in your current shelf.",
        metric: topRated.length ? `${topRated[0].rating}/10` : "Live",
        query: "prestige drama",
      },
      {
        title: "Short watch",
        description: "Fast episodes for a lunch break, commute, or late-night one more episode.",
        metric: `${shows.filter((show) => show.runtime && show.runtime <= 30).length} titles`,
        query: "comedy",
      },
      {
        title: "Crime night",
        description: "Mysteries, investigations, documentaries, and gritty procedural energy.",
        metric: "Curated",
        query: "crime",
      },
      {
        title: "Animation stack",
        description: "Stylized worlds, comic-book universes, anime, and family-friendly finds.",
        metric: "Fresh",
        query: "animation",
      },
    ],
    [shows, topRated]
  );

  const stats = useMemo(() => {
    const rated = shows.filter((show) => show.rating);
    const average =
      rated.length > 0
        ? (rated.reduce((total, show) => total + show.rating, 0) / rated.length).toFixed(1)
        : "N/A";

    return [
      { label: "Titles", value: shows.length || "0" },
      { label: "Avg rating", value: average },
      { label: "Genres", value: Math.max(genres.length - 1, 0) },
    ];
  }, [genres.length, shows]);

  const toggleSaved = (id) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]
    );
  };

  const toggleCompared = (id) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((comparedId) => comparedId !== id);
      return [...current.slice(-2), id];
    });
  };

  const updateWatchNote = (id, note) => {
    setWatchNotes((current) => ({ ...current, [id]: note }));
  };

  const renderMovieGrid = (items = filteredShows) => (
    <div className="movie-grid">
      {items.map((show) => (
        <MovieCard
          key={show.id}
          movie={show}
          isSaved={savedIds.includes(show.id)}
          isCompared={compareIds.includes(show.id)}
          onOpen={setSelected}
          onToggleSaved={toggleSaved}
          onCompare={toggleCompared}
        />
      ))}
    </div>
  );

  const renderSearch = (compact = false) => (
    <form
      className={`search-panel ${compact ? "compact-search" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        searchShows();
      }}
    >
      <label htmlFor={compact ? "search-compact" : "search"}>Search titles</label>
      <div className="search-row">
        <input
          id={compact ? "search-compact" : "search"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try The Last of Us, Batman, Friends..."
        />
        <button type="submit">Search</button>
      </div>
    </form>
  );

  const renderHome = () => (
    <>
      <section className="hero">
        <CinemaGalaxy />
        <KineticConstellation />
        <div className="hero-backword" aria-hidden="true">OBSERVATORY</div>
        <div className="hero-copy">
          <p className="eyebrow">Movie and series discovery</p>
          <h1>Find the next story worth your night.</h1>
          <p className="hero-text">
            CineStack turns a plain API search into a refined watch discovery desk with ratings,
            genres, saved picks, and quick paths for different moods.
          </p>

          {renderSearch()}

          <div className="quick-searches" aria-label="Quick searches">
            {QUICK_SEARCHES.map((term) => (
              <button key={term} type="button" onClick={() => searchShows(term)}>
                {term}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-stage" aria-label="Featured title artwork">
          <div className="signal-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {featured && (
            <button className="feature-poster" type="button" onClick={() => setSelected(featured)}>
              <img src={featured.image} alt="" />
              <span className="feature-shade" />
              <span className="feature-meta">
                <span>{featured.rating ? `${featured.rating}/10` : "Unrated"}</span>
                <strong>{featured.name}</strong>
                <small>{featured.genres.slice(0, 2).join(" / ") || featured.type}</small>
              </span>
            </button>
          )}
          <div className="floating-panel top">
            <strong>{topRated[0]?.rating || "Live"}</strong>
            <span>signal score</span>
          </div>
          <div className="floating-panel bottom">
            <strong>{shows.length}</strong>
            <span>titles scanned</span>
          </div>
        </div>
      </section>

      <Reveal as="section" className="stats-strip" aria-label="Current catalogue stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </Reveal>

      <Reveal as="section" className="signal-ribbon" aria-label="CineStack features">
        <MotionGlyph label="Ratings" />
        <MotionGlyph label="Runtime" />
        <MotionGlyph label="Genres" />
        <MotionGlyph label="Compare" />
        <MotionGlyph label="Notes" />
        <MotionGlyph label="Watchlist" />
      </Reveal>

      <Reveal as="section" className="section mood-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start here</p>
            <h2>Pick a mood, then follow the signal.</h2>
          </div>
        </div>
        <div className="mood-grid">
          {collectionCards.map((card) => (
            <button key={card.title} type="button" onClick={() => searchShows(card.query)}>
              <span>{card.metric}</span>
              <strong>{card.title}</strong>
              <small>{card.description}</small>
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="section lab-section" variant="rise-left">
        <div>
          <p className="eyebrow">Decision lab</p>
          <h2>More than a list of posters.</h2>
          <p>
            CineStack now supports the things people actually need before pressing play: score
            sorting, runtime filters, compare cards, saved notes, and signal-based shelves.
          </p>
        </div>
        <div className="lab-grid">
          <article>
            <span>01</span>
            <strong>Filter by time</strong>
            <small>Short, standard, and long-watch views for different evenings.</small>
          </article>
          <article>
            <span>02</span>
            <strong>Compare picks</strong>
            <small>Stack up to three titles and inspect rating, network, runtime, and status.</small>
          </article>
          <article>
            <span>03</span>
            <strong>Save intent</strong>
            <small>Add private notes to remember why a title made your shelf.</small>
          </article>
        </div>
      </Reveal>

      <Reveal as="section" className="section split-section" variant="rise-right">
        <TopRatedList topRated={topRated} onOpen={setSelected} />
        <SavedShelf savedShows={savedShows} onOpen={setSelected} />
      </Reveal>
    </>
  );

  const renderDiscover = () => (
    <section className="section page-section">
      <div className="page-hero page-hero-grid">
        <div>
          <p className="eyebrow">Browse</p>
          <h1>Discovery board</h1>
          <p>
            Search, filter, compare, and open richer details for every result. The board updates
            directly from TVMaze and keeps your saved shelf in this browser.
          </p>
          {renderSearch(true)}
        </div>
        <div className="page-graphic discover-graphic" aria-hidden="true">
          <AnimatedPageSvg variant="scan" />
          <span className="graphic-title">SCAN</span>
          <span className="graphic-line" />
          <span className="graphic-chip">40 live records</span>
        </div>
      </div>

      <div className="section-heading board-heading">
        <div className="genre-bar" aria-label="Filter by genre">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              className={activeGenre === genre ? "active" : ""}
              onClick={() => setActiveGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
        <button className="text-button" type="button" onClick={loadStarterShows}>
          Reset shelf
        </button>
      </div>

      <div className="control-deck" aria-label="Advanced discovery controls">
        <label>
          Sort
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="signal">Best signal</option>
            <option value="rating">Highest rated</option>
            <option value="newest">Newest first</option>
            <option value="runtime">Shortest first</option>
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Runtime
          <select value={runtimeFilter} onChange={(event) => setRuntimeFilter(event.target.value)}>
            <option value="All">Any length</option>
            <option value="Short">30 min or less</option>
            <option value="Standard">31-50 min</option>
            <option value="Long">Over 50 min</option>
          </select>
        </label>
        <span>{filteredShows.length} matching titles</span>
      </div>

      {message && <p className={`status-message ${status}`}>{message}</p>}
      <Reveal variant="fade-up">{renderMovieGrid()}</Reveal>
    </section>
  );

  const renderCompare = () => {
    const comparison = comparedShows.length ? comparedShows : topRated.slice(0, 3);

    return (
      <section className="section page-section">
        <div className="page-hero page-hero-grid">
          <div>
            <p className="eyebrow">Compare</p>
            <h1>Make the final call faster.</h1>
            <p>
              Select Compare on up to three titles. CineStack turns them into a clear decision table
              so ratings, runtime, network, and status are easy to scan.
            </p>
          </div>
          <div className="page-graphic compare-graphic" aria-hidden="true">
            <AnimatedPageSvg variant="compare" />
            <span className="graphic-title">VS</span>
            <span className="graphic-chip">side by side</span>
          </div>
        </div>

        <Reveal className="compare-grid">
          {comparison.map((show) => (
            <article key={show.id} className="compare-card">
              <img src={show.image} alt="" />
              <div>
                <p className="eyebrow">{show.genres.slice(0, 2).join(" / ") || show.type}</p>
                <h2>{show.name}</h2>
                <dl>
                  <div>
                    <dt>Rating</dt>
                    <dd>{show.rating ? `${show.rating}/10` : "Unrated"}</dd>
                  </div>
                  <div>
                    <dt>Runtime</dt>
                    <dd>{show.runtime ? `${show.runtime} min` : "TBA"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{show.status}</dd>
                  </div>
                  <div>
                    <dt>Network</dt>
                    <dd>{show.network}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setSelected(show)}>
                  Details
                </button>
              </div>
            </article>
          ))}
        </Reveal>

        <div className="empty-note compare-note">
          Use the Compare button on any title card to replace this starter set.
        </div>
      </section>
    );
  };

  const renderInsights = () => (
    <section className="section page-section">
      <div className="page-hero page-hero-grid">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Your shelf, turned into signals.</h1>
          <p>
            Inspired by tracking-focused apps, this page summarizes what is inside the current search
            shelf so users can choose by pattern instead of scrolling forever.
          </p>
        </div>
        <div className="page-graphic insights-graphic" aria-hidden="true">
          <AnimatedPageSvg variant="insights" />
          <span className="graphic-title">DATA</span>
          <span className="graphic-line" />
          <span className="graphic-chip">genre heat</span>
        </div>
      </div>

      <Reveal className="insight-grid">
        <article className="insight-card large">
          <p className="eyebrow">Genre heat</p>
          <h2>What this shelf leans toward</h2>
          <div className="bar-list">
            {genreSignals.map(([genre, count]) => (
              <div key={genre}>
                <span>{genre}</span>
                <strong style={{ width: `${Math.min(100, Math.max(18, count * 10))}%` }}>
                  {count}
                </strong>
              </div>
            ))}
          </div>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Weekend plan</p>
          <h2>Three-title queue</h2>
          {(savedShows.length ? savedShows : topRated.slice(0, 3)).slice(0, 3).map((show) => (
            <button key={show.id} type="button" onClick={() => setSelected(show)}>
              <span>{show.runtime ? `${show.runtime} min` : "TBA"}</span>
              <strong>{show.name}</strong>
            </button>
          ))}
        </article>
        <article className="insight-card">
          <p className="eyebrow">Watch economics</p>
          <h2>Best value picks</h2>
          {topRated.slice(0, 3).map((show) => (
            <button key={show.id} type="button" onClick={() => setSelected(show)}>
              <span>{show.rating ? `${show.rating}/10` : "NR"}</span>
              <strong>{show.name}</strong>
            </button>
          ))}
        </article>
      </Reveal>
    </section>
  );

  const renderCollections = () => (
    <section className="section page-section">
      <div className="page-hero page-hero-grid">
        <div>
          <p className="eyebrow">Collections</p>
          <h1>Curated paths for indecisive nights.</h1>
          <p>
            These pages are built from the same live catalogue, but shaped around how people actually
            choose what to watch: time, tone, trust, and mood.
          </p>
        </div>
        <div className="page-graphic collections-graphic" aria-hidden="true">
          <AnimatedPageSvg variant="collections" />
          <span className="graphic-title">MOOD</span>
          <span className="graphic-chip">curated lanes</span>
        </div>
      </div>

      <Reveal className="collection-grid">
        {collectionCards.map((card) => (
          <article key={card.title} className="collection-card">
            <span>{card.metric}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <button type="button" onClick={() => searchShows(card.query)}>
              Explore
            </button>
          </article>
        ))}
      </Reveal>

      <Reveal className="section feature-row" variant="rise-left">
        <TopRatedList topRated={topRated} onOpen={setSelected} />
        <div>
          <p className="eyebrow">On air</p>
          <h2>Still running</h2>
          {runningShows.length > 0 ? renderMovieGrid(runningShows) : <p className="empty-note">Search more titles to reveal running shows.</p>}
        </div>
      </Reveal>
    </section>
  );

  const renderWatchlist = () => (
    <section className="section page-section">
      <div className="page-hero page-hero-grid">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1>Your saved shelf.</h1>
          <p>
            Saved titles live locally in this browser, so the app feels personal without requiring a
            sign-in flow.
          </p>
        </div>
        <div className="page-graphic watchlist-graphic" aria-hidden="true">
          <AnimatedPageSvg variant="watchlist" />
          <span className="graphic-title">SAVE</span>
          <span className="graphic-chip">local shelf</span>
        </div>
      </div>

      {savedShows.length > 0 ? (
        <Reveal>{renderMovieGrid(savedShows)}</Reveal>
      ) : (
        <Reveal className="empty-state">
          <h2>No saved titles yet</h2>
          <p>Use the Save button on any poster card and your picks will appear here.</p>
          <button type="button" onClick={() => navigate("Discover")}>
            Browse titles
          </button>
        </Reveal>
      )}
    </section>
  );

  const renderAbout = () => (
    <section className="section about-page">
      <div className="page-hero page-hero-grid">
        <div>
          <p className="eyebrow">About CineStack</p>
          <h1>A genuine little discovery product.</h1>
          <p>
            CineStack is a React app powered by the public TVMaze API. It focuses on the real job:
            helping someone decide what to watch with clean metadata, usable filters, and a pleasant
            browsing rhythm.
          </p>
        </div>
        <div className="page-graphic about-graphic" aria-hidden="true">
          <AnimatedPageSvg variant="about" />
          <span className="graphic-title">WHY</span>
          <span className="graphic-chip">built for choice</span>
        </div>
      </div>

      <Reveal className="about-grid">
        <article>
          <span>01</span>
          <h2>Live data</h2>
          <p>Search and opening shelves are hydrated from TVMaze instead of hard-coded lists.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Useful context</h2>
          <p>Ratings, runtime, network, status, genres, and summaries are visible without clutter.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Personal shelf</h2>
          <p>Saved items persist locally so a visitor can build a tiny watchlist instantly.</p>
        </article>
      </Reveal>
    </section>
  );

  const pages = {
    Home: renderHome,
    Discover: renderDiscover,
    Collections: renderCollections,
    Compare: renderCompare,
    Insights: renderInsights,
    Watchlist: renderWatchlist,
    About: renderAbout,
  };

  return (
    <main className="app">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => navigate("Home")} aria-label="CineStack home">
          <img src="/cinestack-logo.svg" alt="" />
        </button>

        <button
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={page === item ? "active" : ""}
              onClick={() => navigate(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="header-cta" type="button" onClick={() => navigate("Discover")}>
          Explore
        </button>
      </header>

      {pages[page]()}

      <Footer navigate={navigate} />

      {selected && (
        <div className="details-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <article className="details-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" type="button" onClick={() => setSelected(null)}>
              Close
            </button>
            <div className="details-media">
              <img src={selected.image} alt="" />
            </div>
            <div className="details-content">
              <p className="eyebrow">{selected.type}</p>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
              <dl>
                <div>
                  <dt>Rating</dt>
                  <dd>{selected.rating ? `${selected.rating}/10` : "Unrated"}</dd>
                </div>
                <div>
                  <dt>Runtime</dt>
                  <dd>{selected.runtime ? `${selected.runtime} min` : "TBA"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Network</dt>
                  <dd>{selected.network}</dd>
                </div>
              </dl>
              <div className="details-actions">
                <button type="button" onClick={() => toggleSaved(selected.id)}>
                  {savedIds.includes(selected.id) ? "Saved" : "Save title"}
                </button>
                <button type="button" onClick={() => toggleCompared(selected.id)}>
                  {compareIds.includes(selected.id) ? "In compare" : "Compare"}
                </button>
                <a href={selected.url} target="_blank" rel="noreferrer">
                  View source
                </a>
              </div>
              <label className="note-field">
                Watch note
                <textarea
                  value={watchNotes[selected.id] || ""}
                  onChange={(event) => updateWatchNote(selected.id, event.target.value)}
                  placeholder="Why is this worth saving?"
                />
              </label>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}

function KineticConstellation() {
  return (
    <svg className="kinetic-constellation" viewBox="0 0 900 620" aria-hidden="true">
      <defs>
        <linearGradient id="constellationGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6a7" />
          <stop offset="0.55" stopColor="#9fe7ff" />
          <stop offset="1" stopColor="#e8b4ff" />
        </linearGradient>
      </defs>
      <path className="constellation-path path-one" d="M80 440 C 210 280, 320 530, 460 330 S 690 120, 820 240" />
      <path className="constellation-path path-two" d="M120 180 C 260 90, 360 210, 470 140 S 690 80, 790 170" />
      {[90, 210, 330, 470, 610, 790].map((x, index) => (
        <circle key={x} className="constellation-dot" cx={x} cy={index % 2 ? 190 : 340} r="5" />
      ))}
    </svg>
  );
}

function Reveal({ as: Component = "div", className = "", variant = "fade-up", children, ...props }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.01,
    rootMargin: "0px 0px -48px 0px",
  });

  return (
    <Component ref={ref} className={`reveal reveal-${variant} ${inView ? "is-visible" : ""} ${className}`} {...props}>
      {children}
    </Component>
  );
}

function AnimatedPageSvg({ variant }) {
  const paths = {
    scan: "M44 180 C120 54 238 282 336 104 S522 92 592 204",
    compare: "M60 90 C160 230 250 20 356 174 S498 255 590 86",
    insights: "M50 220 C150 120 240 260 344 152 S482 62 594 194",
    collections: "M72 122 C170 34 244 196 338 102 S512 84 590 178",
    watchlist: "M62 184 C146 90 228 230 326 134 S492 88 590 196",
    about: "M60 138 C162 36 250 236 346 126 S486 70 592 170",
  };

  return (
    <svg className={`page-motion-svg page-motion-${variant}`} viewBox="0 0 640 320">
      <path d={paths[variant]} />
      <circle cx="96" cy="194" r="9" />
      <circle cx="312" cy="128" r="6" />
      <circle cx="548" cy="174" r="11" />
      <rect x="412" y="88" width="68" height="42" rx="12" />
      <rect x="134" y="74" width="48" height="78" rx="12" />
    </svg>
  );
}

function MotionGlyph({ label }) {
  return (
    <span className="motion-glyph">
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <path d="M21 3v36M3 21h36" />
        <circle cx="21" cy="21" r="7" />
      </svg>
      {label}
    </span>
  );
}

function TopRatedList({ topRated, onOpen }) {
  return (
    <div>
      <p className="eyebrow">Signals</p>
      <h2>Top rated in this shelf</h2>
      <div className="rank-list">
        {topRated.map((show, index) => (
          <button key={show.id} type="button" onClick={() => onOpen(show)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{show.name}</strong>
            <small>{show.rating}/10</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function SavedShelf({ savedShows, onOpen }) {
  return (
    <div>
      <p className="eyebrow">Shelf</p>
      <h2>Saved for later</h2>
      {savedShows.length > 0 ? (
        <div className="saved-list">
          {savedShows.map((show) => (
            <button key={show.id} type="button" onClick={() => onOpen(show)}>
              <img src={show.image} alt="" />
              <span>{show.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-note">Save a title from the board and it will stay here.</p>
      )}
    </div>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="site-footer">
      <div>
        <button className="footer-brand" type="button" onClick={() => navigate("Home")}>
          <img src="/cinestack-logo.svg" alt="" />
        </button>
        <p>
          A fast, refined movie and series discovery interface built with React and TVMaze data.
        </p>
      </div>
      <div>
        <h3>Explore</h3>
        {NAV_ITEMS.map((item) => (
          <button key={item} type="button" onClick={() => navigate(item)}>
            {item}
          </button>
        ))}
      </div>
      <div>
        <h3>Data</h3>
        <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">
          TVMaze API
        </a>
        <span>No API key required</span>
        <span>Saved locally</span>
      </div>
    </footer>
  );
}

export default App;
