import React from 'react';
import StreakCalendar from '../components/StreakCalendar';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">连胜日历测试页面</h1>
      <StreakCalendar 
        streakDays={5}
        lastStreakDate={new Date().toISOString().split('T')[0]}
        frozenDays={1}
        isStreakToday={true}
        userId="2"
        registrationDate="2023-01-01"
      />
    </div>
  );
}