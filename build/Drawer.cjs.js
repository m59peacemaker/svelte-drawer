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

var template = (function () {
const isLeadingSide = side => side === 'left' || side === 'top';

const DEFAULTS = {
  percentOpen: 0,
  side: 'left',
  scrim: true,
  zIndexBase: 1
  //push: false // false, element/ref // TODO: push other content over when opening
};
Object.freeze(DEFAULTS);

return {
  setup (Drawer) {
    Drawer.DEFAULTS = DEFAULTS;
  },

  data () {
    return Object.assign({}, DEFAULTS)
  },

  computed: {
    open: percentOpen => percentOpen === 100,
    closed: percentOpen => percentOpen < 1,
    axis: side => side === 'left' || side === 'right' ? 'x' : 'y',
    translate: (percentOpen, side, axis) => {
      const amount = isLeadingSide(side) ? percentOpen - 100 : 100 - percentOpen;
      return axis === 'x' ? { x: amount, y: 0 } : { x: 0, y: amount }
    },
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
      this.set({ opening: true, closing: false });
      return this.setPercentOpen(100, { smooth })
        .then(() => this.set({ opening: false }))
    },

    close ({ smooth = true } = {}) {
      this.set({ closing: true, opening: false });
      this.setPercentOpen(0, { smooth })
        .then(() => this.set({ closing: false }));
    },

    toggle ({ smooth = true } = {}) {
      const shouldClose = this.get('open') || this.get('opening');
      this[shouldClose ? 'close' : 'open']({ smooth });
    }
  }
}
}());

function encapsulateStyles ( node ) {
	setAttribute$1( node, 'svelte-1589842680', '' );
}

function add_css () {
	var style = createElement$1( 'style' );
	style.id = 'svelte-1589842680-style';
	style.textContent = ".svelte-drawer[svelte-1589842680]{position:fixed;display:inline;transform:translate3d(0, 0, 0)}.axis-x[svelte-1589842680]{top:0;bottom:0;height:100%}.axis-y[svelte-1589842680]{left:0;right:0;width:100%}.side-top[svelte-1589842680]{top:0 }.side-right[svelte-1589842680]{right:0 }.side-bottom[svelte-1589842680]{bottom:0 }.side-left[svelte-1589842680]{left:0 }";
	appendNode$1( style, document.head );
}

function create_main_fragment ( state, component ) {
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
			encapsulateStyles( div );
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
	this._state = assign$1( template.data(), options.data );
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

	if ( !document.getElementById( 'svelte-1589842680-style' ) ) add_css();

	if ( !options._root ) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this.slots = {};

	this._fragment = create_main_fragment( this._state, this );

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

assign$1( Drawer.prototype, template.methods, proto$1 );

Drawer.prototype._recompute = function _recompute ( changed, state, oldState, isInitial ) {
	if ( isInitial || changed.percentOpen ) {
		if ( differs$1( ( state.open = template.computed.open( state.percentOpen ) ), oldState.open ) ) changed.open = true;
		if ( differs$1( ( state.closed = template.computed.closed( state.percentOpen ) ), oldState.closed ) ) changed.closed = true;
	}

	if ( isInitial || changed.side ) {
		if ( differs$1( ( state.axis = template.computed.axis( state.side ) ), oldState.axis ) ) changed.axis = true;
	}

	if ( isInitial || changed.percentOpen || changed.side || changed.axis ) {
		if ( differs$1( ( state.translate = template.computed.translate( state.percentOpen, state.side, state.axis ) ), oldState.translate ) ) changed.translate = true;
	}
};

template.setup( Drawer );

module.exports = Drawer;
