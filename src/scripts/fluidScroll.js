window.fluidScroll = {

	_on: null,
	_animating: false,

	_scrollTimer: null,
	_resizeTimer: null,

	_computedOpts: null,
	_computedWindow: null,
	_computedElements: null,

	init(opts = {}) {

		// Check if opts includes all required properties
		if (fluidScroll._valid(opts)===false) return false

		// Disable fluidScroll on mobile devices
		if (opts.detectMobile===true&&fluidScroll._isMobile()===true) return false

		// Save computed options
		fluidScroll._computedOpts = opts

		// Get size of window
		fluidScroll._computedWindow = fluidScroll._getWindowMetrics()

		// Reset computed elements
		fluidScroll._computedElements = []

		// Listen to window-size changes
		window.removeEventListener('resize', fluidScroll._onResize)
		window.addEventListener('resize', fluidScroll._onResize)

		var isBig   = fluidScroll._computedWindow.width >= opts.minWidth && fluidScroll._computedWindow.height >= opts.minHeight,
			isSmall = fluidScroll._computedWindow.width < opts.minWidth || fluidScroll._computedWindow.height < opts.minHeight

		if (isBig===true && (fluidScroll._on===true || fluidScroll._on===null))        fluidScroll._start()
		else if (isSmall===true && (fluidScroll._on===true || fluidScroll._on===null)) fluidScroll._stop()

		return true

	},

	_isMobile() {

		return (/Android|iPhone|iPad|iPod|BlackBerry/i).test(navigator.userAgent || navigator.vendor || window.opera)

	},

	_timing(t, b, c, d) {

		// t = Current frame
		// b = Start-value
		// c = End-value
		// d = Duration

		t /= d
		return -c * t*(t-2) + b

	},

	_valid(opts = {}) {

		if (opts.elements==null) {
			console.error('Elements missing: opts.elements')
			return false
		}

		if (opts.minWidth==null||opts.minWidth<0) {
			console.error('Property missing or not a number: opts.minWidth')
			return false
		}

		if (opts.minHeight==null||opts.minHeight<0) {
			console.error('Property missing or not a number: opts.minHeight')
			return false
		}

		if (opts.detectMobile!==false) opts.detectMobile = true

		if (opts.duration==null||opts.duration<0) opts.duration = 20

		if (opts.timing==null) opts.timing = fluidScroll._timing

		if (opts.keyboard!==false) opts.keyboard = true

		return true

	},

	_getWindowMetrics() {

		return {
			top:    document.body.scrollTop,
			maxTop: document.body.offsetHeight - window.innerHeight,
			bottom: document.body.scrollTop + window.innerHeight,
			width:  window.innerWidth,
			height: window.innerHeight
		}

	},

	_getElementMetrics(elem, windowMetrics, index) {

		if (elem==null) return false

		var obj = {
			index,
			top:    elem.offsetTop,
			bottom: elem.offsetTop + elem.offsetHeight,
			width:  elem.offsetWidth,
			height: elem.offsetHeight,
			dom:    elem
		}

		obj.visiblePercentage = fluidScroll._getElementVisiblePercentage(obj, windowMetrics)

		return obj

	},

	_getElementVisiblePercentage(elementMetrics, windowMetrics) {

		var sP = 0,
			eP = 0,
			vH = 0,
			vP = 0

		// Calculate start-point (sP)
		sP = (windowMetrics.top > elementMetrics.top ? windowMetrics.top : elementMetrics.top)

		// Calculate end-point (eP)
		eP = (windowMetrics.bottom > elementMetrics.bottom ? elementMetrics.bottom : windowMetrics.bottom)

		// Calculate visible height in pixels (vH)
		vH = eP - sP

		// Convert vH from pixels to a percentage value
		// 100 = element completely visible
		// 0 = element not visible at all
		vP = (100 / elementMetrics.height) * vH

		// Normalize output
		if (vH<0) vH = 0
		if (vP<0) vP = 0

		// Return the visible height in percent
		return vP

	},

	_setElementVisible(elementMetrics, windowMetrics) {

		var elem = elementMetrics.dom

		// Remove all active-classes
		for (let i = 0; i < fluidScroll._computedElements.length; ++i) { fluidScroll._computedElements[i].dom.classList.remove('active') }

		// Add active-class to the new element
		elem.classList.add('active')

		var currentFrame   = 0,
			startScrollTop = document.body.scrollTop,
			difference     = startScrollTop - elementMetrics.top,
			duration       = fluidScroll._computedOpts.duration,
			timing         = fluidScroll._computedOpts.timing

		function animation() {

			// Scroll to element
			document.body.scrollTop = startScrollTop - timing(currentFrame, 0, difference, duration)

			// Stop the animation when ...
			// ... all frames have been shown
			// ... scrollTop reached its maximum
			if (currentFrame<duration&&document.body.scrollTop!==windowMetrics.maxTop) {

				// Continue with next frame
				currentFrame++

				// Continue animation
				requestAnimationFrame(animation)

			} else {

				// Animation finished
				fluidScroll._animating = false

			}

		}

		// Start the animation
		animation()

		return true

	},

	_start() {

		console.log('start')

		fluidScroll._on = true

		window.addEventListener('wheel', fluidScroll._onScroll)

		for (let i = 0; i < fluidScroll._computedElements.length; ++i) { fluidScroll._computedElements[i].dom.classList.remove('active') }

		return true

	},

	_stop() {

		console.log('end')

		fluidScroll._on = false

		window.removeEventListener('wheel', fluidScroll._onScroll)

		for (let i = 0; i < fluidScroll._computedElements.length; ++i) { fluidScroll._computedElements[i].dom.classList.add('active') }

		return true

	},

	_onResize() {

		// Reset timeout
		clearTimeout(fluidScroll._resizeTimer)

		// Set new timeout
		fluidScroll._resizeTimer = setTimeout(() => fluidScroll.init(fluidScroll._computedOpts), 200)

	},

	_onScroll(e) {

		if (fluidScroll._animating===true) return false

		// Reset timeout
		clearTimeout(fluidScroll._scrollTimer)

		// Set new timeout
		fluidScroll._scrollTimer = setTimeout(() => fluidScroll._scrollTo(e), 200)

		return true

	},

	_scrollTo(e) {

		fluidScroll._animating = true

		var direction      = 0,
			topElement     = {},
			nextElementNum = null,
			nextElement    = {},
			gravitation    = 9.807

		// Get the direction from the event
		if (e.type==='wheel') direction = e.deltaY

		// Normalize direction
		if (direction>0) direction = 1
		else             direction = -1

		// Update window metrics
		fluidScroll._computedWindow = fluidScroll._getWindowMetrics()

		// Reset computed elements
		fluidScroll._computedElements = []

		// Update the metrics of each element
		for (let i = 0; i < fluidScroll._computedOpts.elements.length; ++i) {

			let element        = fluidScroll._computedOpts.elements[i],
				elementMetrics = fluidScroll._getElementMetrics(element, fluidScroll._computedWindow, i)

			// Save metrics of element
			fluidScroll._computedElements.push(elementMetrics)

			// Get the element which is most visible and save it
			if (topElement.visiblePercentage==null || elementMetrics.visiblePercentage > topElement.visiblePercentage) topElement = elementMetrics

		}

		// Use the velocity to calculate the next element
		nextElementNum = topElement.index + direction

		// Check if next element exists
		if (nextElementNum<0)                                      nextElementNum = 0
		if (nextElementNum>fluidScroll._computedElements.length-1) nextElementNum = fluidScroll._computedElements.length - 1

		// Add velocity to next element
		fluidScroll._computedElements[nextElementNum].visiblePercentage *= gravitation

		// Re-check if there is a new most visible element
		for (let i = 0; i < fluidScroll._computedElements.length; ++i) {

			let elementMetrics = fluidScroll._computedElements[i]

			if (elementMetrics.visiblePercentage>topElement.visiblePercentage) topElement = elementMetrics

		}

		fluidScroll._setElementVisible(topElement, fluidScroll._computedWindow)

		return true

	}

}