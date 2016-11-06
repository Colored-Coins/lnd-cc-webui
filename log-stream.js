import path from 'path'
import fs from 'fs'
import byline from 'byline'
import escapeHtml from 'escape-html'
import { Tail } from 'tail'

const { LND_PATH, LND_NETWORK, STATIC_URL, VER } = process.env
    , HTML_HEAD = `<link href="${ STATIC_URL }/-.css?${ VER }" type="text/css" rel="stylesheet"><body class="logframe"><pre>\n`
    , RE_LOG = /^(\d{2}:\d{2}:\d{2} \d{4}-\d{2}-\d{2}) (\[\w+\]) (\w+:) /
    , RE_LOG_HEX = /\b([0-9a-f]{44,66})\b/g
    , RE_LOG_MARKER = /^(--- (Begin|End) .* ---)$/
    , RE_LOG_MSG = /\b((read|write)Message (to|from) 127.0.0.1:\d{4,5})\b/
    , RE_LOG_KW = /(Chan(nel)?Point\([0-9a-f:]+\)|(our_balance|their_balance|height|window_edge)=[^,\s]+|\b(lnwire|wire|channeldb)\.\w+)/g

const log2html = line =>
  escapeHtml(line)
    .replace(RE_LOG, '<span class="time">$1</span> '
                   + '<span class="level">$2</span> '
                   + '<span class="module">$3</span> ')
    .replace(RE_LOG_KW, '<span class="kw">$1</span>')
    //.replace(RE_LOG_HEX, '<span class="hex">$1</span>')
    .replace(RE_LOG_MARKER, '<span class="marker">$1</span>')
    .replace(RE_LOG_MSG, '<span class="msg">$1</span>')
  + '\n'

module.exports = (req, res, next) => {
  const wid = req.params.wid
      , logpath = path.join(LND_PATH, wid, 'logs', LND_NETWORK, 'lnd.log')

  req.socket.setKeepAlive(true)
  req.socket.setTimeout(0)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.status(200)
  res.write(HTML_HEAD)

  const rs = byline(fs.createReadStream(logpath, { encoding: 'utf8' }))
  rs.on('data', d => res.write(log2html(d)))
  rs.on('error', err => console.error(err.stack || err))
  rs.on('end', _ => {
    const tail = new Tail(logpath)
        , keepAlive = setInterval(_ => res.write('\u200b')/*zero-width space*/, 20000)

    tail.on('line', d => res.write(log2html(d)))
    tail.on('error', err => console.error(err.stack || err))

    res.on('close', _ => (clearInterval(keepAlive), tail.unwatch()))
  })
}
