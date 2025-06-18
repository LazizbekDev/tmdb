export default function caption(movie, showLink = true) {
    const title = showLink && botUsername
        ? `<a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'>${movie.name}</a>`
        : movie.name;

    return `
🎞 ️<b>${title}</b>

<b>💾 Size: ${movie.size ?? movie.movieSize}
⏳ Running time: ${movie.duration}</b>

<i>${movie.caption}</i>

<blockquote>${Array.isArray(movie.keywords) ? movie.keywords.join(", ") : movie.keywords}</blockquote>`;
}
