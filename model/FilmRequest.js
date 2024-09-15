import mongoose from 'mongoose';

const userSubmissionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    request: { type: String, required: true },
    timestamp: { type: Date, required: true }
});

const UserSubmission = mongoose.model('UserSubmission', userSubmissionSchema);

export default UserSubmission;
