const currentUser = checkAuth();
updateHeader();

const playlistList = document.getElementById('playlistList');
const playlistContent = document.getElementById('playlistContent');
const noSelection = document.getElementById('noSelection');
const currentPlaylistTitle = document.getElementById('currentPlaylistTitle');
const videosList = document.getElementById('videosList');
const filterInput = document.getElementById('filterInput');
const sortSelect = document.getElementById('sortSelect');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
const playPlaylistBtn = document.getElementById('playPlaylistBtn');
const newPlaylistBtn = document.getElementById('newPlaylistBtn');
const createModal = document.getElementById('createPlaylistModal');
const closeCreateModal = document.getElementById('closeCreateModal');
const confirmCreatePlaylist = document.getElementById('confirmCreatePlaylist');
const createPlaylistName = document.getElementById('createPlaylistName');
const playerModal = document.getElementById('playerModal');
const playerContainer = document.getElementById('playerContainer');

let activePlaylistId = null;
let player = null; 
let currentPlaylistQueue = []; 
let currentQueueIndex = 0;

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
        selectPlaylist(id);
    } else {
        const user = getCurrentUser();
        if (user.playlists && user.playlists.length > 0) {
            selectPlaylist(user.playlists[0].id);
        }
    }
});

function renderSidebar() {
    const user = getCurrentUser();
    playlistList.innerHTML = '';
    
    if (user.playlists) {
        user.playlists.forEach(pl => {
            const div = document.createElement('div');
            div.className = `playlist-item ${pl.id === activePlaylistId ? 'active' : ''}`;
            div.textContent = pl.name;
            div.onclick = () => selectPlaylist(pl.id);
            playlistList.appendChild(div);
        });
    }
}

function selectPlaylist(id) {
    const user = getCurrentUser();
    const playlist = user.playlists ? user.playlists.find(p => p.id === id) : null;

    if (playlist) {
        activePlaylistId = id;
        
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url);

        renderSidebar(); 
        noSelection.style.display = 'none';
        playlistContent.style.display = 'block';
        currentPlaylistTitle.textContent = playlist.name;
        playPlaylistBtn.disabled = playlist.videos.length === 0;

        renderVideos();
    } else {
        activePlaylistId = null;
        noSelection.style.display = 'block';
        playlistContent.style.display = 'none';
        playPlaylistBtn.disabled = true;
    }
}

function renderVideos() {
    const user = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === activePlaylistId);
    if (!playlist) return;

    let videos = [...playlist.videos];

    const filterText = filterInput.value.toLowerCase();
    if (filterText) {
        videos = videos.filter(v => v.title.toLowerCase().includes(filterText));
    }

    const sortMode = sortSelect.value;
    if (sortMode === 'az') {
        videos.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'rating') {
        videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    videosList.innerHTML = '';
    
    if (videos.length === 0) {
        videosList.innerHTML = '<p style="padding: 20px; color: #888;">No videos found.</p>';
        return;
    }

    videos.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-video-item';
        
        const rating = video.rating || 0;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star" data-val="${i}">${i <= rating ? '★' : '☆'}</span>`;
        }

        item.innerHTML = `
            <img src="${video.thumbnail}" class="video-thumb-play">
            <div class="playlist-video-details">
                <div style="font-weight: bold; cursor: pointer;" class="video-title-play">${video.title}</div>
                <div style="font-size: 0.9em; color: #666;">Duration: ${video.duration}</div>
            </div>
            <div class="playlist-actions">
                <div class="rating-stars" data-id="${video.id}">${starsHtml}</div>
                <button onclick="deleteVideo('${video.id}')" style="background: #999; padding: 5px 10px; font-size: 0.8em;">Delete</button>
            </div>
        `;
        
        const playHandler = () => {
            const currentIds = videos.map(v => v.id);
            playVideoQueue(currentIds, index);
        };

        item.querySelector('.video-thumb-play').addEventListener('click', playHandler);
        item.querySelector('.video-title-play').addEventListener('click', playHandler);

        const starContainer = item.querySelector('.rating-stars');
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach(s => {
            s.addEventListener('click', (e) => {
                const val = parseInt(e.target.dataset.val);
                rateVideo(video.id, val);
            });
        });

        videosList.appendChild(item);
    });
}

window.deleteVideo = function(videoId) {
    if (!confirm('Remove this video from playlist?')) return;

    const user = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === activePlaylistId);
    
    playlist.videos = playlist.videos.filter(v => v.id !== videoId);
    updateUser(user);
    
    renderVideos();
    playPlaylistBtn.disabled = playlist.videos.length === 0;
}

window.rateVideo = function(videoId, rating) {
    const user = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === activePlaylistId);
    const video = playlist.videos.find(v => v.id === videoId);
    
    if (video) {
        video.rating = rating;
        updateUser(user);
        renderVideos(); 
    }
}


function playVideoQueue(videoIds, startIndex = 0) {
    currentPlaylistQueue = videoIds;
    currentQueueIndex = startIndex;
    
    const videoId = currentPlaylistQueue[currentQueueIndex];
    if (!videoId) return;

    playerModal.style.display = 'block';

    if (player) {
        player.loadVideoById(videoId);
    } else {
        if (window.YT && window.YT.Player) {
             createPlayer(videoId);
        }
    }
}

function createPlayer(videoId) {
    if (!document.getElementById('player-iframe-target')) {
         playerContainer.innerHTML = '<div id="player-iframe-target"></div>';
    }

    player = new YT.Player('player-iframe-target', {
        height: '450',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'rel': 0
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === 0) {
        playNext();
    }
}

function playNext() {
    currentQueueIndex++;
    if (currentQueueIndex < currentPlaylistQueue.length) {
        const nextId = currentPlaylistQueue[currentQueueIndex];
        player.loadVideoById(nextId);
    }
}

deletePlaylistBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    const user = getCurrentUser();
    user.playlists = user.playlists.filter(p => p.id !== activePlaylistId);
    updateUser(user);
    
    activePlaylistId = null;
    window.history.pushState({}, '', window.location.pathname);
    renderSidebar();
    
    if (user.playlists.length > 0) {
        selectPlaylist(user.playlists[0].id);
    } else {
        noSelection.style.display = 'block';
        playlistContent.style.display = 'none';
    }
});

playPlaylistBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === activePlaylistId);
    if (playlist && playlist.videos.length > 0) {
        
        let videos = [...playlist.videos];
        const filterText = filterInput.value.toLowerCase();
        if (filterText) videos = videos.filter(v => v.title.toLowerCase().includes(filterText));
        
        const sortMode = sortSelect.value;
        if (sortMode === 'az') videos.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortMode === 'rating') videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        const ids = videos.map(v => v.id);
        playVideoQueue(ids, 0);
    }
});

filterInput.addEventListener('input', renderVideos);
sortSelect.addEventListener('change', renderVideos);

newPlaylistBtn.addEventListener('click', () => {
    createModal.style.display = 'block';
});

closeCreateModal.addEventListener('click', () => {
    createModal.style.display = 'none';
});

confirmCreatePlaylist.addEventListener('click', () => {
    const name = createPlaylistName.value.trim();
    if (name) {
        const user = getCurrentUser();
        if (!user.playlists) user.playlists = [];
        
        const newPl = {
            id: Date.now().toString(),
            name: name,
            videos: []
        };
        
        user.playlists.push(newPl);
        updateUser(user);
        
        createModal.style.display = 'none';
        createPlaylistName.value = '';
        
        renderSidebar();
        selectPlaylist(newPl.id);
    }
});

document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        playerModal.style.display = 'none';
        createModal.style.display = 'none'; 
        
        if (player) {
            player.stopVideo();
            player.destroy(); 
            player = null;
        }
        playerContainer.innerHTML = ''; 
    });
});

window.onclick = function(event) {
    if (event.target == createModal) createModal.style.display = 'none';
    if (event.target == playerModal) {
        playerModal.style.display = 'none';
        if (player) {
            player.stopVideo();
            player.destroy();
            player = null;
        }
        playerContainer.innerHTML = '';
    }
}
