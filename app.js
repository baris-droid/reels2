document.addEventListener('DOMContentLoaded', () => {

    // --- AYARLAR ---
    const TOTAL_VIDEOS = 50; // Ulaşmayı hedeflediğiniz maksimum video sayısı

    // --- GLOBAL DEĞİŞKENLER VE ELEMENT REFERANSLARI ---
    const reelsContainer = document.getElementById('reelsContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropZoneContainer = document.getElementById('dropZone');
    const dropZone = dropZoneContainer.querySelector('.drop-zone');
    const closeDropZoneBtn = document.getElementById('closeDropZone');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('fileInput');

    let likesData = {}; // Beğeni verilerini saklamak için global nesne

    // =================================================================
    // UYGULAMAYI BAŞLATAN ANA FONKSİYON
    // =================================================================
    async function initializeApp() {
        // 1. Sayfa yüklenirken sunucudan tüm beğeni verilerini çek
        try {
            const response = await fetch('/api/likes');
            likesData = await response.json();
        } catch (error) {
            console.error("Beğeniler yüklenemedi:", error);
        }

        // 2. Oynatıcıyı kur
        let videoNumbers = Array.from({ length: TOTAL_VIDEOS }, (_, i) => i + 1);
        shuffleArray(videoNumbers);
        createVideoElements(videoNumbers);
        setupIntersectionObserver();

        // 3. Diğer interaktif özellikleri kur
        //setupLikeButtonListener();
        setupUploadFeature();
    }

    // --- OTURUM (SESSION) YÖNETİMİ ---
    function hasBeenLikedThisSession(videoFile) {
        const likedVideos = JSON.parse(sessionStorage.getItem('likedVideos') || '[]');
        return likedVideos.includes(videoFile);
    }

    function markAsLikedThisSession(videoFile) {
        let likedVideos = JSON.parse(sessionStorage.getItem('likedVideos') || '[]');
        if (!likedVideos.includes(videoFile)) {
            likedVideos.push(videoFile);
            sessionStorage.setItem('likedVideos', JSON.stringify(likedVideos));
        }
    }

    function unmarkAsLikedThisSession(videoFile) {
        let likedVideos = JSON.parse(sessionStorage.getItem('likedVideos') || '[]');
        const index = likedVideos.indexOf(videoFile);
        if (index > -1) {
            likedVideos.splice(index, 1);
            sessionStorage.setItem('likedVideos', JSON.stringify(likedVideos));
        }
    }
	
	
    // =================================================================
    // VİDEO OLUŞTURMA VE OYNATMA MANTIĞI
    // =================================================================

    function createVideoElements(videoNumbers) {
        videoNumbers.forEach(i => {
            const videoFileName = `${i}.mp4`;
            const videoWrapper = document.createElement('div');
            videoWrapper.className = 'video-wrapper';
            videoWrapper.style.display = 'none';

            const video = document.createElement('video');
            video.src = `videos/${videoFileName}`;
            video.loop = true;
            video.muted = false;
            video.preload = 'metadata';
            video.setAttribute('playsinline', '');

            video.onloadeddata = () => videoWrapper.style.display = 'flex';
            video.onerror = () => {};

            const overlay = createOverlay(videoFileName);
            videoWrapper.appendChild(video);
            videoWrapper.appendChild(overlay);

            const animationHeart = createAnimationHeart();
            videoWrapper.appendChild(animationHeart);
            reelsContainer.appendChild(videoWrapper);

            // --- OLAY DİNLEYİCİLERİ ---
			const likeButton = videoWrapper.querySelector('.like-button');

            // 1. Kalp İkonuna Tıklama (Beğen/Geri Çek)
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Videonun oynat/durdur olayını tetiklemesini engelle
                handleLike(videoFileName, likeButton);
            });
			
            // 1. Tek Tıklama (Oynat/Durdur)
            video.addEventListener('click', e => {
                if (e.target.closest('.action-link')) return;
                video.paused ? video.play() : video.pause();
            });

            // 2. Çift Tıklama (Masaüstü için)
            videoWrapper.addEventListener('dblclick', () => handleDoubleTap(videoWrapper));
            
            // 3. Çift Dokunma (MOBİL için özel mantık)
            let lastTap = 0;
            videoWrapper.addEventListener('touchstart', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    // Çift dokunma algılandı!
                    e.preventDefault(); // Tarayıcının zoom yapmasını engelle
                    handleDoubleTap(videoWrapper);
                }
                lastTap = currentTime;
            });
        
			
        });
    }
	
    function handleDoubleTap(videoWrapper) {
        const likeButton = videoWrapper.querySelector('.like-button');
        const animationHeart = videoWrapper.querySelector('.like-animation-heart');

        // Sadece beğenilmemişse çift tıklama çalışsın
        if (likeButton && !likeButton.classList.contains('session-liked')) {
            handleLike(likeButton.dataset.videoFile, likeButton);
            
            // Animasyonu tetikle
            animationHeart.classList.add('animate');
            animationHeart.addEventListener('animationend', () => {
                animationHeart.classList.remove('animate');
            }, { once: true });
        }
    }

	function createOverlay(videoFileName) {
        const videoNumber = videoFileName.split('.')[0];
        const likeCount = likesData[videoFileName] || 0;
        
        // Bu oturumda beğenilmiş mi diye kontrol et
        const isLikedInSession = hasBeenLikedThisSession(videoFileName);
        // Eğer beğenilmişse, butona 'session-liked' sınıfını ekle
        const likedClass = isLikedInSession ? 'session-liked' : '';

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
            <div class="header"><span>Reels</span><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/768px-Instagram_logo_2016.svg.png" alt="Instagram Logo"></div>
            <div class="footer">
                <div class="video-info">
                    <h3>@kullanici</h3>
                    <p>Video #${videoNumber} - Keyifli seyirler...</p>
				</div>
                <div class="actions">
                    <a class="action-link like-button ${likedClass}" data-video-file="${videoFileName}">
                        <svg class="icon" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </a>
                    <span class="like-count">${likeCount}</span>

                    <a href="videos/${videoFileName}" download="${videoFileName}" class="action-link">
					<svg class="icon" viewBox="0 0 24 24" fill="white"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
					</a>
                </div>
            </div>`;
        return overlay;
    }
	
    function createAnimationHeart() {
        const heartContainer = document.createElement('div');
        heartContainer.className = 'like-animation-heart';
        heartContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        return heartContainer;
    }
	
    // --- BEĞENİ MANTIĞI (TOGGLE) ---

    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function setupIntersectionObserver() {
        const options = { root: reelsContainer, threshold: 0.8 };
        const callback = (entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (video && entry.isIntersecting) {
                    video.play().catch(e => {});
                } else if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        };
        const observer = new IntersectionObserver(callback, options);
        document.querySelectorAll('.video-wrapper').forEach(wrapper => {
            observer.observe(wrapper);
        });
    }

    // =================================================================
    // BEĞENİ SİSTEMİ MANTIĞI
    // =================================================================

    // --- BEĞENİ MANTIĞI (TOGGLE) ---
    function setupLikeButtonListener() {
        reelsContainer.addEventListener('click', e => {
            const likeButton = e.target.closest('.like-button');
            if (likeButton) {
                handleLike(likeButton.dataset.videoFile, likeButton);
            }
        });
    }

    async function handleLike(videoFile, buttonElement) {
        const isAlreadyLiked = buttonElement.classList.contains('session-liked');
        const action = isAlreadyLiked ? 'unlike' : 'like';

        const likeCountSpan = buttonElement.nextElementSibling;
        const currentLikes = parseInt(likeCountSpan.textContent);

        likeCountSpan.textContent = isAlreadyLiked ? currentLikes - 1 : currentLikes + 1;
        buttonElement.classList.toggle('session-liked');

        if (isAlreadyLiked) {
            unmarkAsLikedThisSession(videoFile);
        } else {
            markAsLikedThisSession(videoFile);
        }

        try {
            const response = await fetch('/api/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoFile, action })
            });
            const data = await response.json();
            if (data.success) {
                likeCountSpan.textContent = data.newLikeCount;
            } else {
                likeCountSpan.textContent = currentLikes;
                buttonElement.classList.toggle('session-liked');
            }
        } catch (error) { console.error("Beğeni durumu güncellenemedi:", error); }
    }


// =================================================================
    // OTURUM (SESSION) YÖNETİMİ YARDIMCI FONKSİYONLARI
    // =================================================================

    // Bir videonun bu oturumda beğenilip beğenilmediğini kontrol eder
    function hasBeenLikedThisSession(videoFile) {
        const likedVideosStr = sessionStorage.getItem('likedVideos');
        if (!likedVideosStr) {
            return false; // Henüz hiç video beğenilmemiş
        }
        const likedVideos = JSON.parse(likedVideosStr);
        return likedVideos.includes(videoFile);
    }

    // Bir videoyu bu oturum için "beğenildi" olarak işaretler
    function markAsLikedThisSession(videoFile) {
        let likedVideos = [];
        const likedVideosStr = sessionStorage.getItem('likedVideos');
        if (likedVideosStr) {
            likedVideos = JSON.parse(likedVideosStr);
        }
        if (!likedVideos.includes(videoFile)) {
            likedVideos.push(videoFile);
            sessionStorage.setItem('likedVideos', JSON.stringify(likedVideos));
        }
    }
	
	
	
    // =================================================================
    // SÜRÜKLE-BIRAK VE DOSYA SEÇME İLE YÜKLEME MANTIĞI
    // =================================================================

    function setupUploadFeature() {
        const handleFileUpload = (file) => {
            if (file && file.type.startsWith('video/')) {
                const formData = new FormData();
                formData.append('videoFile', file);

                fetch('/upload', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Video başarıyla yüklendi! Sayfayı yenileyerek yeni videonuzu görebilirsiniz.');
                    } else {
                        alert('Hata: Video yüklenemedi.');
                    }
                })
                .catch(error => {
                    console.error('Yükleme Hatası:', error);
                    alert('Sunucu hatası: Video yüklenemedi.');
                });
                dropZoneContainer.classList.add('hidden');
            } else {
                alert("Lütfen sadece bir video dosyası seçin veya sürükleyin.");
            }
        };

        uploadBtn.addEventListener('click', () => {
            dropZoneContainer.classList.remove('hidden');
        });
        closeDropZoneBtn.addEventListener('click', () => {
            dropZoneContainer.classList.add('hidden');
        });

        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZoneContainer.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZoneContainer.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZoneContainer.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });
        dropZoneContainer.addEventListener('drop', e => {
            handleFileUpload(e.dataTransfer.files[0]);
        }, false);
    }

    // --- UYGULAMAYI BAŞLAT ---
    initializeApp();
});