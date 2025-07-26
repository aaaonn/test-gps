// src/App.tsx (Frontend - React, TypeScript)

import React, { useState, useEffect } from 'react';
import './App.css'; // คุณอาจจะมีหรือไม่มีไฟล์นี้ก็ได้
// หากคุณต้องการใช้ CSS พื้นฐานเพื่อจัดหน้าจอ
// คุณสามารถเพิ่มโค้ดด้านล่างนี้ใน src/App.css ได้:
/*
.App {
  text-align: center;
  margin-top: 50px;
}
.App-header {
  background-color: #282c34;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
button {
  padding: 10px 20px;
  font-size: 16px;
  margin: 10px;
  cursor: pointer;
  background-color: #61dafb;
  color: #282c34;
  border: none;
  border-radius: 5px;
}
button:hover {
  background-color: #21a1f1;
}
p {
  margin: 5px 0;
}
*/


// Define the structure of location data coming from the backend
interface LocationData {
  ID: number;
  Latitude: number;
  Longitude: number;
  Timestamp: string; // Timestamp will be an ISO 8601 string from Go
}

function App() {
  // State to store the current location fetched from the browser
  const [currentLocation, setCurrentLocation] = useState<string>('No location yet.');
  // State to store the last location fetched from the backend
  const [lastSavedLocation, setLastSavedLocation] = useState<LocationData | null>(null);
  // State to store any error messages
  const [error, setError] = useState<string | null>(null);

  // URL of your Go backend API
  const backendUrl = 'http://localhost:8000/api';

  const getGeoLocation = () => {
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCurrentLocation(`Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`);
          sendLocationToBackend(lat, lon);
        },
        (geoError) => {
          let errorMessage = "Geolocation error: ";
          switch (geoError.code) {
            // แก้ไขตรงนี้: ใช้ GeolocationPositionError.NAME_OF_ERROR แทน geoError.NAME_OF_ERROR
            case GeolocationPositionError.PERMISSION_DENIED:
              errorMessage += "User denied the request for Geolocation. Please allow location access in your browser settings.";
              break;
            case GeolocationPositionError.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable.";
              break;
            case GeolocationPositionError.TIMEOUT:
              errorMessage += "The request to get user location timed out.";
              break;
            case 0:
              errorMessage += "An unknown error occurred.";
              break;
            default:
              errorMessage += "An unexpected error occurred.";
          }
          setError(errorMessage);
          setCurrentLocation('Error getting location.');
          console.error(geoError);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser. Please use a modern browser.');
    }
  };

  // Function to send location data to the Go backend
  const sendLocationToBackend = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`${backendUrl}/location`, {
        method: 'POST', // Send data using POST method
        headers: {
          'Content-Type': 'application/json', // Specify content type as JSON
        },
        // Convert latitude and longitude to JSON string
        body: JSON.stringify({ Latitude: latitude, Longitude: longitude }),
      });

      if (!response.ok) {
        // Handle HTTP errors (e.g., 400, 500 status codes)
        const errorText = await response.text(); // Get error message from backend
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }

      const data = await response.json(); // Parse JSON response from backend
      console.log('Backend response:', data);
      alert('Location sent to backend successfully!');
      fetchLastSavedLocation(); // Refresh the last saved location after sending a new one
    } catch (apiError: any) {
      setError(`Failed to send location to backend: ${apiError.message}`);
      console.error('Error sending location:', apiError);
    }
  };

  // Function to fetch the last saved location from the backend
  const fetchLastSavedLocation = async () => {
    try {
      const response = await fetch(`${backendUrl}/location/last`);
      if (!response.ok) {
        if (response.status === 404) {
          // No locations found in the database yet
          setLastSavedLocation(null);
          return;
        }
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }
      const data: LocationData = await response.json(); // Parse JSON response
      setLastSavedLocation(data); // Update state with the last saved location
    } catch (apiError: any) {
      setError(`Failed to fetch last location from backend: ${apiError.message}`);
      console.error('Error fetching last location:', apiError);
    }
  };

  // useEffect hook to fetch the last saved location when the component mounts
  useEffect(() => {
    fetchLastSavedLocation();
  }, []); // Empty dependency array means this runs once after initial render

  return (
    <div className="App">
      <header className="App-header">
        <h1>GPS Tracking Test System</h1>
        <p>Current Geolocation (from browser): <strong>{currentLocation}</strong></p>
        <button onClick={getGeoLocation}>Share My Current Location</button>

        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}

        {lastSavedLocation ? (
          <div>
            <h2>Last Saved Location (from server):</h2>
            <p>
              Latitude: <strong>{lastSavedLocation.Latitude.toFixed(6)}</strong>
            </p>
            <p>
              Longitude: <strong>{lastSavedLocation.Longitude.toFixed(6)}</strong>
            </p>
            <p>
              Timestamp: <strong>{new Date(lastSavedLocation.Timestamp).toLocaleString()}</strong>
            </p>
          </div>
        ) : (
          <p>No location saved in the database yet. Click "Share My Current Location" to save one.</p>
        )}
      </header>
    </div>
  );
}

export default App;