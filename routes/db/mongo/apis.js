import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('test');
    console.log('hit auth api root');
});

export default router;