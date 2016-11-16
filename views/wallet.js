import headerView  from './header'
import paymentView from './payment'
import eventsView  from './events'
import welcomeView from './welcome'

import { div, button, h } from '@cycle/dom'

module.exports =([ wid, wallet, balance, height, events, openCh, settledCh, canPay, showLog, settleBtn, stateMap, props ]) => div([
  headerView({ wallet, props, balance })
, props.showWelcome ? welcomeView : null
, paymentView({ wallet, props, canPay })
, eventsView({ events, wallet, height, openCh, settledCh, stateMap, props })
, div('.container.controls', [
    settleBtn, ' '
  , button('.toggle-log.btn.btn-default', showLog ? 'Hide logs' : 'View logs')
  ])
, showLog ? div('.container.rawlog', [ h('iframe', { src: `/rawlog/${ wid }` }) ]) : null
])
