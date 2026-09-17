import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [machineData, setMachineData] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // For local development, connect to the backend running on port 5002
    const newSocket = io('https://industry4-0-rtms-1.onrender.com');
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    newSocket.on('sensor_data', (data) => {
      setMachineData(Array.isArray(data) ? data.filter(d => d != null) : []);
    });

    newSocket.on('production_data', (data) => {
      setProductionData(Array.isArray(data) ? data.filter(d => d != null) : []);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, machineData, productionData, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
