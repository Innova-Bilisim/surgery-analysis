'use client'

import { useState } from 'react'
import { Calendar, Clock, User, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import useOperation from '@/hooks/useOperation'

const OperationSelection = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Use custom hook for business logic
  const { 
    navigateToOperation, 
    getOperationsForDate,
    formatTime,
    formatDate,
    getOperationStatusColor,
    getOperationStatusText
  } = useOperation()

  const handleOperationSelect = (operation) => {
    navigateToOperation(operation.id)
  }



  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newDate)
  }

  const selectedOperations = getOperationsForDate(selectedDate)
  const calendarDays = getDaysInMonth(currentMonth)

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-8 overflow-hidden flex flex-col">
      {/* Header - FIXED */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-lg flex-shrink-0 min-h-[80px]">
        <div className="flex items-center gap-4">
          <Calendar className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <h1 className="text-3xl font-semibold text-gray-900 whitespace-nowrap">Operation Calendar</h1>
        </div>
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <span className="text-xl font-semibold text-gray-900 whitespace-nowrap">{formatDate(selectedDate)}</span>
          <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            {selectedOperations.length} Operation{selectedOperations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Calendar Section - FIXED */}
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[500px]">
          <div className="flex justify-between items-center mb-8 flex-shrink-0 min-h-[60px]">
            <button 
              onClick={() => navigateMonth('prev')} 
              className="bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-all duration-200 hover:scale-105 flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 px-4 text-center flex-grow">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={() => navigateMonth('next')} 
              className="bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-all duration-200 hover:scale-105 flex-shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-2 mb-4 flex-shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 p-3 text-sm">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days */}
            <div className="grid grid-cols-7 gap-2 flex-1 grid-rows-6">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square"></div>
                }
                
                const operations = getOperationsForDate(day)
                const isSelected = day.toDateString() === selectedDate.toDateString()
                const isToday = day.toDateString() === new Date().toDateString()
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      aspect-square border rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative
                      ${isSelected 
                        ? 'bg-blue-500 text-white border-blue-600' 
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:scale-105'
                      }
                      ${isToday ? 'border-2 border-amber-400' : ''}
                      ${operations.length > 0 ? 'border-2 border-emerald-400' : ''}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className="font-semibold">{day.getDate()}</span>
                    {operations.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {operations.length}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Operations Section - FIXED */}
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[500px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex-shrink-0 min-h-[30px]">Today's Operations</h2>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-4">
            {selectedOperations.length === 0 ? (
              <div className="text-center text-gray-500 py-12 text-lg">
                No scheduled operations on this date.
              </div>
            ) : (
              selectedOperations.map(operation => (
                <div
                  key={operation.id}
                  className="border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 bg-white"
                  onClick={() => handleOperationSelect(operation)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{operation.type}</h3>
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium">
                        Room {operation.room}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold">
                      <Clock className="w-5 h-5" />
                      <span>{formatTime(operation.scheduledTime)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{operation.patient.name}</span>
                        <span className="text-gray-600 text-sm">Age: {operation.patient.age} | ID: {operation.patient.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">Dr. {operation.doctor.name}</span>
                        <span className="text-gray-600 text-sm">{operation.doctor.specialty}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <span className={`
                      px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide
                      ${getOperationStatusColor(operation.status)}
                    `}>
                      {getOperationStatusText(operation.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperationSelection