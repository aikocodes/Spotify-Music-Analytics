# Spotify-Music-Analytics

Interactive Spotify music analytics dashboard that explores streaming performance, playlist reach, and cross-platform engagement. The project visualizes relationships between Spotify streams and playlist reach, highlights top-performing artists, and compares metrics across Spotify, YouTube, and TikTok using D3.js.

## Overview

This project focuses on exploratory data analysis and interactive visualization of Spotify music data. It is designed as a web-based dashboard that allows users to investigate how visibility, playlists, and platform presence relate to streaming success.

## Features

- Streams vs Playlist Reach scatter plot with zoom and tooltips  
- Top 10 artists visualization with dynamic sorting  
- Cross-platform comparison (Spotify, YouTube, TikTok)  
- Interactive D3-based charts with smooth transitions  
- Spotify-themed UI styling  

## Dataset

The analysis uses Spotify datasets including:
- Most Streamed Spotify Songs 2024
- Spotify Songs 2024

Data is cleaned and processed before visualization.

## Technologies

- JavaScript (ES6)
- D3.js (v7)
- HTML
- CSS
- Python (Flask backend)
- Pandas

## Project Structure

- index.html — Dashboard layout and structure  
- app.js — D3 visualizations and interaction logic  
- styles.css — Styling and layout  
- server.py — Backend server for data loading  
- CSV files — Spotify datasets  
- README.md

## How to Run

1. Install dependencies:
   pip install -r requirements.txt

2. Start the server:
   python server.py

3. Open in browser:
   http://localhost:5000

## Notes

- Visualizations are best viewed on desktop screens.
- Initial loading may take a moment due to dataset size.

## Author

Aiko Kato  
Pomona College — Computer Science & Digital Media Studies  
CS181DV: Interactive Data Visualization
