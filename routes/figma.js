import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import zlib from 'zlib';
import { promisify } from 'util';
import { User, FigmaFile, FigmaInstance } from './db/mongo/schemas.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const router = express.Router();

// Auth middleware
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.BAI_JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Extract file key from Figma URL
function extractFileKey(url) {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Helper function to calculate object size in bytes
function getObjectSize(obj) {
    const str = JSON.stringify(obj);
    return Buffer.byteLength(str, 'utf8');
}

// MongoDB document size limit (16MB minus some buffer for other fields)
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024; // 15MB to be safe

// Get file structure
router.get('/file/:fileKey', authenticateUser, async (req, res) => {
    try {
        const { fileKey } = req.params;

        // First, check if data exists in MongoDB cache
        const cachedFile = await FigmaFile.findOne({ fileKey });
        
        if (cachedFile) {
            console.log(`Serving cached file data for ${fileKey} (compressed: ${cachedFile.isCompressed})`);
            
            let tree;
            if (cachedFile.isCompressed) {
                // Decompress the data
                const decompressedData = await gunzip(cachedFile.compressedTree);
                tree = JSON.parse(decompressedData.toString());
            } else {
                tree = cachedFile.tree;
            }
            
            return res.status(200).json({ 
                tree, 
                fileName: cachedFile.fileName,
                cached: true,
                cachedAt: cachedFile.cachedAt,
                wasCompressed: cachedFile.isCompressed
            });
        }

        // If not cached, fetch from Figma API
        console.log(`Fetching file data from Figma API for ${fileKey}`);
        const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
            headers: { 'Authorization': `Bearer ${req.user.figmaToken}` }
        });

        const tree = buildTreeStructure(response.data.document);
        const fileName = response.data.name;
        const lastModified = new Date(response.data.lastModified);

        // Check document size
        const treeSize = getObjectSize(tree);
        console.log(`File ${fileKey} tree size: ${(treeSize / 1024 / 1024).toFixed(2)}MB`);

        let documentData;
        
        if (treeSize > MAX_DOCUMENT_SIZE) {
            // Compress the data for large files
            console.log(`Compressing large file data for ${fileKey}`);
            const compressedData = await gzip(JSON.stringify(tree));
            
            documentData = {
                fileKey,
                fileName,
                tree: null,
                compressedTree: compressedData,
                isCompressed: true,
                originalSize: treeSize,
                lastModified,
                cachedAt: new Date()
            };
        } else {
            // Store uncompressed for smaller files
            documentData = {
                fileKey,
                fileName,
                tree,
                compressedTree: null,
                isCompressed: false,
                originalSize: treeSize,
                lastModified,
                cachedAt: new Date()
            };
        }

        // Store in MongoDB cache
        await FigmaFile.findOneAndUpdate(
            { fileKey },
            documentData,
            { upsert: true, new: true }
        );

        res.status(200).json({ 
            tree, 
            fileName,
            cached: false,
            lastModified
        });
    } catch (err) {
        console.error('Error in /file endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get instance data
router.get('/instance/:fileKey/:nodeId', authenticateUser, async (req, res) => {
    try {
        const { fileKey, nodeId } = req.params;

        // First, check if data exists in MongoDB cache
        const cachedInstance = await FigmaInstance.findOne({ fileKey, nodeId });
        
        if (cachedInstance) {
            console.log(`Serving cached instance data for ${fileKey}/${nodeId} (compressed: ${cachedInstance.isCompressed})`);
            
            let data;
            if (cachedInstance.isCompressed) {
                // Decompress the data
                const decompressedData = await gunzip(cachedInstance.compressedData);
                data = JSON.parse(decompressedData.toString());
            } else {
                data = cachedInstance.data;
            }
            
            return res.status(200).json({ 
                nodeId,
                fileKey,
                data,
                lastModified: cachedInstance.lastModified,
                thumbnailUrl: cachedInstance.thumbnailUrl,
                cached: true,
                cachedAt: cachedInstance.cachedAt,
                wasCompressed: cachedInstance.isCompressed
            });
        }

        // If not cached, fetch from Figma API
        console.log(`Fetching instance data from Figma API for ${fileKey}/${nodeId}`);
        const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}/nodes`, {
            headers: { 'Authorization': `Bearer ${req.user.figmaToken}` },
            params: { ids: nodeId }
        });

        const nodeData = response.data.nodes[nodeId];
        if (!nodeData) {
            return res.status(404).json({ error: 'Node not found' });
        }

        const lastModified = new Date(response.data.lastModified);
        const thumbnailUrl = response.data.thumbnailUrl;
        const data = nodeData.document;

        // Check document size
        const dataSize = getObjectSize(data);
        console.log(`Instance ${fileKey}/${nodeId} data size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);

        let documentData;
        
        if (dataSize > MAX_DOCUMENT_SIZE) {
            // Compress the data for large instances
            console.log(`Compressing large instance data for ${fileKey}/${nodeId}`);
            const compressedData = await gzip(JSON.stringify(data));
            
            documentData = {
                fileKey,
                nodeId,
                data: null,
                compressedData: compressedData,
                isCompressed: true,
                originalSize: dataSize,
                lastModified,
                thumbnailUrl,
                cachedAt: new Date()
            };
        } else {
            // Store uncompressed for smaller instances
            documentData = {
                fileKey,
                nodeId,
                data,
                compressedData: null,
                isCompressed: false,
                originalSize: dataSize,
                lastModified,
                thumbnailUrl,
                cachedAt: new Date()
            };
        }

        // Store in MongoDB cache
        await FigmaInstance.findOneAndUpdate(
            { fileKey, nodeId },
            documentData,
            { upsert: true, new: true }
        );

        res.status(200).json({ 
            nodeId,
            fileKey,
            data,
            lastModified,
            thumbnailUrl,
            cached: false
        });
    } catch (err) {
        console.error('Error in /instance endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Clear cache for a specific file
router.delete('/cache/file/:fileKey', authenticateUser, async (req, res) => {
    try {
        const { fileKey } = req.params;
        
        // Delete file cache
        await FigmaFile.deleteOne({ fileKey });
        // Delete all associated instance caches
        await FigmaInstance.deleteMany({ fileKey });
        
        res.status(200).json({ 
            message: `Cache cleared for file ${fileKey}`,
            fileKey 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear cache for a specific instance
router.delete('/cache/instance/:fileKey/:nodeId', authenticateUser, async (req, res) => {
    try {
        const { fileKey, nodeId } = req.params;
        
        await FigmaInstance.deleteOne({ fileKey, nodeId });
        
        res.status(200).json({ 
            message: `Cache cleared for instance ${fileKey}/${nodeId}`,
            fileKey,
            nodeId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all cache (admin endpoint)
router.delete('/cache/all', authenticateUser, async (req, res) => {
    try {
        const fileCount = await FigmaFile.countDocuments();
        const instanceCount = await FigmaInstance.countDocuments();
        
        await FigmaFile.deleteMany({});
        await FigmaInstance.deleteMany({});
        
        res.status(200).json({ 
            message: 'All cache cleared',
            deletedFiles: fileCount,
            deletedInstances: instanceCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get cache statistics
router.get('/cache/stats', authenticateUser, async (req, res) => {
    try {
        const fileCount = await FigmaFile.countDocuments();
        const instanceCount = await FigmaInstance.countDocuments();
        
        // Get oldest and newest cache entries
        const oldestFile = await FigmaFile.findOne().sort({ cachedAt: 1 });
        const newestFile = await FigmaFile.findOne().sort({ cachedAt: -1 });
        const oldestInstance = await FigmaInstance.findOne().sort({ cachedAt: 1 });
        const newestInstance = await FigmaInstance.findOne().sort({ cachedAt: -1 });
        
        res.status(200).json({
            files: {
                count: fileCount,
                oldest: oldestFile?.cachedAt,
                newest: newestFile?.cachedAt
            },
            instances: {
                count: instanceCount,
                oldest: oldestInstance?.cachedAt,
                newest: newestInstance?.cachedAt
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Transform Figma data to tree structure
function buildTreeStructure(node) {
    return {
        id: node.id,
        name: node.name,
        type: node.type,
        children: node.children ? node.children.map(buildTreeStructure) : []
    };
}

export default router;