import os from "os";
import UserSubmission from "../model/FilmRequest.js";

// Get submissions within the last 24 hours
export const getSubmissionsWithinLast24Hours = async () => {
    try {
        const currentTime = new Date();
        const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

        return await UserSubmission.find({ timestamp: { $gte: oneDayAgo } });
    } catch (e) {
        console.log(`error - getSubmissionsWithinLast24Hours function: ${e}`);
        return;
    }
};

// Post submissions for users to see
export const postSubmissionsForVoting = async (bot) => {
    try {
        const submissions = await getSubmissionsWithinLast24Hours();

        if (submissions.length === 0) {
            return;
        }

        // Send submissions to the channel
        for (const submission of submissions) {
            return await bot.telegram.sendMessage(
                process.env.ADMIN_ID,
                `Film requested by ${submission.name}\nFilm: <b>${submission.request}</b>`,
                { parse_mode: "HTML" }
            );
        }
    } catch (e) {
        console.log(`error - post submission function: ${e}`);
        return;
    }
};

export const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

// Function to format memory usage from bytes to MB or GB
export const formatMemoryUsage = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Function to format CPU usage
export const formatCpuUsage = (cpuUsage) => {
    return `${(cpuUsage.user / 1e6).toFixed(2)} ms user, ${(
        cpuUsage.system / 1e6
    ).toFixed(2)} ms system`;
};

// Function to get system load averages (1m, 5m, 15m)
export const getSystemLoad = () => {
    const loads = os.loadavg();
    return {
        "1m": loads[0].toFixed(2),
        "5m": loads[1].toFixed(2),
        "15m": loads[2].toFixed(2),
    };
};
