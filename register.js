document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const image = document.getElementById('imageUrl').value.trim() || 'https://via.placeholder.com/40'; // Default image
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('registerError');

    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    if (!username || !firstName || !password || !confirmPassword) {
        showError('All fields marked * are required.');
        return;
    }

    if (findUser(username)) {
        showError('Username already exists.');
        return;
    }

    const passwordRegex = /(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])(?=.{6,})/;
    if (!passwordRegex.test(password)) {
        showError('Password must be at least 6 characters long and contain at least one letter, one number, and one special character.');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }

    const newUser = {
        username: username,
        firstName: firstName,
        password: password, 
        image: image,
        playlists: [] 
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    alert('Registration successful! Please login.');
    window.location.href = 'login.html';

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
});

