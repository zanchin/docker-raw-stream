var through = require('through2')

var decode = function() {
  var stdout = through()
  var stderr = through()
  var buffer = through()

  var size = 0
  var header = null

  var flush = function(cb) {
    stdout.end(function() {
      stderr.end(cb)
    })
  }

  var transform = function(data, enc, cb) {
    buffer.write(data)

    if (!header) {
      header = buffer.read(8)
      if (!header) return cb()

      if (header[0] === 1) next = stdout
      else next = stderr

      size = header.readUInt32BE(4)
    }

    var chunk = buffer.read(size)
    if (!chunk) return cb()

    header = null
    next.write(chunk, enc, cb)
  }

  var decoder = through(transform, flush)

  decoder.stdout = stdout
  decoder.stderr = stderr

  return decoder
}

var encode = function() {
  var flushes = 0

  var flush = function(cb) {
    if (++flushes === 2) return encoder.end(cb)
    cb()
  }

  var transformer = function(id) {
    return function(data, enc, cb) {
      var header = new Buffer([id,0,0,0,0,0,0,0])
      header.writeUInt32BE(data.length, 4)
      encoder.write(header)
      encoder.write(data, enc, cb)
    }
  }

  var encoder = through()

  encoder.stdout = through(transformer(1), flush)
  encoder.stderr = through(transformer(2), flush)

  return encoder
}

module.exports = decode
module.exports.decode = decode
module.exports.encode = encode