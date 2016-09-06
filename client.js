import Rx, { Observable as O } from 'rx';
import Cycle from '@cycle/core';
import { makeDOMDriver, div, ul, li, span, hr, pre, h1, h2, h3, p, button, br } from '@cycle/dom';
import io from 'socket.io-client'
import { dbg } from './util'

window.mdebug = require('debug')('LnCC')

const merge = (...xs) => Object.assign({}, ...xs)
const byName = name => x => x.name === name

let main = ({ DOM, socket, props$ }) => {

  let log$ = socket.events('log')
    .withLatestFrom(props$)
    .filter(([ log, props ]) => log.client == props.client)
    .map(([ log, _ ]) => log)
  dbg('log$', log$)

  // Model
  let channelPoint$ = log$.filter(byName('channelpoint'))
    .map(({ txid, index }) => ({ txid, index  }))
    .startWith({ txid: 'N/A', index: 'N/A' })
  let blockHeight$ = log$.filter(byName('block')).map(l => l.height).startWith('N/A')
  let balance$ = log$.filter(byName('balance')).startWith({ ourBalance: 'N/A', theirBalance: 'N/A' })

  // Intent
  let pay$ = DOM.select('button.pay').events('click')
    .map(ev => ({ action: 'pay', amount: ev.target.value }))

  let settle$ = DOM.select('button.settle').events('click')
    .withLatestFrom(channelPoint$, (_, channelPoint) => ({ action: 'settle', channelPoint }))

  let actions$ = O.merge(pay$, settle$)
    .withLatestFrom(props$, (action, props) => [ 'rpc', merge(action, { client: props.client }) ])

  // View
  let vtree$ = O.combineLatest(blockHeight$, channelPoint$, balance$)
    .map(([ blockHeight, channelPoint, balance ]) => div([
      pre(JSON.stringify({ channelPoint: channelPoint, blockHeight: blockHeight, ourBalance: balance.ourBalance, theirBalance: balance.theirBalance }, '\t', 2)),
      button('.pay', { value: 1 }, 'Send 1 CC'), ' ',
      button('.pay', { value: 5 }, 'Send 5 CC'), ' ',
      button('.pay', { value: 10 }, 'Send 10 CC'), ' ',
      br(), br(),
      button('.settle', { }, 'Settle on-chain'), ' ',
    ]))

  return { DOM: vtree$, socket: actions$ }
}

let makeSocketDriver = socket => out$ => (
  out$.subscribe(a => socket.emit(...a)),
  { events: name => O.fromEvent(socket, name) }
)
Cycle.run(main, {
  DOM: makeDOMDriver('#app')
, socket: makeSocketDriver(io(location.origin, { transports: [ 'websocket' ] }))
, props$: _ => O.just({ client: location.hash.substr(1) })
})
