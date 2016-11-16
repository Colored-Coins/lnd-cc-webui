import Rx, { Observable as O } from 'rx'
import { run } from '@cycle/rx-run'
import io from 'socket.io-client'
import { makeDOMDriver, button, a, h } from '@cycle/dom'
import { makeHistoryDriver } from '@cycle/history'
import { createHashHistory as createHistory } from 'history'
import { makeSocketDriver, dbgStreams, makeWid } from './util'
import { reltime } from './views/util'

import indexView   from './views/index'
import loadingView from './views/loading'
import walletView  from './views/wallet'

import errorDialog from './views/error-dialog'

const ID = x => x

const main = ({ DOM, history$, socket, props$ }) => {
  const

  // Get events of type `t` with the type stripped and the data transformed with `mapper`
  evStream = (t, mapper=ID) => event$.filter(x => x[0] == t).map(x => mapper(...x.slice(1)))

  // Model
, wid$     = history$.map(l => l.pathname.replace(/^\//, '')).filter(l => l != 'new').distinctUntilChanged()
, event$   = socket.events('event', (...e) => e)
, init$    = evStream('init')
, events$  = init$.flatMapLatest(ie => (console.log('new events'),event$.startWith([ 'init', ie ]).scan((events, e) => [ e, ...events ], [])))
, wallet$  = O.merge(evStream('wallet', w => w), init$.map({}))
, height$  = O.merge(evStream('chain'), evStream('accept')).map(c => c.height).startWith(0)
, channel$ = evStream('ch_open', c => c.outpoint).startWith(undefined)
, openCh$  = wid$.flatMapLatest(_ => channel$.scan((xs, x) => [ ...xs, x ], []).startWith([]))
, settledCh$ = wid$.flatMapLatest(_ => evStream('ch_settle_done').scan((xs, x) => [ ...xs, x.outpoint ], []).startWith([]))
, balance$ = O.merge(
    wallet$.filter(w => !!w.balance).map(w => w.balance)
  , evStream('balance', b => b.channelbalance)
  , evStream('accept', c => c.ourBalance)
  , evStream('chain', c => c.ourBalance)
  , evStream('ch_settle_done', _ => 0)
  ).startWith('0').distinctUntilChanged()
, stateMap$  = evStream('accept').scan((o, c) => (o[c.height]=c, o), {}).startWith({})
, canPay$    = balance$.map(b => b > 0)
, showLog$   = DOM.select('.toggle-log').events('click').scan(s => !s).startWith(false)
, error$     = evStream('error')


  // Intent
, provis$  = history$.filter(l => l.pathname == '/new').map([ 'provision' ])
, assoc$   = wid$.withLatestFrom(wallet$.startWith({})).filter(([ wid, wallet]) => wid && wallet.wid != wid).map(([ wid ]) => wid)
             .merge(socket.events('reconnect').withLatestFrom(wid$, (_, wid) => wid).filter(wid => !!wid))
             .map(wid => [ 'associate', wid ])
, pay$     = DOM.select('.send-payment').events('submit').do(e => e.preventDefault()).withLatestFrom(wid$)
               .map(([ { target: t }, wid ]) => [ 'pay', wid, t.querySelector('[name=dest]').value, t.querySelector('[name=amount]').value ])
, settle$  = DOM.select('.settle').events('click').withLatestFrom(wid$, channel$, (_, wid, ch) => [ 'settle', wid, ch ])
, cmd$     = O.merge(provis$, assoc$, pay$, settle$)


, location$ = wallet$.withLatestFrom(wid$).filter(([ wallet, wid ]) => wallet.wid && wallet.wid != wid).map(([ { wid } ]) => ({ pathname: wid }))

, settleBtn$ = O.merge(
    O.merge(provis$, assoc$).map(button('.btn.btn-default', { disabled: true }, 'Opening wallet…'))
  , evStream('ch_init').map(button('.btn.btn-default', { disabled: true }, 'Opening channel…'))
  , channel$.filter(x => !!x).map(button('.settle.btn.btn-default', 'Close channel & settle on-chain'))
  , settle$.map(button('.btn.btn-default', { disabled: true }, 'Closing channel…'))
  , settledCh$.filter(xs => xs.length).map(a('.btn.btn-default', { href: '#/new' }, 'Start new wallet')) // assumes a single channel per wallet
  )

, vtree$ = O.merge(
    O.of(indexView)
  , provis$.map(loadingView)
  , assoc$.map(loadingView)
  , O.combineLatest(wid$, wallet$, balance$, height$, events$, openCh$, settledCh$, canPay$, showLog$, settleBtn$, stateMap$, props$)
      .map(walletView)
  )

  // Sinks
  dbgStreams({ wid$, event$, wallet$, height$, openCh$, balance$, cmd$, location$, history$, pay$, showLog$, canPay$, error$, settleBtn$, init$, events$ })
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
