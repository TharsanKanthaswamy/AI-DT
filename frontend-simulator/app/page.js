'use client'

import { useState } from 'react'
import './globals.css'

export default function Simulator() {
  const [signalData, setSignalData] = useState({
    udi: 1,
    product_type: 'L',
    air_temp: 298.1,
    process_temp: 308.6,
    rpm: 1551,
    torque: 42.8,
    tool_wear: 0,
    failure_type: null
  })

  const [status, setStatus] = useState('Ready')

  const sendSignal = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/machine-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signalData)
      })
      const data = await response.json()
      setStatus(`Signal sent! ID: ${data.signal_id}`)

      // Auto-increment UDI for next signal
      setSignalData(prev => ({ ...prev, udi: prev.udi + 1 }))
    } catch (error) {
      setStatus('Error: Could not connect to backend')
      console.error(error)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🏭 Production Line Simulator</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Simulates machine signals sent to Digital Twin
      </p>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Machine Parameters</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            UDI (Unique Device Identifier): {signalData.udi}
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Product Type:
          </label>
          <select
            value={signalData.product_type}
            onChange={(e) => setSignalData({ ...signalData, product_type: e.target.value })}
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="L">L (Low)</option>
            <option value="M">M (Medium)</option>
            <option value="H">H (High)</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Air Temperature: {signalData.air_temp.toFixed(1)} K
          </label>
          <input
            type="range"
            min="295"
            max="305"
            step="0.1"
            value={signalData.air_temp}
            onChange={(e) => setSignalData({ ...signalData, air_temp: parseFloat(e.target.value) })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Process Temperature: {signalData.process_temp.toFixed(1)} K
          </label>
          <input
            type="range"
            min="305"
            max="315"
            step="0.1"
            value={signalData.process_temp}
            onChange={(e) => setSignalData({ ...signalData, process_temp: parseFloat(e.target.value) })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Rotational Speed (RPM): {signalData.rpm}
          </label>
          <input
            type="range"
            min="1000"
            max="3000"
            value={signalData.rpm}
            onChange={(e) => setSignalData({ ...signalData, rpm: parseInt(e.target.value) })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Torque: {signalData.torque.toFixed(1)} Nm
          </label>
          <input
            type="range"
            min="20"
            max="80"
            step="0.1"
            value={signalData.torque}
            onChange={(e) => setSignalData({ ...signalData, torque: parseFloat(e.target.value) })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Tool Wear: {signalData.tool_wear} min
          </label>
          <input
            type="range"
            min="0"
            max="250"
            value={signalData.tool_wear}
            onChange={(e) => setSignalData({ ...signalData, tool_wear: parseInt(e.target.value) })}
          />
        </div>

        <button
          onClick={sendSignal}
          style={{
            background: '#007bff',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            width: '100%'
          }}
        >
          Send Signal to Digital Twin
        </button>

        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Status:</strong> {status}
        </div>
      </div>
    </div>
  )
}
