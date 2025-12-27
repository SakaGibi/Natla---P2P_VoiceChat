VoiceChat-p2p - Natla
Natla is a decentralized peer-to-peer (P2P) voice and video communication platform built using Electron and WebRTC technology. It features a lightweight Python-based signaling server, ensuring low-latency communication, end-to-end media streaming, and secure access control.

Overview
Unlike traditional VoIP applications that route media through central servers, Natla establishes direct connections between clients. The central server is utilized strictly for signaling (handshaking) and room management, ensuring privacy and minimal latency.

Key Features
Secure Access Control: Room access is protected via a custom Access Key system. Only users with the correct server address and key can establish a connection.

P2P Architecture: Audio, video, and file data are transmitted directly between peers using WebRTC.

Screen Sharing: High-definition, low-latency desktop streaming capabilities.

Integrated Soundpad: Built-in audio effects board for real-time interaction.

Peer-to-Peer File Transfer: Secure drag-and-drop file sharing between users without server-side limitations.

Advanced Audio Management: Individual user volume control and real-time audio visualization.

Installation and Usage
Client
Download Download the latest installer (Natla Setup.exe) from the Releases section of this repository.

Initial Configuration Upon launching the application for the first time, a configuration modal will appear requesting the following details:

Server Address: The WebSocket address of the signaling server (e.g., ws://your-server-ip:8080).

Access Key: The secure passphrase required to authenticate with the server.

Connection Click Connect to save your settings. The application stores the configuration securely in the user's AppData directory to prevent permission issues.

Note: If the connection fails or an incorrect key is provided, the application will automatically reset the configuration and prompt for credentials again upon the next launch.

Server Deployment (Self-Hosting)
Natla requires a lightweight WebSocket signaling server to manage peer discovery. You can host this server on AWS, DigitalOcean, or a local machine.

Prerequisites
Python 3.8 or higher

websockets library

Deployment Steps
Clone the Repository

Bash

git clone https://github.com/SakaGibi/VoiceChat-p2p.git
cd VoiceChat-p2p
Install Dependencies

Bash

sudo apt install python3-websockets
Configure Security Open server.py in a text editor. Locate the ACCESS_KEY variable and change it to a strong, unique passphrase. This key must be shared with your clients.

Python

# server.py
ACCESS_KEY = "Your_Secure_Passphrase_Here"
Start the Server It is recommended to run the server as a systemd service for high availability.

Development
To modify the client application or build it from the source:

Install Dependencies

Bash

npm install
Run in Development Mode

Bash

npm start
Build for Production

Bash

npm run build
Troubleshooting
Connection Refused: Ensure the signaling server is running on port 8080 and that AWS Security Group rules allow inbound TCP traffic on this port.

Unauthorized Access Error: This indicates a mismatch between the Access Key in the client configuration and the server. The application will reset the local config file automatically.

Port Conflict: Ensure port 8080 is not being used by other services like Docker or web servers.

A Note on Development & AI
This project was built with significant assistance from Large Language Models. I have to say, they really are something! Utilizing AI provided a massive boost to productivity, especially when navigating the complexities of WebRTC and Electron.

Disclaimer: This started as a fun side project for me and my friends to hang out. While I poured a lot of effort into making it feature-rich and stable, the codebase might not always follow enterprise-level best practices or clean architecture patterns. Apologies in advance for any complexity or "spaghetti code" you might encounter (which you will a lot) while digging through the source. It works, and that was the main goal.

License
This project is licensed under the MIT License. See the LICENSE file for details.