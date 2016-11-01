import Rx, { Observable as O } from 'rx'
import { run } from '@cycle/rx-run'
import io from 'socket.io-client'
import { makeDOMDriver, div, header, form, span, strong, input, label, button, ul, li, h2, h3, h4, p } from '@cycle/dom'
import { makeHistoryDriver } from '@cycle/history'
import { createHashHistory as createHistory } from 'history'
import { makeSocketDriver, dbgStreams, makeWid } from './util'

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
, events$  = event$.scan((events, e) => [ e, ...events ], [])
, wallet$  = evStream('wallet', w => w).startWith({})
, height$  = evStream('accept', c => c.height).startWith(0)
, openCh$  = evStream('ch_open', c => c.outpoint).scan((xs, x) => [ ...xs, x ], []).startWith([])
, balance$ = O.merge(
    wallet$.filter(w => !!w.balance).map(w => w.balance)
  , evStream('balance', b => b.channelbalance)
  , evStream('accept', c => c.ourBalance)
  ).startWith('0').distinctUntilChanged()
//, logMap$ = evStream('accept').scan((o, c) => (o.o[c.ourIndex]=c, o.t[c.theirIndex]=c, o), {o:{}, t:{}}).startWith({o:{}, t:{}})
, stateMap$ = evStream('accept').scan((o, c) => (o[c.height]=c, o), {}).startWith({})

//, point$   = valOf('outpoint').map(point => `${point.txid.substr(0,10)}:${point.index}`).startWith(undefined)
//, bench$   = valOf('benchmark').withLatestFrom(props$, (b, p) => `${b.tps} tx/sec: sent ${b.sent} ${p.asset}, received ${b.recv} ${p.asset} in the last ${b.timeframe}`).startWith(undefined)

  // Intent
, provis$  = wid$.filter(wid => !wid).map([ 'provision' ])
, assoc$   = wid$.withLatestFrom(wallet$).filter(([ wid, wallet]) => wid && wallet.wid != wid).map(([ wid ]) => wid)
             .merge(socket.events('reconnect').withLatestFrom(wid$, (_, wid) => wid))
             .map(wid => [ 'associate', wid ])
, pay$     = DOM.select('.send-payment').events('submit').do(e => e.preventDefault()).withLatestFrom(wid$)
               .map(([ { target: t }, wid ]) => (console.log({t,wid}),[ 'pay', wid, t.querySelector('[name=dest]').value, t.querySelector('[name=amount]').value ]))
, settle$  = DOM.select('.settle').events('click').map([ 'settle' ])
, cmd$     = O.merge(provis$, assoc$, pay$, settle$)

  // Sinks
, vtree$ = O.combineLatest(wid$, wallet$, balance$, height$, events$, openCh$, stateMap$, props$)
    .map(([ wid, wallet, balance, height, events, openCh, stateMap, props ]) => !wallet.idpub ? loadingView() : div([
      headerView({ wallet, props, balance })
    , paymentView({ wallet, props })
    , eventsView({ events, wallet, height, openCh, stateMap, props })
    , div('.container.settle', [ button('.btn.btn-warning', 'Close channel & settle on-chain') ])
    ]))

//, location$ = evStream('provisioned', wid => ({ pathname: wid }))
, location$ = wallet$.withLatestFrom(wid$).filter(([ wallet, wid ]) => wallet.wid && wallet.wid != wid).map(([ { wid } ]) => ({ pathname: wid }))

  dbgStreams({ wid$, event$, wallet$, height$, openCh$, balance$, cmd$, location$, history$, pay$ })
  return { DOM: vtree$, socket: cmd$, history$: location$ }
}

run(main, {
  DOM:      makeDOMDriver('#app')
, socket:   makeSocketDriver(io(location.origin, { transports: [ 'websocket' ] }))
, history$: makeHistoryDriver(createHistory({ hashType: 'noslash' }))
, props$:   _ => O.just({ asset: 'USD' })
})



    /*.map(([ point, height, balance, bench, props ]) => div([*/
      //balance ? pre(JSON.stringify(balance, '\t', 2)) : null
    //, [ 1, 5, 10 ].map(value => [ button('.pay', { value }, `Send ${value} ${props.asset}`), ' ' ])
    //, br(), br()
    //, button('.settle', 'Settle on-chain')
    //, (point && height) ? [' ', small(null, `commitment #${ height } on ChannelPoint(${ point }) `) ] : null
    //, bench ? [ br(), p(small(null, `benchmark: ${bench}`))] : null
    /*]))*/
