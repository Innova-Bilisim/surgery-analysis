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
    scheduledTime: new Date(2025, 6, 21, 9, 0).toISOString(), // July 8, 2025 09:00
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
    scheduledTime: new Date(2025, 6, 22, 11, 30).toISOString(), // July 8, 2025 11:30
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
    scheduledTime: new Date(2025, 6, 22, 14, 0).toISOString(), // July 8, 2025 14:00
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
    scheduledTime: new Date(2025, 6, 23, 16, 0).toISOString(), // July 9, 2025 10:00
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
    scheduledTime: new Date(2025, 6, 24, 8, 30).toISOString(), // July 10, 2025 08:30
    status: 'scheduled'
  }
]
