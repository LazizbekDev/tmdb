export const formatFileSize = (size) => {
  if (size < 1024) {return `${size} bytes`;}
  else if (size < 1048576) {return `${(size / 1024).toFixed(2)} KB`;}
  else if (size < 1073741824) {return `${(size / 1048576).toFixed(2)} MB`;}
  else {return `${(size / 1073741824).toFixed(2)} GB`;}
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedHours = hours.toString().padStart(2, "0");
  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = secs.toString().padStart(2, "0");

  return `${paddedHours}h ${paddedMinutes}m ${paddedSeconds}s`;
};

export const processVideoData = (file) => {
  return {
    videoFileId: file.file_id,
    fileType: file.mime_type,
    movieSize: formatFileSize(file.file_size),
    duration: formatDuration(file.duration),
  };
};
