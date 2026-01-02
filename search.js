const currentUser = checkAuth();
updateHeader();

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('searchResults');
const playerModal = document.getElementById('playerModal');
const playerContainer = document.getElementById('playerContainer');
const playlistModal = document.getElementById('playlistModal');
const closePlaylistModal = document.getElementById('closePlaylistModal');
const saveToPlaylistBtn = document.getElementById('saveToPlaylistBtn');

let currentVideoToAdd = null; 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        searchInput.value = query;
        performSearch(query);
    }
});

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    updateQueryString(query);
    performSearch(query);
}

function updateQueryString(query) {
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);
}

async function performSearch(query) {
    resultsContainer.innerHTML = '<p style="text-align:center; width:100%;">Loading...</p>';

    const hasApiKey = CONFIG.YOUTUBE_API_KEY && CONFIG.YOUTUBE_API_KEY !== 'YOUR_API_KEY_HERE';

    if (!hasApiKey) {
        console.log('No API Key detected. Using Mock Data.');
        setTimeout(() => {
            renderResults(getMockData(query));
        }, 500);
        return;
    }

    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=9&key=${CONFIG.YOUTUBE_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.error) {
            throw new Error(searchData.error.message);
        }

        if (!searchData.items || searchData.items.length === 0) {
            resultsContainer.innerHTML = '<p>No results found.</p>';
            return;
        }

        const videoIds = searchData.items.map(item => item.id.videoId).join(',');

        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${CONFIG.YOUTUBE_API_KEY}`;
        const statsRes = await fetch(statsUrl);
        const statsData = await statsRes.json();

        const videos = searchData.items.map(item => {
            const details = statsData.items.find(d => d.id === item.id.videoId);
            return {
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                duration: formatDuration(details?.contentDetails?.duration || ''),
                views: parseInt(details?.statistics?.viewCount || '0').toLocaleString(),
                publishedAt: item.snippet.publishedAt
            };
        });

        renderResults(videos);

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `<div style="text-align:center; color:red;">
            <p>Error fetching data: ${error.message}</p>
            <p>Falling back to mock data...</p>
        </div>`;
        
        setTimeout(() => renderResults(getMockData(query)), 2000);
    }
}

function getMockData(query) {
    const titles = [
        `Best ${query} Tutorial`,
        `${query} Explained in 10 Minutes`,
        `Top 10 ${query} Moments`,
        `History of ${query}`,
        `Why ${query} is Amazing`,
        `Live: ${query} Event`,
        `Advanced ${query} Techniques`,
        `${query} for Beginners`,
        `Unboxing ${query}`
    ];

    return titles.map((title, i) => ({
        id: `mock_${query}_${i}`,
        title: title,
        thumbnail: `https://picsum.photos/320/180?random=${i}`, // Random placeholder images
        channelTitle: 'Demo Channel',
        duration: '10:05',
        views: (Math.floor(Math.random() * 1000000) + 1000).toLocaleString(),
        publishedAt: new Date().toISOString()
    }));
}

function renderResults(videos) {
    resultsContainer.innerHTML = '';
    const user = getCurrentUser();

    if (videos.length === 0) {
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }

    videos.forEach(video => {
        const isSaved = isVideoInPlaylists(user, video.id);
        
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="thumbnail-wrapper" style="position: relative; cursor: pointer;">
                <img src="${video.thumbnail}" class="video-thumbnail" alt="${video.title}" style="width:100%; display:block;">
                <span style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.8); color: white; padding: 2px 4px; font-size: 12px; border-radius: 2px;">
                    ${video.duration}
                </span>
            </div>
            <div class="video-info">
                <div class="video-title" title="${video.title}">${video.title}</div>
                <div class="video-meta" style="margin-top: 5px; color: #606060; font-size: 0.9em;">
                    ${video.channelTitle} • ${video.views} views
                </div>
                <div class="card-actions" style="margin-top: auto; padding-top: 10px; display: flex; gap: 10px;">
                    <button class="add-fav-btn ${isSaved ? 'added' : ''}" ${isSaved ? 'disabled' : ''} style="flex: 1;">
                        ${isSaved ? '✔ Saved' : '+ Add to Playlist'}
                    </button>
                    <button class="watch-yt-btn" style="padding: 0 10px; background: #f0f0f0; border: 1px solid #ddd; color: #333;" title="Watch on YouTube">
                        &#x2197;
                    </button>
                </div>
            </div>
        `;

        const thumb = card.querySelector('.thumbnail-wrapper');
        const title = card.querySelector('.video-title');
        const addBtn = card.querySelector('.add-fav-btn');
        const ytBtn = card.querySelector('.watch-yt-btn');

        thumb.addEventListener('click', () => openPlayer(video));
        title.addEventListener('click', () => openPlayer(video));
        
        ytBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank');
        });
        
        if (!isSaved) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPlaylistModal(video);
            });
        }

        resultsContainer.appendChild(card);
    });
}

function formatDuration(iso) {
    if (!iso) return "00:00";
    const m = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!m) return "00:00"; 
    const h = m[1] ? m[1].replace("H", "") : 0;
    const min = m[2] ? m[2].replace("M", "") : 0;
    const s = m[3] ? m[3].replace("S", "") : 0;
    
    return (h > 0 ? h + ":" : "") +
      String(min).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0");
}

function isVideoInPlaylists(user, videoId) {
    if (!user.playlists) return false;
    return user.playlists.some(pl => pl.videos.some(v => v.id === videoId));
}

function openPlayer(video) {
    playerContainer.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${video.id}?autoplay=1" allowfullscreen allow="autoplay"></iframe>
    `;
    playerModal.style.display = 'block';
}

function openPlaylistModal(video) {
    currentVideoToAdd = video;
    playlistModal.style.display = 'block';
    
    const user = getCurrentUser();
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">-- Select Playlist --</option>';
    
    if (user.playlists) {
        user.playlists.forEach(pl => {
            const opt = document.createElement('option');
            opt.value = pl.id;
            opt.textContent = pl.name;
            select.appendChild(opt);
        });
    }
}

saveToPlaylistBtn.addEventListener('click', () => {
    if (!currentVideoToAdd) return;

    const user = getCurrentUser();
    if (!user.playlists) user.playlists = [];

    const select = document.getElementById('playlistSelect');
    const newNameInput = document.getElementById('newPlaylistName');
    
    let targetPlaylist;
    const newName = newNameInput.value.trim();
    const targetId = select.value;

    if (newName) {
        targetPlaylist = {
            id: Date.now().toString(),
            name: newName,
            videos: []
        };
        user.playlists.push(targetPlaylist);
    } else if (targetId) {
        targetPlaylist = user.playlists.find(p => p.id === targetId);
    } else {
        alert('Please select or create a playlist.');
        return;
    }

    if (targetPlaylist) {
        if (!targetPlaylist.videos.find(v => v.id === currentVideoToAdd.id)) {
            targetPlaylist.videos.push({
                ...currentVideoToAdd,
                rating: 0,
                addedAt: new Date().toISOString()
            });
            updateUser(user);
            showToast();
            
            playlistModal.style.display = 'none';
            newNameInput.value = '';
            renderResults(searchResults); 
        } else {
            alert('Video already in this playlist.');
        }
    }
});

document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        playerModal.style.display = 'none';
        playlistModal.style.display = 'none';
        playerContainer.innerHTML = ''; 
    });
});

window.onclick = function(event) {
    if (event.target == playerModal) {
        playerModal.style.display = 'none';
        playerContainer.innerHTML = '';
    }
    if (event.target == playlistModal) {
        playlistModal.style.display = 'none';
    }
};

function showToast() {
    const t = document.getElementById("toast");
    t.style.visibility = "visible";
    setTimeout(() => { t.style.visibility = "hidden"; }, 3000);
}
