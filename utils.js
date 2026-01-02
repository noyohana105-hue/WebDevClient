const USERS_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

function getUsers() {
    const usersJSON = localStorage.getItem(USERS_KEY);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    const userJSON = sessionStorage.getItem(CURRENT_USER_KEY);
    return userJSON ? JSON.parse(userJSON) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function checkAuth(redirectIfNot = true) {
    const user = getCurrentUser();
    if (!user && redirectIfNot) {
        window.location.href = 'login.html';
    }
    return user;
}

function logout() {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'login.html';
}

function updateHeader() {
    const user = getCurrentUser();
    const headerUserDiv = document.querySelector('.user-info');
    
    if (user && headerUserDiv) {
        headerUserDiv.innerHTML = `
            <span>Welcome, ${user.firstName}</span>
            <img src="${user.image}" alt="Profile">
            <button id="logoutBtn" style="padding: 5px 10px; margin-left: 10px; font-size: 0.8em;">Logout</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
    }
}

function findUser(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
}

function updateUser(updatedUser) {
    const users = getUsers();
    const index = users.findIndex(u => u.username === updatedUser.username);
    if (index !== -1) {
        users[index] = updatedUser;
        saveUsers(users);
        
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.username === updatedUser.username) {
            setCurrentUser(updatedUser);
        }
    }
}

