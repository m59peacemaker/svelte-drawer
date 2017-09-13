# svelte-drawer

A vanilla JS drawer (a.k.a. side menu) component made with Svelte.

## install

```sh
$ npm install svelte-drawer
```

## example

```js
import Drawer from 'svelte-drawer'

const drawer = new Drawer({
  target: aDomNode, // element where the drawer will be rendered
  data: {
    side: 'left', // top, right, bottom, left
    percentOpen: 0
      // 0 => drawer is fully closed
      // 100 => drawer is fully open
      // 80 => drawer is 80% open
    scrim: true, // true, false - darken the rest of the page when drawer is open
    zIndexBase: 1 // adjust the relative z-index of the drawer
  }
})

drawer.toggle()
```

## api

### `drawer.open({ smooth: true })`

### `drawer.close({ smooth: true })`

### `drawer.toggle({ smooth: true })`

### `drawer.setPercentOpen(percent, { smooth: true })`

`setPercentOpen` is the lower level API for manipulating the drawer for finer control. If you want to slide the drawer open or closed gradually congruent with a user gesture, use this.

This is the same as `drawer.set({ percentOpen })`, but with smoothing.
