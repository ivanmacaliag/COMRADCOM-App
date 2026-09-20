export const mockMembers = [
  {
    callsign: 'K9-ALPHA',
    crcCallsign: 'C-101',
    name: 'Juan Dela Cruz',
    position: 'Team Leader',
    status: 'active',
    address: 'Metro Manila, PH',
    memberType: 'Officer',
    contact: '09123456789'
  },
  {
    callsign: 'BRAVO-7',
    crcCallsign: 'C-102',
    name: 'Maria Santos',
    position: 'Radio Operator',
    status: 'inactive',
    address: 'Cebu City, PH',
    memberType: 'Regular',
    contact: '09123456780'
  },
  {
    callsign: 'CHARLIE-1',
    crcCallsign: 'C-103',
    name: 'Pedro Penduko',
    position: 'Logistics',
    status: 'suspended',
    address: 'Davao City, PH',
    memberType: 'Probationary',
    contact: ''
  }
];

export const mockAlerts = [
  {
    title: 'Typhoon Warning (Signal No. 3)',
    author: 'HQ Admin',
    category: 'alert',
    content: 'All units in Region 3 please monitor frequency 146.020 Mhz closely. Evacuation operations underway.',
    createdAt: new Date(Date.now() - 3600000)
  },
  {
    title: 'Scheduled Maintenance',
    author: 'SysAdmin',
    category: 'warning',
    content: 'Zello Work server will undergo maintenance at 0200H tomorrow. Expect intermittent connections.',
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    title: 'New Member Orientation',
    author: 'Training Div',
    category: 'announcement',
    content: 'Welcome batch 2026! Orientation will be held this Saturday at 0800H via Zoom.',
    createdAt: new Date(Date.now() - 172800000)
  }
];

export const mockPosts = [
  {
    category: 'Activities',
    timestamp: new Date(),
    title: 'Medical Mission 2026',
    content: 'Successful medical mission conducted in Barangay San Roque. Thank you to all volunteers!',
    imageUrl: 'https://placehold.co/600x400',
    author: 'Community Team',
    location: 'San Roque, QC'
  },
  {
    category: 'Monitoring',
    timestamp: new Date(Date.now() - 50000000),
    title: 'Traffic Situation: EDSA Southbound',
    content: 'Heavy traffic buildup starting from Cubao due to vehicular accident. Please take alternate routes.',
    imageUrl: '',
    author: 'Traffic Unit',
    location: 'EDSA, Cubao'
  }
];

export const mockChannels = [
  { name: '146.020 Mhz', status: 'CONNECTED' },
  { name: 'Emergency Channel', status: 'DISCONNECTED' },
  { name: 'General Chat', status: 'DISCONNECTED' }
];
