import { encode, decode } from './encoder'

function data(_r) {
  return 'data'
}

async function handleRequest(r) {
  const body = r.requestText || ''
  const encoded = encode(body)
  const decoded = decode(encoded)
  r.log(`${body}, ${encoded.length}`)
  return r.return(
    200,
    `body: ${body}\nencoded: ${encoded}\ndecoded: ${decoded}`
  )
}

export default {
  handleRequest,
  data,
}
