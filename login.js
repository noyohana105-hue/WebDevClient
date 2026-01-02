document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    const user = findUser(username);

    if (user && user.password === password) {
        setCurrentUser(user);
        window.location.href = 'search.html';
    } else {
        errorDiv.textContent = 'Invalid username or password.';
        errorDiv.style.display = 'block';
    }
});

