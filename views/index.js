import { header, div, h2, p, a } from '@cycle/dom'

module.exports = div([
  header(div('.container.center', h2('Colu Lightning Demo')))
, div('.container', [
    p(null, 'Click the button below to open a demo wallet with some free play money, and start sending and receiving payments!')
  , p([ 'Visit our ', a({ href: '/faq' }, 'FAQ'), ' for more details.' ])
  , a('.new-wallet.btn.btn-primary.btn-lg', { href: '#new' }, 'Create Lightning wallet')
  ])
])
