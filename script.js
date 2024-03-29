// Toggle theme
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Open chat
const openChatButton = document.querySelector('.nav-options a[href="#"]');

openChatButton.addEventListener("click", (event) => {
  event.preventDefault();
  window.open("LaklakaAI", "index.html");
});

// Open test generator
const openTestGeneratorButton = document.querySelector(
  '.nav-options a[href="#"]'
);

openTestGeneratorButton.addEventListener("click", (event) => {
  event.preventDefault();
  window.open("testgenweb", "_blank");
});

// Smooth scroll to About Us section
const aboutButton = document.querySelector("#about-button");
const aboutSection = document.querySelector("#about");

aboutButton.addEventListener("click", () => {
  aboutSection.scrollIntoView({ behavior: "smooth" });
});

// Smooth scroll to Pricing section
const pricingButton = document.querySelector("#pricing-button");
const pricingSection = document.querySelector("#pricing");

pricingButton.addEventListener("click", () => {
  pricingSection.scrollIntoView({ behavior: "smooth" });
});
