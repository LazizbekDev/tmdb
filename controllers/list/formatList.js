export default function formatList(movies, series) {
    let movieList = "<b>Movies:</b>\n";
    let seriesList = "<b>Series:</b>\n";

    // Map over movies and create deep link URLs
    movieList += movies
        .map(
            (movie) =>
                `<a href="https://t.me/${process.env.BOT_USERNAME}?start=${encodeURIComponent(movie._id)}">${movie.name}</a>`
        )
        .join("\n");

    // Map over series and create deep link URLs
    seriesList += series
        .map(
            (seriesItem) =>
                `<a href="https://t.me/${process.env.BOT_USERNAME}?start=${encodeURIComponent(
                    seriesItem._id
                )}">${seriesItem.name}</a>`
        )
        .join("\n");

    // Combine the movie and series lists into one
    return `${movieList}\n\n${seriesList}`;
}
