
import React, { Component } from 'react'

const dgram = require('dgram')
let server

let canvasStyle = {
  position: 'absolute',
  left: 0,
  top: '75px',
  zIndex: -1
}

let currentYPos = 0

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
    this.canvas = this.refs.canvas
    this.canvas.width  = window.innerWidth - 16
    this.canvas.height = window.innerHeight - 16
    this.ctx = this.canvas.getContext('2d')

    this.updateCanvas()
  }

  componentDidUpdate() {
    this.updateCanvas()
  }

  handleData(msg, rinfo) {
    // Floating point numbers:
    // GNU Radio uses IEEE-754 Floating point for it's binary float format
    //
    // Complex numbers:
    // GNU Radio uses 2 IEEE-754 floats for complex values. One for real (sent first), one for
    // imaginary (sent second)
    //
    // TODO: This method should probably handle multiple data types...
    let rfData = []

    // Use Buffer.readFloatLE() to parse a float off of the buffer:
    // console.warn('oh man i am dumb', msg.readFloatLE(0))

    if (msg.length !== 0) {
      for (let i = 0; i < msg.length/4; i+=4) {
        rfData.push(msg.readFloatLE(i))
      }
      // console.log(`length: ${msg.length} rfData: ${rfData} rfData.length: ${rfData.length}`)
      this.setState({ receivedCount: this.state.receivedCount + 1, rfData: rfData })
    }

    // Debug: Only let one packet come through (so we don't flood the console)
    // this.stopListening()
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

    this.ctx.fillStyle = 'rgb(200, 0, 0)'
    this.ctx.fillRect(0, 0, 1, 1024)
    this.ctx.fillRect(255, 0, 1, 1024)

    if (this.state.rfData.length > 0) {
      this.ctx.fillStyle = 'rgb(0, 0, 0)'
      const cutoff = Math.min(this.state.rfData.length, 1024)
      this.ctx.beginPath()
      // this.ctx.moveTo(0, 0)

      this.state.rfData.forEach((value, i) => {
        // this.ctx.fillRect(this.state.rfData[i], i, 1, 1)
        currentYPos += 1
        if (currentYPos > 512) {
          currentYPos = 0
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.fillRect(0, 0, 1, 1024)
          this.ctx.fillRect(255, 0, 1, 1024)
        }
        this.ctx.lineTo(this.state.rfData[i]+127, currentYPos);
      })
      this.ctx.strokeStyle = 'rgb(255,255,255)'
      this.ctx.stroke()
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
