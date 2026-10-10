import React, { useEffect, useState } from 'react';

// Airplane Icon
const AirplaneIcon = ({ color = '#38bdf8', size = 18, rotation = 0 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.5s ease',
      filter: `drop-shadow(0px 0px 4px ${color})`
    }}
  >
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

export default function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('AOC'); // 'AOC' or 'PASSENGER'
  const [delayScenarioMin, setDelayScenarioMin] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState('');

  // Selected Flight for Modal
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Real SMS Target Input State
  const [targetPhoneNumber, setTargetPhoneNumber] = useState('+971500000000');

  // Interactive Map State: Coordinates for Passenger and Buggy
  const [passengerPos, setPassengerPos] = useState({ x: 20, y: 50 });
  const [buggyPos, setBuggyPos] = useState({ x: 80, y: 50 });
  const [isBuggyMoving, setIsBuggyMoving] = useState(false);

  // SMS Chat Log State
  const [passengerMessages, setPassengerMessages] = useState([
    { id: 1, time: '10:14 AM', type: 'system', text: 'Welcome to Dubai International Airport (DXB). Connected flight EK-201 departs Gate B04.' }
  ]);

  // Voice speech synthesis
  const speakAlert = (text) => {
    if (soundEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Dispatch Action Alert + SMS Trigger
  const triggerActionAlert = async (message, voiceText, smsText) => {
    setNotification(message);
    if (voiceText) speakAlert(voiceText);

    if (smsText) {
      setPassengerMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'alert',
          text: smsText
        }
      ]);

      try {
        await fetch('http://localhost:3001/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: targetPhoneNumber, message: smsText })
        });
      } catch (e) {
        // Fallback for demo when backend server isn't linked to Twilio
      }
    }
    setTimeout(() => setNotification(''), 4000);
  };

  // Simulate Autonomous Buggy Movement across terminal map
  const animateBuggyToPassenger = () => {
    setIsBuggyMoving(true);
    triggerActionAlert(
      '🏎️ Autonomous Buggy Dispatched! Dispatching across Concourse A...',
      'Autonomous Buggy dispatched to passenger BLE location.',
      '🚙 DXB ALERT: Driverless Shuttle #04 is en route to BLE Beacon #A12.'
    );

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setBuggyPos((prev) => ({
        x: prev.x - (prev.x - passengerPos.x) * 0.2,
        y: prev.y - (prev.y - passengerPos.y) * 0.2
      }));

      if (step >= 12) {
        clearInterval(interval);
        setIsBuggyMoving(false);
        setPassengerMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'alert',
            text: '✅ DXB ALERT: Buggy arrived at your location (BLE Beacon #A12).'
          }
        ]);
      }
    }, 400);
  };

  const fetchLiveFlights = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/live-flights');
      const data = await response.json();
      if (data.success) {
        setFlights(data.flights);
      } else {
        generateDemoDataset();
      }
    } catch (err) {
      generateDemoDataset();
    } finally {
      setLoading(false);
    }
  };

  const generateDemoDataset = () => {
    const demo = [
      { id: '1', callsign: 'UAE201', originCountry: 'United Kingdom', distanceToHubKm: 145, layoverMarginMin: 22, riskLevel: 'HIGH', rfidTag: 'DXB-9831-A', radarAngle: 45 },
      { id: '2', callsign: 'UAE505', originCountry: 'India', distanceToHubKm: 210, layoverMarginMin: 45, riskLevel: 'LOW', rfidTag: 'DXB-1022-B', radarAngle: 120 },
      { id: '3', callsign: 'UAE413', originCountry: 'Australia', distanceToHubKm: 85, layoverMarginMin: 30, riskLevel: 'MEDIUM', rfidTag: 'DXB-4410-C', radarAngle: 210 },
      { id: '4', callsign: 'UAE012', originCountry: 'Germany', distanceToHubKm: 180, layoverMarginMin: 18, riskLevel: 'HIGH', rfidTag: 'DXB-7719-D', radarAngle: 300 },
      { id: '5', callsign: 'UAE302', originCountry: 'Japan', distanceToHubKm: 120, layoverMarginMin: 55, riskLevel: 'LOW', rfidTag: 'DXB-3381-E', radarAngle: 340 }
    ];
    setFlights(demo);
  };

  useEffect(() => {
    fetchLiveFlights();
    const interval = setInterval(fetchLiveFlights, 12000);
    return () => clearInterval(interval);
  }, []);

  const processedFlights = flights.map((flight, idx) => {
    const adjustedLayover = Math.max(0, flight.layoverMarginMin - delayScenarioMin);
    const arrivalGate = `A${(idx % 12) + 1}`;
    const departureGate = `B${((idx + 4) % 15) + 1}`;
    const walkTimeMin = 22 + (idx % 5);
    const buggyTimeMin = 5;
    const radarAngle = flight.radarAngle || (idx * 72);

    const bleBeacons = [
      'BLE-Beacon #A12 (Concourse A Central Duty Free)',
      'BLE-Beacon #A04 (Concourse A Security Hub)',
      'BLE-Beacon #T3-Transit (Train Transfer Level 2)',
      'Wi-Fi AP #B02 (Concourse B Food Court)'
    ];
    const passengerLocation = bleBeacons[idx % bleBeacons.length];

    let riskLevel = flight.riskLevel;
    let rfidStatus = 'In Transit - Normal Sorting Belt';
    let rfidBadge = styles.baggageNormal;

    if (adjustedLayover < walkTimeMin) {
      riskLevel = 'HIGH';
      rfidStatus = '⚡ CRITICAL: Auto Fast-Track High-Speed Chute';
      rfidBadge = styles.baggageExpress;
    } else if (adjustedLayover < 38) {
      riskLevel = 'MEDIUM';
      rfidStatus = '⚠️ PRIORITY: RFID High-Priority Tagged';
      rfidBadge = styles.baggagePriority;
    }

    return {
      ...flight,
      arrivalGate,
      departureGate,
      walkTimeMin,
      buggyTimeMin,
      passengerLocation,
      effectiveLayover: adjustedLayover,
      effectiveRisk: riskLevel,
      rfidStatus,
      rfidBadge,
      radarAngle
    };
  });

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      {notification && <div style={styles.toast}>📡 {notification}</div>}

      <header style={styles.header}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.aocBadge}>AOC COMMAND CONSOLE</span>
            <span style={styles.hubBadge}>HUB: DXB TERMINAL 3</span>
            {delayScenarioMin > 0 && (
              <span style={styles.scenarioActiveBadge}>
                ⚠️ SIMULATED STORM DELAY (+{delayScenarioMin} MINS)
              </span>
            )}
          </div>
          <h1 style={styles.title}>AIRPORT CONNECTION GUARDIAN</h1>
          <p style={styles.subtitle}>Autonomous Layover Protection, BLE Indoor Map & RFID Baggage Transfer</p>
        </div>

        <div style={styles.actions}>
          <div style={styles.toggleGroup}>
            <button
              onClick={() => setActiveView('AOC')}
              style={{ ...styles.toggleBtn, ...(activeView === 'AOC' ? styles.toggleActive : {}) }}
            >
              🖥️ Ground Ops Panel
            </button>
            <button
              onClick={() => setActiveView('PASSENGER')}
              style={{ ...styles.toggleBtn, ...(activeView === 'PASSENGER' ? styles.toggleActive : {}) }}
            >
              📱 Passenger Mobile View
            </button>
          </div>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              triggerActionAlert(
                soundEnabled ? '🔇 Voice Alerts Muted' : '🔊 Voice Alerts Active',
                soundEnabled ? '' : 'Voice alerts activated'
              );
            }}
            style={styles.soundButton}
          >
            {soundEnabled ? '🔊 VOICE ON' : '🔇 VOICE OFF'}
          </button>
        </div>
      </header>

      {activeView === 'AOC' ? (
        <>
          {/* Delay Injectors */}
          <div style={styles.scenarioBar}>
            <span style={styles.scenarioTitle}>⚡ PREDICTIVE DELAY ANALYTICS INJECTOR:</span>
            <button
              onClick={() => {
                setDelayScenarioMin(25);
                triggerActionAlert(
                  '🌪️ Sandstorm Delay Injected (+25m). Express Buggies & High-Speed Baggage Chutes Dispatched!',
                  'Sandstorm delay detected. Critical layover margins. Autonomous buggies and RFID chutes activated.',
                  '🚨 DXB ALERT: Sandstorm delay detected. Baggage tagged for High-Speed Express Chute.'
                );
              }}
              style={{ ...styles.scenarioBtn, backgroundColor: '#991b1b', color: '#fca5a5' }}
            >
              🌪️ Inject Sandstorm (+25m)
            </button>

            <button
              onClick={() => {
                setDelayScenarioMin(15);
                triggerActionAlert(
                  '⏱️ Runway Delay Injected (+15m)',
                  'Runway congestion delay injected.',
                  '⚠️ DXB NOTICE: Runway delay detected. RFID Baggage priority transfer activated.'
                );
              }}
              style={{ ...styles.scenarioBtn, backgroundColor: '#854d0e', color: '#fef08a' }}
            >
              ⏱️ Inject Runway Delay (+15m)
            </button>

            {delayScenarioMin > 0 && (
              <button
                onClick={() => {
                  setDelayScenarioMin(0);
                  triggerActionAlert(
                    '✅ Operations Reset to Nominal',
                    'Simulation cleared.',
                    '✅ DXB NOTICE: Standard schedule restored.'
                  );
                }}
                style={{ ...styles.scenarioBtn, backgroundColor: '#166534', color: '#86efac' }}
              >
                🔄 Reset Operations
              </button>
            )}
          </div>

          {/* RFID Baggage Status Summary */}
          <div style={styles.rfidSummaryCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.85rem' }}>
                🧳 RFID BAGGAGE EXPRESS SORTING MONITOR
              </span>
              <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold' }}>
                ● 100% SCANNER READ RATE
              </span>
            </div>
            <div style={styles.rfidGrid}>
              {processedFlights.map((flight) => (
                <div key={flight.id} style={styles.rfidItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <strong style={{ color: '#f8fafc' }}>{flight.callsign} ({flight.rfidTag})</strong>
                    <span style={{ color: '#94a3b8' }}>Gate {flight.arrivalGate} ➔ {flight.departureGate}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                    <span style={flight.rfidBadge}>{flight.rfidStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Map */}
          <div style={styles.mapSection}>
            <div style={styles.mapHeader}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#38bdf8' }}>
                  🗺️ LIVE INDOOR TERMINAL 3 MAP (BLE BEACON TRACKING)
                </span>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Concourse A ➔ Concourse B Express Route • Auto-Rerouting Engine
                </div>
              </div>

              <button onClick={animateBuggyToPassenger} style={styles.mapActionBtn}>
                🚙 Dispatch Autonomous Buggy
              </button>
            </div>

            <div style={styles.terminalMapCanvas}>
              <div style={{ ...styles.concourseZone, left: '3%', top: '15%', width: '32%', height: '70%' }}>
                <span style={styles.zoneLabel}>CONCOURSE A (Arriving)</span>
              </div>
              <div style={{ ...styles.concourseZone, left: '38%', top: '35%', width: '24%', height: '30%', borderStyle: 'dashed' }}>
                <span style={{ ...styles.zoneLabel, color: '#f59e0b', textAlign: 'center' }}>EXPRESS TRANSIT TUNNEL</span>
              </div>
              <div style={{ ...styles.concourseZone, right: '3%', top: '15%', width: '32%', height: '70%' }}>
                <span style={styles.zoneLabel}>CONCOURSE B (Departing)</span>
              </div>

              <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                <line
                  x1={`${passengerPos.x}%`}
                  y1={`${passengerPos.y}%`}
                  x2={`${buggyPos.x}%`}
                  y2={`${buggyPos.y}%`}
                  stroke={isBuggyMoving ? '#10b981' : '#38bdf8'}
                  strokeWidth="3"
                  strokeDasharray={isBuggyMoving ? '6,6' : '0'}
                />
              </svg>

              <div
                style={{
                  ...styles.mapMarker,
                  left: `${passengerPos.x}%`,
                  top: `${passengerPos.y}%`,
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 12px #ef4444'
                }}
              >
                👤
                <span style={styles.markerToolTip}>Passenger (EK-201)<br/>📍 BLE Beacon #A12</span>
              </div>

              <div
                style={{
                  ...styles.mapMarker,
                  left: `${buggyPos.x}%`,
                  top: `${buggyPos.y}%`,
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 12px #10b981'
                }}
              >
                🚙
                <span style={styles.markerToolTip}>
                  {isBuggyMoving ? '⚡ Shuttle #04 (IN TRANSIT)' : 'Shuttle #04 (Standby)'}
                </span>
              </div>
            </div>
          </div>

          {/* Radar Scope */}
          <div style={styles.radarContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
              <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold' }}>
                📡 TACTICAL ADS-B RADAR SCOPE (DXB HUB INBOUND TRAJECTORY)
              </span>
              <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold' }}>● LIVE FEED ACTIVE</span>
            </div>

            <div style={styles.radarScope}>
              <div style={styles.radarRing1} />
              <div style={styles.radarRing2} />
              <div style={styles.radarCrossH} />
              <div style={styles.radarCrossV} />
              <div style={styles.radarSweep} />

              <div style={styles.radarCenterHub}>
                <span>DXB</span>
              </div>

              {processedFlights.map((flight) => {
                const distanceRatio = Math.min(1, flight.distanceToHubKm / 250);
                const angleRad = (flight.radarAngle * Math.PI) / 180;
                const radiusPx = distanceRatio * 110;
                const cx = 150 + radiusPx * Math.cos(angleRad);
                const cy = 150 + radiusPx * Math.sin(angleRad);

                const isHighRisk = flight.effectiveRisk === 'HIGH';

                return (
                  <div
                    key={flight.id}
                    onClick={() => setSelectedFlight(flight)}
                    style={{
                      position: 'absolute',
                      left: `${cx}px`,
                      top: `${cy}px`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      zIndex: 5
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: isHighRisk ? '#ef4444' : '#38bdf8',
                        animation: isHighRisk ? 'pulseGlow 1.2s infinite' : 'none',
                        boxShadow: `0 0 10px ${isHighRisk ? '#ef4444' : '#38bdf8'}`
                      }}
                    />
                    <span style={styles.radarLabel}>
                      {flight.callsign} ({flight.effectiveLayover}m)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flight Monitoring Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>CALLSIGN</th>
                  <th style={styles.th}>ROUTE</th>
                  <th style={styles.th}>WALK vs BUGGY</th>
                  <th style={styles.th}>LAYOVER MARGIN</th>
                  <th style={styles.th}>RFID BAGGAGE TRANSFER</th>
                  <th style={styles.th}>RISK</th>
                  <th style={styles.th}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {processedFlights.map((flight) => (
                  <tr key={flight.id} style={styles.tr}>
                    <td style={styles.tdCallsign}>
                      <AirplaneIcon color={flight.effectiveRisk === 'HIGH' ? '#ef4444' : '#38bdf8'} size={14} />
                      <span style={{ marginLeft: '6px' }}>{flight.callsign}</span>
                    </td>
                    <td style={styles.td}>Gate {flight.arrivalGate} ➔ Gate {flight.departureGate}</td>
                    <td style={styles.td}>🚶 {flight.walkTimeMin}m | 🚙 {flight.buggyTimeMin}m</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 'bold', color: flight.effectiveLayover < flight.walkTimeMin ? '#ef4444' : '#10b981' }}>
                        {flight.effectiveLayover} mins
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={flight.rfidBadge}>{flight.rfidStatus}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={flight.effectiveRisk === 'HIGH' ? styles.badgeHigh : flight.effectiveRisk === 'MEDIUM' ? styles.badgeMedium : styles.badgeLow}>
                        {flight.effectiveRisk}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => setSelectedFlight(flight)} style={styles.inspectButton}>
                        INSPECT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* PASSENGER MOBILE VIEW */
        <div style={styles.passengerScreenWrapper}>
          <div style={styles.phoneMockup}>
            <div style={styles.phoneHeader}>
              <span>📶 DXB Guest Wi-Fi</span>
              <span>10:24 AM</span>
              <span>🔋 98%</span>
            </div>

            <div style={styles.phoneAppHeader}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>📱 SMS & WhatsApp Assistant</div>
              <div style={{ fontSize: '0.65rem', color: '#10b981' }}>Target Number: {targetPhoneNumber}</div>
            </div>

            <div style={styles.phoneCard}>
              <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                SEND REAL SMS TO YOUR MOBILE:
              </label>
              <input
                type="text"
                value={targetPhoneNumber}
                onChange={(e) => setTargetPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                style={styles.phoneNumberInput}
              />
            </div>

            <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold', margin: '0.5rem 0' }}>
              💬 CONTEXTUAL PUSH MESSAGES
            </div>
            <div style={styles.smsContainer}>
              {passengerMessages.map((msg) => (
                <div key={msg.id} style={msg.type === 'alert' ? styles.smsBubbleAlert : styles.smsBubbleSystem}>
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.2rem' }}>{msg.time} • DXB Guardian</div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                animateBuggyToPassenger();
                setActiveView('AOC');
              }}
              style={styles.requestBuggyBtn}
            >
              🚙 Request Buggy Dispatch
            </button>
          </div>
        </div>
      )}

      {selectedFlight && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFlight(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 'bold' }}>MANUAL ACTION CONSOLE</span>
                <h2 style={{ margin: 0, color: '#f8fafc' }}>FLIGHT {selectedFlight.callsign}</h2>
              </div>
              <button onClick={() => setSelectedFlight(null)} style={styles.closeButton}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
              <p><strong>Passenger BLE Position:</strong> {selectedFlight.passengerLocation}</p>
              <p><strong>RFID Tag:</strong> {selectedFlight.rfidTag}</p>
              <p><strong>Baggage Transfer Mode:</strong> <span style={{ color: '#10b981' }}>{selectedFlight.rfidStatus}</span></p>
              <p><strong>Layover Margin:</strong> <span style={{ color: '#ef4444' }}>{selectedFlight.effectiveLayover} mins</span></p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  animateBuggyToPassenger();
                  setSelectedFlight(null);
                }}
                style={styles.actionBtnPrimary}
              >
                🚙 Dispatch Shuttle on Map
              </button>
              <button
                onClick={() => {
                  triggerActionAlert(
                    `📱 SMS Fast-Pass sent to ${targetPhoneNumber}`,
                    `SMS dispatched to passenger.`,
                    `🎫 DXB FAST-PASS: Scan QR at Gate ${selectedFlight.departureGate} Security. Baggage RFID: Express chute loaded.`
                  );
                  setSelectedFlight(null);
                }}
                style={styles.actionBtnSecondary}
              >
                💬 Dispatch Real SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#070a12', color: '#cbd5e1', minHeight: '100vh', padding: '1.5rem', fontFamily: '"JetBrains Mono", monospace' },
  toast: { position: 'fixed', top: '20px', right: '20px', backgroundColor: '#0284c7', color: '#ffffff', padding: '0.8rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', zIndex: 2000, boxShadow: '0 8px 16px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #1e293b', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' },
  badgeRow: { display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' },
  aocBadge: { backgroundColor: '#1e293b', color: '#00f2fe', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '3px', fontWeight: 'bold' },
  hubBadge: { backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '3px' },
  scenarioActiveBadge: { backgroundColor: '#7f1d1d', color: '#fca5a5', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '3px', fontWeight: 'bold' },
  title: { margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: '800' },
  subtitle: { margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  toggleGroup: { display: 'flex', backgroundColor: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' },
  toggleBtn: { backgroundColor: 'transparent', color: '#94a3b8', border: 'none', padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' },
  toggleActive: { backgroundColor: '#0284c7', color: '#fff' },
  soundButton: { backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #0284c7', padding: '0.4rem 0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' },
  scenarioBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#0f172a', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '1rem', flexWrap: 'wrap' },
  scenarioTitle: { fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' },
  scenarioBtn: { border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' },
  rfidSummaryCard: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' },
  rfidGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
  rfidItem: { backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.6rem' },
  baggageNormal: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  baggagePriority: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  baggageExpress: { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  mapSection: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
  mapActionBtn: { backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' },
  terminalMapCanvas: { position: 'relative', width: '100%', height: '240px', backgroundColor: '#030712', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' },
  concourseZone: { position: 'absolute', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #0284c7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', textAlign: 'center' },
  zoneLabel: { fontSize: '0.65rem', fontWeight: 'bold', color: '#38bdf8' },
  mapMarker: { position: 'absolute', transform: 'translate(-50%, -50%)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.4s ease' },
  markerToolTip: { position: 'absolute', top: '32px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.55rem', whiteSpace: 'nowrap', zIndex: 15 },
  radarContainer: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  radarScope: { position: 'relative', width: '300px', height: '300px', borderRadius: '50%', backgroundColor: '#020617', border: '2px solid #0284c7', overflow: 'hidden', margin: '0.5rem 0' },
  radarRing1: { position: 'absolute', top: '75px', left: '75px', width: '150px', height: '150px', borderRadius: '50%', border: '1px dashed rgba(56, 189, 248, 0.3)', pointerEvents: 'none' },
  radarRing2: { position: 'absolute', top: '25px', left: '25px', width: '250px', height: '250px', borderRadius: '50%', border: '1px solid rgba(56, 189, 248, 0.15)', pointerEvents: 'none' },
  radarCrossH: { position: 'absolute', top: '150px', left: 0, width: '100%', height: '1px', backgroundColor: 'rgba(56, 189, 248, 0.2)', pointerEvents: 'none' },
  radarCrossV: { position: 'absolute', top: 0, left: '150px', width: '1px', height: '100%', backgroundColor: 'rgba(56, 189, 248, 0.2)', pointerEvents: 'none' },
  radarSweep: { position: 'absolute', top: 0, left: 0, width: '300px', height: '300px', borderRadius: '50%', background: 'conic-gradient(from 0deg at 50% 50%, rgba(56, 189, 248, 0.25) 0deg, transparent 60deg, transparent 360deg)', animation: 'radarSpin 4s linear infinite', pointerEvents: 'none' },
  radarCenterHub: { position: 'absolute', top: '150px', left: '150px', transform: 'translate(-50%, -50%)', backgroundColor: '#0284c7', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 4 },
  radarLabel: { position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#38bdf8', padding: '1px 4px', borderRadius: '3px', fontSize: '0.55rem', whiteSpace: 'nowrap', border: '1px solid #334155' },
  tableContainer: { backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#1e293b' },
  th: { padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { padding: '0.75rem 1rem', fontSize: '0.8rem' },
  tdCallsign: { padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  badgeHigh: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold' },
  badgeMedium: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold' },
  badgeLow: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold' },
  inspectButton: { backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #0284c7', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' },
  passengerScreenWrapper: { display: 'flex', justifyContent: 'center', padding: '1rem' },
  phoneMockup: { width: '340px', backgroundColor: '#020617', border: '4px solid #334155', borderRadius: '24px', padding: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' },
  phoneHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' },
  phoneAppHeader: { marginBottom: '0.75rem' },
  phoneCard: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' },
  phoneNumberInput: { width: '100%', backgroundColor: '#070a12', border: '1px solid #334155', color: '#fff', padding: '0.4rem', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px', boxSizing: 'border-box' },
  smsContainer: { backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: '8px', height: '180px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' },
  smsBubbleSystem: { backgroundColor: '#1e293b', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontSize: '0.7rem', maxWidth: '85%' },
  smsBubbleAlert: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '0.5rem', borderRadius: '6px', fontSize: '0.7rem', maxWidth: '85%', border: '1px solid #ef4444' },
  requestBuggyBtn: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: '0', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  modalContent: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  closeButton: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1rem', cursor: 'pointer' },
  actionBtnPrimary: { flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' },
  actionBtnSecondary: { flex: 1, backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #0284c7', padding: '0.6rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }
};