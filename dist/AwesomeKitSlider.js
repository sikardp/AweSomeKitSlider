class AweSomeKitSlider {
    constructor(container, options = {}) {
        this.container = document.querySelector(container);
        if (!this.container) throw new Error(`Container ${container} not found`);
        
        this.slider = this.container.querySelector('.awe-slider');
        if (!this.slider) throw new Error('Slider element not found');

        // Initialize
        this.init = () => {
            this.slides = [...this.slider.children];
            this.paginationContainer = this.container.querySelector('.awe-pagination');
            this.prevBtn = this.container.querySelector('.awe-prev');
            this.nextBtn = this.container.querySelector('.awe-next');
            
            const {
                autoplay = false,
                interval = 3000,
                infinite = false,
                arrows = false,
                pagination = false,
                paginationText = [],
                type = 'slide',
                slidesPerView = 1,
                slidesToScroll = 1,
                breakpoints = {}
            } = options;

            this.defaultOptions = {
                autoplay,
                interval,
                infinite,
                arrows,
                pagination,
                paginationText,
                type,
                slidesPerView: type === 'fade' ? 1 : slidesPerView,
                slidesToScroll
            };
            this.breakpoints = breakpoints;
            this.gap = 14;
            this.isDragging = false;
            this.startPos = 0;
            this.currentTranslate = 0;
            this.prevTranslate = 0;
            this.index = this.infinite && this.type === 'slide' ? this.slidesPerView : 0;

            this.applyResponsiveSettings();
            this.setupSlides();
            this.slider.dataset.slidesPerView = this.slidesPerView;
            
            if (this.type === 'slide' && this.infinite) this.cloneSlides();
            if (this.type === 'fade') this.setupFade();
            if (this.pagination && this.paginationContainer) this.createPagination();
            if (this.arrows && this.prevBtn && this.nextBtn) this.addArrows();

            this.updateSlideVisibility();
            this.updatePagination();
            this.startAutoplay();
            this.addDragEvents();
            window.addEventListener('resize', this.handleResize.bind(this));
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }

    applyResponsiveSettings() {
        const width = window.innerWidth;
        let settings = { ...this.defaultOptions };

        Object.keys(this.breakpoints)
            .sort((a, b) => a - b)
            .forEach(bp => {
                if (width >= parseInt(bp)) {
                    settings = { ...settings, ...this.breakpoints[bp] };
                }
            });

        this.autoplay = settings.autoplay;
        this.interval = settings.interval;
        this.infinite = settings.infinite;
        this.arrows = settings.arrows;
        this.pagination = settings.pagination;
        this.paginationText = settings.paginationText;
        this.type = settings.type;
        this.slidesPerView = this.type === 'fade' ? 1 : settings.slidesPerView;
        this.slidesToScroll = settings.slidesToScroll;
    }

    handleResize() {
        this.stopAutoplay();
        this.applyResponsiveSettings();
        this.setupSlides();
        this.slider.dataset.slidesPerView = this.slidesPerView;
        
        if (this.type === 'slide' && this.infinite) {
            this.slider.innerHTML = '';
            this.slides = [...this.container.querySelector('.awe-slider').children];
            this.cloneSlides();
        }
        if (this.pagination && this.paginationContainer) this.createPagination();
        this.updateSlideVisibility();
        this.updatePagination();
        this.resetAutoplay();
    }

    setupSlides() {
        if (this.type === 'slide') {
            const sliderWidth = this.slider.offsetWidth;
            if (sliderWidth === 0) {
                requestAnimationFrame(() => this.setupSlides());
                return;
            }
            const totalGapWidth = this.gap * (this.slidesPerView - 1);
            const slideWidth = (sliderWidth - totalGapWidth) / this.slidesPerView;
            this.slides.forEach(slide => {
                slide.style.minWidth = `${slideWidth}px`;
                slide.style.width = `${slideWidth}px`;
            });
        }
    }

    cloneSlides() {
        if (this.slides.length < this.slidesPerView) return;
        const clonesBefore = [];
        const clonesAfter = [];
        for (let i = 0; i < this.slidesPerView; i++) {
            const beforeClone = this.slides[this.slides.length - 1 - i].cloneNode(true);
            const afterClone = this.slides[i].cloneNode(true);
            clonesBefore.unshift(beforeClone);
            clonesAfter.push(afterClone);
        }
        clonesBefore.forEach(clone => this.slider.prepend(clone));
        clonesAfter.forEach(clone => this.slider.appendChild(clone));
        this.slides = [...this.slider.children];
        this.updateSlidePosition();
    }

    setupFade() {
        this.slides.forEach((slide, i) => {
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';
            slide.style.width = '100%';
            slide.style.height = '100%';
            slide.style.transition = 'opacity 0.5s ease-in-out';
            slide.style.opacity = i === this.index ? '1' : '0';
            slide.style.zIndex = i === this.index ? 1 : 0;
        });
        this.slider.style.position = 'relative';
        this.slider.style.overflow = 'hidden';
        this.slider.classList.add('awe-fade');
    }

    createPagination() {
        this.paginationContainer.innerHTML = '';
        const slideCount = this.slides.length - (this.infinite && this.type === 'slide' ? this.slidesPerView * 2 : 0);
        const pageCount = Math.ceil((slideCount - this.slidesPerView + 1) / this.slidesToScroll);
        for (let i = 0; i < pageCount; i++) {
            const link = document.createElement('div');
            link.classList.add('awe-page-link');
            link.textContent = this.paginationText[i] || (i + 1);
            link.addEventListener('click', () => {
                this.stopAutoplay();
                this.goToSlide(i * this.slidesToScroll + (this.infinite && this.type === 'slide' ? this.slidesPerView : 0));
                this.resetAutoplay();
            });
            this.paginationContainer.appendChild(link);
        }
    }

    addArrows() {
        // Ensure buttons are visible and events are properly bound
        if (this.prevBtn) {
            this.prevBtn.style.display = 'block';
            this.removeEventListeners(this.prevBtn, 'click'); // Prevent multiple listeners
            this.prevBtn.addEventListener('click', () => {
                this.stopAutoplay();
                this.prevSlide();
                this.resetAutoplay();
            });
        }
        if (this.nextBtn) {
            this.nextBtn.style.display = 'block';
            this.removeEventListeners(this.nextBtn, 'click');
            this.nextBtn.addEventListener('click', () => {
                this.stopAutoplay();
                this.nextSlide();
                this.resetAutoplay();
            });
        }
    }

    // Utility to remove existing event listeners
    removeEventListeners(element, event) {
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
        if (event === 'click') {
            if (element === this.prevBtn) this.prevBtn = clone;
            if (element === this.nextBtn) this.nextBtn = clone;
        }
    }

    addDragEvents() {
        const events = {
            start: ['mousedown', 'touchstart'],
            move: ['mousemove', 'touchmove'],
            end: ['mouseup', 'touchend', 'mouseleave', 'touchcancel']
        };

        events.start.forEach(ev => 
            this.slider.addEventListener(ev, this.startDragging.bind(this), { passive: false })
        );
        events.move.forEach(ev => 
            this.slider.addEventListener(ev, this.drag.bind(this), { passive: false })
        );
        events.end.forEach(ev => 
            this.slider.addEventListener(ev, this.stopDragging.bind(this))
        );
    }

    startDragging(e) {
        this.isDragging = true;
        this.startPos = this.getPositionX(e);
        this.prevTranslate = this.currentTranslate;
        this.stopAutoplay();
        if (this.type === 'slide') {
            this.slider.style.transition = 'none';
        }
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const currentPosition = this.getPositionX(e);
        const diff = currentPosition - this.startPos;
        
        if (this.type === 'slide') {
            this.currentTranslate = this.prevTranslate + diff;
            requestAnimationFrame(() => {
                this.slider.style.transform = `translateX(${this.currentTranslate}px)`;
            });
        }
    }

    stopDragging(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        if (this.type === 'slide') {
            const movedBy = this.currentTranslate - this.prevTranslate;
            const slideWidthPx = (this.slider.offsetWidth - this.gap * (this.slidesPerView - 1)) / this.slidesPerView;
            const threshold = slideWidthPx * 0.3;
            
            this.slider.style.transition = 'transform 0.5s ease-in-out';
            if (movedBy < -threshold) {
                this.nextSlide();
            } else if (movedBy > threshold) {
                this.prevSlide();
            } else {
                this.updateSlidePosition();
            }
        } else if (this.type === 'fade') {
            const diff = this.getPositionX(e) - this.startPos;
            if (diff < -30) this.nextSlide();
            else if (diff > 30) this.prevSlide();
        }
        
        this.resetAutoplay();
    }

    getPositionX(e) {
        return e.type.includes('mouse') ? e.pageX : (e.touches?.[0]?.pageX || e.changedTouches?.[0]?.pageX || 0);
    }

    updatePagination() {
        if (!this.pagination || !this.paginationContainer) return;
        const links = this.paginationContainer.querySelectorAll('.awe-page-link');
        links.forEach(link => link.classList.remove('awe-active'));

        const totalOriginalSlides = this.slides.length - (this.infinite && this.type === 'slide' ? this.slidesPerView * 2 : 0);
        const pageCount = Math.ceil((totalOriginalSlides - this.slidesPerView + 1) / this.slidesToScroll);

        let activeIndex;
        if (this.type === 'fade') {
            activeIndex = this.index % totalOriginalSlides;
            if (this.infinite && this.index >= this.slides.length) activeIndex = 0;
            else if (this.index < 0) activeIndex = totalOriginalSlides - 1;
        } else {
            let adjustedIndex = this.index;
            if (this.infinite) {
                if (adjustedIndex < this.slidesPerView) {
                    adjustedIndex = totalOriginalSlides - this.slidesPerView + (adjustedIndex % this.slidesPerView);
                } else if (adjustedIndex >= this.slides.length - this.slidesPerView) {
                    adjustedIndex = adjustedIndex - (this.slides.length - this.slidesPerView);
                } else {
                    adjustedIndex -= this.slidesPerView;
                }
            }
            activeIndex = Math.floor(adjustedIndex / this.slidesToScroll);
        }

        activeIndex = Math.max(0, Math.min(activeIndex, pageCount - 1));
        if (activeIndex >= 0 && activeIndex < links.length) {
            links[activeIndex].classList.add('awe-active');
        }
    }

    updateSlidePosition() {
        if (this.type === 'slide') {
            const slideWidthPx = (this.slider.offsetWidth - this.gap * (this.slidesPerView - 1)) / this.slidesPerView;
            const totalWidthPx = slideWidthPx + this.gap;
            this.currentTranslate = -(this.index * totalWidthPx);
            this.slider.style.transform = `translateX(${this.currentTranslate}px)`;
        }
    }

    updateSlideVisibility() {
        if (this.type === 'fade') {
            this.slides.forEach((slide, i) => {
                slide.style.opacity = i === this.index ? '1' : '0';
                slide.style.zIndex = i === this.index ? 1 : 0;
            });
        } else {
            this.updateSlidePosition();
        }
    }

    nextSlide() {
        this.index += this.slidesToScroll;
        if (this.type === 'slide') {
            const maxIndex = this.slides.length - this.slidesPerView;
            if (this.infinite && this.index >= maxIndex) {
                this.slider.style.transition = 'transform 0.5s ease-in-out';
                this.updateSlidePosition();
                setTimeout(() => {
                    this.slider.style.transition = 'none';
                    this.index = this.slidesPerView;
                    this.updateSlidePosition();
                    this.updatePagination();
                }, 500);
            } else if (!this.infinite && this.index > maxIndex) {
                this.index = maxIndex;
            }
        } else if (this.type === 'fade') {
            if (this.index >= this.slides.length) {
                this.index = this.infinite ? 0 : this.slides.length - 1;
            }
        }
        this.updateSlideVisibility();
        this.updatePagination();
    }

    prevSlide() {
        this.index -= this.slidesToScroll;
        if (this.type === 'slide') {
            if (this.infinite && this.index < this.slidesPerView) {
                this.slider.style.transition = 'transform 0.5s ease-in-out';
                this.updateSlidePosition();
                setTimeout(() => {
                    this.slider.style.transition = 'none';
                    this.index = this.slides.length - this.slidesPerView * 2;
                    this.updateSlidePosition();
                    this.updatePagination();
                }, 500);
            } else if (!this.infinite && this.index < 0) {
                this.index = 0;
            }
        } else if (this.type === 'fade') {
            if (this.index < 0) {
                this.index = this.infinite ? this.slides.length - 1 : 0;
            }
        }
        this.updateSlideVisibility();
        this.updatePagination();
    }

    goToSlide(index) {
        this.index = index;
        if (this.type === 'slide') {
            const maxIndex = this.slides.length - this.slidesPerView;
            if (!this.infinite && this.index > maxIndex) this.index = maxIndex;
            if (!this.infinite && this.index < 0) this.index = 0;
        } else if (this.type === 'fade') {
            if (this.index >= this.slides.length) this.index = this.infinite ? 0 : this.slides.length - 1;
            if (this.index < 0) this.index = this.infinite ? this.slides.length - 1 : 0;
        }
        this.updateSlideVisibility();
        this.updatePagination();
    }

    startAutoplay() {
        if (this.autoplay) {
            this.timer = setInterval(() => this.nextSlide(), this.interval);
        }
    }

    stopAutoplay() {
        clearInterval(this.timer);
        this.timer = null;
    }

    resetAutoplay() {
        if (this.autoplay) {
            this.stopAutoplay();
            this.startAutoplay();
        }
    }
}
