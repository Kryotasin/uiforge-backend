'use strcit';

import express from 'express';

const api = express.Router();

api.get('/', (req, res) => {
    res.send('hello figma');
    console.log('hit figma');
});

export default api;