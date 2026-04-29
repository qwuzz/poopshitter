const menuToggle = document.getElementById('menu-toggle');
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        const links = document.getElementById('nav-links');
        if (links) {
            links.classList.toggle('visible');
        }
    });
}


