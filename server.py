"""
    CS181DV Assignment 2: Interactive Web Visualization with D3.js

    Author: AIKO KATO

    Date: 02/28/2025
    
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS  # Enable Cross-Origin Resource Sharing
from collections import OrderedDict  # Import OrderedDict for structured JSON responses
import json
import pandas as pd
import numpy as np
from pathlib import Path

# Initialize Flask app
app = Flask(__name__, static_url_path='/static', static_folder='static')
CORS(app)  # Enable CORS to allow cross-origin requests


def error_response(message, status_code):
    """
    Generate an error response in JSON format.
    
    Args:
        message (str): The error message
        status_code (int): HTTP status code
    
    Returns:
        Response: JSON response with error message and HTTP status
    """
    return jsonify({"error": message}), status_code


def clean_numeric(value):
    """
    Clean numeric values by removing commas and non-numeric characters.

    Args:
        value (str/int/float): The value to clean.

    Returns:
        float: Cleaned numeric value, or 0 if conversion fails.
    """
    try:
        if pd.isna(value):  # Handle NaN values
            return 0
        if isinstance(value, str):
            # Remove commas and any non-numeric characters except decimal points
            cleaned = ''.join(c for c in value if c.isdigit() or c == '.')
            return float(cleaned) if cleaned else 0
        return float(value)
    except:
        return 0


def load_data():
    """
    Load and cleans the Spotify songs dataset.

    Returns:
        pd.DataFrame: Cleaned dataframe if successful, otherwise None
    """
    try:
        file_path = Path('data/Spotify_Songs_2024.csv')
        if not file_path.exists():
            print(f"Error: File not found at {file_path.absolute()}")
            return None

        # Read the CSV file
        df = pd.read_csv(file_path, encoding="latin1")

        # Detect and remove rows with encoding errors (garbage characters)
        def contains_encoding_errors(text):
            # Return true if the text contains corrupted encoding characters
            if isinstance(text, str):
                return any(char not in set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-'&()!?") for char in text)
            return False

        # Remove rows where Track, Artist, or Album Name have corrupted text
        df_clean = df[~df.apply(lambda row: 
            contains_encoding_errors(row["Track"]) or 
            contains_encoding_errors(row["Artist"]) or 
            contains_encoding_errors(row["Album Name"]), axis=1)].copy()

        # Remove non-artist entries like DJ mixes or compilations (since I didn't know how to do this, I counted all entries from the dataset)
        non_artist_names = [
            "MUSIC LAB JPN",
            "LOVE BGM JPN",
            "sped up 8282",
            "DJ MIX NON-STOP CHANNEL",
            "WORK OUT GYM - DJ MIX"
        ]

        df_clean = df_clean[~df_clean['Artist'].isin(non_artist_names)]

        # Convert numeric columns
        numeric_columns = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach',
                           'YouTube Views', 'YouTube Likes', 'TikTok Views']
        for col in numeric_columns:
            if col in df_clean.columns:
                df_clean[col] = df_clean[col].apply(clean_numeric)

        print(f"Data cleaned. Removed {len(df) - len(df_clean)} rows with encoding errors or non-artist entries.")
        return df_clean

    except Exception as e:
        app.logger.error(f"Error loading data: {str(e)}")
        return None


# Load data globally
df = load_data()


# Serve the static index page
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')


# Serve static assets (CSS, JS, images)
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)


# API Endpoint (fetch track data)
@app.route('/api/tracks')
def get_tracks():
    """
    Fetch track-level data including streams and playlist metrics.
    
    Returns:
        JSON: Tracks data with "total" count
    """
    if df is None:
        return error_response("Data not loaded", 500)

    try:
        # Select relevant columns
        result_df = df[['Track', 'Artist', 'Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach']].copy()

        # Ensure numeric columns are cleaned
        numeric_cols = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach']
        for col in numeric_cols:
            result_df[col] = result_df[col].apply(clean_numeric)

        # Convert NaN values to None for proper JSON formatting
        result_df = result_df.where(pd.notna(result_df), None)

        # Convert to dictionary
        result = result_df.to_dict(orient='records')

        # Format response as an OrderedDict
        response = OrderedDict([
            ("total", len(result)),  # Ensure total appears at the top
            ("data", result)
        ])

        return app.response_class(
            response=json.dumps(response, indent=2),  # Manually format JSON for readability and order preservation (asked ChatGPT for help)
            mimetype="application/json"
        )

    except Exception as e:
        app.logger.error(f"Error in get_tracks: {str(e)}")  # I used ChatGPT for this error handling.
        return jsonify({'error': str(e)}), 500


# API Endpoint (fetch top 10 artists by streams)
@app.route('/api/top-artists')
def get_top_artists():
    """
    Fetch the top 10 artists based on total Spotify streams.

    Returns:
        JSON: List of top artists sorted by streams
    """
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Aggregate streams, playlist count, and reach by artist
        artist_stats = df.groupby('Artist').agg({
            'Spotify Streams': 'sum',  # Sum streams for each artist
            'Spotify Playlist Count': 'sum',  # Sum playlist counts for each artist
            'Spotify Playlist Reach': 'sum'   # Sum playlist reach for each artist
        }).reset_index()
        
        # Sort by streams and get top 10
        artist_stats = artist_stats.nlargest(10, 'Spotify Streams')
        
        # Convert to list of dictionaries, ensuring all numeric values are floats
        result = []
        for _, row in artist_stats.iterrows():
            result.append({
                'Artist': row['Artist'],
                'Spotify Streams': float(row['Spotify Streams']),  # Ensure it's a float
                'Spotify Playlist Count': float(row['Spotify Playlist Count']),  # Include playlist count
                'Spotify Playlist Reach': float(row['Spotify Playlist Reach'])   # Include playlist reach
            })
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error in get_top_artists: {str(e)}")  # I used ChatGPT for this error handling.
        return jsonify({'error': str(e)}), 500


# API Endpoint (compare platforms)
@app.route('/api/platform-comparison')
def get_platform_comparison():
    """
    Compare streaming platforms by total, average, and median values.

    Returns:
        JSON: Data summary for Spotify, YouTube, and TikTok
    """
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500

    try:
        platforms = {
            'Spotify': 'Spotify Streams',
            'YouTube': 'YouTube Views',
            'TikTok': 'TikTok Views'
        }

        stats = OrderedDict()  # Maintain order

        for platform, column in platforms.items():
            if column in df.columns:
                stats[platform] = OrderedDict([
                    ("total", float(df[column].sum())),  # Sum of all values (total streams/views)
                    ("average", float(df[column].mean())),  # Mean (total divided by count)
                    ("median", float(df[column].median()))  # Middle value in sorted list
                ])
                
        return app.response_class(
            response=json.dumps(stats, indent=2),  # Ensure proper JSON formatting
            mimetype="application/json"
        )

    except Exception as e:
        app.logger.error(f"Error in get_platform_comparison: {str(e)}")  # I used ChatGPT for this error handling.
        return error_response(str(e), 500)


# API Endpoint (get data information)
@app.route('/api/debug/data-info')
def get_data_info():
    """
    Provide debugging information about the dataset.

    Returns:
        JSON: Structured response containing dataset information
    """
    # Check if the dataset is loaded properly
    if df is None:
        return error_response("Data not loaded", 500)

    try:
        # Select only necessary columns and clean sample data
        sample_data = df.head(3).copy()
        
        # List of numeric columns that require cleaning
        numeric_cols = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach']
        
        # Apply cleaning function to numeric columns to remove errors or inconsistencies
        for col in numeric_cols:
            if col in sample_data.columns:
                sample_data[col] = sample_data[col].apply(clean_numeric)

        # Structure the response using OrderedDict to maintain a consistent JSON order
        response = OrderedDict([
            ("status", "success"),  # Indicate successful data retrieval
            ("shape", f"[{df.shape[0]}, {df.shape[1]}]"),  # Dataset dimensions: [rows, columns]
            ("columns", df.columns.tolist()),  # List of column names in the dataset
            ("sample_data", sample_data.to_dict(orient="records"))  # First 3 cleaned records for verification
        ])

        # Return the response as a formatted JSON output
        return app.response_class(
            response=json.dumps(response, indent=2),  # Ensure formatted JSON output
            mimetype="application/json"
        )
        
    except Exception as e:
        app.logger.error(f"Error in get_data_info: {str(e)}")  # I used ChatGPT for this error handling.
        return error_response(str(e), 500)


# Handle undefined routes (404 Error)
@app.errorhandler(404)
def not_found(e):
    return error_response("Resource not found", 404)


# API Endpoint (update data)
@app.route('/api/update-data', methods=['POST'])
def update_data():
    """
    Load new data and update from a specified file.

    Returns:
        JSON response with status and updated data preview
    """
    global df  # Update the global dataframe dynamically

    try:
        if not request.is_json:
            return jsonify({"status": "error", "message": "Invalid JSON request"}), 400

        # Get file path from request
        data = request.get_json()
        new_file = data.get("file_path", "data/Spotify_Songs_2024_new.csv") # I only changed stream numbers of Drake songs for this new dataset

        # Convert to absolute path
        base_directory = Path(__file__).resolve().parent  
        full_file_path = (base_directory / new_file).resolve()

        # Log an informational message about the dataset being loaded
        app.logger.info(f"Attempting to load data from: {full_file_path}")

        # Load new data with cleaning & filtering
        updated_df = load_data_from_file(full_file_path)

        # Handle case where dataset could not be loaded
        if updated_df is None:
            return jsonify({"status": "error", "message": f"Failed to load data from {full_file_path}"}), 500

        # Update global dataframe with the new dataset
        df = updated_df

        # Convert to JSON, replacing NaN values with `None`
        full_data = df.replace({np.nan: None}).to_dict(orient="records")

        # Return success response with updated dataset details
        return jsonify({
            "status": "success",
            "message": f"Data updated from {full_file_path}",
            "total_records": len(df),
            "data": full_data  
        })
    
    except Exception as e:
        app.logger.error(f"Error in update_data: {str(e)}", exc_info=True)  # I used ChatGPT for this error handling.
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500


def load_data_from_file(file_path):
    """
    Load and clean data from a specified file.

    Args:
        file_path (str): Absolute path to the dataset CSV file

    Returns:
        pd.DataFrame: Cleaned dataframe if successful, otherwise None
    """
    try:
        # Ensure the file path is absolute and exists
        file_path = Path(file_path).resolve()
        if not file_path.exists():
            app.logger.error(f"File not found: {file_path}")
            return None

        # Read the CSV file
        df_new = pd.read_csv(file_path, encoding="latin1")

        # Detect and remove rows with encoding errors (garbage characters)
        def contains_encoding_errors(text):
            if isinstance(text, str):
                return any(char not in set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-'&()!?") for char in text)
            return False

        # Remove rows where Track, Artist, or Album Name have corrupted text
        df_new = df_new[~df_new.apply(lambda row: 
            contains_encoding_errors(row["Track"]) or 
            contains_encoding_errors(row["Artist"]) or 
            contains_encoding_errors(row["Album Name"]), axis=1)].copy()

        # Remove non-artist entries like DJ mixes or compilations
        non_artist_names = [
            "MUSIC LAB JPN",
            "LOVE BGM JPN",
            "sped up 8282",
            "DJ MIX NON-STOP CHANNEL",
            "WORK OUT GYM - DJ MIX"
        ]

        # Remove rows where the artist matches a non-artist entry
        df_new = df_new[~df_new['Artist'].isin(non_artist_names)]

        # List of numeric columns that need cleaning
        numeric_columns = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach', 'YouTube Views', 'YouTube Likes', 'TikTok Views']
        
        # Convert numeric columns: remove invalid characters and convert to float
        for col in numeric_columns:
            if col in df_new.columns:
                df_new[col] = df_new[col].apply(clean_numeric)

        print(f"Data cleaned. Removed {len(df_new)} rows with encoding errors or non-artist entries.")
        return df_new

    # Log any errors that occur while loading and cleaning the data
    except Exception as e:
        app.logger.error(f"Error loading data from file: {str(e)}")
        return None


# Start Flask server
if __name__ == '__main__':
    if df is None:
        print("\nWARNING: Failed to load data.")
        print("Please check:")
        print("1. Data file exists in 'data' directory")
        print("2. File has correct name: 'Spotify_Songs_2024.csv'")
        print("3. File is readable")
    else:
        print("\nServer ready.")
        print(f"Loaded {len(df)} records with {len(df.columns)} columns")
        print("\nAvailable columns:", df.columns.tolist())
    
    app.run(port=8000, debug=True)
