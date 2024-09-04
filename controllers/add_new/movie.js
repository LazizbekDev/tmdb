export default async function movie(ctx,userState, file) {
    if (!file) {
        return ctx.reply("Please send a valid video file.");
    }

    const fileType = file.mime_type;

    const formatFileSize = (size) => {
        if (size < 1024) return `${size} bytes`;
        else if (size < 1048576)
            return `${(size / 1024).toFixed(2)} KB`;
        else if (size < 1073741824)
            return `${(size / 1048576).toFixed(2)} MB`;
        else return `${(size / 1073741824).toFixed(2)} GB`;
    };
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const paddedHours = hours.toString().padStart(2, "0");
        const paddedMinutes = minutes.toString().padStart(2, "0");
        const paddedSeconds = secs.toString().padStart(2, "0");

        return `${paddedHours}h ${paddedMinutes}m ${paddedSeconds}s`;
    }

    // console.log(file);

    if (!fileType.startsWith("video/")) {
        return ctx.reply(
            "Only video files are accepted. Please send a valid video file."
        );
    }

    userState[ctx.from.id] = {
        step: "awaitingDetails",
        videoFileId: file.file_id,
        fileType: fileType,
        movieSize: formatFileSize(file.file_size),
        duration: formatDuration(file.duration),
    };

    await ctx.reply(
        "Video received. Please send the movie details in the format: name | caption | keywords"
    );
};