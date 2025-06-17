export const checkAdmin = (req, res, next) => {
  const initData = req.headers["telegram-init-data"];
  // Lokal muhitda telegram-init-data yo'q bo'lsa, ruxsat berish
  if (process.env.NODE_ENV === "development" && !initData && req.ip === "::1") {
    console.warn("Lokal muhitda admin tekshiruvi chetlab o'tildi.");
    return next();
  }
  if (!initData) {
    return res.status(401).json({ error: "Telegram initData topilmadi" });
  }
  try {
    const user = JSON.parse(initData)?.user;
    if (!user || user.id !== parseInt(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: "Admin ruxsati yo‘q" });
    }
    next();
  } catch (err) {
    return res.status(400).json({ error: "Noto‘g‘ri initData formati" });
  }
};
