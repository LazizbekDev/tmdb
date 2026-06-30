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

export const generatePaginationButtons = (currentPage, totalPages, actionPrefix = "l_", sortType = "new") => {
  const keyboard = [];

  // 1. Sort Row
  keyboard.push([
    { text: sortType === "new" ? "🔽 Newest" : "Newest", callback_data: `${actionPrefix}1_new` },
    { text: sortType === "old" ? "🔼 Oldest" : "Oldest", callback_data: `${actionPrefix}1_old` },
    { text: sortType === "pop" ? "⭐ Popular" : "Popular", callback_data: `${actionPrefix}1_pop` }
  ]);

  // 2. Tens Row (faqat umumiy sahifalar soni 10 dan katta bo'lsa)
  if (totalPages > 10) {
    const tensRow = [];
    const startTen = Math.floor((currentPage - 1) / 50) * 50 + 10;
    
    if (startTen > 10) {
      tensRow.push({ text: "«", callback_data: `${actionPrefix}${startTen - 10}_${sortType}` });
    }

    for (let i = 0; i < 5; i++) {
      const val = startTen + i * 10;
      if (val > totalPages) {
        break;
      }
      
      // Agar 5 ta tugma chegarasiga yetsak va yana sahifalar qolgan bo'lsa "»" qo'shish
      if (tensRow.length === 4 && val + 10 <= totalPages && startTen > 10) {
        tensRow.push({ text: "»", callback_data: `${actionPrefix}${val}_${sortType}` });
        break;
      } else if (tensRow.length === 4 && val < totalPages && startTen === 10 && val + 10 <= totalPages) {
         tensRow.push({ text: "»", callback_data: `${actionPrefix}${val}_${sortType}` });
         break;
      }
      
      tensRow.push({ text: `${val}`, callback_data: `${actionPrefix}${val}_${sortType}` });
    }
    keyboard.push(tensRow);
  }

  // 3. Units Row (birliklar qatori)
  const unitsRow = [];
  if (currentPage > 1) {
    unitsRow.push({ text: "⬅️", callback_data: `${actionPrefix}${currentPage - 1}_${sortType}` });
  }

  let startUnit = Math.max(1, currentPage - 2);
  let endUnit = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 2) {
    endUnit = Math.min(totalPages, 5);
  }
  if (currentPage >= totalPages - 1) {
    startUnit = Math.max(1, totalPages - 4);
  }

  for (let i = startUnit; i <= endUnit; i++) {
    unitsRow.push({
      text: i === currentPage ? `· ${i} ·` : `${i}`,
      callback_data: `${actionPrefix}${i}_${sortType}`
    });
  }

  if (currentPage < totalPages) {
    unitsRow.push({ text: "➡️", callback_data: `${actionPrefix}${currentPage + 1}_${sortType}` });
  }
  
  keyboard.push(unitsRow);

  return keyboard;
};

export const generateHeader = (moviesCount, seriesCount) => {
  const totalCount = moviesCount + seriesCount;
  return `<b>Total Films: 🎥 ${totalCount}</b>\n<b>Movies: 🍿 ${moviesCount}</b>\n<b>Series: 📺 ${seriesCount}</b>\n\n`;
};

export const calculateTotalPages = (moviesCount, seriesCount, limit) => {
  const maxItems = Math.max(moviesCount, seriesCount);
  return Math.ceil(maxItems / limit);
};