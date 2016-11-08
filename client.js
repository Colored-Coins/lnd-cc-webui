import Rx, { Observable as O } from 'rx'
import { run } from '@cycle/rx-run'
import io from 'socket.io-client'
import { makeDOMDriver, div, button, h } from '@cycle/dom'
import { makeHistoryDriver } from '@cycle/history'
import { createHashHistory as createHistory } from 'history'
import { makeSocketDriver, dbgStreams, makeWid } from './util'
import { reltime } from './views/util'

import loadingView from './views/loading'
import headerView  from './views/header'
import paymentView from './views/payment'
import eventsView  from './views/events'

const ID = x => x

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
  , evStream('ch_settle_done', _ => 0)
  ).startWith('0').distinctUntilChanged()
//, logMap$ = evStream('accept').scan((o, c) => (o.o[c.ourIndex]=c, o.t[c.theirIndex]=c, o), {o:{}, t:{}}).startWith({o:{}, t:{}})
, stateMap$ = evStream('accept').scan((o, c) => (o[c.height]=c, o), {}).startWith({})
, canPay$ = balance$.map(b => b > 0)

//, point$   = valOf('outpoint').map(point => `${point.txid.substr(0,10)}:${point.index}`).startWith(undefined)
//, bench$   = valOf('benchmark').withLatestFrom(props$, (b, p) => `${b.tps} tx/sec: sent ${b.sent} ${p.asset}, received ${b.recv} ${p.asset} in the last ${b.timeframe}`).startWith(undefined)

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


  // Sinks
, vtree$ = O.combineLatest(wid$, wallet$, balance$, height$, events$, channel$, openCh$, settledCh$, canPay$, showLog$, stateMap$, props$)
    .map(([ wid, wallet, balance, height, events, channel, openCh, settledCh, canPay, showLog, stateMap, props ]) => !wallet.idpub ? loadingView() : div([
      headerView({ wallet, props, balance })
    , paymentView({ wallet, props, canPay })
    , eventsView({ events, wallet, height, openCh, settledCh, stateMap, props })
    , channel ? div('.container.controls', [
        button('.settle.btn.btn-default', 'Close channel & settle on-chain'), ' '
      , button('.toggle-log.btn.btn-default', showLog ? 'Hide logs' : 'View logs')
      ]) : null
    , showLog ? div('.container.rawlog', [ h('iframe', { src: `/rawlog/${ wid }` }) ]) : null
    ]))

//, location$ = evStream('provisioned', wid => ({ pathname: wid }))
, location$ = wallet$.withLatestFrom(wid$).filter(([ wallet, wid ]) => wallet.wid && wallet.wid != wid).map(([ { wid } ]) => ({ pathname: wid }))

  dbgStreams({ wid$, event$, wallet$, height$, openCh$, balance$, cmd$, location$, history$, pay$, showLog$, canPay$ })
  return { DOM: vtree$, socket: cmd$, history$: location$ }
}

run(main, {
  DOM:      makeDOMDriver('#app')
, socket:   makeSocketDriver(io(location.origin, { transports: [ 'websocket' ] }))
, history$: makeHistoryDriver(createHistory({ hashType: 'noslash' }))
, props$:   _ => O.just({ asset: 'USD' })
})


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
