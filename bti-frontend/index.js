// Pega todos os links que têm um href que começa com '#'
const navLinks = document.querySelectorAll('nav a[href^="#"]');
const header = document.querySelector('header');
const headerHeight = header.offsetHeight; // Pega a altura do seu cabeçalho

// Itera sobre cada link encontrado
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    // Previne o comportamento padrão de "pular" para a âncora
    e.preventDefault();

    // Pega o ID do elemento de destino (ex: #secao_Segmentacao)
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      // Calcula a posição de rolagem subtraindo a altura do cabeçalho
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = targetPosition - headerHeight - 0; // 100px para o espaçamento adicional

      // Rola a página de forma suave para a nova posição
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelector('.carousel-slides');
    const dotsContainer = document.querySelector('.carousel-dots');
    const dots = dotsContainer.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    let currentIndex = 0;
    const totalSlides = slides.children.length;

    function updateCarousel() {
        const offset = -currentIndex * 100;
        slides.style.transform = `translateX(${offset}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentIndex].classList.add('active');
    }

    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalSlides - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0;
        updateCarousel();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            updateCarousel();
        });
    });

    // Autoplay do carrossel
    setInterval(() => {
        currentIndex = (currentIndex < totalSlides - 1) ? currentIndex + 1 : 0;
        updateCarousel();
    }, 7000); // Muda a imagem a cada x segundos
});