export default function caption(item, id, showLink = true) {
    return `
🎞 ️<b>${item.name}</b>

${showLink && `👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${id}">Tap to watch</a>`}

<i>${item.caption}</i>

▪️Size: ${item.movieSize ?? item.size}
▪️Running time: ${item.duration}

${item.keywords}`;
}