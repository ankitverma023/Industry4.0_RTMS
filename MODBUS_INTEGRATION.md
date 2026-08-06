# The Ultimate Guide: Connecting RTMS to Live Modbus Hardware

This is a foolproof, step-by-step guide to replacing the fake simulated data in RTMS with real, live data from your physical factory machines using a LAN cable and the Modbus TCP protocol.

By following this guide, you will only need to edit **two files** in your entire project to go live.

---

## Step 1: The Physical Connection & Register Mapping

### 1.1 Connect the Hardware
1. Plug an Ethernet (LAN) cable into your machine's PLC (Programmable Logic Controller) or Modbus gateway.
2. Plug the other end of the cable into the same Network Switch that your Node.js Server is plugged into.
3. Find out the IP Address of your machine (e.g., `192.168.1.50`).

### 1.2 Find Your Register Numbers
You must look at your machine's instruction manual to find its **Modbus Register Map**. Modbus stores data in "Holding Registers". 

For this tutorial, let's assume your manual says:
- **Register 40100**: Temperature
- **Register 40101**: Vibration
- **Register 40102**: Pressure

*Important Note: Holding registers always start with a `4`. In code, you drop the `40000` prefix. So Register `40100` becomes Address `100` in the code!*

---

## Step 2: Install the Modbus Library

Open a terminal on your server, go to the backend folder, and install the library that allows Node.js to read Modbus data over the LAN cable:

```bash
cd /var/www/rtms/backend
npm install modbus-serial
```

---

## Step 3: Create the Modbus Engine Code

We need to create the script that actually reaches out over the LAN cable to read those specific register numbers (`100`, `101`, `102`) every single second.

Create a brand new file in your backend folder:
```bash
nano /var/www/rtms/backend/modbusEngine.js
```

**Copy and paste the exact code below into that file. Read the comments starting with `// CHANGE THIS` to customize it for your factory.**

```javascript
const ModbusRTU = require("modbus-serial");

// =========================================================================
// 1. CHANGE THIS: Define your physical machines
// =========================================================================
const MACHINES = [
  { 
    // [EDIT THIS LINE]: Change 'cnc-01' to the EXACT machine_id from your database
    id: 'cnc-01',          
    
    // [EDIT THIS LINE]: Change '192.168.1.50' to the physical IP address of your machine
    ip: '192.168.1.50',    
    
    // [DO NOT EDIT]: 502 is the universal standard port for Modbus TCP
    port: 502,             
    
    // [EDIT THIS LINE]: Find the starting register address from your machine's manual. 
    // Example: If manual says 40100, type 100 here.
    startRegister: 100     
  }
  // To add more machines, just add a comma and copy-paste the block above!
];

async function startModbusEngine(io) {
  console.log("Starting Live Hardware Modbus Engine...");

  MACHINES.forEach(async (machine) => {
    const client = new ModbusRTU();

    try {
      // Connect to the physical machine over the LAN cable
      await client.connectTCP(machine.ip, { port: machine.port });
      client.setID(1); 
      console.log(`[SUCCESS] Connected to live machine at ${machine.ip}`);

      // Start an infinite loop that runs exactly every 1000 milliseconds (1 second)
      setInterval(async () => {
        try {
          // =========================================================================
          // 2. READ THE DATA FROM THE MACHINE
          // =========================================================================
          // This tells the PLC: "Go to startRegister (e.g. 100) and read 3 blocks of memory"
          const data = await client.readHoldingRegisters(machine.startRegister, 3);
          
          // =========================================================================
          // 3. CHANGE THIS: Format the data (Decimals)
          // =========================================================================
          // PLCs usually don't send decimals. If the temp is 85.5 degrees, the PLC sends "855".
          // [EDIT THESE LINES]: If your machine sends raw numbers without decimals, leave the " / 10".
          // If your machine sends exact numbers (e.g. 85), DELETE the " / 10".
          const temperature = data.data[0] / 10; // First register (e.g. 100)
          const vibration = data.data[1] / 10;   // Second register (e.g. 101)
          const pressure = data.data[2] / 10;    // Third register (e.g. 102)

          // Package the data perfectly for the React Dashboard
          const telemetryPayload = {
            machine_id: machine.id,
            timestamp: new Date().toISOString(),
            metrics: {
              temperature: temperature,
              vibration: vibration,
              pressure: pressure
            }
          };

          // Broadcast the live physical data to the web dashboard!
          io.emit('telemetry_update', telemetryPayload);

        } catch (pollError) {
          console.error(`[ERROR] Failed to read registers from ${machine.ip}. Is the machine turned on?`);
        }
      }, 1000); 

    } catch (connectionError) {
      console.error(`[FATAL] Could not connect LAN cable to ${machine.ip}. Check IPs and cables.`);
    }
  });
}

module.exports = { startModbusEngine };
```
Save and close the file.

---

## Step 4: Swap the Engines in `server.js`

Now, you just need to tell the RTMS server to stop running the fake `simulationEngine.js` and start running your new live `modbusEngine.js`.

Open your main server file:
```bash
nano /var/www/rtms/backend/server.js
```

Scroll to the very bottom of the file (around **Line 40**). You will see the old simulation code. 
You need to **delete** the old lines and **add** the new lines exactly as shown in this diff block:

```diff
- // Import and start simulation engine
- const { startSimulation } = require('./simulationEngine');
- startSimulation(io);

+ // Import and start live physical hardware engine
+ const { startModbusEngine } = require('./modbusEngine');
+ startModbusEngine(io);
```
Save and close the file.

---

## Step 5: Restart the Server

You are completely finished! All you have to do is restart your Node.js backend so the changes take effect.

```bash
# If using PM2:
pm2 restart rtms-backend

# If running manually:
node server.js
```

### What happens now?
1. Your Node.js server will reach across the LAN cable and connect to `192.168.1.50` on port 502.
2. Every 1 second, it will read memory registers `100`, `101`, and `102` from the machine's motherboard.
3. It will convert those electrical signals into a JSON object and blast it out over Socket.io.
4. Your React dashboard, 3D Digital Twin, and AI Predictor will instantly start reacting to the live physical data!
