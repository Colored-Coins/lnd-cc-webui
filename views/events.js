import { div, header, form, span, strong, input, label, button, ul, li, h2, h3, h4, p, br, a, em, pre } from '@cycle/dom'
import { formatNumber } from './util'

/*const itemView = ([ type, data, n=1 ]) =>
  li('.list-group-item.'+ (n>0?'recv':'sent'), [
    span('.glyphicon.glyphicon-send'),
    div('.prim', [
      h4(null, type), p('.text-muted', JSON.stringify(data))
      //h4([ n>0?'Received':'Sent' ]),
      //p('.text-muted', [ n>0?'from':'to', ' ', span('.lnid', '02b8287608b4c2814a16792c77d07f8d8041ad41ed06203470bff797c9398062c5') ]),
    ]),
    div('.meta', [
      strong(null, [ span('.amount', n>0?'+ '+n:'- '+(n*-1)), ' ', span('.asset', 'BTC') ]),
      p(n == 15 ? span('.btn.btn-xs.btn-warning.disabled', {disabled:true}, 'processing...') :
        n == 35 ? span('.btn.btn-xs.btn-success.disabled', {disabled:true}, 'confirmed!') : null),
      p(span('.time.text-muted', '12 min ago'))
    ]),
    div('.clearfix')
  ])*/

module.exports = ({ ...opt, events }) =>
  div('.events.container', [
    //h2(null, 'Activity'),
    ul('.list-group', events.filter(([ type ]) => !!renderers[type])
                           .map(([ type, item ]) => renderers[type](item, opt)))
  ])


const ev = ({ icon, title, text, meta, selector='' }) => li('.list-group-item'+selector, [
  icon && span('.glyphicon.glyphicon-'+icon)
, div('.prim', [ h4(null, title), text && p('.text-muted', text)])
, meta && div('.meta', meta)
, div('.clearfix')
])

const amountEl = (amount, asset) => em('.amount', [ span('.num', formatNumber(amount)), ' ', span('.asset', asset) ])
    , peerEl   = peer => span({title: peer}, peer.substr(0, 25) + '…')
    , txLink   = txid => a({ href: 'http://coloredcoins.org/explorer/testnet/tx/'+txid, target: '_blank'}, txid.substr(0, 25) + '…')

const renderers = {
  init:  (_, { wallet }) => ev({
      title: 'Setting up Lightning Wallet...'
  , meta: [ wallet.idpub ? span('.label.label-success', 'wallet ready') : null ]
  })

, ch_init: ({ outpoint, peer, capacity }, { props: { asset }, openCh }, isOpen=~openCh.indexOf(outpoint)) => ev({
    title: [ 'Incoming channel of ', amountEl(capacity, asset) ]
  , text: [
      em(null, 'peer:'), ' ', peerEl(peer), br()
    , ...(isOpen ? [em('funding tx:'), ' ',txLink(outpoint.replace(/:\d+$/, ''))]
                 : [em('awaiting funding tx'), ' (', txLink(outpoint.replace(/:\d+$/, '')), ') to confirm'])
    , br(), em('initial state:'), ' ours=', amountEl('0', asset), ', theirs=', amountEl(capacity, asset)

    ]
  , meta: [
    , p(isOpen ? span('.label.label-success', 'confirmed on-chain')
               : span('.label.label-warning', 'awaiting channel…'))
    ]
  })

, tx: ({ height, amount, ourIndex, theirIndex }, { height: currHeight, stateMap, props: { asset } }, state=findState(stateMap, height)) => ev({
    selector: amount[0] == '-' ? '.sent' : '.recv'
  , title: [ amount[0] == '-' ? 'Send' : 'Receive', ' ', amountEl(amount.replace(/^-/, ''), asset) ]
  , text: state && [ em('new state:'), ' ours=', amountEl(state.ourBalance, asset), ', theirs=', amountEl(state.theirBalance, asset), ' (height ', em(height), ')' ]
  , meta: p(+currHeight > +height+1 ? span('.label.label-success', 'confirmed off-chain')
                                    : span('.label.label-warning', 'processing…'))
  })
}

const findState = (stateMap, height) => stateMap[+height+2]