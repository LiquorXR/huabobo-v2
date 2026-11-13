/**
 * 首页轮播图（淡入淡出，标签页不可见时暂停）
 */
(function () {
  var root = document.querySelector('.carousel');
  if (!root) return;

  var slides = root.querySelectorAll('.carousel-slide');
  var dotsWrap = root.querySelector('.carousel-dots');
  var prevBtn = root.querySelector('.carousel-btn.prev');
  var nextBtn = root.querySelector('.carousel-btn.next');
  var total = slides.length;
  var current = 0;
  var timer = null;
  var interval = 6000;

  function lazyLoadSlide(slide) {
    var sources = slide.querySelectorAll('source[data-srcset]');
    sources.forEach(function (s) {
      s.srcset = s.getAttribute('data-srcset');
      s.removeAttribute('data-srcset');
    });
    var img = slide.querySelector('img[data-src]');
    if (!img) return;
    img.src = img.getAttribute('data-src');
    img.removeAttribute('data-src');
  }

  function goTo(index) {
    slides[current].classList.remove('is-active');
    current = (index + total) % total;
    slides[current].classList.add('is-active');
    lazyLoadSlide(slides[current]);
    var nextIndex = (current + 1) % total;
    lazyLoadSlide(slides[nextIndex]);

    var dots = dotsWrap.querySelectorAll('.carousel-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  }

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function startAuto() {
    stopAuto();
    if (document.hidden) return;
    timer = setInterval(next, interval);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  slides.forEach(function (slide, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute(
      'aria-label',
      window.ZJS && ZJS.t ? ZJS.t('carousel.dot', { n: i + 1 }) : '第 ' + (i + 1) + ' 张'
    );
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', function () {
      goTo(i);
      startAuto();
    });
    dotsWrap.appendChild(dot);
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAuto(); });

  root.addEventListener('mouseenter', stopAuto);
  root.addEventListener('mouseleave', startAuto);

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stopAuto() : startAuto();
  });

  var startX = 0;
  root.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    stopAuto();
  }, { passive: true });

  root.addEventListener('touchend', function (e) {
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    startAuto();
  }, { passive: true });

  slides[0].classList.add('is-active');
  lazyLoadSlide(slides[0]);
  if (total > 1) lazyLoadSlide(slides[1]);
  startAuto();

  window.addEventListener('zhijiansu:langchange', function () {
    var dots = dotsWrap.querySelectorAll('.carousel-dot');
    dots.forEach(function (dot, i) {
      dot.setAttribute(
        'aria-label',
        window.ZJS && ZJS.t ? ZJS.t('carousel.dot', { n: i + 1 }) : '第 ' + (i + 1) + ' 张'
      );
    });
  });
})();
