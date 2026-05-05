export function generateSeriesKeyboard(seriesId, seasonNum, currentEpisodeNum, totalEpisodes) {
    const keyboard = [];
    const episodesPerRow = 5;
    const currentEp = parseInt(currentEpisodeNum);

    // Group buttons into rows of 5
    for (let i = 0; i < totalEpisodes; i += episodesPerRow) {
        const row = [];
        for (let j = i; j < i + episodesPerRow && j < totalEpisodes; j++) {
            const epNum = j + 1;
            row.push({
                text: epNum === currentEp ? `· ${epNum} ·` : `${epNum}`,
                callback_data: `ser_${seriesId}_${seasonNum}_${epNum}`,
            });
        }
        keyboard.push(row);
    }

    return keyboard;
}
