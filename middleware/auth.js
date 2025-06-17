import querystring from "querystring";
import crypto from "crypto";

export const checkAdmin = (req, res, next) => {
  const initData = req.headers["telegram-init-data"];
  console.log("Received telegram-init-data:", initData);

  // Allow local development bypass
  const isLocalhost =
    req.ip === "::1" || req.ip === "127.0.0.1" || req.ip.startsWith("192.168.");
  if (process.env.NODE_ENV === "development" && isLocalhost) {
    console.warn("Lokal muhitda admin tekshiruvi chetlab o'tildi. IP:", req.ip);
    return next();
  }

  if (!initData) {
    return res.status(401).json({ error: "Telegram initData topilmadi" });
  }

  try {
    // Parse initData as URL-encoded query string
    const parsedData = querystring.parse(initData);
    console.log("Parsed initData:", parsedData);

    // Extract and parse the user field
    if (!parsedData.user) {
      throw new Error("initData-da user maydoni yo‘q");
    }
    const user = JSON.parse(parsedData.user);
    console.log("Extracted user:", user);

    // Validate initData signature
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error("BOT_TOKEN o‘rnatilmagan");
    }

    // Create data check string for HMAC validation
    const dataCheckString = Object.keys(parsedData)
      .filter((key) => key !== "hash")
      .sort()
      .map((key) => `${key}=${parsedData[key]}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== parsedData.hash) {
      console.warn("Invalid initData hash:", {
        calculatedHash,
        receivedHash: parsedData.hash,
      });
      return res.status(403).json({ error: "Noto‘g‘ri initData imzo" });
    }

    // Verify admin ID
    if (!user || user.id !== parseInt(process.env.ADMIN_ID)) {
      console.log("Admin ID mismatch:", {
        userId: user.id,
        adminId: process.env.ADMIN_ID,
      });
      return res.status(403).json({ error: "Admin ruxsati yo‘q" });
    }

    next();
  } catch (err) {
    console.error("Error parsing or validating initData:", err.message);
    return res
      .status(400)
      .json({ error: "Noto‘g‘ri initData formati", details: err.message });
  }
};
