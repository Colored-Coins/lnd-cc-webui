import { header, div, h2, p, span, strong } from '@cycle/dom'
import { formatNumber } from './util'

module.exports = ({ balance, props: { asset } }) =>
  header('.overview', [
    div('.balance', div('.container', [
      //h2('Your balance:'),
      p([ span('.amount', formatNumber(balance)), ' ', span('.asset', asset) ])
    ]))
  ])
