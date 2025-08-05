import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { User } from './db/mongo/schemas.js';

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

// Get file structure
router.get('/file/:fileKey', authenticateUser, async (req, res) => {
    try {
        axios.get(`https://api.figma.com/v1/files/${req.params.fileKey}`, {
            headers: { 'Authorization': `Bearer ${req.user.figmaToken}` }
        })
            .then((response) => {
                const tree = buildTreeStructure(response.data.document);
                res.status(200).json({ tree, fileName: response.data.name });
            })

        // Transform to tree structure
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get instance data
router.get('/instance/:fileKey/:nodeId', authenticateUser, async (req, res) => {
    try {
        const { fileKey, nodeId } = req.params;
        
        // Call Figma API to get specific node data
        const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}/nodes`, {
            headers: { 'Authorization': `Bearer ${req.user.figmaToken}` },
            params: { ids: nodeId }
        });

        const nodeData = response.data.nodes[nodeId];
        if (!nodeData) {
            return res.status(404).json({ error: 'Node not found' });
        }

        res.status(200).json({ 
            nodeId,
            fileKey,
            data: nodeData.document,
            lastModified: response.data.lastModified,
            thumbnailUrl: response.data.thumbnailUrl
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