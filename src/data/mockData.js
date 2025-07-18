export const mockOperations = [
  {
    id: 'op1',
    type: 'Cholecystectomy',
    patient: {
      id: 'P001',
      name: 'Ahmet Yılmaz',
      age: 35
    },
    doctor: {
      name: 'Dr. Mehmet Öz',
      specialty: 'General Surgery'
    },
    room: 'OR-1',
    scheduledTime: new Date(2025, 6, 18, 9, 0).toISOString(), // July 8, 2025 09:00
    status: 'in-progress'
  },
  {
    id: 'op2',
    type: 'Cholecystectomy',
    patient: {
      id: 'P002',
      name: 'Fatma Demir',
      age: 42
    },
    doctor: {
      name: 'Dr. Ayşe Kaya',
      specialty: 'General Surgery'
    },
    room: 'OR-2',
    scheduledTime: new Date(2025, 6, 19, 11, 30).toISOString(), // July 8, 2025 11:30
    status: 'scheduled'
  },
  {
    id: 'op3',
    type: 'Hernia Repair',
    patient: {
      id: 'P003',
      name: 'Mustafa Çelik',
      age: 58
    },
    doctor: {
      name: 'Dr. Ali Vural',
      specialty: 'General Surgery'
    },
    room: 'OR-3',
    scheduledTime: new Date(2025, 6, 20, 14, 0).toISOString(), // July 8, 2025 14:00
    status: 'scheduled'
  },
  {
    id: 'op4',
    type: 'Thyroidectomy',
    patient: {
      id: 'P004',
      name: 'Zeynep Ak',
      age: 29
    },
    doctor: {
      name: 'Dr. Hasan Özkan',
      specialty: 'Endocrine Surgery'
    },
    room: 'OR-1',
    scheduledTime: new Date(2025, 6, 21, 16, 0).toISOString(), // July 9, 2025 10:00
    status: 'scheduled'
  },
  {
    id: 'op5',
    type: 'Gallbladder Surgery',
    patient: {
      id: 'P005',
      name: 'Mehmet Kara',
      age: 45
    },
    doctor: {
      name: 'Dr. Zeynep Yurt',
      specialty: 'General Surgery'
    },
    room: 'OR-2',
    scheduledTime: new Date(2025, 6, 22, 8, 30).toISOString(), // July 10, 2025 08:30
    status: 'scheduled'
  }
]

export const mockEvents = [
  {
    id: 'ev1',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    type: 'start',
    description: 'Surgery started - Patient prepared and anesthesia administered',
    severity: 'low'
  },
  {
    id: 'ev2',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    type: 'incision',
    description: 'Initial incision made - 3cm incision at McBurney point',
    severity: 'medium'
  },
  {
    id: 'ev3',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
    type: 'monitoring',
    description: 'Vital signs stable - BP: 120/80, HR: 72, SpO2: 98%',
    severity: 'low'
  },
  {
    id: 'ev4',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    type: 'medication',
    description: 'Antibiotic administered - Cefazolin 1g IV',
    severity: 'low'
  },
  {
    id: 'ev5',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
    type: 'monitoring',
    description: 'Blood pressure slightly elevated - 135/85 mmHg',
    severity: 'medium'
  },
  {
    id: 'ev6',
    operationId: 'op1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    type: 'suture',
    description: 'Appendix successfully removed and area irrigated',
    severity: 'low'
  },
  {
    id: 'ev7',
    operationId: 'op2',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    type: 'start',
    description: 'Pre-operative preparation completed',
    severity: 'low'
  },
  {
    id: 'ev8',
    operationId: 'op4',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    type: 'start',
    description: 'Thyroidectomy completed successfully',
    severity: 'low'
  }
]