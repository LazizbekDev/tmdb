// utilities/session.js

import { session } from "telegraf-session-mongodb";
import { connect } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export default async function applySession(bot) {
  try {
    const connection = await connect(process.env.DB);
    bot.use(
      session(connection, {
        sessionName: "session",
        collectionName: "sessions",
        ttl: 30 * 60, // sekundlarda – 30 daqiqa
      })
    );
    console.log("✅ Session middleware configured with MongoDB");
  } catch (err) {
    console.error("❌ Failed to configure session middleware:", err);
  }
}
