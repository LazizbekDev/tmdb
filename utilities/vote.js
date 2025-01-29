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
        };
    } catch (e) {
        console.log(`error - post submission function: ${e}`);
        return;
    }
};
