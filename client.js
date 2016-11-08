import Rx, { Observable as O } from 'rx'
import { run } from '@cycle/rx-run'
import io from 'socket.io-client'
import { makeDOMDriver, div, button, a, span, h } from '@cycle/dom'
import { makeHistoryDriver } from '@cycle/history'
import { createHashHistory as createHistory } from 'history'
import { makeSocketDriver, dbgStreams, makeWid } from './util'
import { reltime } from './views/util'

import loadingView from './views/loading'
import headerView  from './views/header'
import paymentView from './views/payment'
import eventsView  from './views/events'
import welcomeView from './views/welcome'

import errorDialog from './views/error-dialog'

const ID = x => x
    , spinner   = span('.glyphicon.glyphicon-refresh.spinning')

const main = ({ DOM, history$, socket, props$ }) => {
  const

  // Get events of type `t` with the type stripped and the data transformed with `mapper`
  evStream = (t, mapper=ID) => event$.filter(x => x[0] == t).map(x => mapper(...x.slice(1)))

  // Model
, wid$     = history$.map(l => l.pathname.replace(/^\//, '')).distinctUntilChanged()
, event$   = socket.events('event', (...e) => e)
, events$  = event$.scan((events, e) => e[0] == 'init' ? [ e ] : [ e, ...events ], [])
, wallet$  = O.merge(evStream('wallet', w => w), evStream('init', _ => ({}))).startWith({})
, height$  = evStream('accept', c => c.height).startWith(0)
, channel$ = evStream('ch_open', c => c.outpoint).startWith(undefined)
, openCh$  = channel$.scan((xs, x) => [ ...xs, x ], []).startWith([])
, settledCh$ = evStream('ch_settle_done').scan((xs, x) => [ ...xs, x.outpoint ], []).startWith([])
, balance$ = O.merge(
    wallet$.filter(w => !!w.balance).map(w => w.balance)
  , evStream('balance', b => b.channelbalance)
  , evStream('accept', c => c.ourBalance)
  , evStream('chain', c => c.ourBalance)
  , evStream('ch_settle_done', _ => 0)
  ).startWith('0').distinctUntilChanged()
, stateMap$  = evStream('accept').scan((o, c) => (o[c.height]=c, o), {}).startWith({})
, canPay$    = balance$.map(b => b > 0)
, error$     = evStream('error')


  // Intent
, provis$  = wid$.filter(wid => !wid).map([ 'provision' ])
, assoc$   = wid$.withLatestFrom(wallet$).filter(([ wid, wallet]) => wid && wallet.wid != wid).map(([ wid ]) => wid)
             .merge(socket.events('reconnect').withLatestFrom(wid$, (_, wid) => wid).filter(wid => !!wid))
             .map(wid => [ 'associate', wid ])
, pay$     = DOM.select('.send-payment').events('submit').do(e => e.preventDefault()).withLatestFrom(wid$)
               .map(([ { target: t }, wid ]) => [ 'pay', wid, t.querySelector('[name=dest]').value, t.querySelector('[name=amount]').value ])
, settle$  = DOM.select('.settle').events('click').withLatestFrom(wid$, channel$, (_, wid, ch) => [ 'settle', wid, ch ])
, cmd$     = O.merge(provis$, assoc$, pay$, settle$)
, showLog$ = DOM.select('.toggle-log').events('click').scan(s => !s).startWith(false)

, location$ = wallet$.withLatestFrom(wid$).filter(([ wallet, wid ]) => wallet.wid && wallet.wid != wid).map(([ { wid } ]) => ({ pathname: wid }))

, settleBtn$ = O.merge(
    channel$.filter(x => !!x).map(button('.settle.btn.btn-default', 'Close channel & settle on-chain'))
  , settle$.map(button('.btn.btn-default', { disabled: true }, [ 'Closing channel… ', spinner ]))
  , settledCh$.filter(xs => xs.length).map(a('.btn.btn-default', { href: '/' }, 'Start new wallet')) // assumes a single channel per wallet
  ).startWith(button('.btn.btn-default', { disabled: true }, [ 'Opening channel… ', spinner ]))

, vtree$ = O.combineLatest(wid$, wallet$, balance$, height$, events$, openCh$, settledCh$, canPay$, showLog$, settleBtn$, stateMap$, props$)
    .map(([ wid, wallet, balance, height, events, openCh, settledCh, canPay, showLog, settleBtn, stateMap, props ]) => !wallet.idpub ? loadingView() : div([
      headerView({ wallet, props, balance })
    , props.showWelcome ? welcomeView : null
    , paymentView({ wallet, props, canPay })
    , eventsView({ events, wallet, height, openCh, settledCh, stateMap, props })
    , div('.container.controls', [
        settleBtn, ' '
      , button('.toggle-log.btn.btn-default', showLog ? 'Hide logs' : 'View logs')
      ])
    , showLog ? div('.container.rawlog', [ h('iframe', { src: `/rawlog/${ wid }` }) ]) : null
    ]))

  // Sinks
  dbgStreams({ wid$, event$, wallet$, height$, openCh$, balance$, cmd$, location$, history$, pay$, showLog$, canPay$, settleBtn$, error$ })
  return { DOM: vtree$, socket: cmd$, history$: location$, error$ }
}

run(main, {
  DOM:      makeDOMDriver('#app')
, socket:   makeSocketDriver(io(location.origin, { transports: [ 'websocket' ] }))
, history$: makeHistoryDriver(createHistory({ hashType: 'noslash' }))
, props$:   _ => O.just({ asset: 'USD', showWelcome: !localStorage.getItem('shown_welcome') })
, error$:   err$ => (err$.subscribe(errorDialog), O.empty())
})

localStorage.setItem('shown_welcome', true)

// Live update for relative times
setInterval(_ =>
  Array.prototype.forEach.call(document.querySelectorAll('.reltime'), el =>
      el.innerText = reltime(el.getAttribute('title')))
, 5000)

    /*.map(([ point, height, balance, bench, props ]) => div([*/
      //balance ? pre(JSON.stringify(balance, '\t', 2)) : null
    //, [ 1, 5, 10 ].map(value => [ button('.pay', { value }, `Send ${value} ${props.asset}`), ' ' ])
    //, br(), br()
    //, button('.settle', 'Settle on-chain')
    //, (point && height) ? [' ', small(null, `commitment #${ height } on ChannelPoint(${ point }) `) ] : null
    //, bench ? [ br(), p(small(null, `benchmark: ${bench}`))] : null
    /*]))*/
