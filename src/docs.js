import Drawer from './Drawer.html'

// TODO: might as well use svelte in the docs

const mainContent = document.createElement('article')
mainContent.textContent = 'Main content.'

const div = document.createElement('div')
div.textContent = 'Drawer content.'
div.style.background = 'white'
div.style.height = '100%'
div.style.width = '100%'
div.style.minWidth = '275px'
div.style.minHeight = '275px'

document.body.appendChild(mainContent)

const drawer = new Drawer({
  target: document.body,
  data: {
    side: 'left'
  },
  slots: {
    default: div
  }
})

window.drawer = drawer
