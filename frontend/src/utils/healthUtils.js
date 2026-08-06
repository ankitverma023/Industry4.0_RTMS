export const calculateHealthScore = (machine) => {
  if (!machine) return 0;
  
  // Base score
  let score = 100;
  
  // Deductions based on Phase 8 parameters
  if (machine.temperature > 95) score -= 40;
  else if (machine.temperature > 85) score -= 15;
  
  if (machine.pressure > 110) score -= 20;
  else if (machine.pressure > 100) score -= 10;
  
  if (machine.vibration > 15) score -= 30;
  else if (machine.vibration > 10) score -= 10;
  
  // In a real scenario we'd use historical data here too
  
  return Math.max(0, score);
};

export const getHealthStatus = (score) => {
  if (score >= 90) return { text: 'Excellent', class: 'status-running' };
  if (score >= 75) return { text: 'Good', class: 'status-running' };
  if (score >= 50) return { text: 'Warning', class: 'status-warning' };
  return { text: 'Critical', class: 'status-fault' };
};
