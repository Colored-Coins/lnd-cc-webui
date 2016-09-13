import Rx, { Observable as O } from 'rx'
import Cycle from '@cycle/core'
import { makeDOMDriver, div, pre, button, br, p, small } from '@cycle/dom'
import io from 'socket.io-client'
import dbg from './dbg-stream'

const makeSocketDriver = socket => out$ => (
  out$.subscribe(a => socket.emit(...a)),
  { events: O.fromEvent.bind(O, socket) })

const main = ({ DOM, socket, props$ }) => {
  const

  // Filter for events of `name`for the currently active client
  valOf = name => socket.events('log')
    .withLatestFrom(props$)
    .flatMap(([ ev, p ]) => ev[0] == p.client && ev[1] == name ? O.just(ev[2]) : O.empty())

  // Model
, point$   = valOf('outpoint').map(point => `${point.txid.substr(0,10)}:${point.index}`).startWith(undefined)
, height$  = valOf('height').startWith(undefined)
, bench$   = valOf('benchmark').withLatestFrom(props$, (b, p) => `${b.tps} tx/sec: sent ${b.sent} ${p.asset}, received ${b.recv} ${p.asset} in the last ${b.timeframe}`).startWith(undefined)
, balance$ = valOf('balance').startWith(undefined)

  // Intent
, pay$    = DOM.select('.pay').events('click').map(ev => [ 'pay', ev.target.value ])
, settle$ = DOM.select('.settle').events('click').withLatestFrom(point$, (_, point) => [ 'settle', point ])
, out$    = O.merge(pay$, settle$).withLatestFrom(props$, (action, p) => [ 'rpc', p.client, ...action ])

  // View
, vtree$ = O.combineLatest(point$, height$, balance$, bench$, props$)
    .map(([ point, height, balance, bench, props ]) => div([
     balance ? pre(JSON.stringify(balance, '\t', 2)) : null
    , [ 1, 5, 10 ].map(value => [ button('.pay', { value }, `Send ${value} ${props.asset}`), ' ' ])
    , br(), br()
    , button('.settle', 'Settle on-chain')
    , (point && height) ? [' ', small(null, `commitment #${ height } on ChannelPoint(${ point }) `) ] : null
    , bench ? [ br(), p(small(null, `benchmark: ${bench}`))] : null
    ]))

  // Sinks
  dbg({ point$, height$, balance$, bench$, out$ })
  return { DOM: vtree$, socket: out$ }
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app')
, socket: makeSocketDriver(io(location.origin, { transports: [ 'websocket' ] }))
, props$: _ => O.just({ client: location.hash.substr(1), asset: 'CC' })
})
