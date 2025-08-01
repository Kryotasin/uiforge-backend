'use strict'
import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from './db/mongo/schemas.js';

const router = express.Router();
const authUrl = `https://www.figma.com/oauth?client_id=${process.env.BAI_FIGMA_CLIENT_ID}&redirect_uri=${process.env.BAI_FIGMA_REDIRECT_URI}&scope=file_read&response_type=code&state=${process.env.BAI_FIGMA_STATE}`;


router.get('/', (req, res) => {
    res.send('Entered auth')
})

router.get('/figma/login', (req, res) => {
    res.redirect(authUrl);
})

router.get('/figma/callback', async (req, res) => {
    const { code, state } = req.query;

    try {
        // Create Basic Auth header
        const credentials = `${process.env.BAI_FIGMA_CLIENT_ID}:${process.env.BAI_FIGMA_CLIENT_SECRET}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');
        console.log('done trying')
        // Exchange code for access token - Following Figma's documentation
        const tokenResponse = await axios.post('https://api.figma.com/v1/oauth/token',
            new URLSearchParams({
                redirect_uri: process.env.BAI_FIGMA_REDIRECT_URI,
                code,
                grant_type: 'authorization_code'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${encodedCredentials}`
                }
            }
        );

        const { access_token, refresh_token, user_id_string } = tokenResponse.data;

        // Get user info from Figma
        const userResponse = await axios.get('https://api.figma.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        const figmaUser = userResponse.data;


        // Save/update user in MongoDB
        let user = await User.findOne({ figmaId: user_id_string });
        if (!user) {
            user = new User({
                figmaId: user_id_string,
                email: figmaUser.email,
                name: figmaUser.handle,
                figmaToken: access_token,
                refreshToken: refresh_token
            });
        } else {
            user.figmaToken = access_token;
            user.refreshToken = refresh_token;
        }
        await user.save();

        // Create JWT
        const token = jwt.sign({ userId: user._id }, process.env.BAI_JWT_SECRET, { expiresIn: '7d' });

        // Set JWT as httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Redirect back to frontend
        res.redirect('http://localhost:3000');
    } catch (err) {
        console.error('OAuth callback error:', err);
        res.redirect('http://localhost:3000/login?error=auth_failed');
    }

});

// Check current user authentication
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.BAI_JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                figmaId: user.figmaId
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
