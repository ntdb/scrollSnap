// Helper functions

const isMobile = () => {
  return (/Android|iPhone|iPad|iPod|BlackBerry/i).test(navigator.userAgent || navigator.vendor || window.opera);
};

const timing = (t, b, c, d) => {
  // t = Current frame
  // b = Start-value
  // c = End-value
  // d = Duration

  const tx = t / d;
  return -c * tx * (tx - 2) + b;
};

const valid = (opts = {}) => {
  // Check required properties
  if (opts.elements === undefined) {
    console.error('Elements missing: opts.elements');
    return false;
  }

  if (opts.minWidth === undefined || opts.minWidth < 0) {
    console.error('Property missing or not a number: opts.minWidth');
    return false;
  }

  if (opts.minHeight === undefined || opts.minHeight < 0) {
    console.error('Property missing or not a number: opts.minHeight');
    return false;
  }

  // Set optional properties

  if (opts.detectMobile !== false) opts.detectMobile = true;
  if (opts.duration === undefined || opts.duration < 0) opts.duration = 30;
  if (opts.timing === undefined) opts.timing = timing;
  if (opts.keyboard !== false) opts.keyboard = true;

  return true;
};

const normalizePosition = (newPos, maxPos) => {
  let newPosx = newPos;
  if (newPos < 0) newPosx = 0;
  if (newPos > maxPos - 1) newPosx = maxPos - 1;

  return newPosx;
};

const getWindowMetrics = () => {
  const boundingClientRect = document.body.getBoundingClientRect();
  const windowSize = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const metrics = {
    top: boundingClientRect.top * -1,
    maxTop: boundingClientRect.height - windowSize.height,
    bottom: boundingClientRect.top * -1 + windowSize.height,
    width: windowSize.width,
    height: windowSize.height
  };
  return metrics;
};

const getElementVisiblePercentage = (elementMetrics, windowMetrics) => {
  let sP = 0;
  let eP = 0;
  let vH = 0;
  let vP = 0;

  // Calculate start-point (sP)
  sP = (windowMetrics.top > elementMetrics.top ? windowMetrics.top : elementMetrics.top);

  // Calculate end-point (eP)
  eP = (windowMetrics.bottom > elementMetrics.bottom ? elementMetrics.bottom : windowMetrics.bottom);

  // Calculate visible height in pixels (vH)
  vH = eP - sP;

  // Convert vH from pixels to a percentage value
  // 100 = element completely visible
  // 0 = element not visible at all
  vP = (100 / elementMetrics.height) * vH;

  // Normalize output
  if (vH < 0) vH = 0;
  if (vP < 0) vP = 0;

  // Return the visible height in percent
  return { vH, vP };
};

const getElementMetrics = (elem, windowMetrics, index) => {
  if (elem === null) return false;

  const obj = {
    index,
    active: false, // elem.classList.contains('active'),
    top: elem.offsetTop,
    bottom: elem.offsetTop + elem.offsetHeight,
    height: elem.offsetHeight,
    dom: elem
  };

  obj.visiblePercentage = getElementVisiblePercentage(obj, windowMetrics).vP;

  return obj;
};


// ScrollSnap class

class ScrollSnap {
  constructor(opts) {
    this.on = null;
    this.paused = false;
    this.animating = false;
    this.scrollTimer = null;
    this.resizeTimer = null;
    this.computedOpts = opts;
    this.computedWindow = null;
    this.computedElements = null;
    this.container = opts.container;
    this.callback = null;

    this.onKeydown = this.onKeydown.bind(this);
    this.scrollTo = this.scrollTo.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onScrollKey = this.onScrollKey.bind(this);

    // Check if opts includes all required properties
    if (valid(opts) === false) return false;

    // Disable on mobile devices
    if (opts.detectMobile === true && isMobile() === true) return false;

    // Listen to window-size changes
    window.addEventListener('resize', (_e) => {
      // Reset timeout
      clearTimeout(this.resizeTimer);

      // Set new timeout
      this.resizeTimer = setTimeout(() => this.init(), 200);

      return true;
    });

    this.init();
  }

  init() {
    // Get size of window
    this.computedWindow = getWindowMetrics();

    // Reset computed elements
    this.computedElements = [];

    // Update the metrics of each element
    for (let i = 0; i < this.computedOpts.elements.length; ++i) {
      const element = this.computedOpts.elements[i];
      const elementMetrics = getElementMetrics(element, this.computedWindow, i);

      // Save metrics of element
      this.computedElements.push(elementMetrics);
    }

    const isBig = this.computedWindow.width >= this.computedOpts.minWidth && this.computedWindow.height >= this.computedOpts.minHeight;
    const isSmall = this.computedWindow.width < this.computedOpts.minWidth || this.computedWindow.height < this.computedOpts.minHeight;

    if (isBig === true && (this.on === false || this.on === null) && !this.paused) {
      this.start(this.computedOpts);
    } else if (isSmall === true && (this.on === true || this.on === null)) {
      this.stop(this.computedOpts);
    }
  }

  getContainerMetrics() {
    if (this.container === document.body) {
      return getWindowMetrics();
    }

    const containerSize = {
      width: this.container.offsetWidth,
      height: this.container.offsetHeight
    };
    const fullHeight = this.container.children.length * containerSize.height;

    return {
      top: this.container.scrollTop,
      maxTop: fullHeight - containerSize.height,
      bottom: this.container.scrollTop + containerSize.height,
      width: containerSize.width,
      height: containerSize.height
    };
  }

  setElementVisible(elementMetrics, windowMetrics) {
    if (!elementMetrics) {
      this.animating = false;
      return false;
    }
    const elem = elementMetrics.dom;

    // Remove all active-states
    for (let i = 0; i < this.computedElements.length; ++i) {
      this.computedElements[i].dom.classList.remove('active');
      this.computedElements[i].active = false;
    }

    // Add active-state to the element
    elem.classList.add('active');
    elementMetrics.active = true;

    let currentFrame = 0;
    const startScrollTop = this.container.scrollTop;
    const difference = startScrollTop - elementMetrics.top;
    const duration = this.computedOpts.duration;
    const elementTiming = this.computedOpts.timing;

    const animation = () => {
      const newScrollTop = startScrollTop - elementTiming(currentFrame, 0, difference, duration);

      // Scroll to element
      if (this.container === document.body) {
        document.body.scrollTop = newScrollTop; // Safari, Chrome
        document.documentElement.scrollTop = newScrollTop; // Firefox
      } else {
        this.container.scrollTop = newScrollTop;
      }

      // Stop the animation when ...
      // ... all frames have been shown
      // ... scrollTop reached its maximum after the first frame
      const reachedMax = this.container.scrollTop === windowMetrics.maxTop && currentFrame !== 0;
      if (currentFrame >= duration || reachedMax) {
        // Animation finished
        this.animating = false;
        if (this.callback) {
          this.callback();
          this.callback = null;
        }
      } else {
        // Continue with next frame
        currentFrame++;

        // Continue animation
        requestAnimationFrame(animation);
      }
    };

    // Start the animation
    animation();

    return true;
  }

  updateComputedElements() {
    // Reset computed elements
    this.computedElements = [];

    // Update the metrics of each element
    for (let i = 0; i < this.computedOpts.elements.length; ++i) {
      const element = this.computedOpts.elements[i];
      const elementMetrics = getElementMetrics(element, this.computedWindow, i);

      // Save metrics of element
      this.computedElements.push(elementMetrics);
    }
  }

  onKeydown(e) {
    if (this.animating === true || !this.on) return false;

    this.animating = true;

    const key = e.keyCode;
    let newPos = 0;

    if (key !== 38 && key !== 40) return true;

    // Update window metrics
    this.computedWindow = this.getContainerMetrics();

    // Get current position
    for (let i = 0; i < this.computedElements.length; ++i) {
      if (this.computedElements[i].active === true) newPos = i;
    }

    this.updateComputedElements();

    // 38 = Up
    // 40 = Down
    if (key === 38) newPos += -1;
    else if (key === 40) newPos += 1;

    // Check if next element exists
    newPos = normalizePosition(newPos, this.computedElements.length);

    // Show the new element
    this.setElementVisible(this.computedElements[newPos], this.computedWindow);

    e.preventDefault();
    return false;
  }

  scrollTo(e, index = null) {
    this.animating = true;

    let direction = 0;
    let topElement = {};
    // let nextElementNum = null;
    // const gravitation = 9.807;

    // Get the direction from the event
    // Only need to do this if there's no set index
    if (e && !index) {
      if (e.type === 'wheel') direction = e.deltaY;

      // Normalize direction
      direction = direction > 0 ? 1 : -1;
    }

    // Update window metrics
    this.computedWindow = this.getContainerMetrics();

    this.updateComputedElements();

    // Get the element which is most visible and save it
    for (let i = 0; i < this.computedElements.length; ++i) {
      const elementMetrics = this.computedElements[i];
      if (topElement.visiblePercentage === undefined || elementMetrics.visiblePercentage > topElement.visiblePercentage) {
        topElement = elementMetrics;
      }
    }

    // Navigate directly to an index, if set
    if (index !== null && index !== undefined) {
      return this.setElementVisible(this.computedElements[index], this.computedWindow);
    }

    // // Use the velocity to calculate the next element
    // nextElementNum = topElement.index + direction;

    // // Check if next element exists
    // nextElementNum = normalizePosition(nextElementNum, computedElements.length);

    // Gravitation tends the algo towards the previous tile
    // Add velocity to next element
    // computedElements[nextElementNum].visiblePercentage *= gravitation;

    // Re-check if there is a new most visible element
    // for (let i = 0; i < computedElements.length; ++i) {
    //   const elementMetrics = computedElements[i];

    //   if (elementMetrics.visiblePercentage > topElement.visiblePercentage) {
    //     topElement = elementMetrics;
    //   }
    // }

    return this.setElementVisible(topElement, this.computedWindow);
  }

  onScroll(e) {
    if (this.animating === true || !this.on) return false;

    // Reset timeout
    clearTimeout(this.scrollTimer);

    // Set new timeout
    this.scrollTimer = setTimeout(() => this.scrollTo(e), 200);

    return true;
  }

  scrollToNearest() {
    this.animating = true;

    let nextElementMetrics = null;

    for (let i = 0; i < this.computedOpts.elements.length; ++i) {
      const elementMetrics = this.computedElements[i];

      if (this.computedWindow.top >= elementMetrics.top) nextElementMetrics = elementMetrics;
    }

    return this.setElementVisible(nextElementMetrics, this.computedWindow);
  }

  onScrollKey(e) {
    if (!this.on) return false;

    // These need to happen if `animating` === true, but not if `on` === false
    e.stopPropagation();
    e.preventDefault();
    e.returnValue = false;

    if (this.animating || Math.abs(e.deltaY) < 15) return false;

    if (e.deltaY < 0) {
      e.keyCode = 38;
    } else {
      e.keyCode = 40;
    }
    this.onKeydown(e);

    return false;
  }

  setPaused(toPaused) {
    this.on = !toPaused;
    this.paused = toPaused;
  }

  scrollToIndex(index, cb = null) {
    if (cb) this.callback = cb;
    this.scrollTo(null, index);
  }

  start(opts) {
    this.on = true;

    document.body.addEventListener('wheel', opts.scrollToKey ? this.onScrollKey : this.onScroll);
    if (opts.keyboard === true) document.body.addEventListener('keydown', this.onKeydown);

    for (let i = 0; i < this.computedElements.length; ++i) {
      this.computedElements[i].dom.classList.remove('active');
    }

    // return this.scrollToNearest();
  }

  stop(opts) {
    this.on = false;

    document.body.removeEventListener('wheel', opts.scrollToKey ? this.onScrollKey : this.onScroll);
    if (opts.keyboard === true) document.body.removeEventListener('keydown', this.onKeydown);

    for (let i = 0; i < this.computedElements.length; ++i) {
      this.computedElements[i].dom.classList.add('active');
    }

    return true;
  }
}

export default ScrollSnap;
