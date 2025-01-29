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

export const generatePaginationButtons = (
    currentPage,
    totalPages,
    specific
) => {
    const buttons = [];
    const maxButtons = 5; // Limit the number of buttons to 7

    // Add the "Previous" button if not on the first page
    if (currentPage > 1) {
        buttons.push({
            text: "⬅️",
            callback_data: `list_page_${currentPage - 1}${specific}`,
        });
    }

    // Calculate range of pages to show
    let start = 1;
    let end = totalPages;

    // Ensure there's at least some space around the current page
    if (totalPages > maxButtons) {
        if (currentPage <= 4) {
            end = Math.min(maxButtons, totalPages); // Show first 7 pages if on the start
        } else if (currentPage >= totalPages - 3) {
            start = totalPages - maxButtons + 1; // Show last 7 pages if near the end
        } else {
            start = currentPage - 3; // Show a range of 7 pages around the current page
            end = currentPage + 3;
        }
    }

    // Add the page number buttons
    for (let i = start; i <= end; i++) {
        if (i === currentPage) {
            // Skip the current page
            continue;
        }
        buttons.push({
            text: `${i}`,
            callback_data: `list_page_${i}${specific}`,
        });
    }

    // Add the "Next" button if not on the last page
    if (currentPage < totalPages) {
        buttons.push({
            text: "➡️",
            callback_data: `list_page_${currentPage + 1}${specific}`,
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
