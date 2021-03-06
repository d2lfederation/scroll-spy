import 'fastdom/fastdom.js';

var ScrollSpy = {

	__isEnabled: false,

	__isSpying: false,

	__points: [],

	isPointRegistered: function(key) {
		return (this.__getPointInfo(key) ? true : false);
	},

	registerPoint: function(key, node, options) {
		if (!key || !node) {
			return;
		}
		for (var i = 0; i < this.__points.length; i++) {
			if (this.__points[i].key === key) {
				return;
			}
		}
		this.__points.push({
			key: key,
			node: node,
			duration: (options && options.duration !== undefined && options.duration !== null) ? options.duration : 3000,
			onceOnly: (options && options.onceOnly !== undefined && options.onceOnly !== null) ? options.onceOnly : false
		});
		this.__updateSpying();
	},

	reset: function() {
		this.setEnabled(false);
		this.__points = [];
	},

	setEnabled: function(isEnabled) {
		this.__isEnabled = isEnabled;
		this.__updateSpying();
	},

	spy: function() {
		this.__spy();
	},

	unregisterPoint: function(key) {
		if (!key) {
			return;
		}
		for (var i = 0; i < this.__points.length; i++) {
			if (this.__points[i].key === key) {
				this.__points.splice(i, 1);
				this.__updateSpying();
				return;
			}
		}
	},

	__getPointInfo: function(key) {
		for (var i = 0; i < this.__points.length; i++) {
			if (this.__points[i].key === key) {
				return this.__points[i];
			}
		}
		return null;
	},

	__isPassiveSupported: function() {
		var passiveSupported = false;
		try {
			var options = Object.defineProperty({}, 'passive', {
				get: function() {
					passiveSupported = true;
				}
			});
			window.addEventListener('test', null, options);
			/* eslint no-empty:0 */
		} catch (err) {}
		return passiveSupported;
	},

	__isPointBottomVisible: function(node) {
		return new Promise(function(resolve) {
			fastdom.measure(function() {
				var rect = node.getBoundingClientRect();
				resolve(rect.bottom > 0 && rect.bottom < window.innerHeight);
			});
		});
	},

	__spy: function() {

		for (var i = 0; i < this.__points.length; i++) {
			var point = this.__points[i];
			if (point.onceOnly && point.spied) {
				continue;
			}
			this.__spyPoint(point);
		}

	},

	__spyPoint: function(point) {
		this.__isPointBottomVisible(point.node).then(function(isBottomVisible) {
			if (isBottomVisible && !point.visible) {
				this.__spyDelayed(point, true);
			} else if (!isBottomVisible && point.visible) {
				this.__spyDelayed(point, false);
			}
		}.bind(this));
	},

	__spyDelayed: function(point, isVisible) {

		setTimeout(function() {

			// bail if spying stopped during delay
			if (!this.__isSpying) {
				return;
			}

			// bail if no state change
			if (isVisible && point.visible) {
				return;
			} else if (!isVisible && !point.visible) {
				return;
			}

			if (!point.spied) {
				point.spied = true;
				point.node.dispatchEvent(new CustomEvent('d2l-scroll-spy-once', {
					bubbles: true,
					detail: { key: point.key, node: point.node, visible: isVisible }
				}));
				if (point.onceOnly) {
					return;
				}
			}

			this.__isPointBottomVisible(point.node).then(function(isBottomVisible) {

				// bail if prev visible but no longer, or is prev not visible but is now
				if (isBottomVisible !== isVisible) {
					return;
				}

				if (isVisible) {
					point.visible = true;
				} else {
					point.visible = false;
				}

				point.node.dispatchEvent(new CustomEvent('d2l-scroll-spy', {
					bubbles: true,
					detail: { key: point.key, node: point.node, visible: point.visible }
				}));

			});

		}.bind(this), point.duration);

	},

	__startSpying: function() {

		this.__isSpying = true;

		var options = (this.__isPassiveSupported() ? { passive: true } : false);

		window.addEventListener('scroll', this.__spy, options);
		window.addEventListener('resize', this.__spy, options);
		document.addEventListener('touchmove', this.__spy, options);
		document.addEventListener('MSPointerMove', this.__spy, options);

		requestAnimationFrame(this.__spy);

	},

	__stopSpying: function() {

		this.__isSpying = false;

		var options = (this.__isPassiveSupported() ? { passive: true } : false);

		window.removeEventListener('scroll', this.__spy, options);
		window.removeEventListener('resize', this.__spy, options);
		document.removeEventListener('touchmove', this.__spy, options);
		document.removeEventListener('MSPointerMove', this.__spy, options);

	},

	__updateSpying: function() {
		if (this.__isSpying) {
			if (!this.__isEnabled || Object.keys(this.__points).length === 0) {
				this.__stopSpying();
			}
		} else {
			if (this.__isEnabled && Object.keys(this.__points).length > 0) {
				this.__startSpying();
			}
		}
	}

};

ScrollSpy.__spy = ScrollSpy.__spy.bind(ScrollSpy);

window.D2L = window.D2L || {};
window.D2L.ScrollSpy = ScrollSpy;

document.dispatchEvent(new CustomEvent('d2l-scroll-spy-ready', {bubbles: true}));
