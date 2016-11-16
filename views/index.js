import { header, div, a } from '@cycle/dom'

module.exports = header(
  div('.container.center', [
    a('.new-wallet.btn.btn-default.btn-lg', { href: '#new' }, 'Create Lightning wallet')
  ])
)
