export default function caption(item, id) {
    console.log(item);
    return `
🎞 ️"<b>${item.name}</b>"
ℹ ️ ️"${item.caption}"
▪️Size: ${item.movieSize ?? item.size}
▪️Running time: ${item.duration}
▪️Keywords: ${item.keywords}
    
👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${id}">Tap to watch</a>
    `;
}