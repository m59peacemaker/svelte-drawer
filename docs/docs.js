(function () {
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
	this.destroy = this.set = noop;
	this.fire('destroy');

	if (detach !== false) this._fragment.unmount();
	this._fragment.destroy();
	this._fragment = null;

	this._state = {};
}

function differs(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers(component, group, newState, oldState) {
	for (var key in group) {
		if (!(key in newState)) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		if (differs(newValue, oldValue)) {
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
	teardown: destroy
};

function recompute ( state, newState, oldState, isInitial ) {
	if ( isInitial || ( 'open' in newState && differs( state.open, oldState.open ) ) ) {
		state.percentOpen = newState.percentOpen = template.computed.percentOpen( state.open );
	}

	if ( isInitial || ( 'percentOpen' in newState && differs( state.percentOpen, oldState.percentOpen ) ) ) {
		state.isOpen = newState.isOpen = template.computed.isOpen( state.percentOpen );
	}

	if ( isInitial || ( 'side' in newState && differs( state.side, oldState.side ) ) ) {
		state.axis = newState.axis = template.computed.axis( state.side );
	}

	if ( isInitial || ( 'percentOpen' in newState && differs( state.percentOpen, oldState.percentOpen ) ) || ( 'side' in newState && differs( state.side, oldState.side ) ) || ( 'axis' in newState && differs( state.axis, oldState.axis ) ) ) {
		state.translate = newState.translate = template.computed.translate( state.percentOpen, state.side, state.axis );
	}

	if ( isInitial || ( 'smooth' in newState && differs( state.smooth, oldState.smooth ) ) || ( 'temporarySmooth' in newState && differs( state.temporarySmooth, oldState.temporarySmooth ) ) ) {
		state.shouldTransition = newState.shouldTransition = template.computed.shouldTransition( state.smooth, state.temporarySmooth );
	}
}

var template = (function () {
const clamp = (min, max, n) => Math.max(min, Math.min(max, n));
const isLeadingSide = side => side === 'left' || side === 'top';

return {
  data () {
    return {
      side: 'left',
      open: false, // true, false, 0 - 100 (percent)
      smooth: true,
      scrim: true
      //push: false // false, element/ref // TODO: push other content
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
	setAttribute( node, 'svelte-510233630', '' );
}

function add_css () {
	var style = createElement( 'style' );
	style.id = 'svelte-510233630-style';
	style.textContent = "[svelte-510233630].svelte-drawer,[svelte-510233630] .svelte-drawer{position:fixed;display:inline;z-index:999;transform:translate3d(0, 0, 0);will-change:transform}[svelte-510233630].svelte-drawer.smooth,[svelte-510233630] .svelte-drawer.smooth{transition:transform 300ms}[svelte-510233630].axis-x,[svelte-510233630] .axis-x{top:0;bottom:0;height:100%}[svelte-510233630].axis-y,[svelte-510233630] .axis-y{left:0;right:0;width:100%}[svelte-510233630].side-top,[svelte-510233630] .side-top{top:0 }[svelte-510233630].side-right,[svelte-510233630] .side-right{right:0 }[svelte-510233630].side-bottom,[svelte-510233630] .side-bottom{bottom:0 }[svelte-510233630].side-left,[svelte-510233630] .side-left{left:0 }[svelte-510233630].svelte-drawer-scrim,[svelte-510233630] .svelte-drawer-scrim{position:fixed;top:0;right:0;bottom:0;left:0;z-index:998;background:#000000;opacity:.1;will-change:opacity}[svelte-510233630].transparent,[svelte-510233630] .transparent{opacity:0}[svelte-510233630].svelte-drawer-scrim.smooth,[svelte-510233630] .svelte-drawer-scrim.smooth{transition:opacity 300ms linear}";
	appendNode( style, document.head );
}

function create_main_fragment ( state, component ) {
	var div, div_class_value, div_style_value, text, if_block_anchor;

	function transitionend_handler ( event ) {
		var state = component.get();
		component.set('temporarySmooth', ( 'undefined' in state ? state.undefined : undefined ));
	}

	var if_block = (state.scrim) && create_if_block( state, component );

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
			div.style.cssText = div_style_value = "transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);";
			addListener( div, 'transitionend', transitionend_handler );
		},

		mount: function ( target, anchor ) {
			insertNode( div, target, anchor );
			if ( component._yield ) component._yield.mount( div, null );
			insertNode( text, target, anchor );
			if ( if_block ) if_block.mount( target, anchor );
			insertNode( if_block_anchor, target, anchor );
		},

		update: function ( changed, state ) {
			if ( div_class_value !== ( div_class_value = "\n    svelte-drawer\n    side-" + ( state.side ) + "\n    axis-" + ( state.axis ) + "\n    " + ( state.isOpen ? 'open' : 'closed' ) + "\n    " + ( state.shouldTransition ? 'smooth' : '' ) + "\n  " ) ) {
				div.className = div_class_value;
			}

			if ( div_style_value !== ( div_style_value = "transform: translate3d(" + ( state.translate.x ) + "%, " + ( state.translate.y ) + "%, 0);" ) ) {
				div.style.cssText = div_style_value;
			}

			if ( state.scrim ) {
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
			if ( component._yield ) component._yield.unmount();
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
	var div, div_class_value;

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
			div.className = div_class_value = "\n      svelte-drawer-scrim " + ( !state.isOpen ? 'transparent' : '' ) + "\n      " + ( state.shouldTransition ? 'smooth' : '' ) + "\n    ";
			addListener( div, 'click', click_handler );
		},

		mount: function ( target, anchor ) {
			insertNode( div, target, anchor );
		},

		update: function ( changed, state ) {
			if ( div_class_value !== ( div_class_value = "\n      svelte-drawer-scrim " + ( !state.isOpen ? 'transparent' : '' ) + "\n      " + ( state.shouldTransition ? 'smooth' : '' ) + "\n    " ) ) {
				div.className = div_class_value;
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
	options = options || {};
	this._state = assign( template.data(), options.data );
	recompute( this._state, this._state, {}, true );

	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};

	this._handlers = Object.create( null );

	this._root = options._root || this;
	this._yield = options._yield;

	if ( !document.getElementById( 'svelte-510233630-style' ) ) add_css();

	this._fragment = create_main_fragment( this._state, this );

	if ( options.target ) {
		this._fragment.create();
		this._fragment.mount( options.target, null );
	}
}

assign( Drawer.prototype, template.methods, proto );

Drawer.prototype._set = function _set ( newState ) {
	var oldState = this._state;
	this._state = assign( {}, oldState, newState );
	recompute( this._state, newState, oldState, false );
	dispatchObservers( this, this._observers.pre, newState, oldState );
	this._fragment.update( newState, this._state );
	dispatchObservers( this, this._observers.post, newState, oldState );
};

// TODO: might as well use svelte in the docs

const componentize = node => ({
  mount: function (target, anchor) {
    target.insertBefore(node, anchor);
  },
  unmount: function (node) {
    node.parent.removeChild(node);
  },
  destroy: () => {}
});

const mainContent = document.createElement('article');
mainContent.textContent = 'Main content.';

const div = document.createElement('div');
div.textContent = 'Drawer content.';
div.style.background = 'white';
div.style.height = '100%';
div.style.width = '100%';
div.style.minWidth = '275px';
div.style.minHeight = '275px';

document.body.appendChild(mainContent);

const drawer = new Drawer({
  target: document.body,
  _yield: componentize(div),
  data: {
    side: 'left'
  }
});

window.drawer = drawer;

}());
