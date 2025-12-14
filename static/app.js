/**
    CS181DV Assignment 2: Interactive Web Visualization with D3.js

    Author: AIKO KATO

    Date: 02/28/2025

 */

function initializeDashboard(containerId) {
    /**
     * Initialize the dashboard and set up data loading.
     *
     * @param {string} containerId - Main container element ID
     * @returns {Object} Dashboard configuration object
     */
    console.log("Dashboard initializing...");

    // Add loading messages before fetching API data
    document.getElementById("scatterPlotContainer").innerHTML = "<p class='loading-message'>Loading scatter plot...</p>";
    document.getElementById("topArtistsContainer").innerHTML = "<p class='loading-message'>Loading artists...</p>";
    document.getElementById("platformComparisonContainer").innerHTML = "<p class='loading-message'>Loading platform comparison...</p>";

    // Load data from API endpoints with better error handling
    Promise.all([
        fetch('/api/tracks')
            .then(res => {
                console.log("Tracks API Response Status:", res.status);
                return res.text();
            })
            .then(text => {
                console.log("Tracks API Raw Response:", text);
                return JSON.parse(text); // Convert to JSON after checking
            })
            .catch(error => {
                console.error("Tracks API Error:", error);
                document.getElementById("scatterPlotContainer").innerHTML = "<p class='error-message'>Failed to load data. Please try again later.</p>";
                return { data: [] }; // Ensure function continues without breaking
            }),

        fetch('/api/top-artists')
            .then(res => {
                console.log("Top Artists API Response Status:", res.status);
                return res.text();
            })
            .then(text => {
                console.log("Top Artists API Raw Response:", text);
                return JSON.parse(text);
            })
            .catch(error => {
                console.error("Top Artists API Error:", error);
                document.getElementById("topArtistsContainer").innerHTML = "<p class='error-message'>Failed to load data. Please try again later.</p>";
                return []; // Return empty array to prevent crashing
            }),

        fetch('/api/platform-comparison')
            .then(res => {
                console.log("Platform Comparison API Response Status:", res.status);
                return res.text();
            })
            .then(text => {
                console.log("Platform Comparison API Raw Response:", text);
                return JSON.parse(text);
            })
            .catch(error => {
                console.error("Platform Comparison API Error:", error);
                document.getElementById("platformComparisonContainer").innerHTML = "<p class='error-message'>Failed to load data. Please try again later.</p>";
                return {};
            }) // Return empty object to avoid breaking visualization

    ]).then(([trackData, artistData, platformData]) => {
        console.log("Track Data Loaded", trackData);
        console.log("Artist Data Loaded", artistData);
        console.log("Platform Comparison Data Loaded", platformData);

        // Remove loading messages after data loads
        document.getElementById("scatterPlotContainer").innerHTML = "";
        document.getElementById("topArtistsContainer").innerHTML = "";
        document.getElementById("platformComparisonContainer").innerHTML = "";

        // Ensure trackData has a 'data' property
        createScatterPlot("#scatterPlotContainer", trackData.data || []);
        createTopArtistsChart("#topArtistsContainer", artistData || []);
        createPlatformComparison("#platformComparisonContainer", platformData || {});

    }).catch(error => {
        console.error("Error fetching data:", error);
    });
}


function createScatterPlot(
    /**
     * Create an interactive scatter plot for streams vs playlist reach.
     *
     * @param {string} container - Container element selector
     * @param {Array} data - Streaming data array
     * @param {Object} config - Visualization configuration
     * @returns {Objects} D3 visualization instance
     */
    container,
    data,
    config = {
        width: 800,
        height: 400,
        margin: {top: 50, right: 50, bottom: 60, left: 70}
    }
) {
    console.log("Creating scatter plot", container, data);
    console.log("Sample Data Keys:", Object.keys(data[0]));

    // Remove existing SVG to avoid duplication
    d3.select(container).select("svg").remove();

    // Compute the actual width and height after applying margins
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;

    // Create an SVG canvas inside the specified container
    const svg = d3.select(container)
        .append("svg")
        .attr("width", config.width)
        .attr("height", config.height);

    // Create a group g inside the SVG to apply margins
    const g = svg.append("g").attr("transform", `translate(${config.margin.left},${config.margin.top})`); // I used ChatGPT for this line.

    // Ensure that all data points have non-negative values (I asked ChatGPT for help)
    const cleanData = data.map(d => ({
        Track: d.Track,
        Artist: d.Artist,
        "Spotify Playlist Reach": Math.max(0, d["Spotify Playlist Reach"]),
        "Spotify Streams": Math.max(0, d["Spotify Streams"])
    }));

    // Define x-scale for Playlist Reach
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(cleanData, d => d["Spotify Playlist Reach"]) * 1.1])
        .range([0, width]);

    // Define y-scale for Spotify Streams
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(cleanData, d => d["Spotify Streams"]) * 1.1])
        .range([height, 0]);

    // Store original scales for reset functionality
    const xScaleOriginal = xScale.copy();
    const yScaleOriginal = yScale.copy();

    // Format large numbers as M (million) or B (billion)
    const formatNumber = (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"; // Convert to billion
        if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"; // Convert to million
        return num.toLocaleString(); // Default formatting for smaller numbers
    };

    // Add x-axis with formatted tick labels
    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => {
            if (d >= 1e9) return d3.format(".0f")(d / 1e9) + "B"; // Billions (no decimals)
            if (d >= 1e6) return d3.format(".0f")(d / 1e6) + "M"; // Millions (no decimals)
            return d3.format(".0f")(d); // Default formatting for smaller numbers
        }));

    // Add y-axis with formatted tick labels
    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => {
            if (d >= 1e9) return d3.format(".0f")(d / 1e9) + "B"; // Billions (no decimals)
            if (d >= 1e6) return d3.format(".0f")(d / 1e6) + "M"; // Millions (no decimals)
            return d3.format(".0f")(d); // Default formatting for smaller numbers
        }));

    // Add axis labels
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Spotify Playlist Reach");

    // Add y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Spotify Streams");

    // Create a tooltip div for displaying details on hover
    const tooltip = d3.select(container)
        .append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#333")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "5px");

    // Add scatter plot circles
    const circles = g.selectAll("circle")
        .data(cleanData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d["Spotify Playlist Reach"]))
        .attr("cy", d => yScale(d["Spotify Streams"]))
        .attr("r", 6) // Default circle size
        .style("fill", "#1DB954") // Spotify color
        .style("opacity", 0.8)
        .on("mouseover", (event, d) => { // I asked ChatGPT for help to work on hover.
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>${d.Track} - ${d.Artist}</strong><br>
                    Streams: ${d["Spotify Streams"].toLocaleString()}<br>
                    Reach: ${d["Spotify Playlist Reach"].toLocaleString()}
                `);
            d3.select(event.currentTarget).attr("r", 10).style("opacity", 1); // Enlarge on hover
        })
        .on("mousemove", (event) => {
            tooltip.style("top", `${event.pageY - 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", (event) => {
            tooltip.style("visibility", "hidden");
            d3.select(event.currentTarget).attr("r", 6).style("opacity", 0.8); // Restore size
        });
    console.log("Total Circles Plotted:", g.selectAll("circle").size());

    // Implement zoom and pan
    let currentTransform = d3.zoomIdentity;
    const zoom = d3.zoom() // I asked ChatGPT for help to implement zoom and pan.
        .scaleExtent([0.5, 10]) // Allow zoom from 50% to 10x
        .translateExtent([[0, 0], [width, height]]) // Restrict translation
        .on("zoom", (event) => {
            currentTransform = event.transform;

            const newXScale = event.transform.rescaleX(xScaleOriginal);
            const newYScale = event.transform.rescaleY(yScaleOriginal);

            xAxis.call(d3.axisBottom(newXScale).ticks(5).tickFormat(d => {
                if (d >= 1e9) return d3.format(".0f")(d / 1e9) + "B"; // Billions (no decimals)
                if (d >= 1e6) return d3.format(".0f")(d / 1e6) + "M"; // Millions (no decimals)
                return d3.format(".0f")(d); // Default formatting for smaller numbers
            }));

            yAxis.call(d3.axisLeft(newYScale).ticks(5).tickFormat(d => {
                if (d >= 1e9) return d3.format(".0f")(d / 1e9) + "B"; // Billions (no decimals)
                if (d >= 1e6) return d3.format(".0f")(d / 1e6) + "M"; // Millions (no decimals)
                return d3.format(".0f")(d); // Default formatting for smaller numbers
            }));

            circles.attr("cx", d => newXScale(d["Spotify Playlist Reach"]))
                   .attr("cy", d => newYScale(d["Spotify Streams"]))
                   .style("display", d =>
                        (newXScale(d["Spotify Playlist Reach"]) >= 0 && newXScale(d["Spotify Playlist Reach"]) <= width) &&
                        (newYScale(d["Spotify Streams"]) >= 0 && newYScale(d["Spotify Streams"]) <= height)
                        ? "block" : "none" // Hide circles outside the zoomed area
                    );
        });

    svg.call(zoom);

    function resetZoom() {
        /**
         * Resets the zoom level of the scatter plot to its original state.
         */
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    }

    // Create Reset Zoom Button
    const buttonContainer = d3.select(container)
        .append("div")
        .attr("class", "zoom-button-container")
        .style("margin-top", "10px")
        .style("text-align", "center");

    // Append Reset Zoom Button
    buttonContainer.append("button")
        .attr("class", "zoom-button")
        .text("Reset Zoom")
        .style("padding", "10px 20px")
        .style("border", "2px solid #1DB954")
        .style("background-color", "white")
        .style("color", "#1DB954")
        .style("border-radius", "20px")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .style("margin-top", "10px")
        .on("mouseover", function () {
            d3.select(this)
                .style("background-color", "#1DB954")
                .style("color", "white");
        })
        .on("mouseout", function () {
            d3.select(this)
                .style("background-color", "white")
                .style("color", "#1DB954");
        })
        .on("click", resetZoom);

    // Return update and reset functions
    return { update: () => {}, resetZoom: resetZoom, svg: svg };
}


function createTopArtistsChart(
    /**
     * Create an interactive bar chart of top artists.
     *
     * @param {string} container - Container element selector
     * @param {Array} data - Artist streaming data
     * @param {Object} config - Chart configuration
     * @returns {Object} D3 visualization instance
     */
    container,
    data,
    config = {
        width: 800,
        height: 400,
        margin: {top: 50, right: 50, bottom: 80, left: 150}
    }
) {
    console.log("Creating top artists chart", container, data);

    // Remove any existing chart elements to prevent duplication
    d3.select(container).select("svg").remove();
    d3.select(container).select(".sort-buttons").remove();
    d3.select(".tooltip").remove();

    // Compute the actual width and height after applying margins
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;

    // Create an SVG canvas inside the specified container
    const svg = d3.select(container)
        .append("svg")
        .attr("width", config.width)
        .attr("height", config.height)
        .append("g")
        .attr("transform", `translate(${config.margin.left},${config.margin.top})`); // I used ChatGPT for this line.

    // Default sorting criterion
    let sortingCriterion = "Spotify Streams";

    // Define x and y scales
    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleBand().range([0, height]).padding(0.2);

    // Create axis elements
    const xAxisGroup = svg.append("g").attr("transform", `translate(0, ${height})`);
    const yAxisGroup = svg.append("g");

    // Add x-axis label to indicate sorting criterion
    const xAxisLabel = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "black");

    // Create tooltip div for displaying details on hover
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip");

    function cleanValue(value) {
        /**
         * Cleans and converts a value to a number.
         *
         * @param {string|number} value - The value to clean and convert
         * @returns {number} - Parsed numerical value or 0 if invalid
         */
        if (value === undefined || value === null || value === "") return 0;
        // Remove commas, whitespace, and convert to a number
        return parseFloat(String(value).replace(/[, ]/g, '')) || 0;
    }

    function getProperty(data, propertyBase) {
        /**
         * Retrieves the correct property from an artist data object.
         *
         * @param {Object} data - Artist data object
         * @param {string} propertyBase - Expected property name
         * @returns {number} - Extracted numerical value or 0 if not found
         */
        if (!data || typeof data !== 'object') {
            console.warn(`Invalid data for property ${propertyBase}:`, data); // I used ChatGPT for this line.
            return 0;
        }

        // List of possible variations of the property name
        const trimmedBase = propertyBase.trim();
        const possibleKeys = [
            trimmedBase, // Exact match
            trimmedBase.replace(/\s+/g, ''), // Remove spaces (eg, "SpotifyPlaylistCount")
            trimmedBase.replace(/\s+/g, '_'), // Replace spaces with underscores (eg, "Spotify_Playlist_Count")
            trimmedBase.toLowerCase(), // Lowercase (eg, "spotify playlist count")
            trimmedBase.toUpperCase(), // Uppercase (eg, "SPOTIFY PLAYLIST COUNT")
            trimmedBase.split(' ').join(''), // Remove spaces (alternative)
            trimmedBase.split(' ').join('_'), // Replace spaces with underscores (alternative)
        ];

        for (const key of possibleKeys) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                console.log(`Found key for ${propertyBase}: ${key} with value ${data[key]}`); // I used ChatGPT for this line.
                return cleanValue(data[key]);
            }
        }

        // Log all available keys in the data for debugging
        console.warn(`No matching key found for ${propertyBase} in data:`, Object.keys(data), data);
        return 0;
    }

    function updateChart() {
        /**
         * Updates the bar chart based on the selected sorting criterion.
         */
        console.log("Updating chart with sorting:", sortingCriterion);
    
        let sortedData;
        if (sortingCriterion === "Spotify Streams") {
            // Sort by total streams and select top 10 (I asked ChatGPT for help)
            sortedData = [...data].sort((a, b) => 
                d3.descending(getProperty(a, "Spotify Streams"), getProperty(b, "Spotify Streams"))
            ).slice(0, 10);
        } else if (sortingCriterion === "Spotify Playlist Reach") {
            // Sort by playlist reach and select top 10
            sortedData = [...data].sort((a, b) => 
                d3.descending(getProperty(a, "Spotify Playlist Reach"), getProperty(b, "Spotify Playlist Reach"))
            ).slice(0, 10);
        }
    
        // Update scale domains
        xScale.domain([0, d3.max(sortedData, d => getProperty(d, sortingCriterion))]);
        yScale.domain(sortedData.map(d => d.Artist || d.artist || d.ARTIST || "Unknown")); // Handle Artist variations
    
        // Update axes (with Billion instead of Giga)
        xAxisGroup.transition().duration(1000).call(
            d3.axisBottom(xScale).ticks(5).tickFormat(d => d3.format(".2s")(d).replace('G', 'B'))
        );
        yAxisGroup.transition().duration(1000).call(d3.axisLeft(yScale));
    
        xAxisLabel.text(`Sorting by: ${sortingCriterion}`);
    
        // Bind data to bars
        const bars = svg.selectAll("rect.bar").data(sortedData);
    
        // Enter and update
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.Artist || d.artist || d.ARTIST || "Unknown"))
            .attr("x", 0)
            .attr("height", yScale.bandwidth())
            .attr("width", 0)
            .style("fill", "var(--spotify-green)")
            .style("opacity", 0.8)
            .merge(bars)
            .transition()
            .duration(1000)
            .attr("y", d => yScale(d.Artist || d.artist || d.ARTIST || "Unknown"))
            .attr("width", d => xScale(getProperty(d, sortingCriterion)))
            .on("end", function() {
                
                // Attach event listeners after transition
                const allBars = svg.selectAll("rect.bar");
                console.log("Bars rendered:", allBars.size());
    
                allBars // I asked ChatGPT for help to work on hover.
                    .on("mouseover", function(event, d) {
                        console.log("Hover data:", d); // Debug (inspect full data object)
    
                        // Get values with dynamic property lookup
                        const streams = getProperty(d, "Spotify Streams");
                        const playlistCount = getProperty(d, "Spotify Playlist Count");
                        const playlistReach = getProperty(d, "Spotify Playlist Reach");
    
                        // Log the actual values for debugging
                        console.log("Streams:", streams, "Playlist Count:", playlistCount, "Playlist Reach:", playlistReach);
    
                        tooltip
                            .style("opacity", 1)
                            .html(`
                                <strong>${d.Artist || d.artist || d.ARTIST || "Unknown"}</strong><br>
                                Streams: ${d3.format(",")(streams)}<br>
                                Playlist Count: ${d3.format(",")(playlistCount)}<br>
                                Playlist Reach: ${d3.format(",")(playlistReach)}
                            `);
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style("fill", "#0b8f3e")
                            .style("opacity", 1);
                    })
                    .on("mousemove", function(event) {
                        tooltip
                            .style("top", `${event.pageY + 10}px`)
                            .style("left", `${event.pageX + 10}px`);
                    })
                    .on("mouseout", function() {
                        tooltip.style("opacity", 0);
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style("fill", "var(--spotify-green)")
                            .style("opacity", 0.8);
                    });
            });
    
        // Exit
        bars.exit()
            .transition()
            .duration(1000)
            .attr("width", 0)
            .remove();
    }
    
    // Create sort buttons
    const buttonContainer = d3.select(container)
        .append("div")
        .attr("class", "sort-buttons")
        .style("margin-top", "10px");

    buttonContainer.append("button")
        .text("Sort by Streams")
        .style("margin-right", "10px")
        .on("click", () => {
            sortingCriterion = "Spotify Streams";
            updateChart();
        });

    buttonContainer.append("button")
        .text("Sort by Playlist Reach")
        .on("click", () => {
            sortingCriterion = "Spotify Playlist Reach";
            updateChart();
        });

    // Run initial update
    updateChart();

    console.log("Top Artists chart created in:", container);
}


function createPlatformComparison(
    /**
     * Creates interactive platform comparison visualization.
     * 
     * @param {string} container - Container element selector
     * @param {Object} data - Platform comparison data
     * @param {string} metric - Comparison metric
     * @param {Object} config - Visualization configuration
     * @returns {Object} D3 visualization instance
     */
    container,
    data,
    config = {
        width: 800,
        height: 400,
        margin: {top: 50, right: 50, bottom: 80, left: 100}
    }
) {
    console.log("Creating platform comparison", container, data);

    // Remove existing SVG and buttons to prevent duplication when reloading the chart
    d3.select(container).select("svg").remove();
    d3.select(container).select(".toggle-buttons").remove();

    // Set chart dimensions based on provided config
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;

    // Default metric to display (initially total streams)
    let currentMetric = "total";

    // Create SVG element
    const svg = d3.select(container)
        .append("svg")
        .attr("width", config.width)
        .attr("height", config.height)
        .append("g")
        .attr("transform", `translate(${config.margin.left},${config.margin.top})`); // I used ChatGPT for this line.

    // Define scales
    const xScale = d3.scaleLinear().range([0, width]); // Scale for the x-axis (streams)
    const yScale = d3.scaleBand()
        .domain(Object.keys(data)) // Platforms (Spotify, YouTube, TikTok)
        .range([0, height])
        .padding(0.2); // Adds spacing between bars

    // Create axis groups
    const xAxisGroup = svg.append("g").attr("transform", `translate(0, ${height})`);
    const yAxisGroup = svg.append("g");

    // Axis Label
    const xAxisLabel = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "black");

    // Create Tooltip for showing detailed values on hover
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#333")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "5px");

    function getScaleAndUnit(metric) {
        /**
         * Determines the scaling factor and unit for visualization.
         */
        if (metric === "total") {
            return { scale: 1e9, unit: "B" }; // Convert values to billions for total streams
        } else {
            return { scale: 1e6, unit: "M" }; // Convert values to millions for average and median
        }
    }

    function updateChart() {
        /**
         * Updates the bar chart based on the selected metric (total, average, or median).
         */
        const platforms = Object.keys(data); // Extract platform names (Spotify, YouTube, TikTok)
        const { scale, unit } = getScaleAndUnit(currentMetric); // Get appropriate scale and unit
        const values = platforms.map(p => data[p][currentMetric] / scale); // Normalize values

        // Update domain of x-scale based on max value in selected metric
        xScale.domain([0, d3.max(values)]);
        yScale.domain(platforms); // Ensure platform names are mapped correctly

        // Update axes with proper formatting for large numbers
        xAxisGroup.transition().duration(1000).call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d3.format(".0f")(d) + unit)); // I used ChatGPT for this line.
        yAxisGroup.transition().duration(1000).call(d3.axisLeft(yScale));

        // Update x-axis label to indicate selected metric
        xAxisLabel.text(`Showing: ${currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1)} (in ${unit === "B" ? "Billions" : "Millions"})`); // I used ChatGPT for this line.

        // Bind data to bars
        const bars = svg.selectAll(".bar").data(platforms);

        // Enter (append new bars)
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d)) // Position bar on y-axis
            .attr("x", 0)
            .attr("height", yScale.bandwidth()) // Set bar height
            .attr("width", 0) // Start with width 0 for animation
            .attr("fill", d => platformColors[d]) // Use platform-specific colors
            .merge(bars) // Merge enter and update
            .transition()
            .duration(1000)
            .attr("y", d => yScale(d))
            .attr("width", d => xScale(data[d][currentMetric] / scale)); // Scale based on metric

        // Exit (remove bars not in the dataset anymore)
        bars.exit().remove();

        // Add hover effects for tooltip (I asked ChatGPT for help to work on hover)
        svg.selectAll(".bar")
            .on("mouseover", (event, d) => {
                function formatNumber(value) {
                    /**
                     * Formats numbers for tooltip display.
                     */
                    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
                    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
                    return d3.format(",")(value); // Default comma format
                }

                tooltip.style("visibility", "visible")
                    .style("opacity", 1)
                    .html(`
                        <div style="color:black; padding:5px; border-radius:5px; font-size:14px;">
                            <strong style="font-size:16px;">${d}</strong><br>
                            <b>Total:</b> ${formatNumber(data[d]["total"])}<br>
                            <b>Average:</b> ${formatNumber(data[d]["average"])}<br>
                            <b>Median:</b> ${formatNumber(data[d]["median"])}
                        </div>
                    `);
                d3.select(event.currentTarget).style("opacity", 0.7);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", (event) => {
                tooltip.style("visibility", "hidden");
                d3.select(event.currentTarget).style("opacity", 1);
            });
    }

    // Create view toggle buttoons
    const buttonContainer = d3.select(container)
        .append("div")
        .attr("class", "toggle-buttons")
        .style("margin-top", "10px");

    buttonContainer.append("button")
        .text("Show Total")
        .style("margin-right", "10px")
        .on("click", () => {
            currentMetric = "total";
            updateChart();
        });

    buttonContainer.append("button")
        .text("Show Average")
        .style("margin-right", "10px")
        .on("click", () => {
            currentMetric = "average";
            updateChart();
        });

    buttonContainer.append("button")
        .text("Show Median")
        .on("click", () => {
            currentMetric = "median";
            updateChart();
        });

    // Define platform colors
    const platformColors = {
        "Spotify": "#1DB954", // Green
        "YouTube": "#FF0000", // Red
        "TikTok": "#000000" // Black
    };

    // Create legend
    const legend = svg.append("g").attr("transform", `translate(${width - 120}, ${-40})`);

    Object.keys(platformColors).forEach((platform, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", platformColors[platform]);

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 12)
            .style("font-size", "14px")
            .text(platform);
    });

    // Run initial update
    updateChart();

    console.log("Platform comparison chart created in:", container);
}


function integrateVisualizations(
    /**
     * Integrate all visualizations into cohesive dashboard.
     *
     * @param {Object} config - Dashboard configuration
     * @returns {Object} Dashboard controller instance
     */
    config = {
        scatterPlot: '#scatterPlot',
        barChart: '#topArtists',
        platformComparison: '#platformComparison'
    }
) {
    console.log("Integrating visualizations...", config); // Debug log to confirm function execution
    
    // Delay initialization to ensure everything is fully loaded
    setTimeout(() => {
        initializeDashboard(config.scatterPlot);
    }, 100); // Small delay to prevent premature execution
}


function updateData() {
    /**
     * Sends a request to update the dataset and refreshes the visualizations.
     *
     * @param {string} filePath - The path to the new dataset file ("data/Spotify_Songs_2024_new.csv")
     * @returns {void} - This function does not return anything but updates the visualizations dynamically
     */
    console.log("Updating data...");  // Debug log to indicate that data update process has started

    // Prepare the request payload with the file path of the new dataset
    const requestData = JSON.stringify({ file_path: "data/Spotify_Songs_2024_new.csv" });
    console.log("Sending request:", requestData);  // Log the request payload for debugging

    // Send a POST request to the api/update-data endpoint to update the dataset
    fetch('/api/update-data', {
        method: "POST",  // Specifies that this is a POST request
        headers: { "Content-Type": "application/json" },  // Set request header to indicate JSON format
        body: requestData  // Attach the JSON payload (file path) as the request body
    })
    .then(response => response.json())  // Convert the response to JSON format
    .then(data => {
        console.log("Update response received:", data);  // Log the server response for debugging

        // Check if the update was successful
        if (data.status === "success") {
            console.log(`Loaded ${data.total_records} records from new dataset.`);  // Log the number of records in the new dataset

            // Reload visualizations with the updated data
            initializeDashboard(); 
        } else {
            console.error("Data update failed:", data.message);  // Log an error message if the update was unsuccessful
        }
    })
    .catch(error => console.error("Error updating data:", error));  // Handle and log any errors that occur during the request
}


// Ensure the document is fully loaded before initializing
document.addEventListener("DOMContentLoaded", function () {
    console.log("Document fully loaded. Initializing dashboard..."); 

    // Calls function to set up dashboard
    integrateVisualizations();

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style = `
        display: flex; 
        justify-content: center; 
        gap: 10px; 
        margin-top: 10px;
    `;

    // Create "Update Data" button
    const updateButton = document.createElement("button");
    updateButton.innerText = "Update Data";
    updateButton.style = `
        padding: 10px 20px;
        border: 2px solid #1DB954; 
        color: #1DB954; 
        background: white; 
        cursor: pointer;
        font-size: 14px; 
        border-radius: 20px;
        font-weight: bold;
    `;

    // Hover effect (like other buttons)
    updateButton.addEventListener("mouseover", function () {
        updateButton.style.backgroundColor = "#1DB954";
        updateButton.style.color = "white";
    });

    updateButton.addEventListener("mouseout", function () {
        updateButton.style.backgroundColor = "white";
        updateButton.style.color = "#1DB954";
    });

    // Attach event listener to update data
    updateButton.addEventListener("click", function() {
        console.log("Update Data button clicked!");
        updateData();
    });

    // Append button inside the same container as other buttons
    buttonContainer.appendChild(updateButton);
    document.body.appendChild(buttonContainer);
    console.log("Update Data button added.");
});

// I used GenAI multiple times to get help with debugging...
