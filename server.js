const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const videosDir = path.join(__dirname, 'videos');
const likesDbPath = path.join(__dirname, 'likes.json');

app.use(express.json());

if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'videos/'),
    filename: (req, file, cb) => {
        const newFileName = (fs.readdirSync(videosDir).length + 1) + path.extname(file.originalname);
        cb(null, newFileName);
    }
});
const upload = multer({ storage: storage });
app.post('/upload', upload.single('videoFile'), (req, res) => {
    res.json({ success: true, message: 'Video başarıyla yüklendi!' });
});

app.get('/api/likes', (req, res) => {
    try {
        const data = fs.readFileSync(likesDbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.json({});
    }
});

app.post('/api/toggle-like', (req, res) => {
    const { videoFile, action } = req.body;
    if (!videoFile || !action) {
        return res.status(400).json({ success: false, message: 'Gerekli parametreler eksik.' });
    }
    try {
        let likesData = {};
        if (fs.existsSync(likesDbPath)) {
            const data = fs.readFileSync(likesDbPath, 'utf8');
            if (data) likesData = JSON.parse(data);
        }
        
        if (action === 'like') {
            likesData[videoFile] = (likesData[videoFile] || 0) + 1;
        } else if (action === 'unlike') {
            if (likesData[videoFile] && likesData[videoFile] > 0) {
                likesData[videoFile]--;
            }
        }
        
        fs.writeFileSync(likesDbPath, JSON.stringify(likesData, null, 2));
        res.json({ success: true, newLikeCount: likesData[videoFile] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor.`);
});