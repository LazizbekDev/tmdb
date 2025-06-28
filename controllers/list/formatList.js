export default function formatList(movies, series, page, limit) {
  let movieList = "<b>Movies:</b>\n";
  let seriesList = "<b>Series:</b>\n";

  // Format movies list
  if (movies.length > 0) {
    movieList += movies
      .map(
        (movie, index) =>
          `${(page - 1) * limit + index + 1}. <a href="https://t.me/${process.env.BOT_USERNAME}?start=${encodeURIComponent(
            movie._id
          )}">${movie.name}</a>`
      )
      .join("\n");
  } else {
    movieList += "No movies available.";
  }

  // Format series list
  if (series.length > 0) {
    seriesList += series
      .map(
        (seriesItem, index) =>
          `${(page - 1) * limit + index + 1}. <a href="https://t.me/${process.env.BOT_USERNAME}?start=${encodeURIComponent(
            seriesItem._id
          )}">${seriesItem.name}</a>`
      )
      .join("\n");
  } else {
    seriesList += "No series available.";
  }

  // Combine movie and series list
  return `${movieList}\n\n${seriesList}`;
}

export const generatePaginationButtons = (currentPage, totalPages, actionPrefix = "list_page_") => {
  const buttons = [];
  const maxButtons = 5; // Limit the number of buttons to 5

  // Add the "Previous" button if not on the first page
  if (currentPage > 1) {
    buttons.push({
      text: "⬅️",
      callback_data: `${actionPrefix}${currentPage - 1}`,
    });
  }

  // Calculate range of pages to show
  let start = 1;
  let end = totalPages;

  if (totalPages > maxButtons) {
    if (currentPage <= 3) {
      end = Math.min(maxButtons, totalPages); // Show first pages if near the start
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - maxButtons + 1; // Show last pages if near the end
    } else {
      start = currentPage - 2; // Show a range of pages around the current page
      end = currentPage + 2;
    }
  }

  // Add the page number buttons
  for (let i = start; i <= end; i++) {
    if (i === currentPage) continue; // Skip the current page
    buttons.push({ text: `${i}`, callback_data: `${actionPrefix}${i}` });
  }

  // Add the "Next" button if not on the last page
  if (currentPage < totalPages) {
    buttons.push({
      text: "➡️",
      callback_data: `${actionPrefix}${currentPage + 1}`,
    });
  }

  return [buttons];
};

export const generateHeader = (moviesCount, seriesCount) => {
  const totalCount = moviesCount + seriesCount;
  return `<b>Total Films: 🎥 ${totalCount}</b>\n<b>Movies: 🍿 ${moviesCount}</b>\n<b>Series: 📺 ${seriesCount}</b>\n\n`;
};

export const calculateTotalPages = (moviesCount, seriesCount, limit) => {
  const maxItems = Math.max(moviesCount, seriesCount);
  return Math.ceil(maxItems / limit);
};