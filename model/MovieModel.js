import {Model, Schema} from "mongoose";

const movieSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    movieUrl: {
        type: String,
        required: true
    }
})

export default Model('movie',movieSchema);