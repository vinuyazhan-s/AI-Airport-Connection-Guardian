const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock Live Flights API endpoint
app.get('/api/live-flights', (req, res) => {
  res.json({
    success: true,
    flights: [
      { id: '1', callsign: 'UAE201', originCountry: 'United Kingdom', distanceToHubKm: 145, layoverMarginMin: 22, riskLevel: 'HIGH', rfidTag: 'DXB-9831-A', radarAngle: 45 },
      { id: '2', callsign: 'UAE505', originCountry: 'India', distanceToHubKm: 210, layoverMarginMin: 45, riskLevel: 'LOW', rfidTag: 'DXB-1022-B', radarAngle: 120 },
      { id: '3', callsign: 'UAE413', originCountry: 'Australia', distanceToHubKm: 85, layoverMarginMin: 30, riskLevel: 'MEDIUM', rfidTag: 'DXB-4410-C', radarAngle: 210 },
      { id: '4', callsign: 'UAE012', originCountry: 'Germany', distanceToHubKm: 180, layoverMarginMin: 18, riskLevel: 'HIGH', rfidTag: 'DXB-7719-D', radarAngle: 300 },
      { id: '5', callsign: 'UAE302', originCountry: 'Japan', distanceToHubKm: 120, layoverMarginMin: 55, riskLevel: 'LOW', rfidTag: 'DXB-3381-E', radarAngle: 340 }
    ]
  });
});

// Mock or Twilio SMS Handler endpoint
app.post('/api/send-sms', async (req, res) => {
  const { phoneNumber, message } = req.body;
  console.log(`[SMS Gateway] Sending to ${phoneNumber}: "${message}"`);
  
  // Here you can integrate real Twilio SDK if needed:
  // client.messages.create({ body: message, from: '+...', to: phoneNumber })
  
  res.json({ success: true, status: 'SMS Dispatched successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Airport Guardian Backend running on http://localhost:${PORT}`);
});