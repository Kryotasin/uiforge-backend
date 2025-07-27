'use stric'
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    figmaId: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        require: true
    },
    name: {
        required: true,
        type: String
    },
    figmaToken: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const componentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileKey: {
        type: String,
        required: true
    },
    nodeId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    figmaData: {
        type: Object,
        required: true
    },
    generatedCode: String,
    modifiedCode: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const User = mongoose.model('User', userSchema);
export const Component = mongoose.model('Component', componentSchema);