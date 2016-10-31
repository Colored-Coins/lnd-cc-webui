import redis from 'redis'
import { Observable as O } from 'rx'

module.exports = rread => {
  const rsub  = redis.createClient(rread.connection_options)

      , msg$ = O.fromEvent(rsub, 'message', (wid, msg) => [ wid.substr(2), ...parseMsg(msg) ] ).share()

      , find = (lrange => wid => lrange('e:'+wid, 0, -1).flatMap(x => x.map(parseMsg)).share())(O.fromNodeCallback(rread.lrange, rread))
      , subscribe = wid => (rsub.subscribe('s:'+wid), msg$.filter(x => x[0] == wid).map(x => x.slice(1))) // @XXX leaky!

  return {
    walletEvents: wid => O.merge(find(wid), subscribe(wid))
  }
}

const parseMsg = msg => {
  let [ type, ...data ] = msg.split(' ')
  data = data.length ? data.join(' ') : null
  data && data[0] == '{' && (data = JSON.parse(data)) // initial "{" indicates JSON
  return [ type, data ]
}
