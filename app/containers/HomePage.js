import React, { Component } from 'react'

import SDR from '../components/SDR'

export default class HomePage extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <SDR />
      </div>
    )
  }
}
