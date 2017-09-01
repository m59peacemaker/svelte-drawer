'use strict';

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

function reinsertBetween(before, after, target) {
	while (before.nextSibling && before.nextSibling !== after) {
		target.appendChild(before.parentNode.removeChild(before.nextSibling));
	}
}

function createElement(name) {
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

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function destroy(detach) {
	this.destroy = this.set = this.get = noop;
	this.fire('destroy');

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

var proto = {
	destroy: destroy,
	get: get,
	fire: fire,
	observe: observe,
	on: on,
	set: set,
	teardown: destroy,
	_recompute: noop,
	_set: _set
};

var template = (function () {
const clamp = (min, max, n) => Math.max(min, Math.min(max, n));
const isLeadingSide = side => side === 'left' || side === 'top';

return {
  data () {
    return {
      side: 'left',
      open: false, // true, false, 0 - 100 (percent)
      smooth: true,
      scrim: true,
      zIndexBase: 1
      //push: false // false, element/ref // TODO: push other content over when opening
    }
  },

  computed: {
    percentOpen: open => !open ? 0 : (open === true ? 100 : clamp(0, 100, open)),
    isOpen: percentOpen => percentOpen === 100,
    axis: side => side === 'left' || side === 'right' ? 'x' : 'y',
    translate: (percentOpen, side, axis) => {
      const amount = isLeadingSide(side) ? percentOpen - 100 : 100 - percentOpen;
      return axis === 'x' ? { x: amount, y: 0 } : { x: 0, y: amount }
    },
    shouldTransition: (smooth, temporarySmooth) =>
      temporarySmooth !== undefined ? temporarySmooth : smooth
  },

  methods: {
    toggle: function ({ smooth = true } = {}) {
      const open = !this.get('isOpen');
      this.set({ open, temporarySmooth: smooth });
      return { open }
    }
  }
}
}());

function encapsulateStyles ( node ) {
	setAttribute( node, 'svelte-3722708153', '' );
}

function add_css () {
	var style = createElement( 'style' );
	style.id = 'svelte-3722708153-style';
	style.textContent = ".svelte-drawer[svelte-3722708153]{position:fixed;display:inline;transform:translate3d(0, 0, 0);will-change:transform}.svelte-drawer.smooth[svelte-3722708153]{transition:transform 300ms}.axis-x[svelte-3722708153]{top:0;bottom:0;height:100%}.axis-y[svelte-3722708153]{left:0;right:0;width:100%}.side-top[svelte-3722708153]{top:0 }.side-right[svelte-3722708153]{right:0 }.side-bottom[svelte-3722708153]{bottom:0 }.side-left[svelte-3722708153]{left:0 }.svelte-drawer-scrim[svelte-3722708153]{position:fixed;top:0;right:0;bottom:0;left:0;background:#000000;opacity:0.3}";
	appendNode( style, document.head );
}

function create_main_fragment ( state, component ) {
	var div, div_class_value, div_style_value, slot_content_default = component._slotted.default, slot_content_default_before, slot_content_default_after, text, if_block_anchor;

	function transitionend_handler ( event ) {
		var state = component.get();
		component.set('temporarySmooth', ( 'undefined' in state ? state.undefined : undefined ));
	}

	var if_block = (state.scrim && state.isOpen) && create_if_block( state, component );

	return {
		create: function () {
			div = createElement( 'div' );
			text = createText( "\n\n" );
			if ( if_block ) if_block.create();
			if_block_anchor = createComment();
			this.hydrate();
		},

		hydrate: function ( nodes ) {
			encapsulateStyles( div );
			div.className = div_class_value = "\n    svelte-drawer\n    side-" + ( state.side ) + "\n    axis-" + ( state.axis ) + "\n    " + ( state.isOpen ? 'open' : 'closed' ) + "\n    " + ( state.shouldTransition ? 'smooth' : '' ) + "\n  ";
			div.style.cssText = div_style_value = "\n    transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);\n    z-index: " + ( state.zIndexBase + 1 ) + ";\n  ";
			addListener( div, 'transitionend', transitionend_handler );
		},

		mount: function ( target, anchor ) {
			insertNode( div, target, anchor );

			if (slot_content_default) {
				appendNode(slot_content_default_before || (slot_content_default_before = createComment()), div);
				appendNode(slot_content_default, div);
				appendNode(slot_content_default_after || (slot_content_default_after = createComment()), div);
			}

			insertNode( text, target, anchor );
			if ( if_block ) if_block.mount( target, anchor );
			insertNode( if_block_anchor, target, anchor );
		},

		update: function ( changed, state ) {
			if ( ( changed.side || changed.axis || changed.isOpen || changed.shouldTransition ) && div_class_value !== ( div_class_value = "\n    svelte-drawer\n    side-" + ( state.side ) + "\n    axis-" + ( state.axis ) + "\n    " + ( state.isOpen ? 'open' : 'closed' ) + "\n    " + ( state.shouldTransition ? 'smooth' : '' ) + "\n  " ) ) {
				div.className = div_class_value;
			}

			if ( ( changed.translate || changed.zIndexBase ) && div_style_value !== ( div_style_value = "\n    transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);\n    z-index: " + ( state.zIndexBase + 1 ) + ";\n  " ) ) {
				div.style.cssText = div_style_value;
			}

			if ( state.scrim && state.isOpen ) {
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
			detachNode( div );

			if (slot_content_default) {
				reinsertBetween(slot_content_default_before, slot_content_default_after, slot_content_default);
				detachNode(slot_content_default_before);
				detachNode(slot_content_default_after);
			}

			detachNode( text );
			if ( if_block ) if_block.unmount();
			detachNode( if_block_anchor );
		},

		destroy: function () {
			removeListener( div, 'transitionend', transitionend_handler );
			if ( if_block ) if_block.destroy();
		}
	};
}

function create_if_block ( state, component ) {
	var div, div_style_value;

	function click_handler ( event ) {
		component.set({ open: false });
	}

	return {
		create: function () {
			div = createElement( 'div' );
			this.hydrate();
		},

		hydrate: function ( nodes ) {
			encapsulateStyles( div );
			div.className = "svelte-drawer-scrim";
			div.style.cssText = div_style_value = "z-index: " + ( state.zIndexBase ) + ";";
			addListener( div, 'click', click_handler );
		},

		mount: function ( target, anchor ) {
			insertNode( div, target, anchor );
		},

		update: function ( changed, state ) {
			if ( ( changed.zIndexBase ) && div_style_value !== ( div_style_value = "z-index: " + ( state.zIndexBase ) + ";" ) ) {
				div.style.cssText = div_style_value;
			}
		},

		unmount: function () {
			detachNode( div );
		},

		destroy: function () {
			removeListener( div, 'click', click_handler );
		}
	};
}

function Drawer ( options ) {
	this.options = options;
	this._state = assign( template.data(), options.data );
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

	if ( !document.getElementById( 'svelte-3722708153-style' ) ) add_css();

	this.slots = {};

	this._fragment = create_main_fragment( this._state, this );

	if ( options.target ) {
		this._fragment.create();
		this._fragment.mount( options.target, options.anchor || null );
	}
}

assign( Drawer.prototype, template.methods, proto );

Drawer.prototype._recompute = function _recompute ( changed, state, oldState, isInitial ) {
	if ( isInitial || changed.open ) {
		if ( differs( ( state.percentOpen = template.computed.percentOpen( state.open ) ), oldState.percentOpen ) ) changed.percentOpen = true;
	}

	if ( isInitial || changed.percentOpen ) {
		if ( differs( ( state.isOpen = template.computed.isOpen( state.percentOpen ) ), oldState.isOpen ) ) changed.isOpen = true;
	}

	if ( isInitial || changed.side ) {
		if ( differs( ( state.axis = template.computed.axis( state.side ) ), oldState.axis ) ) changed.axis = true;
	}

	if ( isInitial || changed.percentOpen || changed.side || changed.axis ) {
		if ( differs( ( state.translate = template.computed.translate( state.percentOpen, state.side, state.axis ) ), oldState.translate ) ) changed.translate = true;
	}

	if ( isInitial || changed.smooth || changed.temporarySmooth ) {
		if ( differs( ( state.shouldTransition = template.computed.shouldTransition( state.smooth, state.temporarySmooth ) ), oldState.shouldTransition ) ) changed.shouldTransition = true;
	}
};

module.exports = Drawer;
