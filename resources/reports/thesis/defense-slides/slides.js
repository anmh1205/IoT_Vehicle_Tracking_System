const deck = document.getElementById("deck");
const slides = [...document.querySelectorAll(".slide")];
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const slideTitle = document.getElementById("slide-title");
const slideCount = document.getElementById("slide-count");
const progressBar = document.getElementById("progress-bar");

let current = 0;
let touchStartX = 0;

function clamp(index) {
  return Math.max(0, Math.min(index, slides.length - 1));
}

function setSlide(index, updateHash = true) {
  current = clamp(index);
  deck.style.transform = `translateX(-${current * 100}vw)`;
  slideTitle.textContent = slides[current].dataset.title || `Slide ${current + 1}`;
  slideCount.textContent = `${current + 1} / ${slides.length}`;
  progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === slides.length - 1;
  if (updateHash) window.location.hash = `slide-${current + 1}`;
}

function fromHash() {
  const match = window.location.hash.match(/slide-(\d+)/);
  return match ? clamp(Number(match[1]) - 1) : 0;
}

prevBtn.addEventListener("click", () => setSlide(current - 1));
nextBtn.addEventListener("click", () => setSlide(current + 1));

document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    setSlide(current + 1);
  }
  if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) {
    event.preventDefault();
    setSlide(current - 1);
  }
  if (event.key === "Home") setSlide(0);
  if (event.key === "End") setSlide(slides.length - 1);
});

document.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

document.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 60) return;
  setSlide(current + (delta < 0 ? 1 : -1));
}, { passive: true });

window.addEventListener("hashchange", () => setSlide(fromHash(), false));
window.addEventListener("resize", () => setSlide(current, false));

setSlide(fromHash(), false);
