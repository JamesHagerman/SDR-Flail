
import React, { Component } from 'react'

const dgram = require('dgram')
let server

let canvasStyle = {
  position: 'absolute',
  left: 0,
  top: '75px',
  zIndex: -1
}

export default class SDR extends Component {
  constructor(props) {
    super(props)

    this.state = {
      serverListening: false,
      receivedCount: 0,
      rfData: []
    }
    this.startListening = this.startListening.bind(this)
    this.stopListening = this.stopListening.bind(this)
    this.updateCanvas = this.updateCanvas.bind(this)

    this.handleData = this.handleData.bind(this)
  }

  componentDidMount() {
    this.updateCanvas()
  }

  componentDidUpdate() {
    this.updateCanvas()
  }

  handleData(msg, rinfo) {
    // Floating point numbers:
    // GNU Radio uses IEEE-754 Floating point for it's binary float format
    // 1 bit Sign
    // 8 bits Exponent
    // 23 bits Mantissa
    //
    // Thus, a value of -1 will send these bytes, in order:
    // 0x0
    // 0x0
    // 0x128 = 0b10000000 (exponent LSB and 7 mantissa bits)
    // 0x191 = 0b10111111 (sign and 7 exponent bits)
    //
    // Thus, 32 bit value of -1 is:
    // 0b10111111 10000000 00000000 00000000
    //
    // Complex numbers:
    // Apparently, it's just two floats. One for real (sent first), one for
    // imaginary (sent second)
    //
    // Thus, a value of (-1 + 1j) will send these bytes, in order:
    // 0x0
    // 0x0
    // 0x128
    // 0x191
    // 0x0
    // 0x0
    // 0x128
    // 0x63
    //
    let byteString = ''
    let bytes = []
    let empty = true
    for (let i = 0; i < msg.length; i++) {
      if (empty) {
        empty = (msg[i] === 0)
      }
      byteString = byteString + msg[i].toString(16) + ' '
      bytes.push(msg[i])
    }
    if (!empty) {
      console.log(`length: ${msg.length} data: ${byteString}`)
      this.setState({ receivedCount: this.state.receivedCount + 1, rfData: bytes })
    }

    // Only let one packet come through (so we don't flood the console)
    this.stopListening()
  }

  startListening() {
    if (!server || server._receiving !== true) {
      console.log('starting server...')
      server = dgram.createSocket('udp4')

      server.on('error', (err) => {
        console.log(`server error:\n${err.stack}`)
        server.close()
      })

      server.on('message', this.handleData)

      server.on('listening', () => {
        const address = server.address()
        console.log(`server listening ${address.address}:${address.port}`)
      })

      server.bind(41234)
      console.log('server listening on port 41234', server)

      this.setState({serverListening: true, receivedCount: 0, rfData: []})
    } else {
      console.log('server already started...')
    }
  }

  stopListening() {
    if (server && server._receiving === true) {
      console.log('stopping server...', server)
      server.close()
      this.setState({ serverListening: false })
    } else {
      console.log('no server started...')
    }
  }

  updateCanvas() {
    const canvas = this.refs.canvas
    canvas.width  = window.innerWidth - 16
    canvas.height = window.innerHeight - 16
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgb(200, 0, 0)'
    ctx.fillRect(0, 0, 1, 1024)
    ctx.fillRect(255, 0, 1, 1024)

    if (this.state.rfData.length > 0) {
      ctx.fillStyle = 'rgb(0, 0, 0)'
      const cutoff = Math.min(this.state.rfData.length, 1024)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      this.state.rfData.forEach((value, i) => {
        console.log('data:', i, value)
      })
      // for (let i = 0; i < cutoff/4; i+=1) {
      // //   // ctx.fillRect(this.state.rfData[i], i, 1, 1)
      // //   if (i < 4) {
      //     console.log('data:', i, this.state.rfData[i])
      // //   }
      // //   ctx.lineTo(this.state.rfData[i],i);

      // }
      console.log('----')
      ctx.strokeStyle = 'rgb(255,255,255)'
      ctx.stroke()
    }
  }

  render() {
    return (
      <div>
        <canvas style={canvasStyle} ref='canvas'/>
        <div>
          <span>Server Status: {this.state.serverListening ? 'Listening on port 41234' : 'Not Listening'}</span><br />

          Stuff received: {this.state.receivedCount} <br />

          <button onClick={this.startListening}>Start Server</button>
          <button onClick={this.stopListening}>Stop Server</button>
          <br />
          {/* Raw Data: {this.state.rfData} */}
        </div>
      </div>
    )
  }
}
