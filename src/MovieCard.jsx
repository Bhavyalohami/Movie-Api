import React from "react";

const fallbackPoster =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 900'%3E%3Crect width='600' height='900' fill='%2317171f'/%3E%3Ccircle cx='300' cy='370' r='138' fill='%2384233a'/%3E%3Crect x='172' y='560' width='256' height='34' rx='17' fill='%23d29a39'/%3E%3Crect x='214' y='624' width='172' height='24' rx='12' fill='%23fffaf2' opacity='.86'/%3E%3C/svg%3E";

function MovieCard({ movie, isSaved, isCompared, onOpen, onToggleSaved, onCompare }) {
  const year = movie.premiered ? new Date(movie.premiered).getFullYear() : "TBA";
  const genres = movie.genres.length ? movie.genres.slice(0, 2).join(" / ") : movie.type;

  return (
    <article className="movie-card">
      <button className="poster-button" type="button" onClick={() => onOpen(movie)}>
        <img src={movie.image || fallbackPoster} alt={`${movie.name} poster`} />
        <span className="poster-gradient" />
        <span className="rating-pill">{movie.rating ? `${movie.rating}` : "NR"}</span>
      </button>

      <div className="card-body">
        <div>
          <p>{genres}</p>
          <h3>{movie.name}</h3>
        </div>
        <button
          className={`save-button ${isSaved ? "saved" : ""}`}
          type="button"
          onClick={() => onToggleSaved(movie.id)}
          aria-label={isSaved ? `Remove ${movie.name} from saved` : `Save ${movie.name}`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>

      <button
        className={`compare-button ${isCompared ? "active" : ""}`}
        type="button"
        onClick={() => onCompare(movie.id)}
      >
        {isCompared ? "Comparing" : "Compare"}
      </button>

      <div className="card-meta">
        <span>{year}</span>
        <span>{movie.runtime ? `${movie.runtime} min` : "Runtime TBA"}</span>
        <span>{movie.network}</span>
      </div>
    </article>
  );
}

export default MovieCard;
