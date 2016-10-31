import { header, div, h2, p, span } from '@cycle/dom'

module.exports = (balance, asset, total_locked) => (console.log('render loading....'),
  header('.overview', [ div('.container', [
    h2('Setting up wallet...')
  ]) ]))
