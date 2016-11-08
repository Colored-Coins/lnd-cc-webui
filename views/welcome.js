import { div, p, strong, button, span, a, h } from '@cycle/dom'

module.exports = div('.container', [
  div('.alert.alert-warning.alert-dismissible', { attributes: { role: 'alert' } }, [
    button('.close', { type: 'button', attributes: { 'data-dismiss': 'alert', 'aria-label': 'Close' } }, [
      span({ attributes: { 'aria-hidden': true },  innerHTML: '&times;' }) ])
  , p([
    , strong('Welcome to the Lightning Colored Coins demo!')
    , ' To try it out, '
    , a({ href: '/', target: '_blank' }, 'click here')
    , ' to open a second wallet, then copy its Lightning ID to the form below and send it some money!'
    ])
  ])
])
