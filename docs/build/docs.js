(function () {
'use strict';

function isDate(obj) {
    return Object.prototype.toString.call(obj) === '[object Date]';
}

var scheduler$1 = {
    components: [],
    running: false,
    add: function (component) {
        if (~scheduler$1.components.indexOf(component))
            return;
        scheduler$1.components.push(component);
        if (!scheduler$1.running) {
            scheduler$1.running = true;
            requestAnimationFrame(scheduler$1.next);
        }
    },
    next: function () {
        var hasComponents = false;
        var i = scheduler$1.components.length;
        while (i--) {
            var component = scheduler$1.components[i];
            var data = {};
            var hasSprings = false;
            for (var key in component._springs) {
                var spring_1 = component._springs[key];
                if (spring_1.tick(data)) {
                    hasSprings = true;
                    hasComponents = true;
                }
                else {
                    component._springCallbacks[key]();
                    delete component._springs[key];
                    delete component._springCallbacks[key];
                }
            }
            component._springing = true;
            component.set(data);
            component._springing = false;
            if (!hasSprings)
                scheduler$1.components.splice(i, 1);
        }
        if (hasComponents) {
            requestAnimationFrame(scheduler$1.next);
        }
        else {
            scheduler$1.running = false;
        }
    }
};
function snap$1(key, a, b, options) {
    return {
        key: key,
        tick: function (object) {
            object[key] = b;
            return false;
        },
        update: function (object, options) {
            b = object;
        }
    };
}
function number(key, a, b, options) {
    var velocity = 0;
    var stiffness = options.stiffness, damping = options.damping;
    var valueThreshold = Math.abs(b - a) * 0.001;
    var velocityThreshold = valueThreshold; // TODO is this right?
    return {
        key: key,
        tick: function (object) {
            var d = b - a;
            var spring = stiffness * d;
            var damper = damping * velocity;
            var acceleration = spring - damper;
            velocity += acceleration;
            a += velocity;
            object[key] = a;
            if (velocity < velocityThreshold &&
                Math.abs(b - a) < valueThreshold) {
                object[key] = b;
                return false;
            }
            object[key] = a;
            return true;
        },
        update: function (object, options) {
            checkCompatibility(object, b);
            b = object;
            stiffness = options.stiffness;
            damping = options.damping;
        }
    };
}
function date(key, a, b, options) {
    var dummy = {};
    var subspring = number(key, a.getTime(), b.getTime(), options);
    return {
        key: key,
        tick: function (object) {
            if (!subspring.tick(dummy)) {
                object[key] = b;
                return false;
            }
            object[key] = new Date(dummy[key]);
            return true;
        },
        update: function (object, options) {
            checkCompatibility(object, b);
            subspring.update(object.getTime(), options);
            b = object;
        }
    };
}
function array(key, a, b, options) {
    var value = [];
    var subsprings = [];
    for (var i = 0; i < a.length; i += 1) {
        subsprings.push(getSpring(i, a[i], b[i], options));
    }
    return {
        key: key,
        tick: function (object) {
            var active = false;
            for (var i = 0; i < subsprings.length; i += 1) {
                if (subsprings[i].tick(value))
                    active = true;
            }
            if (!active) {
                object[key] = b;
                return false;
            }
            object[key] = value;
            return true;
        },
        update: function (object, options) {
            checkCompatibility(object, b);
            for (var i = 0; i < object.length; i += 1) {
                subsprings[i].update(object[i], options);
            }
            b = object;
        }
    };
}
function object(key, a, b, options) {
    var value = {};
    var subsprings = [];
    for (var k in a) {
        subsprings.push(getSpring(k, a[k], b[k], options));
    }
    return {
        key: key,
        tick: function (object) {
            var active = false;
            for (var i = 0; i < subsprings.length; i += 1) {
                if (subsprings[i].tick(value))
                    active = true;
            }
            if (!active) {
                object[key] = b;
                return false;
            }
            object[key] = value;
            return true;
        },
        update: function (object, options) {
            checkCompatibility(object, b);
            for (var i = 0; i < subsprings.length; i += 1) {
                subsprings[i].update(object[subsprings[i].key], options);
            }
            b = object;
        }
    };
}
function checkCompatibility(a, b) {
    var type = typeof a;
    if (type !== typeof b || Array.isArray(a) !== Array.isArray(b) || isDate(a) !== isDate(b)) {
        throw new Error('Cannot interpolate values of different type');
    }
    if (type === 'object') {
        if (!a || !b)
            throw new Error('Object cannot be null');
        if (Array.isArray(a)) {
            if (a.length !== b.length) {
                throw new Error('Cannot interpolate arrays of different length');
            }
        }
        else {
            if (!keysMatch(a, b))
                throw new Error('Cannot interpolate differently-shaped objects');
        }
    }
    else if (type !== 'number') {
        throw new Error("Cannot interpolate " + type + " values");
    }
}
function getSpring(key, a, b, options) {
    if (a === b || a !== a)
        return snap$1(key, a, b, options);
    checkCompatibility(a, b);
    if (typeof a === 'object') {
        if (Array.isArray(a)) {
            return array(key, a, b, options);
        }
        if (isDate(a)) {
            return date(key, a, b, options);
        }
        return object(key, a, b, options);
    }
    return number(key, a, b, options);
}
function spring(key, to, options) {
    var _this = this;
    if (!this._springs) {
        this._springs = Object.create(null);
        this._springCallbacks = Object.create(null);
        this._springing = false;
        var set_1 = this.set;
        this.set = function (data) {
            if (!_this._springing) {
                for (var key_1 in data) {
                    delete _this._springs[key_1];
                }
            }
            set_1.call(_this, data);
        };
    }
    if (this._springs[key]) {
        this._springs[key].update(to, options);
    }
    else {
        var spring_2 = getSpring(key, this.get(key), to, options);
        this._springs[key] = spring_2;
    }
    var promise = new Promise(function (fulfil) {
        _this._springCallbacks[key] = fulfil;
    });
    scheduler$1.add(this);
    return promise;
}
function keysMatch(a, b) {
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length)
        return false;
    for (var i = 0; i < aKeys.length; i += 1) {
        if (!(aKeys[i] in b))
            return false;
    }
    return true;
}

function noop() {}

function assign(target) {
	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) target[k] = source[k];
	}

	return target;
}

function appendNode(node, target) {
	target.appendChild(node);
}

function insertNode(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode(node) {
	node.parentNode.removeChild(node);
}

function createElement(name) {
	return document.createElement(name);
}

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function setStyle(node, key, value) {
	node.style.setProperty(key, value);
}

function destroy(detach) {
	this.destroy = noop;
	this.fire('destroy');
	this.set = this.get = noop;

	if (detach !== false) this._fragment.unmount();
	this._fragment.destroy();
	this._fragment = this._state = null;
}

function differs(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function get(key) {
	return key ? this._state[key] : this._state;
}

function fire(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function observe(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function on(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set(newState) {
	this._set(assign({}, newState));
	if (this._root._lock) return;
	this._root._lock = true;
	callAll(this._root._beforecreate);
	callAll(this._root._oncreate);
	callAll(this._root._aftercreate);
	this._root._lock = false;
}

function _set(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (differs(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign({}, oldState, newState);
	this._recompute(changed, this._state, oldState, false);
	if (this._bind) this._bind(changed, this._state);
	dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
	this._fragment.update(changed, this._state);
	dispatchObservers(this, this._observers.post, changed, this._state, oldState);
}

function callAll(fns) {
	while (fns && fns.length) fns.pop()();
}

function _mount(target, anchor) {
	this._fragment.mount(target, anchor);
}

function _unmount() {
	this._fragment.unmount();
}

var proto = {
	destroy: destroy,
	get: get,
	fire: fire,
	observe: observe,
	on: on,
	set: set,
	teardown: destroy,
	_recompute: noop,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount
};

var template$1 = (function() {
const DEFAULTS = {
  opacity: 0.3,
  background: '#000000'
};
Object.freeze(DEFAULTS);

return {
  setup (Scrim) {
    Scrim.DEFAULTS = DEFAULTS;
  },

  data () {
    return Object.assign({}, DEFAULTS)
  }
}
}());

function encapsulateStyles$1(node) {
	setAttribute(node, "svelte-1216306015", "");
}

function add_css$1() {
	var style = createElement("style");
	style.id = 'svelte-1216306015-style';
	style.textContent = ".svelte-scrim[svelte-1216306015]{position:fixed;top:0;right:0;left:0;height:100vh;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}";
	appendNode(style, document.head);
}

function create_main_fragment$1(state, component) {
	var div;

	return {
		create: function() {
			div = createElement("div");
			this.hydrate();
		},

		hydrate: function(nodes) {
			encapsulateStyles$1(div);
			div.className = "svelte-scrim";
			setStyle(div, "opacity", state.opacity);
			setStyle(div, "background", state.background);
		},

		mount: function(target, anchor) {
			insertNode(div, target, anchor);
		},

		update: function(changed, state) {
			if ( changed.opacity ) {
				setStyle(div, "opacity", state.opacity);
			}

			if ( changed.background ) {
				setStyle(div, "background", state.background);
			}
		},

		unmount: function() {
			detachNode(div);
		},

		destroy: noop
	};
}

function Scrim(options) {
	this.options = options;
	this._state = assign(template$1.data(), options.data);

	this._observers = {
		pre: Object.create(null),
		post: Object.create(null)
	};

	this._handlers = Object.create(null);

	this._root = options._root || this;
	this._yield = options._yield;
	this._bind = options._bind;

	if (!document.getElementById("svelte-1216306015-style")) add_css$1();

	this._fragment = create_main_fragment$1(this._state, this);

	if (options.target) {
		this._fragment.create();
		this._fragment.mount(options.target, options.anchor || null);
	}
}

assign(Scrim.prototype, proto );

template$1.setup(Scrim);

var justClamp$1 = clamp;

/*
  var n = 5;
  clamp(1, n, 12); // 5
  clamp(1, n, 3); // 3
  clamp(8, n, 9); // 8
  clamp(0, n, 0); // 0
  n = undefined;
  clamp(3, n, 8); // 3
  n = null;
  clamp(3, n, 8); // 3
  n = NaN;
  clamp(3, n, 8); // 3
*/

function clamp(lower, n, higher) {
  if (!Number(n)) {
    n = 0;
  }
  if (n < lower) {
    return lower;
  }
  if (n > higher) {
    return higher;
  }
  return n;
}

function noop$1() {}

function assign$1(target) {
	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) target[k] = source[k];
	}

	return target;
}

function appendNode$1(node, target) {
	target.appendChild(node);
}

function insertNode$1(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode$1(node) {
	node.parentNode.removeChild(node);
}

function reinsertBetween(before, after, target) {
	while (before.nextSibling && before.nextSibling !== after) {
		target.appendChild(before.parentNode.removeChild(before.nextSibling));
	}
}

function createElement$1(name) {
	return document.createElement(name);
}

function createText(data) {
	return document.createTextNode(data);
}

function createComment() {
	return document.createComment('');
}

function addListener(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute$1(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function destroy$1(detach) {
	this.destroy = this.set = this.get = noop$1;
	this.fire('destroy');

	if (detach !== false) this._fragment.unmount();
	this._fragment.destroy();
	this._fragment = this._state = null;
}

function differs$1(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers$1(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function get$1(key) {
	return key ? this._state[key] : this._state;
}

function fire$1(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function observe$1(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function on$1(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set$1(newState) {
	this._set(assign$1({}, newState));
	if (this._root._lock) return;
	this._root._lock = true;
	callAll$1(this._root._beforecreate);
	callAll$1(this._root._oncreate);
	callAll$1(this._root._aftercreate);
	this._root._lock = false;
}

function _set$1(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (differs$1(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign$1({}, oldState, newState);
	this._recompute(changed, this._state, oldState, false);
	if (this._bind) this._bind(changed, this._state);
	dispatchObservers$1(this, this._observers.pre, changed, this._state, oldState);
	this._fragment.update(changed, this._state);
	dispatchObservers$1(this, this._observers.post, changed, this._state, oldState);
}

function callAll$1(fns) {
	while (fns && fns.length) fns.pop()();
}

var proto$1 = {
	destroy: destroy$1,
	get: get$1,
	fire: fire$1,
	observe: observe$1,
	on: on$1,
	set: set$1,
	teardown: destroy$1,
	_recompute: noop$1,
	_set: _set$1
};

var template$1$1 = (function () {
const isLeadingSide = side => side === 'left' || side === 'top';

const DEFAULTS = {
  percentOpen: 0,
  side: 'left',
  scrim: true,
  zIndexBase: 1
  //push: false // false, element/ref // TODO: push other content over when opening
};
const FIRES = {
  open: 'open',
  opening: 'opening',
  closing: 'closing',
  closed: 'closed'
};[ DEFAULTS, FIRES ].forEach(Object.freeze);

return {
  setup (Drawer) {
    Object.assign(Drawer, { DEFAULTS, FIRES });
  },

  data () {
    return Object.assign({}, DEFAULTS)
  },

  computed: {
    open: percentOpen => percentOpen === 100,
    closed: percentOpen => percentOpen < 1,
    transitioning: (open, closed) => !open && !closed,
    opening: (transitioning, percentOpen, previousPercentOpen) =>
      transitioning && (percentOpen > previousPercentOpen),
    closing: (transitioning, closed, percentOpen, previousPercentOpen) =>
      transitioning && (percentOpen < previousPercentOpen),
    axis: side => side === 'left' || side === 'right' ? 'x' : 'y',
    translate: (percentOpen, side, axis) => {
      const amount = isLeadingSide(side) ? percentOpen - 100 : 100 - percentOpen;
      return axis === 'x' ? { x: amount, y: 0 } : { x: 0, y: amount }
    }
  },

  oncreate () {
    this.observe('percentOpen', (percentOpen, previousPercentOpen) => {
      this.set({ previousPercentOpen });
    });

    // watch data and fire corresponding events
    Object.keys(FIRES)
      .forEach(property => this.observe(property, v => v && this.fire(property)));
  },

  methods: {
    spring,

    setPercentOpen (percent, { smooth = true } = {}) {
      const percentOpen = justClamp$1(0, percent, 100);
      return smooth
        ? this.spring('percentOpen', percentOpen, { stiffness: 0.2, damping: 0.9 })
        : Promise.resolve(this.set({ percentOpen }))
    },

    open ({ smooth = true } = {}) {
      return this.setPercentOpen(100, { smooth })
    },

    close ({ smooth = true } = {}) {
      return this.setPercentOpen(0, { smooth })
    },

    toggle ({ smooth = true } = {}) {
      const shouldClose = this.get('open') || this.get('opening');
      const method = shouldClose ? 'close' : 'open';
      return this[method]({ smooth })
    }
  }
}
}());

function encapsulateStyles$1$1 ( node ) {
	setAttribute$1( node, 'svelte-604543570', '' );
}

function add_css$1$1 () {
	var style = createElement$1( 'style' );
	style.id = 'svelte-604543570-style';
	style.textContent = ".svelte-drawer[svelte-604543570]{position:fixed;display:inline;transform:translate3d(0, 0, 0)}.axis-x[svelte-604543570]{top:0;bottom:0;height:100%}.axis-y[svelte-604543570]{left:0;right:0;width:100%}.side-top[svelte-604543570]{top:0 }.side-right[svelte-604543570]{right:0 }.side-bottom[svelte-604543570]{bottom:0 }.side-left[svelte-604543570]{left:0 }";
	appendNode$1( style, document.head );
}

function create_main_fragment$1$1 ( state, component ) {
	var div, div_class_value, div_style_value, slot_content_default = component._slotted.default, slot_content_default_before, slot_content_default_after, text_1, if_block_anchor;

	var if_block = (state.scrim && !state.closed && !state.closing) && create_if_block( state, component );

	return {
		create: function () {
			div = createElement$1( 'div' );
			text_1 = createText( "\n\n" );
			if ( if_block ) if_block.create();
			if_block_anchor = createComment();
			this.hydrate();
		},

		hydrate: function ( nodes ) {
			encapsulateStyles$1$1( div );
			div.className = div_class_value = "\n    svelte-drawer\n    side-" + ( state.side ) + "\n    axis-" + ( state.axis ) + "\n  ";
			setAttribute$1( div, 'data-open', state.open );
			setAttribute$1( div, 'data-opening', state.opening );
			setAttribute$1( div, 'data-closing', state.closing );
			setAttribute$1( div, 'data-closed', state.closed );
			div.style.cssText = div_style_value = "\n    transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);\n    z-index: " + ( state.zIndexBase + 1 ) + ";\n  ";
		},

		mount: function ( target, anchor ) {
			insertNode$1( div, target, anchor );

			if (slot_content_default) {
				appendNode$1(slot_content_default_before || (slot_content_default_before = createComment()), div);
				appendNode$1(slot_content_default, div);
				appendNode$1(slot_content_default_after || (slot_content_default_after = createComment()), div);
			}

			insertNode$1( text_1, target, anchor );
			if ( if_block ) if_block.mount( target, anchor );
			insertNode$1( if_block_anchor, target, anchor );
		},

		update: function ( changed, state ) {
			if ( ( changed.side || changed.axis ) && div_class_value !== ( div_class_value = "\n    svelte-drawer\n    side-" + ( state.side ) + "\n    axis-" + ( state.axis ) + "\n  " ) ) {
				div.className = div_class_value;
			}

			if ( changed.open ) {
				setAttribute$1( div, 'data-open', state.open );
			}

			if ( changed.opening ) {
				setAttribute$1( div, 'data-opening', state.opening );
			}

			if ( changed.closing ) {
				setAttribute$1( div, 'data-closing', state.closing );
			}

			if ( changed.closed ) {
				setAttribute$1( div, 'data-closed', state.closed );
			}

			if ( ( changed.translate || changed.zIndexBase ) && div_style_value !== ( div_style_value = "\n    transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);\n    z-index: " + ( state.zIndexBase + 1 ) + ";\n  " ) ) {
				div.style.cssText = div_style_value;
			}

			if ( state.scrim && !state.closed && !state.closing ) {
				if ( if_block ) {
					if_block.update( changed, state );
				} else {
					if_block = create_if_block( state, component );
					if_block.create();
					if_block.mount( if_block_anchor.parentNode, if_block_anchor );
				}
			} else if ( if_block ) {
				if_block.unmount();
				if_block.destroy();
				if_block = null;
			}
		},

		unmount: function () {
			detachNode$1( div );

			if (slot_content_default) {
				reinsertBetween(slot_content_default_before, slot_content_default_after, slot_content_default);
				detachNode$1(slot_content_default_before);
				detachNode$1(slot_content_default_after);
			}

			detachNode$1( text_1 );
			if ( if_block ) if_block.unmount();
			detachNode$1( if_block_anchor );
		},

		destroy: function () {
			if ( if_block ) if_block.destroy();
		}
	};
}

function create_if_block ( state, component ) {
	var div, div_style_value, slot_content_scrim = component._slotted.scrim, slot_content_scrim_before, slot_content_scrim_after;

	function click_handler ( event ) {
		component.close();
	}

	var scrim = new Scrim({
		_root: component._root
	});

	return {
		create: function () {
			div = createElement$1( 'div' );
			if (!slot_content_scrim) {
				scrim._fragment.create();
			}
			this.hydrate();
		},

		hydrate: function ( nodes ) {
			div.style.cssText = div_style_value = "z-index: " + ( state.zIndexBase ) + ";";
			addListener( div, 'click', click_handler );
		},

		mount: function ( target, anchor ) {
			insertNode$1( div, target, anchor );
			if (!slot_content_scrim) {
				scrim._fragment.mount( div, null );
			}

			if (slot_content_scrim) {
				appendNode$1(slot_content_scrim_before || (slot_content_scrim_before = createComment()), div);
				appendNode$1(slot_content_scrim, div);
				appendNode$1(slot_content_scrim_after || (slot_content_scrim_after = createComment()), div);
			}
		},

		update: function ( changed, state ) {
			if ( ( changed.zIndexBase ) && div_style_value !== ( div_style_value = "z-index: " + ( state.zIndexBase ) + ";" ) ) {
				div.style.cssText = div_style_value;
			}
		},

		unmount: function () {
			detachNode$1( div );

			if (slot_content_scrim) {
				reinsertBetween(slot_content_scrim_before, slot_content_scrim_after, slot_content_scrim);
				detachNode$1(slot_content_scrim_before);
				detachNode$1(slot_content_scrim_after);
			}
		},

		destroy: function () {
			removeListener( div, 'click', click_handler );
			if (!slot_content_scrim) {
				scrim.destroy( false );
			}
		}
	};
}

function Drawer ( options ) {
	this.options = options;
	this._state = assign$1( template$1$1.data(), options.data );
	this._recompute( {}, this._state, {}, true );

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );

	this._root = options._root || this;
	this._yield = options._yield;
	this._bind = options._bind;
	this._slotted = options.slots || {};

	if ( !document.getElementById( 'svelte-604543570-style' ) ) add_css$1$1();

	var oncreate = template$1$1.oncreate.bind( this );

	if ( !options._root ) {
		this._oncreate = [oncreate];
		this._beforecreate = [];
		this._aftercreate = [];
	} else {
	 	this._root._oncreate.push(oncreate);
	 }

	this.slots = {};

	this._fragment = create_main_fragment$1$1( this._state, this );

	if ( options.target ) {
		this._fragment.create();
		this._fragment.mount( options.target, options.anchor || null );
	}

	if ( !options._root ) {
		this._lock = true;
		callAll$1(this._beforecreate);
		callAll$1(this._oncreate);
		callAll$1(this._aftercreate);
		this._lock = false;
	}
}

assign$1( Drawer.prototype, template$1$1.methods, proto$1 );

Drawer.prototype._recompute = function _recompute ( changed, state, oldState, isInitial ) {
	if ( isInitial || changed.percentOpen ) {
		if ( differs$1( ( state.open = template$1$1.computed.open( state.percentOpen ) ), oldState.open ) ) changed.open = true;
		if ( differs$1( ( state.closed = template$1$1.computed.closed( state.percentOpen ) ), oldState.closed ) ) changed.closed = true;
	}

	if ( isInitial || changed.open || changed.closed ) {
		if ( differs$1( ( state.transitioning = template$1$1.computed.transitioning( state.open, state.closed ) ), oldState.transitioning ) ) changed.transitioning = true;
	}

	if ( isInitial || changed.transitioning || changed.percentOpen || changed.previousPercentOpen ) {
		if ( differs$1( ( state.opening = template$1$1.computed.opening( state.transitioning, state.percentOpen, state.previousPercentOpen ) ), oldState.opening ) ) changed.opening = true;
	}

	if ( isInitial || changed.transitioning || changed.closed || changed.percentOpen || changed.previousPercentOpen ) {
		if ( differs$1( ( state.closing = template$1$1.computed.closing( state.transitioning, state.closed, state.percentOpen, state.previousPercentOpen ) ), oldState.closing ) ) changed.closing = true;
	}

	if ( isInitial || changed.side ) {
		if ( differs$1( ( state.axis = template$1$1.computed.axis( state.side ) ), oldState.axis ) ) changed.axis = true;
	}

	if ( isInitial || changed.percentOpen || changed.side || changed.axis ) {
		if ( differs$1( ( state.translate = template$1$1.computed.translate( state.percentOpen, state.side, state.axis ) ), oldState.translate ) ) changed.translate = true;
	}
};

template$1$1.setup( Drawer );

const OppositeCalculator = (...opposites) => {
  const map = opposites.reduce((map, [ a, b ]) => {
    map[a] = b;
    map[b] = a;
    return map
  }, {});
  return value => map[value]
};

function noop$1$1() {}

function assign$1$1(target) {
	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) target[k] = source[k];
	}

	return target;
}

function appendNode$1$1(node, target) {
	target.appendChild(node);
}

function insertNode$1$1(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode$1$1(node) {
	node.parentNode.removeChild(node);
}

function createFragment() {
	return document.createDocumentFragment();
}

function createElement$1$1(name) {
	return document.createElement(name);
}

function createText$1(data) {
	return document.createTextNode(data);
}

function addListener$1(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener$1(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute$1$1(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function destroy$1$1(detach) {
	this.destroy = this.set = this.get = noop$1$1;
	this.fire('destroy');

	if (detach !== false) this._fragment.unmount();
	this._fragment.destroy();
	this._fragment = this._state = null;
}

function differs$1$1(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers$1$1(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function get$1$1(key) {
	return key ? this._state[key] : this._state;
}

function fire$1$1(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function observe$1$1(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function on$1$1(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set$1$1(newState) {
	this._set(assign$1$1({}, newState));
	if (this._root._lock) return;
	this._root._lock = true;
	callAll$1$1(this._root._beforecreate);
	callAll$1$1(this._root._oncreate);
	callAll$1$1(this._root._aftercreate);
	this._root._lock = false;
}

function _set$1$1(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (differs$1$1(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign$1$1({}, oldState, newState);
	this._recompute(changed, this._state, oldState, false);
	if (this._bind) this._bind(changed, this._state);
	dispatchObservers$1$1(this, this._observers.pre, changed, this._state, oldState);
	this._fragment.update(changed, this._state);
	dispatchObservers$1$1(this, this._observers.post, changed, this._state, oldState);
}

function callAll$1$1(fns) {
	while (fns && fns.length) fns.pop()();
}

var proto$1$1 = {
	destroy: destroy$1$1,
	get: get$1$1,
	fire: fire$1$1,
	observe: observe$1$1,
	on: on$1$1,
	set: set$1$1,
	teardown: destroy$1$1,
	_recompute: noop$1$1,
	_set: _set$1$1
};

var template = (function () {
const getOppositeSide = OppositeCalculator([ 'left', 'right' ], [ 'top', 'bottom' ]);
const sideToArrowMap = { top: 'up', bottom: 'down' };

return {
  data () {
    return {
      drawer: Object.assign({}, Drawer.DEFAULTS)
    }
  },

  computed: {
    arrow: (drawer) => {
      const side = (drawer.closing || drawer.closed) ? getOppositeSide(drawer.side) : drawer.side;
      return sideToArrowMap[side] || side
    }
  }
}
}());

function encapsulateStyles ( node ) {
	setAttribute$1$1( node, 'svelte-2558650438', '' );
}

function add_css () {
	var style = createElement$1$1( 'style' );
	style.id = 'svelte-2558650438-style';
	style.textContent = ".drawer-toggle[svelte-2558650438]{position:absolute;transition:none}.axis-x .drawer-toggle{top:50%;transform:translateY(-50%)}.axis-y .drawer-toggle{left:50%;transform:translateX(-50%)}.side-left .drawer-toggle{left:100%}.side-right .drawer-toggle{right:100%}.side-top .drawer-toggle{top:100%}.side-bottom .drawer-toggle{bottom:100%}.drawer-content[svelte-2558650438]{background:white;overflow:auto;padding:20px;box-sizing:border-box}.axis-x .drawer-content{height:100%;width:275px}.axis-y .drawer-content{height:275px;width:100%}";
	appendNode$1$1( style, document.head );
}

function create_main_fragment ( state, component ) {
	var h1, text, text_1, fieldset, legend, text_2, text_3, ul, li, label, input, input_updating = false, text_4, li_1, label_1, input_1, input_1_updating = false, text_6, li_2, label_2, input_2, input_2_updating = false, text_8, li_3, label_3, input_3, input_3_updating = false, text_10, text_13, button, i, i_class_value, text_15, div, h3, text_16, drawer_updating = {};

	function input_change_handler () {
		input_updating = true;
		if ( !input.checked ) return;
		var state = component.get();
		state.drawer.side = input.__value;
		component.set({ drawer: state.drawer });
		input_updating = false;
	}

	function input_1_change_handler () {
		input_1_updating = true;
		if ( !input_1.checked ) return;
		var state = component.get();
		state.drawer.side = input_1.__value;
		component.set({ drawer: state.drawer });
		input_1_updating = false;
	}

	function input_2_change_handler () {
		input_2_updating = true;
		if ( !input_2.checked ) return;
		var state = component.get();
		state.drawer.side = input_2.__value;
		component.set({ drawer: state.drawer });
		input_2_updating = false;
	}

	function input_3_change_handler () {
		input_3_updating = true;
		if ( !input_3.checked ) return;
		var state = component.get();
		state.drawer.side = input_3.__value;
		component.set({ drawer: state.drawer });
		input_3_updating = false;
	}

	function click_handler ( event ) {
		component.refs.drawer.toggle();
	}

	var drawer_initial_data = { side: state.drawer.side };
	if ( 'open' in state.drawer ) {
		drawer_initial_data.open = state.drawer.open;
		drawer_updating.open = true;
	}
	if ( 'closing' in state.drawer ) {
		drawer_initial_data.closing = state.drawer.closing;
		drawer_updating.closing = true;
	}
	if ( 'closed' in state.drawer ) {
		drawer_initial_data.closed = state.drawer.closed;
		drawer_updating.closed = true;
	}
	var drawer = new Drawer({
		_root: component._root,
		slots: { default: createFragment() },
		data: drawer_initial_data,
		_bind: function(changed, childState) {
			var state = component.get(), newState = {};
			if ( !drawer_updating.open && changed.open ) {
				state.drawer.open = childState.open;
				newState.drawer = state.drawer;
			}

			if ( !drawer_updating.closing && changed.closing ) {
				state.drawer.closing = childState.closing;
				newState.drawer = state.drawer;
			}

			if ( !drawer_updating.closed && changed.closed ) {
				state.drawer.closed = childState.closed;
				newState.drawer = state.drawer;
			}
			drawer_updating = changed;
			component._set(newState);
			drawer_updating = {};
		}
	});

	component._root._beforecreate.push(function () {
		var state = component.get(), childState = drawer.get(), newState = {};
		if (!childState) return;
		if ( !drawer_updating.open ) {
			state.drawer.open = childState.open;
			newState.drawer = state.drawer;
		}

		if ( !drawer_updating.closing ) {
			state.drawer.closing = childState.closing;
			newState.drawer = state.drawer;
		}

		if ( !drawer_updating.closed ) {
			state.drawer.closed = childState.closed;
			newState.drawer = state.drawer;
		}
		drawer_updating = { open: true, closing: true, closed: true };
		component._set(newState);
		drawer_updating = {};
	});

	component.refs.drawer = drawer;

	return {
		create: function () {
			h1 = createElement$1$1( 'h1' );
			text = createText$1( "svelte-drawer" );
			text_1 = createText$1( "\n\n" );
			fieldset = createElement$1$1( 'fieldset' );
			legend = createElement$1$1( 'legend' );
			text_2 = createText$1( "Side" );
			text_3 = createText$1( "\n  " );
			ul = createElement$1$1( 'ul' );
			li = createElement$1$1( 'li' );
			label = createElement$1$1( 'label' );
			input = createElement$1$1( 'input' );
			text_4 = createText$1( "\n        left" );
			li_1 = createElement$1$1( 'li' );
			label_1 = createElement$1$1( 'label' );
			input_1 = createElement$1$1( 'input' );
			text_6 = createText$1( "\n        right" );
			li_2 = createElement$1$1( 'li' );
			label_2 = createElement$1$1( 'label' );
			input_2 = createElement$1$1( 'input' );
			text_8 = createText$1( "\n        top" );
			li_3 = createElement$1$1( 'li' );
			label_3 = createElement$1$1( 'label' );
			input_3 = createElement$1$1( 'input' );
			text_10 = createText$1( "\n        bottom" );
			text_13 = createText$1( "\n\n" );
			button = createElement$1$1( 'button' );
			i = createElement$1$1( 'i' );
			text_15 = createText$1( "\n\n  " );
			div = createElement$1$1( 'div' );
			h3 = createElement$1$1( 'h3' );
			text_16 = createText$1( "Drawer Content" );
			drawer._fragment.create();
			this.hydrate();
		},

		hydrate: function ( nodes ) {
			fieldset.className = "drawer-side";
			input.type = "radio";
			input.name = "drawer-side";
			input.__value = "left";
			input.value = input.__value;
			component._bindingGroups[0].push( input );
			addListener$1( input, 'change', input_change_handler );
			input_1.type = "radio";
			input_1.name = "drawer-side";
			input_1.__value = "right";
			input_1.value = input_1.__value;
			component._bindingGroups[0].push( input_1 );
			addListener$1( input_1, 'change', input_1_change_handler );
			input_2.type = "radio";
			input_2.name = "drawer-side";
			input_2.__value = "top";
			input_2.value = input_2.__value;
			component._bindingGroups[0].push( input_2 );
			addListener$1( input_2, 'change', input_2_change_handler );
			input_3.type = "radio";
			input_3.name = "drawer-side";
			input_3.__value = "bottom";
			input_3.value = input_3.__value;
			component._bindingGroups[0].push( input_3 );
			addListener$1( input_3, 'change', input_3_change_handler );
			encapsulateStyles( button );
			button.className = "drawer-toggle btn btn-default";
			addListener$1( button, 'click', click_handler );
			encapsulateStyles( i );
			i.className = i_class_value = "fa fa-chevron-" + ( state.arrow );
			encapsulateStyles( div );
			div.className = "drawer-content";
		},

		mount: function ( target, anchor ) {
			insertNode$1$1( h1, target, anchor );
			appendNode$1$1( text, h1 );
			insertNode$1$1( text_1, target, anchor );
			insertNode$1$1( fieldset, target, anchor );
			appendNode$1$1( legend, fieldset );
			appendNode$1$1( text_2, legend );
			appendNode$1$1( text_3, fieldset );
			appendNode$1$1( ul, fieldset );
			appendNode$1$1( li, ul );
			appendNode$1$1( label, li );
			appendNode$1$1( input, label );

			input.checked = input.__value === state.drawer.side;

			appendNode$1$1( text_4, label );
			appendNode$1$1( li_1, ul );
			appendNode$1$1( label_1, li_1 );
			appendNode$1$1( input_1, label_1 );

			input_1.checked = input_1.__value === state.drawer.side;

			appendNode$1$1( text_6, label_1 );
			appendNode$1$1( li_2, ul );
			appendNode$1$1( label_2, li_2 );
			appendNode$1$1( input_2, label_2 );

			input_2.checked = input_2.__value === state.drawer.side;

			appendNode$1$1( text_8, label_2 );
			appendNode$1$1( li_3, ul );
			appendNode$1$1( label_3, li_3 );
			appendNode$1$1( input_3, label_3 );

			input_3.checked = input_3.__value === state.drawer.side;

			appendNode$1$1( text_10, label_3 );
			insertNode$1$1( text_13, target, anchor );
			appendNode$1$1( button, drawer._slotted.default );
			appendNode$1$1( i, button );
			appendNode$1$1( text_15, drawer._slotted.default );
			appendNode$1$1( div, drawer._slotted.default );
			appendNode$1$1( h3, div );
			appendNode$1$1( text_16, h3 );
			drawer._fragment.mount( target, anchor );
		},

		update: function ( changed, state ) {
			if ( !input_updating ) {
				input.checked = input.__value === state.drawer.side;
			}

			if ( !input_1_updating ) {
				input_1.checked = input_1.__value === state.drawer.side;
			}

			if ( !input_2_updating ) {
				input_2.checked = input_2.__value === state.drawer.side;
			}

			if ( !input_3_updating ) {
				input_3.checked = input_3.__value === state.drawer.side;
			}

			if ( ( changed.arrow ) && i_class_value !== ( i_class_value = "fa fa-chevron-" + ( state.arrow ) ) ) {
				i.className = i_class_value;
			}

			var drawer_changes = {};
			if ( changed.drawer ) drawer_changes.side = state.drawer.side;
			if ( !drawer_updating.open && changed.drawer ) {
				drawer_changes.open = state.drawer.open;
				drawer_updating.open = true;
			}
			if ( !drawer_updating.closing && changed.drawer ) {
				drawer_changes.closing = state.drawer.closing;
				drawer_updating.closing = true;
			}
			if ( !drawer_updating.closed && changed.drawer ) {
				drawer_changes.closed = state.drawer.closed;
				drawer_updating.closed = true;
			}
			drawer._set( drawer_changes );
			drawer_updating = {};

			
		},

		unmount: function () {
			detachNode$1$1( h1 );
			detachNode$1$1( text_1 );
			detachNode$1$1( fieldset );
			detachNode$1$1( text_13 );
			drawer._fragment.unmount();
		},

		destroy: function () {
			component._bindingGroups[0].splice( component._bindingGroups[0].indexOf( input ), 1 );

			removeListener$1( input, 'change', input_change_handler );

			component._bindingGroups[0].splice( component._bindingGroups[0].indexOf( input_1 ), 1 );

			removeListener$1( input_1, 'change', input_1_change_handler );

			component._bindingGroups[0].splice( component._bindingGroups[0].indexOf( input_2 ), 1 );

			removeListener$1( input_2, 'change', input_2_change_handler );

			component._bindingGroups[0].splice( component._bindingGroups[0].indexOf( input_3 ), 1 );

			removeListener$1( input_3, 'change', input_3_change_handler );
			removeListener$1( button, 'click', click_handler );
			drawer.destroy( false );
			if ( component.refs.drawer === drawer ) component.refs.drawer = null;
		}
	};
}

function Demo ( options ) {
	this.options = options;
	this.refs = {};
	this._state = assign$1$1( template.data(), options.data );
	this._recompute( {}, this._state, {}, true );
	this._bindingGroups = [ [] ];

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );

	this._root = options._root || this;
	this._yield = options._yield;
	this._bind = options._bind;

	if ( !document.getElementById( 'svelte-2558650438-style' ) ) add_css();

	if ( !options._root ) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment( this._state, this );

	if ( options.target ) {
		this._fragment.create();
		this._fragment.mount( options.target, options.anchor || null );
	}

	if ( !options._root ) {
		this._lock = true;
		callAll$1$1(this._beforecreate);
		callAll$1$1(this._oncreate);
		callAll$1$1(this._aftercreate);
		this._lock = false;
	}
}

assign$1$1( Demo.prototype, proto$1$1 );

Demo.prototype._recompute = function _recompute ( changed, state, oldState, isInitial ) {
	if ( isInitial || changed.drawer ) {
		if ( differs$1$1( ( state.arrow = template.computed.arrow( state.drawer ) ), oldState.arrow ) ) changed.arrow = true;
	}
};

window.app = new Demo({ target: document.getElementById('app') });

}());
