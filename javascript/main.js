const header = document.querySelector("[data-header]");
const slides = Array.from(document.querySelectorAll(".hero-slide"));
const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const ga4Id = document.documentElement.dataset.ga4Id;
const metaPixelId = document.documentElement.dataset.metaPixelId;

function updateHeader() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function startHeroSlider() {
  if (slides.length < 2) return;

  let index = 0;
  window.setInterval(() => {
    slides[index].classList.remove("is-active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("is-active");
  }, 4500);
}

function preserveUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const savedParams = new URLSearchParams();

  utmKeys.forEach((key) => {
    const value = params.get(key);
    if (value) savedParams.set(key, value);
  });

  if (!savedParams.toString()) return;

  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    const url = new URL(link.href);
    savedParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    link.href = url.toString();
  });
}

function setupTrackingHooks() {
  document.querySelectorAll("[data-track]").forEach((element) => {
    element.addEventListener("click", () => {
      const eventName = element.dataset.track;

      if (window.gtag) {
        window.gtag("event", eventName);
      }

      if (window.fbq) {
        window.fbq("trackCustom", eventName);
      }
    });
  });
}

function loadScript(src, onload) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  if (onload) script.onload = onload;
  document.head.appendChild(script);
}

function setupAnalytics() {
  if (ga4Id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", ga4Id);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`);
  }

  if (metaPixelId) {
    window.fbq = function fbq() {
      window.fbq.callMethod
        ? window.fbq.callMethod.apply(window.fbq, arguments)
        : window.fbq.queue.push(arguments);
    };
    window.fbq.queue = [];
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    window.fbq("init", metaPixelId);
    window.fbq("track", "PageView");
    loadScript("https://connect.facebook.net/en_US/fbevents.js");
  }
}

updateHeader();
startHeroSlider();
preserveUtmParams();
setupAnalytics();
setupTrackingHooks();

window.addEventListener("scroll", updateHeader, { passive: true });
