'use strict'
import express from 'express';

const router = express.Router();
const authUrl = `https://www.figma.com/oauth?client_id=${process.env.BAI_FIGMA_CLIENT_ID}&redirect_uri=${process.env.BAI_FIGMA_REDIRECT_URI}&scope=file_read&response_type=code&state=${process.env.BAI_FIGMA_STATE}`;


router.get('/', (req, res) => {
    res.send('Entered auth')
})

router.get('/figma/login', (req, res) => {
    res.redirect(authUrl);
})

router.get('/figma/callback', (req, res) => {
    console.log(req.query);
    const { code } = req.query;
})
//http://localhost:8080/api/v1/auth/figma/login
export default router;
