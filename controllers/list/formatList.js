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

  // 2. Tens Row — step 5, markazda hozirgi sahifa
  if (totalPages > 5) {
    const step = 5;
    // Hozirgi sahifadan boshlab step=5 bilan 5 ta kandidat hosil qilamiz
    // [cur, cur+5, cur+10, cur+15, cur+20] → totalPages bilan cheklaymiz
    const candidates = [];
    for (let i = 0; candidates.length < 5; i++) {
      const page = currentPage + i * step;
      if (page > totalPages) {
        break;
      }
      candidates.push(page);
    }

    const tensRow = [];

    // « tugmasi: currentPage dan yuqori sahifalar bor bo'lsa
    if (currentPage > step) {
      tensRow.push({
        text: "«",
        callback_data: `${actionPrefix}${Math.max(1, currentPage - step)}_${sortType}`
      });
    }

    for (const page of candidates) {
      tensRow.push({
        text: page === currentPage ? `· ${page} ·` : `${page}`,
        callback_data: `${actionPrefix}${page}_${sortType}`
      });
    }

    // » tugmasi: hali ko'rsatilmagan sahifalar qolgan bo'lsa
    const lastCandidate = candidates[candidates.length - 1];
    if (lastCandidate && lastCandidate + step <= totalPages) {
      tensRow.push({
        text: "»",
        callback_data: `${actionPrefix}${lastCandidate + step}_${sortType}`
      });
    }

    keyboard.push(tensRow);
  }

  // 3. Units Row — faqat ⬅️ + 5 ta raqam + ➡️
  //    Raqamli tugmalar va arrow tugmalari overlap bo'lmasin uchun:
  //    Raqamli oynani [currentPage-2 .. currentPage+2] deb olamiz,
  //    lekin doim 5 ta to'liq ko'rsatishga harakat qilamiz.
  const unitsRow = [];

  let startUnit = currentPage - 2;
  let endUnit = currentPage + 2;

  // Chegaralarga moslashtiramiz
  if (startUnit < 1) {
    endUnit += (1 - startUnit);
    startUnit = 1;
  }
  if (endUnit > totalPages) {
    startUnit -= (endUnit - totalPages);
    endUnit = totalPages;
  }
  startUnit = Math.max(1, startUnit);

  if (currentPage > 1) {
    unitsRow.push({ text: "⬅️", callback_data: `${actionPrefix}${currentPage - 1}_${sortType}` });
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