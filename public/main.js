function showLoader() {
    document.getElementById("loader-wrapper").style.display = "flex";
}

function hideLoader() {
    const loader = document.getElementById("loader-wrapper");
    if (loader) loader.style.display = "none";
}

// Hide on initial page load
window.addEventListener("load", () => {
    hideLoader();
});

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});