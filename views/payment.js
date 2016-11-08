import { form, div, p, input, span, strong } from '@cycle/dom'

module.exports = ({ wallet: { idpub }, props: { asset }, canPay }) =>
  form('.send-payment.container', {  disabled: !canPay }, [
    div('.row', [
      div('.form-group.col-md-6', [
        input('#send-dest.form-control.input-lg', { type: 'text', name: 'dest', placeholder: 'Lightning ID', disabled: !canPay })
      ])
    , div('.form-group.col-md-3', [
        //label({ for: 'send-amount' }, 'Amount'),
        div('.input-group', [
          input('#send-amount.form-control.input-lg', { type: 'number', name: 'amount', placeholder: 'Amount to send', disabled: !canPay })
        , span('.input-group-addon', asset)
        ])
      ]),
      div('.form-group.col-md-3', [
        //label('\u200B')
        input('.btn.btn-primary.btn-block.btn-lg', { type: 'submit', value: 'Pay', disabled: !canPay })
      ])
    ])
  , p('.text-muted.your-id', ['Your Lightning ID: ', strong('.lnid', idpub)])
  ])
