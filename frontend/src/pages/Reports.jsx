import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Filter, Calendar, BarChart2, Zap, Target, Wrench, ShieldAlert, Activity } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, AreaChart, Area } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [alerts, setAlerts] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('alerts');
  const [timeRange, setTimeRange] = useState('30d'); // Default to 30d for better data visualization
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [newLog, setNewLog] = useState({ machine_id: 'cnc-01', type: 'Preventative', technician: '', parts_replaced: '', duration_hrs: '', cost: '' });

  // Fetch alerts and maintenance logs for reporting
  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('rtms_token');
      
      const resAlerts = await fetch('https://industry4-0-rtms-1.onrender.com/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (resAlerts.ok) {
        const data = await resAlerts.json();
        setAlerts(Array.isArray(data) ? data : []);
      }

      const resMaint = await fetch('https://industry4-0-rtms-1.onrender.com/api/maintenance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resMaint.ok) {
        const data = await resMaint.json();
        setMaintenanceLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // --- MOCK DATA GENERATORS (Distributed across past 30 days) ---
  const realMachines = ['cnc-01', 'cnc-02', 'press-01', 'motor-03', 'assembly-01', 'packaging-02'];
  
  const [mockTelemetry] = useState(() => {
    return Array.from({length: 100}).map((_, i) => ({
      id: `TEL-${Math.floor(Math.random() * 10000)}`,
      machine_id: realMachines[i % realMachines.length],
      temperature: (70 + Math.random() * 20).toFixed(1),
      pressure: (80 + Math.random() * 40).toFixed(1),
      timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
    })).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  const [mockEnergy] = useState(() => {
    return Array.from({length: 100}).map((_, i) => ({
      id: `PWR-${Math.floor(Math.random() * 10000)}`,
      machine_id: realMachines[i % realMachines.length],
      power: (80 + Math.random() * 20).toFixed(1),
      efficiency: (75 + Math.random() * 20).toFixed(1),
      timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
    })).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  const [mockKpi] = useState(() => {
    return Array.from({length: 30}).map((_, i) => ({
      id: `KPI-${Math.floor(Math.random() * 10000)}`,
      machine_id: realMachines[i % realMachines.length],
      oee: (60 + Math.random() * 35).toFixed(1),
      availability: (80 + Math.random() * 15).toFixed(1),
      performance: (75 + Math.random() * 20).toFixed(1),
      quality: (90 + Math.random() * 9).toFixed(1),
      timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
    })).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  const [mockPerformance] = useState(() => {
    return Array.from({length: 30}).map((_, i) => {
      const breakdown = Math.random() * 2;
      const idle = Math.random() * 4;
      const work = 24 - breakdown - idle;
      return {
        id: `PRF-${Math.floor(Math.random() * 10000)}`,
        machine_id: realMachines[i % realMachines.length],
        total_uptime: work.toFixed(1),
        work_by_program: work.toFixed(1),
        idle: idle.toFixed(1),
        breakdown: breakdown.toFixed(1),
        timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
      };
    }).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  });



  // --- FILTER ENGINE ---
  const filterByDate = (dataArray) => {
    if (timeRange === 'all') return dataArray;
    const now = Date.now();
    let limit = 0;
    if (timeRange === '24h') limit = 24 * 60 * 60 * 1000;
    else if (timeRange === '7d') limit = 7 * 24 * 60 * 60 * 1000;
    else if (timeRange === '30d') limit = 30 * 24 * 60 * 60 * 1000;
    
    return dataArray.filter(item => {
      const dateStr = item.timestamp || item.created_at;
      // Ensure SQLite datetime formats parse correctly across all browsers
      let safeDateStr = String(dateStr).replace(' ', 'T');
      // If it doesn't have a timezone indicator, Safari will fail to parse it. 
      // SQLite stores as UTC, so we append 'Z'.
      if (!safeDateStr.includes('Z') && !safeDateStr.includes('+') && !safeDateStr.includes('-')) {
        safeDateStr += 'Z';
      }
      const ts = new Date(safeDateStr).getTime();
      return (now - ts) <= limit;
    });
  };

  const getActiveData = () => {
    if (reportType === 'telemetry') return filterByDate(mockTelemetry);
    if (reportType === 'energy') return filterByDate(mockEnergy);
    if (reportType === 'kpi') return filterByDate(mockKpi);
    if (reportType === 'performance') return filterByDate(mockPerformance);
    if (reportType === 'maintenance') return filterByDate(maintenanceLogs);
    return filterByDate(alerts);
  };

  const displayData = getActiveData().slice(0, 50);

  // --- SUMMARY KPI CALCULATIONS ---
  const getSummaryMetrics = () => {
    if (displayData.length === 0) return null;
    
    if (reportType === 'energy') {
      const totalPower = displayData.reduce((acc, curr) => acc + parseFloat(curr.power), 0);
      const avgEff = displayData.reduce((acc, curr) => acc + parseFloat(curr.efficiency), 0) / displayData.length;
      return (
        <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--accent-purple)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Total Power (Period)</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>{Math.round(totalPower)} kW</div>
          </div>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--accent-blue)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Avg Plant Efficiency</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>{avgEff.toFixed(1)}%</div>
          </div>
        </div>
      );
    }
    
    if (reportType === 'maintenance') {
      const totalCost = displayData.reduce((acc, curr) => acc + parseFloat(curr.cost), 0);
      const totalHours = displayData.reduce((acc, curr) => acc + parseFloat(curr.duration_hrs), 0);
      return (
        <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--danger)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Total Maintenance Spend</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>₹{totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          </div>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--warning)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}} title="Mean Time To Repair: The average time required to troubleshoot and repair failed equipment">Total Downtime (MTTR)</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>{totalHours.toFixed(1)} hrs</div>
          </div>
        </div>
      );
    }

    if (reportType === 'kpi') {
      const avgOee = displayData.reduce((acc, curr) => acc + parseFloat(curr.oee), 0) / displayData.length;
      const sorted = [...displayData].sort((a,b) => parseFloat(a.oee) - parseFloat(b.oee));
      const lowest = sorted[0];
      return (
        <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--success)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}} title="Overall Equipment Effectiveness: A measure of manufacturing productivity">Average Plant OEE</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>{avgOee.toFixed(1)}%</div>
          </div>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--danger)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Worst Performer</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)'}}>{lowest.machine_id} <span style={{fontSize: '1rem', color: 'var(--danger)'}}>({lowest.oee}%)</span></div>
          </div>
        </div>
      );
    }

    if (reportType === 'alerts') {
      const criticals = displayData.filter(a => a.severity === 'CRITICAL' || a.severity === 'Fault').length;
      return (
        <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--danger)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Total Critical Faults</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)'}}>{criticals}</div>
          </div>
          <div className="glass-panel" style={{flex: 1, padding: '1rem', borderTop: '3px solid var(--warning)'}}>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Total Degradation Warnings</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)'}}>{displayData.length - criticals}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  // --- CSV GENERATOR ---
  const generateCSV = () => {
    const dataToExport = getActiveData();
    if (dataToExport.length === 0) return alert("No data available for this time range.");
    
    let headers = [];
    let rows = [];

    if (reportType === 'telemetry') {
      headers = ['ID', 'Machine ID', 'Temperature', 'Pressure', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.temperature, row.pressure, row.timestamp]);
    } else if (reportType === 'energy') {
      headers = ['ID', 'Machine ID', 'Power Consumption', 'Efficiency', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.power, row.efficiency, row.timestamp]);
    } else if (reportType === 'kpi') {
      headers = ['ID', 'Machine ID', 'OEE (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.oee, row.availability, row.performance, row.quality, row.timestamp]);
    } else if (reportType === 'performance') {
      headers = ['ID', 'Machine ID', 'Uptime (hrs)', 'Work By Program (hrs)', 'Idle (hrs)', 'Breakdown (hrs)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.total_uptime, row.work_by_program, row.idle, row.breakdown, row.timestamp]);
    } else if (reportType === 'maintenance') {
      headers = ['ID', 'Machine ID', 'Type', 'Technician', 'Parts Replaced', 'Duration (hrs)', 'Cost (INR)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.type, `"${row.technician}"`, `"${row.parts_replaced}"`, row.duration_hrs, row.cost, row.timestamp]);
    } else {
      headers = ['ID', 'Machine ID', 'Severity', 'Message', 'Status', 'Timestamp'];
      rows = dataToExport.map(a => [a.id, a.machine_id, a.severity, `"${a.message}"`, a.status, a.created_at || a.timestamp]);
    }
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rtms_${reportType}_report_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PDF GENERATOR ---
  const generatePDF = async () => {
    const dataToExport = getActiveData();
    if (dataToExport.length === 0) return alert("No data available for this time range.");
    
    const doc = new jsPDF();
    
    try {
      // Fetch and encode the logo
      const getBase64ImageFromUrl = async (imageUrl) => {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to load image'));
          reader.readAsDataURL(blob);
        });
      };
      const logoBase64 = await getBase64ImageFromUrl('/logo.png');
      // Adding Logo at X=14, Y=10, Width=60, Height=35
      doc.addImage(logoBase64, 'PNG', 14, 10, 60, 35);
    } catch(e) {
      console.warn("Could not load logo for PDF", e);
    }

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("Official Production Report", 14, 55);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report Module: ${reportType.toUpperCase()}`, 14, 65);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 72);
    doc.text(`Total Records: ${dataToExport.length}`, 14, 79);
    
    let headers = [];
    let rows = [];

    if (reportType === 'telemetry') {
      headers = ['ID', 'Machine ID', 'Temp (°C)', 'Pressure (PSI)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.temperature, row.pressure, new Date(row.timestamp).toLocaleString()]);
    } else if (reportType === 'energy') {
      headers = ['ID', 'Machine ID', 'Power (kW)', 'Efficiency (%)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.power, row.efficiency, new Date(row.timestamp).toLocaleString()]);
    } else if (reportType === 'kpi') {
      headers = ['ID', 'Machine ID', 'OEE (%)', 'Avail (%)', 'Perf (%)', 'Qual (%)', 'Timestamp'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.oee, row.availability, row.performance, row.quality, new Date(row.timestamp).toLocaleString()]);
    } else if (reportType === 'performance') {
      headers = ['ID', 'Machine ID', 'Uptime (hrs)', 'Work (hrs)', 'Idle (hrs)', 'Breakdown (hrs)'];
      rows = dataToExport.map(row => [row.id, row.machine_id, row.total_uptime, row.work_by_program, row.idle, row.breakdown]);
    } else if (reportType === 'maintenance') {
      headers = ['Machine', 'Type', 'Technician', 'Parts', 'Dur (hrs)', 'Cost (INR)'];
      rows = dataToExport.map(row => [row.machine_id, row.type, row.technician, row.parts_replaced, row.duration_hrs, row.cost]);
    } else {
      headers = ['ID', 'Machine', 'Severity', 'Message', 'Timestamp'];
      rows = dataToExport.map(a => {
        let ds = a.created_at || a.timestamp;
        if (ds) {
          ds = String(ds).replace(' ', 'T');
          if (!ds.includes('Z') && !ds.includes('+') && !ds.includes('-')) ds += 'Z';
        }
        return [a.id, a.machine_id, a.severity, a.message, new Date(ds).toLocaleString()];
      });
    }
    
    autoTable(doc, {
      startY: 85,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 },
    });
    
    doc.save(`rtms_${reportType}_report_${new Date().getTime()}.pdf`);
  };

  if (loading && reportType === 'alerts') return <div className="flex justify-center items-center h-full"><div className="pulse-dot" style={{transform: 'scale(2)'}}></div></div>;

  // --- CHARTING ENGINE ---
  const getChartData = () => {
    if (reportType === 'alerts') {
      const counts = {};
      displayData.forEach(a => {
        const id = a.machine_id || 'UNKNOWN';
        if (!counts[id]) counts[id] = { name: id, CRITICAL: 0, WARNING: 0 };
        if (a.severity === 'CRITICAL' || a.severity === 'Fault') counts[id].CRITICAL++;
        else counts[id].WARNING++;
      });
      return Object.values(counts);
    }
    if (reportType === 'maintenance') {
      const counts = {};
      displayData.forEach(m => {
        if (!counts[m.machine_id]) counts[m.machine_id] = { name: m.machine_id, Preventative: 0, Corrective: 0 };
        if (m.type === 'Corrective') counts[m.machine_id].Corrective += parseFloat(m.duration_hrs);
        else counts[m.machine_id].Preventative += parseFloat(m.duration_hrs);
      });
      return Object.values(counts);
    }
    if (reportType === 'energy') {
      // Average by machine
      const aggr = {};
      displayData.forEach(d => {
        if (!aggr[d.machine_id]) aggr[d.machine_id] = { count: 0, power: 0, eff: 0 };
        aggr[d.machine_id].count++;
        aggr[d.machine_id].power += parseFloat(d.power);
        aggr[d.machine_id].eff += parseFloat(d.efficiency);
      });
      return Object.keys(aggr).map(k => ({
        name: k, Power: parseFloat((aggr[k].power / aggr[k].count).toFixed(1)), Efficiency: parseFloat((aggr[k].eff / aggr[k].count).toFixed(1))
      }));
    }
    if (reportType === 'telemetry') {
      return displayData.slice(0, 15).reverse().map(d => ({ 
        name: new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
        Temperature: parseFloat(d.temperature), 
        Pressure: parseFloat(d.pressure) 
      }));
    }
    if (reportType === 'kpi') {
      return displayData.slice(0, 15).map(d => ({ name: d.machine_id, OEE: parseFloat(d.oee) }));
    }
    return [];
  };

  const chartData = getChartData();

  const renderChart = () => {
    if (displayData.length === 0) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%',color:'var(--text-muted)'}}>No data in this time range.</div>;

    if (reportType === 'alerts') {
      return (
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
          <Legend iconType="circle" wrapperStyle={{fontSize: '0.75rem', paddingTop: '0.5rem'}} />
          <Bar dataKey="WARNING" name="Warning Alerts" stackId="a" fill="var(--warning)" />
          <Bar dataKey="CRITICAL" name="Critical Faults" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    if (reportType === 'maintenance') {
      return (
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v) => [`${v} hrs`]} />
          <Legend iconType="circle" wrapperStyle={{fontSize: '0.75rem', paddingTop: '0.5rem'}} />
          <Bar dataKey="Preventative" name="Planned Maint." stackId="a" fill="var(--accent-blue)" />
          <Bar dataKey="Corrective" name="Breakdown Repairs" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    if (reportType === 'energy') {
      return (
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis yAxisId="left" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
          <Legend iconType="circle" wrapperStyle={{fontSize: '0.75rem', paddingTop: '0.5rem'}} />
          <Bar yAxisId="left" dataKey="Power" name="Avg Power (kW)" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="Efficiency" name="Efficiency %" stroke="var(--accent-blue)" strokeWidth={3} dot={{r: 4}} />
        </ComposedChart>
      );
    }
    if (reportType === 'telemetry') {
      return (
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPres" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
          <Legend iconType="circle" wrapperStyle={{fontSize: '0.75rem', paddingTop: '0.5rem'}} />
          <Area type="monotone" dataKey="Temperature" stroke="var(--danger)" fillOpacity={1} fill="url(#colorTemp)" />
          <Area type="monotone" dataKey="Pressure" stroke="var(--accent-blue)" fillOpacity={1} fill="url(#colorPres)" />
        </AreaChart>
      );
    }
    if (reportType === 'kpi') {
      const avgAvail = displayData.reduce((acc, curr) => acc + parseFloat(curr.availability), 0) / (displayData.length || 1);
      const avgPerf = displayData.reduce((acc, curr) => acc + parseFloat(curr.performance), 0) / (displayData.length || 1);
      const avgQual = displayData.reduce((acc, curr) => acc + parseFloat(curr.quality), 0) / (displayData.length || 1);
      
      const pieData = [
        { name: 'Availability', value: parseFloat(avgAvail.toFixed(1)), color: 'var(--accent-blue)' },
        { name: 'Performance', value: parseFloat(avgPerf.toFixed(1)), color: 'var(--accent-purple)' },
        { name: 'Quality', value: parseFloat(avgQual.toFixed(1)), color: 'var(--success)' }
      ];

      return (
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(value) => [`${value}%`, 'Average Score']} />
          <Legend />
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    
    if (reportType === 'performance') {
      const totalWork = displayData.reduce((acc, curr) => acc + parseFloat(curr.work_by_program), 0);
      const totalIdle = displayData.reduce((acc, curr) => acc + parseFloat(curr.idle), 0);
      const totalBreakdown = displayData.reduce((acc, curr) => acc + parseFloat(curr.breakdown), 0);
      
      const pieData = [
        { name: 'Work By Program', value: parseFloat(totalWork.toFixed(1)), color: 'var(--success)' },
        { name: 'Idle Time', value: parseFloat(totalIdle.toFixed(1)), color: 'var(--warning)' },
        { name: 'Breakdown / Fault', value: parseFloat(totalBreakdown.toFixed(1)), color: 'var(--danger)' }
      ];

      return (
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(value) => [`${value} hrs`, 'Total Time']} />
          <Legend />
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    
    // Fallback simple line
    return (
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={10} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
        <Legend />
        <Line type="monotone" dataKey="OEE" stroke="var(--success)" strokeWidth={3} dot={{r: 4}} />
      </LineChart>
    );
  };

  return (
    <div className="flex flex-col gap-6" style={{height: '100%'}}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 style={{color: 'var(--text-primary)', margin: '0 0 0.25rem 0'}}>Advanced Reporting Engine</h1>
          <p style={{color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem'}}>Generate, visualize, and export system analytics</p>
        </div>
        <div className="flex gap-3">
          {reportType === 'maintenance' && (
            <button 
              onClick={() => setShowMaintenanceModal(true)}
              style={{
                background: 'var(--success)', color: '#ffffff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Wrench size={18} />
              Log Maintenance
            </button>
          )}
          <button 
            onClick={generatePDF}
            style={{
              background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <FileText size={18} />
            Export PDF
          </button>
          <button 
            onClick={generateCSV}
            style={{
              background: 'var(--accent-blue)', color: '#ffffff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {showMaintenanceModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, 
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowMaintenanceModal(false)}>
          <div className="glass-panel" style={{width: '450px', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-4" style={{borderColor: 'var(--border-color)'}}>
              <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Wrench size={20} color="var(--accent-blue)" /> Log Maintenance Record</h2>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const token = localStorage.getItem('rtms_token');
                const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/maintenance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify(newLog)
                });
                if (res.ok) {
                  setShowMaintenanceModal(false);
                  setNewLog({ machine_id: 'cnc-01', type: 'Preventative', technician: '', parts_replaced: '', duration_hrs: '', cost: '' });
                  fetchReportData(); // Refresh UI instantly
                }
              } catch (err) {
                console.error("Failed to add log", err);
              }
            }} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              
              <div>
                <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Machine ID</label>
                <select value={newLog.machine_id} onChange={e => setNewLog({...newLog, machine_id: e.target.value})} style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} required>
                  {realMachines.map(m => <option key={m} value={m}>{String(m).toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Maintenance Type</label>
                <select value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value})} style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} required>
                  <option value="Preventative">Preventative</option>
                  <option value="Corrective">Corrective</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Calibration">Calibration</option>
                </select>
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Technician Name</label>
                <input type="text" value={newLog.technician} onChange={e => setNewLog({...newLog, technician: e.target.value})} placeholder="e.g. Ankit Sharma" style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} required />
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Parts Replaced</label>
                <input type="text" value={newLog.parts_replaced} onChange={e => setNewLog({...newLog, parts_replaced: e.target.value})} placeholder="e.g. Spindle Bearing, or 'None'" style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} />
              </div>

              <div style={{display: 'flex', gap: '1rem'}}>
                <div style={{flex: 1}}>
                  <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Duration (Hrs)</label>
                  <input type="number" step="0.5" value={newLog.duration_hrs} onChange={e => setNewLog({...newLog, duration_hrs: e.target.value})} placeholder="e.g. 2.5" style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} required />
                </div>
                <div style={{flex: 1}}>
                  <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)'}}>Total Cost (₹)</label>
                  <input type="number" step="100" value={newLog.cost} onChange={e => setNewLog({...newLog, cost: e.target.value})} placeholder="e.g. 15000" style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}} required />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowMaintenanceModal(false)} style={{flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer'}}>Cancel</button>
                <button type="submit" style={{flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600}}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid" style={{gridTemplateColumns: '250px 1fr', gap: '1.5rem', flex: 1}}>
        
        {/* FILTER PANEL */}
        <div className="glass-panel" style={{height: 'fit-content'}}>
          <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{borderColor: 'var(--border-color)'}}>
            <Filter size={18} color="var(--accent-blue)" />
            <h3 style={{margin: 0, fontSize: '1rem'}}>Report Configuration</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600}}>Data Module</label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="alerts">Alert Audit Log</option>
                <option value="telemetry">Machine Telemetry</option>
                <option value="energy">Energy Consumption</option>
                <option value="kpi">OEE (Overall Equipment Effectiveness) & KPI (Key Performance Indicator) Summary</option>
                <option value="performance">Machine Performance</option>
                <option value="maintenance">Maintenance History</option>
              </select>
            </div>
            
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600}}>Time Range</label>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time History</option>
              </select>
            </div>
          </div>
        </div>

        {/* DATA PREVIEW */}
        <div className="glass-panel" style={{padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
          <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)'}}>
            <h3 style={{margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem'}}>Visual Analytics</h3>
            <p style={{margin: '0.25rem 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
              Filtering <span style={{color: 'var(--accent-blue)', fontWeight: 600}}>{displayData.length} records</span> for the selected time range.
            </p>
            
            {/* KPI METRIC ROW */}
            {getSummaryMetrics()}
            
            <div style={{height: '240px', width: '100%'}}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)'}}>
            <h3 style={{margin: 0, fontSize: '1rem'}}>Raw Data View</h3>
          </div>

          <div style={{flex: 1, overflowY: 'auto'}}>
            <table className="rtms-table" style={{width: '100%'}}>
              <thead style={{position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10}}>
                <tr>
                  <th style={{paddingLeft: '1.5rem'}}>ID</th>
                  <th>Machine</th>
                  {reportType === 'telemetry' ? (
                    <><th>Temperature</th><th>Pressure</th></>
                  ) : reportType === 'energy' ? (
                    <>
                      <th>
                        Power
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Total Energy Consumed (kW)
                        </div>
                      </th>
                      <th>
                        Efficiency
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Formula: (Output / Input) × 100
                        </div>
                      </th>
                    </>
                  ) : reportType === 'kpi' ? (
                    <>
                      <th>
                        OEE
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Overall Equipment Effectiveness<br/>Formula: Availability × Performance × Quality
                        </div>
                      </th>
                      <th>
                        Avail / Perf / Qual
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Avail = Uptime / Planned Time<br/>Perf = Ideal Cycle / Actual Cycle<br/>Qual = Good Parts / Total Parts
                        </div>
                      </th>
                    </>
                  ) : reportType === 'performance' ? (
                    <>
                      <th>
                        Uptime
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Total Productive Time
                        </div>
                      </th>
                      <th>
                        Work / Idle / Fault
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Breakdown of Machine States
                        </div>
                      </th>
                    </>
                  ) : reportType === 'maintenance' ? (
                    <>
                      <th>
                        Details
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          Maintenance Type & Replaced Parts
                        </div>
                      </th>
                      <th>
                        Duration & Cost
                        <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginTop: '4px'}}>
                          MTTR (Mean Time To Repair)<br/>Cost = Total INR Spend
                        </div>
                      </th>
                    </>
                  ) : (
                    <><th>Event</th><th>Status</th></>
                  )}
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map(row => (
                  <tr key={row.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                    <td style={{paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{row.id}</td>
                    <td style={{fontWeight: 700, fontSize: '0.9rem'}}>{row.machine_id ? String(row.machine_id).toUpperCase() : 'UNK'}</td>
                    
                    {reportType === 'telemetry' ? (
                      <>
                        <td style={{color: parseFloat(row.temperature) > 85 ? 'var(--danger)' : 'var(--text-primary)'}}>{row.temperature}°C</td>
                        <td style={{color: parseFloat(row.pressure) > 110 ? 'var(--warning)' : 'var(--text-primary)'}}>{row.pressure} PSI</td>
                      </>
                    ) : reportType === 'energy' ? (
                      <>
                        <td style={{color: 'var(--accent-purple)', fontWeight: 600}}>{row.power} kW</td>
                        <td style={{color: parseFloat(row.efficiency) < 80 ? 'var(--warning)' : 'var(--success)'}}>{row.efficiency}%</td>
                      </>
                    ) : reportType === 'kpi' ? (
                      <>
                        <td style={{fontWeight: 800, color: parseFloat(row.oee) < 75 ? 'var(--danger)' : 'var(--success)'}}>{row.oee}%</td>
                        <td style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{row.availability}% / {row.performance}% / {row.quality}%</td>
                      </>
                    ) : reportType === 'performance' ? (
                      <>
                        <td style={{fontWeight: 700, color: 'var(--accent-blue)'}}>{row.total_uptime}h</td>
                        <td style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          {row.work_by_program}h / <span style={{color: parseFloat(row.idle) > 2 ? 'var(--warning)' : 'inherit'}}>{row.idle}h</span> / <span style={{color: parseFloat(row.breakdown) > 0 ? 'var(--danger)' : 'inherit'}}>{row.breakdown}h</span>
                        </td>
                      </>
                    ) : reportType === 'maintenance' ? (
                      <>
                        <td>
                          <div style={{fontWeight: 600, color: row.type === 'Corrective' ? 'var(--danger)' : 'var(--accent-blue)'}}>{row.type}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.technician} • {row.parts_replaced}</div>
                        </td>
                        <td>
                          <div style={{fontWeight: 600}}>{row.duration_hrs} hrs</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--warning)'}}>₹{row.cost}</div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{fontSize: '0.9rem'}}>{row.message}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                            background: row.severity === 'CRITICAL' || row.severity === 'Fault' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: row.severity === 'CRITICAL' || row.severity === 'Fault' ? 'var(--danger)' : 'var(--warning)'
                          }}>
                            {row.severity}
                          </span>
                        </td>
                      </>
                    )}
                    
                    <td style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {(() => {
                          let ds = row.created_at || row.timestamp;
                          if (!ds) return 'N/A';
                          ds = String(ds).replace(' ', 'T');
                          if (!ds.includes('Z') && !ds.includes('+') && !ds.includes('-')) ds += 'Z';
                          return new Date(ds).toLocaleString();
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
