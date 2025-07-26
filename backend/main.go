// main.go (Backend - Go, GORM, SQLite)

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Location represents a stored GPS coordinate in the database
type Location struct {
	ID        uint `gorm:"primaryKey"` // Primary key
	Latitude  float64
	Longitude float64
	Timestamp time.Time `gorm:"autoCreateTime"` // GORM will automatically set creation time
}

// DB global variable for database connection
var DB *gorm.DB

func main() {
	// 1. Initialize SQLite Database with GORM
	var err error
	// Open a SQLite database file named "locations.db"
	DB, err = gorm.Open(sqlite.Open("locations.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Database connection established to locations.db")

	// AutoMigrate will create/update the 'locations' table based on the 'Location' struct
	DB.AutoMigrate(&Location{})
	log.Println("Database migration completed (table 'locations' is ready).")

	// 2. Setup API Endpoints
	// Handle POST requests to /api/location for saving new location
	http.HandleFunc("/api/location", enableCORS(handlePostLocation))
	// Handle GET requests to /api/location/last for retrieving the most recent location
	http.HandleFunc("/api/location/last", enableCORS(handleGetLastLocation))

	log.Println("Go server starting on http://localhost:8080")
	// Start the HTTP server on port 8080
	log.Fatal(http.ListenAndServe(":8000", nil))
}

// enableCORS is a simple middleware function to allow Cross-Origin Resource Sharing
// This is crucial for local development where frontend (e.g., React on port 3000)
// tries to communicate with backend (Go on port 8080)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from any origin during development. In production, specify your frontend's domain.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		// Allow specific HTTP methods
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		// Allow specific headers to be sent from the client
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests (OPTIONS method)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	}
}

// handlePostLocation handles POST requests to /api/location
// It receives Latitude and Longitude from the frontend and saves them
func handlePostLocation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var newLocation Location // Declare a variable to hold the incoming JSON data
	// Decode JSON request body into the newLocation struct
	err := json.NewDecoder(r.Body).Decode(&newLocation)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid request payload: %v", err), http.StatusBadRequest)
		return
	}

	// Save the new location to the database using GORM
	result := DB.Create(&newLocation)
	if result.Error != nil {
		http.Error(w, fmt.Sprintf("Failed to save location: %v", result.Error), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated) // Set HTTP status to 201 Created
	// Encode a success message as JSON response
	json.NewEncoder(w).Encode(map[string]string{"message": "Location saved successfully"})
	log.Printf("Received and saved location: Lat=%.6f, Lon=%.6f", newLocation.Latitude, newLocation.Longitude)
}

// handleGetLastLocation handles GET requests to /api/location/last
// It retrieves the most recently saved location from the database
func handleGetLastLocation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var lastLocation Location // Declare a variable to hold the retrieved location
	// Query the database for the first record, ordered by ID in descending order
	// (assuming higher ID means newer record, or use Timestamp if available)
	result := DB.Order("id DESC").First(&lastLocation)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// If no records found, return 404
			http.Error(w, "No locations found", http.StatusNotFound)
		} else {
			// Handle other database errors
			http.Error(w, fmt.Sprintf("Failed to retrieve last location: %v", result.Error), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json") // Set response header to JSON
	json.NewEncoder(w).Encode(lastLocation)             // Encode the retrieved location as JSON
}