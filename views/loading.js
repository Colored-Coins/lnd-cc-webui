import { header, div, h2, p, span } from '@cycle/dom'

module.exports = (balance, asset, total_locked) =>
  header([ div('.container', [
    h2('Setting up Lightning wallet...')
  ]) ])

