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

// Schema for caching Figma file data
const figmaFileSchema = new mongoose.Schema({
    fileKey: {
        type: String,
        unique: true,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    tree: {
        type: Object,
        required: false // Will be null if compressed
    },
    compressedTree: {
        type: Buffer,
        required: false // Compressed data for large files
    },
    isCompressed: {
        type: Boolean,
        default: false
    },
    originalSize: {
        type: Number,
        required: false
    },
    lastModified: {
        type: Date,
        required: true
    },
    cachedAt: {
        type: Date,
        default: Date.now
    }
});

// Schema for caching Figma instance/node data
const figmaInstanceSchema = new mongoose.Schema({
    fileKey: {
        type: String,
        required: true
    },
    nodeId: {
        type: String,
        required: true
    },
    data: {
        type: Object,
        required: false // Will be null if compressed
    },
    compressedData: {
        type: Buffer,
        required: false // Compressed data for large nodes
    },
    isCompressed: {
        type: Boolean,
        default: false
    },
    originalSize: {
        type: Number,
        required: false
    },
    lastModified: {
        type: Date,
        required: true
    },
    thumbnailUrl: String,
    cachedAt: {
        type: Date,
        default: Date.now
    }
});

// Create compound unique index for fileKey + nodeId combination
figmaInstanceSchema.index({ fileKey: 1, nodeId: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Component = mongoose.model('Component', componentSchema);
export const FigmaFile = mongoose.model('FigmaFile', figmaFileSchema);
export const FigmaInstance = mongoose.model('FigmaInstance', figmaInstanceSchema);