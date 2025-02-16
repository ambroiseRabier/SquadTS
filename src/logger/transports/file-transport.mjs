import { createWriteStream } from 'node:fs'

export default (options) => {
  return createWriteStream(options.destination)
}
