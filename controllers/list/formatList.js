export default function formatList(movies, series, page, limit) {
    let movieList = "<b>Movies:</b>\n";
    let seriesList = "<b>Series:</b>\n";

    const moviePageStart = (page - 1) * limit;
    const moviePageEnd = moviePageStart + limit;
    const seriesPageStart = (page - 1) * limit;
    const seriesPageEnd = seriesPageStart + limit;

    // Paginate movies
    const paginatedMovies = movies.slice(moviePageStart, moviePageEnd);
    const paginatedSeries = series.slice(seriesPageStart, seriesPageEnd);

    // Format movies list
    if (paginatedMovies.length > 0) {
        movieList += paginatedMovies
            .map(
                (movie, index) =>
                    `${moviePageStart + index + 1}. <a href="https://t.me/${
                        process.env.BOT_USERNAME
                    }?start=${encodeURIComponent(movie._id)}">${movie.name}</a>`
            )
            .join("\n");
    } else {
        movieList += "No movies available.";
    }

    // Format series list
    if (paginatedSeries.length > 0) {
        seriesList += paginatedSeries
            .map(
                (seriesItem, index) =>
                    `${seriesPageStart + index + 1}. <a href="https://t.me/${
                        process.env.BOT_USERNAME
                    }?start=${encodeURIComponent(seriesItem._id)}">${
                        seriesItem.name
                    }</a>`
            )
            .join("\n");
    } else {
        seriesList += "No series available.";
    }

    // Combine movie and series list
    return `${movieList}\n\n${seriesList}`;
}

export const generatePaginationButtons = (currentPage, totalPages) => {
    const buttons = [];

    if (currentPage > 1) {
        buttons.push({
            text: "⬅️",
            callback_data: `list_page_${currentPage - 1}`,
        });
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            // Don't add a button for the current page
            continue;
        } else if (
            i <= 2 ||
            i >= totalPages - 1 ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            buttons.push({ text: `${i}`, callback_data: `list_page_${i}` });
        }
    }

    if (currentPage < totalPages) {
        buttons.push({
            text: "➡️",
            callback_data: `list_page_${currentPage + 1}`,
        });
    }

    return [buttons];
};

export const generateHeader = (moviesCount, seriesCount) => {
    const totalCount = moviesCount + seriesCount;
    return `<b>Total Films: 🎥 ${totalCount}</b>\n<b>Movies: 🍿 ${moviesCount}</b>\n<b>Series: 📺 ${seriesCount}</b>\n\n`;
};

// Function to calculate total pages based on maximum of movies/series
export const calculateTotalPages = (moviesCount, seriesCount, limit) => {
    const maxItems = Math.max(moviesCount, seriesCount);
    return Math.ceil(maxItems / limit);
};
