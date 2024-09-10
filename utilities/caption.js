export default function caption(item, id) {
    return `
🎞 ️<b>${item.name}</b>

<i>${item.caption}</i>

▪️Size: ${item.movieSize ?? item.size}
▪️Running time: ${item.duration}
▪️Keywords: ${item.keywords}
    
👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${id}">Tap to watch</a>
    `;
}